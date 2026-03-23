import slugify from "slugify";
import type { Locale } from "@/lib/i18n";
import type { SocialLinks } from "@/lib/social-links";

const GLOBAL_POST_ROLES = new Set(["admin", "owner"]);
const WRITER_ROLES = new Set(["volunteer", "writer", "admin", "owner"]);
const DEFAULT_POST_DESCRIPTION_MAX_LENGTH = 220;
const DESCRIPTION_TARGET_LENGTH = 180;
const MIN_DESCRIPTION_CANDIDATE_LENGTH = 48;
const MAX_DESCRIPTION_BLOCKS = 8;
const CODE_FENCE_PATTERN = /```[\s\S]*?```|~~~[\s\S]*?~~~/g;
const HTML_COMMENT_PATTERN = /<!--[\s\S]*?-->/g;
const YAML_FRONTMATTER_PATTERN = /^---\s*\n[\s\S]*?\n---\s*(?:\n|$)/;
const HEADING_PATTERN = /^\s{0,3}#{1,6}\s+/gm;
const BLOCKQUOTE_PATTERN = /^\s{0,3}>\s?/gm;
const LIST_MARKER_PATTERN = /^\s{0,3}(?:[-*+]|\d+\.)\s+/gm;
const TABLE_DIVIDER_PATTERN = /^\s*\|?(?:\s*:?-{3,}:?\s*\|)+\s*:?-{3,}:?\s*\|?\s*$/;
const WEAK_DESCRIPTION_STARTS = [
	/^(?:this|that|these|those)\s+(?:is|are|was|were)\b/i,
	/^(?:in|throughout)\s+this\s+(?:post|article|guide)\b/i,
	/^(?:here(?:'s| is)|below|above)\b/i,
	/^(?:so|but|and|of course|meanwhile)\b/i,
	/^(?:the point|the goal|the thing)\b/i,
];
const TITLE_STOPWORDS = new Set([
	"about",
	"after",
	"around",
	"because",
	"before",
	"being",
	"build",
	"building",
	"from",
	"into",
	"page",
	"post",
	"that",
	"this",
	"through",
	"what",
	"when",
	"where",
	"with",
	"without",
	"your",
]);

type DescriptionCandidate = {
	text: string;
	index: number;
	sentenceCount: number;
};

type SessionUserLike = {
	id?: string | null;
	role?: string | null;
};

export type PostPageAuthor = {
	id: string;
	name: string;
	slug: string;
	profilePicture: string;
	socialLinks: SocialLinks;
};

export type PostPageData = {
	id: string;
	title: string;
	slug: string;
	content: string;
	locale: Locale;
	originalLocale: Locale;
	isTranslated: boolean;
	thumbnail: string | null;
	thumbnailAlt: string;
	mainTag: string;
	tags: string[];
	description: string;
	views: number;
	bookmarks: number;
	edited: boolean;
	postedAt: string;
	lastEditedAt: string | null;
	status: "draft" | "pending_review" | "published";
	authorId: string;
	author: PostPageAuthor;
};

export function canWriteRole(role?: string | null) {
	return WRITER_ROLES.has((role || "").toLowerCase());
}

export function canManageAllPosts(role?: string | null) {
	return GLOBAL_POST_ROLES.has((role || "").toLowerCase());
}

export function canEditPost(
	post: { authorId: string },
	user?: SessionUserLike | null,
) {
	if (!user?.id) {
		return false;
	}

	return user.id === post.authorId || canManageAllPosts(user.role);
}

export function canViewPost(
	post: { authorId: string; status: string },
	user?: SessionUserLike | null,
) {
	return post.status === "published" || canEditPost(post, user);
}

export function slugifyPostValue(value: string) {
	return slugify(value, { lower: true, strict: true }).trim();
}

export function stripMarkdown(markdown: string) {
	return markdown
		.replace(/!\[([^\]]*)\]\([^)]+\)/g, " $1 ")
		.replace(/\[([^\]]+)\]\([^)]+\)/g, " $1 ")
		.replace(/[`#>*_~-]/g, " ")
		.replace(/\n+/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

function normalizeDescriptionInput(markdown: string) {
	return markdown
		.replace(/\r/g, "")
		.replace(YAML_FRONTMATTER_PATTERN, "")
		.replace(HTML_COMMENT_PATTERN, "\n\n")
		.replace(CODE_FENCE_PATTERN, "\n\n");
}

function cleanDescriptionBlock(block: string) {
	if (!block.trim()) {
		return "";
	}

	const lines = block
		.split("\n")
		.map((line) => line.trim())
		.filter(Boolean);

	if (!lines.length) {
		return "";
	}

	if (lines.every((line) => TABLE_DIVIDER_PATTERN.test(line))) {
		return "";
	}

	const listLines = lines.filter((line) =>
		/^(?:[-*+]|\d+\.)\s+/.test(line),
	).length;
	if (listLines / lines.length > 0.6) {
		return "";
	}

	const blockText = lines.join(" ");
	const cleaned = blockText
		.replace(HEADING_PATTERN, "")
		.replace(BLOCKQUOTE_PATTERN, "")
		.replace(LIST_MARKER_PATTERN, "")
		.replace(/!\[([^\]]*)\]\([^)]+\)/g, " ")
		.replace(/\[([^\]]+)\]\([^)]+\)/g, " $1 ")
		.replace(/`([^`]+)`/g, " $1 ")
		.replace(/[*_~]/g, "")
		.replace(/\|/g, " ")
		.replace(/\s+/g, " ")
		.trim();

	if (!cleaned) {
		return "";
	}

	if (looksLikeCode(cleaned)) {
		return "";
	}

	return cleaned;
}

function extractTitleKeywords(content: string) {
	const heading =
		normalizeDescriptionInput(content)
			.split("\n")
			.map((line) => line.trim())
			.find((line) => /^#{1,6}\s+/.test(line))
			?.replace(/^#{1,6}\s+/, "") || "";

	return heading
		.toLowerCase()
		.replace(/[^a-z0-9\s-]/g, " ")
		.split(/\s+/)
		.filter(
			(word) => word.length >= 4 && !TITLE_STOPWORDS.has(word),
		)
		.slice(0, 5);
}

function looksLikeCode(text: string) {
	const codeSignals = [
		/\b(?:function|const|let|var|return|class|interface|import|export)\b/,
		/=>/,
		/[{}[\]]/,
		/\b[a-zA-Z_$][\w$]*\([^)]*\)/,
	];

	return codeSignals.filter((pattern) => pattern.test(text)).length >= 2;
}

function splitIntoSentences(text: string) {
	const matches = text.match(/[^.!?]+(?:[.!?]+|$)/g) || [];

	return matches
		.map((sentence) => sentence.replace(/\s+/g, " ").trim())
		.filter(Boolean);
}

function normalizeDescriptionText(text: string) {
	return text
		.replace(/\s+([,.;!?])/g, "$1")
		.replace(/\(\s+/g, "(")
		.replace(/\s+\)/g, ")")
		.replace(/\s+/g, " ")
		.trim();
}

function finalizeDescription(text: string, maxLength: number) {
	const normalized = normalizeDescriptionText(text);
	if (normalized.length <= maxLength) {
		return normalized;
	}

	const withinLimit = normalized.slice(0, maxLength);
	const sentenceMatches = [...withinLimit.matchAll(/[.!?](?=\s|$)/g)];
	const lastSentenceEnd = sentenceMatches.at(-1)?.index;
	if (
		typeof lastSentenceEnd === "number" &&
		lastSentenceEnd + 1 >= Math.floor(maxLength * 0.6)
	) {
		return withinLimit.slice(0, lastSentenceEnd + 1).trim();
	}

	const hardLimit = Math.max(0, maxLength - 3);
	const slice = normalized.slice(0, hardLimit);
	const boundary = Math.max(
		slice.lastIndexOf(". "),
		slice.lastIndexOf("; "),
		slice.lastIndexOf(": "),
		slice.lastIndexOf(", "),
		slice.lastIndexOf(" "),
	);
	const safeCutoff = boundary >= Math.floor(hardLimit * 0.6) ? boundary : hardLimit;
	const trimmed = slice
		.slice(0, safeCutoff)
		.replace(/[,:;!?-]+$/g, "")
		.trimEnd();

	return `${trimmed}...`;
}

function isWeakDescriptionStart(text: string) {
	return WEAK_DESCRIPTION_STARTS.some((pattern) => pattern.test(text));
}

function scoreDescriptionCandidate(
	candidate: DescriptionCandidate,
	maxLength: number,
	titleKeywords: string[],
) {
	const length = candidate.text.length;
	let score = 120 - candidate.index * 18;
	score += Math.max(0, 70 - Math.abs(length - DESCRIPTION_TARGET_LENGTH));
	score +=
		candidate.sentenceCount === 2
			? 18
			: candidate.sentenceCount === 1
				? 8
				: -10;
	score += /[.!?]$/.test(candidate.text) ? 8 : -4;
	score += length >= 110 ? 12 : Math.max(-18, length - 110);
	score -= isWeakDescriptionStart(candidate.text) ? 24 : 0;
	score -= /(?:\bimage\b|\bscreenshot\b|\bplaceholder\b|\btodo\b)/i.test(
		candidate.text,
	)
		? 20
		: 0;
	score -= looksLikeCode(candidate.text) ? 40 : 0;
	score -= /[{}[\]|<>]/.test(candidate.text) ? 12 : 0;
	score -= length > maxLength ? 10 : 0;
	score -= candidate.text.endsWith("...") ? 18 : 0;
	score += titleKeywords.reduce(
		(total, keyword) =>
			total + (new RegExp(`\\b${keyword}\\b`, "i").test(candidate.text) ? 12 : 0),
		0,
	);

	return score;
}

function buildDescriptionCandidates(content: string, maxLength: number) {
	const blocks = normalizeDescriptionInput(content)
		.split(/\n{2,}/)
		.map((block) => cleanDescriptionBlock(block))
		.filter(Boolean)
		.slice(0, MAX_DESCRIPTION_BLOCKS);

	const candidates: DescriptionCandidate[] = [];

	blocks.forEach((block, index) => {
		const sentences = splitIntoSentences(block);
		if (!sentences.length) {
			return;
		}

		for (let size = 1; size <= Math.min(3, sentences.length); size += 1) {
			const joined = sentences.slice(0, size).join(" ");
			if (joined.length > maxLength) {
				break;
			}
			if (joined.length < MIN_DESCRIPTION_CANDIDATE_LENGTH) {
				continue;
			}

			candidates.push({
				text: normalizeDescriptionText(joined),
				index,
				sentenceCount: size,
			});
		}

		if (block.length >= MIN_DESCRIPTION_CANDIDATE_LENGTH) {
			candidates.push({
				text: finalizeDescription(block, maxLength),
				index,
				sentenceCount: sentences.length,
			});
		}
	});

	return candidates;
}

export function generatePostDescription(
	content: string,
	maxLength = DEFAULT_POST_DESCRIPTION_MAX_LENGTH,
) {
	const plainText = stripMarkdown(content);
	if (!plainText) {
		return "";
	}

	const candidates = buildDescriptionCandidates(content, maxLength);
	const titleKeywords = extractTitleKeywords(content);
	const bestCandidate = candidates
		.map((candidate) => ({
			candidate,
			score: scoreDescriptionCandidate(candidate, maxLength, titleKeywords),
		}))
		.sort((left, right) => right.score - left.score)[0]?.candidate;

	if (bestCandidate?.text) {
		return bestCandidate.text;
	}

	return finalizeDescription(plainText, maxLength);
}

export function buildPostDescription(
	content: string,
	description?: string | null,
) {
	const trimmedDescription = description?.trim();
	if (trimmedDescription) {
		return trimmedDescription;
	}

	return generatePostDescription(content);
}

export function getReadingTimeMinutes(markdown: string) {
	const wordCount = stripMarkdown(markdown).split(" ").filter(Boolean).length;

	return Math.max(1, Math.round(wordCount / 220));
}
