import slugify from "slugify";
import type { SocialLinks } from "@/lib/social-links";

const GLOBAL_POST_ROLES = new Set(["admin", "owner"]);
const WRITER_ROLES = new Set(["volunteer", "writer", "admin", "owner"]);

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

export function buildPostDescription(
	content: string,
	description?: string | null,
) {
	const trimmedDescription = description?.trim();
	if (trimmedDescription) {
		return trimmedDescription;
	}

	const excerpt = stripMarkdown(content);
	if (excerpt.length <= 180) {
		return excerpt;
	}

	return `${excerpt.slice(0, 177).trimEnd()}...`;
}

export function getReadingTimeMinutes(markdown: string) {
	const wordCount = stripMarkdown(markdown).split(" ").filter(Boolean).length;

	return Math.max(1, Math.round(wordCount / 220));
}
