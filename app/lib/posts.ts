import "server-only";

import type { Prisma } from "@prisma/client";
import { cache } from "react";
import prisma from "@/database/prisma";
import { DEFAULT_LOCALE, type Locale, resolveLocale } from "@/lib/i18n";
import {
	FALLBACK_POST_IMAGE,
	getPostSlug,
	type PostCatalogResponse,
	type PostListItem,
	type PostTagCatalogResponse,
	type PostTagOption,
} from "@/lib/post-catalog";
import {
	buildPostDescription,
	type PostPageData,
	slugifyPostValue,
} from "@/lib/post-shared";
import {
	clampReadingProgress,
	shouldPersistReadingProgress,
} from "@/lib/reading-progress";
import { emptySocialLinks, normalizeSocialLinks } from "@/lib/social-links";

export type PostWithAuthor = Prisma.PostGetPayload<{
	include: { author: true };
}>;

export type PostWithAuthorAndTranslations = Prisma.PostGetPayload<{
	include: { author: true; translations: true };
}>;

type RecommendationSignals = {
	authorWeights: Map<string, number>;
	tagWeights: Map<string, number>;
	excludedIds: Set<string>;
	hasSignals: boolean;
};

function normalizePostLocale(locale?: string | null): Locale {
	return resolveLocale(locale) || DEFAULT_LOCALE;
}

function getPostTranslations(
	post: PostWithAuthor | PostWithAuthorAndTranslations,
) {
	return "translations" in post ? post.translations : [];
}

function getLocalizedPostSnapshot(
	post: PostWithAuthor | PostWithAuthorAndTranslations,
	locale?: Locale | null,
) {
	const originalLocale = normalizePostLocale(post.locale);
	const translation =
		locale && locale !== originalLocale
			? getPostTranslations(post).find(
					(entry) => normalizePostLocale(entry.locale) === locale,
				)
			: null;
	const content = translation?.content?.trim() || post.content;
	const title = translation?.title?.trim() || post.title;

	return {
		title,
		content,
		description: translation
			? buildPostDescription(content, translation.description)
			: buildPostDescription(post.content, post.description),
		thumbnailAlt:
			translation?.thumbnailAlt?.trim() || post.thumbnailAlt?.trim() || title,
		locale: translation
			? normalizePostLocale(translation.locale)
			: originalLocale,
		originalLocale,
		isTranslated: Boolean(translation),
	};
}

export async function ensureUniquePostSlug(
	value: string,
	excludeId?: string,
): Promise<string> {
	const base = slugifyPostValue(value) || "post";
	let candidate = base;
	let suffix = 2;

	for (;;) {
		const existing = await prisma.post.findFirst({
			where: {
				slug: candidate,
				...(excludeId ? { id: { not: excludeId } } : {}),
			},
			select: { id: true },
		});

		if (!existing) {
			return candidate;
		}

		candidate = `${base}-${suffix}`;
		suffix += 1;
	}
}

export function mapPostForPage(
	post: PostWithAuthor | PostWithAuthorAndTranslations,
	locale?: Locale | null,
): PostPageData {
	const authorName = resolveAuthorName(post.author);
	const localized = getLocalizedPostSnapshot(post, locale);

	return {
		id: post.id,
		title: localized.title,
		slug: post.slug,
		content: localized.content,
		locale: localized.locale,
		originalLocale: localized.originalLocale,
		isTranslated: localized.isTranslated,
		thumbnail: post.thumbnail,
		thumbnailAlt: localized.thumbnailAlt,
		mainTag: post.mainTag,
		tags: post.tags,
		description: localized.description,
		views: post.views,
		bookmarks: post.bookmarks,
		edited: post.edited,
		postedAt: post.postedAt.toISOString(),
		lastEditedAt: post.lastEditedAt?.toISOString() || null,
		status: post.status,
		authorId: post.authorId,
		author: {
			id: post.author.id,
			name: authorName,
			slug: post.author.slug || post.author.id,
			profilePicture: post.author.profilePic || post.author.image || "",
			socialLinks: normalizeSocialLinks(post.author.socialLinks),
		},
	};
}

export async function getPostEditorMainTags() {
	const rows = await prisma.post.findMany({
		select: { mainTag: true },
		distinct: ["mainTag"],
		orderBy: { mainTag: "asc" },
	});

	return rows.map((row) => row.mainTag.trim()).filter(Boolean);
}

export async function getPostBySlugWithAuthor(slug: string) {
	return prisma.post.findUnique({
		where: { slug },
		include: { author: true },
	});
}

export async function getPostBySlugWithTranslations(slug: string) {
	return prisma.post.findUnique({
		where: { slug },
		include: {
			author: true,
			translations: {
				orderBy: { locale: "asc" },
			},
		},
	});
}

export async function getLocalizedPostBySlugWithAuthor(
	slug: string,
	locale?: Locale | null,
) {
	return prisma.post.findUnique({
		where: { slug },
		include: {
			author: true,
			translations: locale
				? {
						where: { locale },
						take: 1,
					}
				: false,
		},
	});
}

export async function getRelatedPosts(
	post: PostWithAuthor,
	locale?: Locale | null,
	limit = 3,
) {
	const related = await prisma.post.findMany({
		where: {
			id: { not: post.id },
			status: "published",
			OR: [{ mainTag: post.mainTag }, { tags: { hasSome: post.tags } }],
		},
		include: {
			author: true,
			translations: locale
				? {
						where: { locale },
						take: 1,
					}
				: false,
		},
		orderBy: [{ views: "desc" }, { postedAt: "desc" }],
		take: limit,
	});

	return related.map((entry) => mapPostForPage(entry, locale));
}

export function emptyAuthorSocialLinks() {
	return emptySocialLinks();
}

function resolveAuthorName(author: PostWithAuthor["author"]) {
	return (
		author.name?.trim() ||
		author.username?.trim() ||
		author.slug?.trim() ||
		author.id
	);
}

function mapPostForList(
	post: PostWithAuthor | PostWithAuthorAndTranslations,
	locale?: Locale | null,
): PostListItem {
	const localized = getLocalizedPostSnapshot(post, locale);

	return {
		id: post.id,
		slug: post.slug,
		image: post.thumbnail?.trim() || FALLBACK_POST_IMAGE,
		imageAlt: localized.thumbnailAlt,
		locale: localized.locale,
		originalLocale: localized.originalLocale,
		isTranslated: localized.isTranslated,
		mainTag: post.mainTag,
		tags: post.tags,
		title: localized.title,
		author: resolveAuthorName(post.author),
		authorSlug: post.author.slug?.trim() || "",
		date: post.postedAt.toISOString(),
		views: post.views,
		bookmarks: post.bookmarks,
		hasStartedReading: false,
		percentRead: 0,
		description: localized.description,
	};
}

async function hydratePostReadingProgress(
	posts: PostListItem[],
	userId?: string | null,
) {
	if (!userId || posts.length === 0) {
		return posts;
	}

	const progressRows = await prisma.progress.findMany({
		where: {
			userId,
			postId: {
				in: posts.map((post) => post.id),
			},
		},
		select: {
			postId: true,
			percentageRead: true,
		},
	});
	const progressByPostId = new Map(
		progressRows
			.filter((row) => shouldPersistReadingProgress(row.percentageRead))
			.map((row) => [row.postId, clampReadingProgress(row.percentageRead)]),
	);

	return posts.map((post) => {
		const percentRead = progressByPostId.get(post.id);
		if (typeof percentRead !== "number") {
			return post;
		}

		return {
			...post,
			hasStartedReading: true,
			percentRead,
		};
	});
}

const getPublishedPostsWithAuthor = cache(
	async function getPublishedPostsWithAuthor(
		locale?: Locale | null,
	): Promise<Array<PostWithAuthor | PostWithAuthorAndTranslations>> {
		return prisma.post.findMany({
			where: { status: "published" },
			include: {
				author: true,
				translations: locale
					? {
							where: { locale },
							take: 1,
						}
					: false,
			},
			orderBy: [{ postedAt: "desc" }, { createdAt: "desc" }],
		});
	},
);

export const getPublishedPostList = cache(
	async (locale?: Locale | null): Promise<PostListItem[]> => {
		const posts = await getPublishedPostsWithAuthor(locale);
		return posts.map((post) => mapPostForList(post, locale));
	},
);

function sortRecentPosts(posts: PostListItem[]) {
	return [...posts].sort((a, b) => b.date.localeCompare(a.date));
}

function sortTrendingPosts(posts: PostListItem[], limit?: number) {
	const sorted = [...posts].sort(
		(a, b) =>
			b.views - a.views ||
			b.bookmarks - a.bookmarks ||
			b.date.localeCompare(a.date),
	);
	const recentWindowStart = Date.now() - 30 * 24 * 60 * 60 * 1000;
	const recentPool = sorted.filter(
		(post) => Date.parse(post.date) >= recentWindowStart,
	);

	if (recentPool.length === 0) {
		return limit ? sorted.slice(0, limit) : sorted;
	}
	if (!limit) {
		return recentPool;
	}
	if (recentPool.length >= limit) {
		return recentPool.slice(0, limit);
	}

	const usedIds = new Set(recentPool.map((post) => post.id));
	const topUp = sorted.filter((post) => !usedIds.has(post.id));
	return [...recentPool, ...topUp].slice(0, limit);
}

function sortFallbackRecommendedPosts(posts: PostListItem[], limit?: number) {
	const blended = mergeUniquePostLists(
		[
			sortTrendingPosts(posts, Math.max(limit ?? 10, 10)),
			sortRecentPosts(posts),
		],
		limit,
	);

	return limit ? blended.slice(0, limit) : blended;
}

function mergeUniquePostLists(lists: PostListItem[][], limit?: number) {
	const seen = new Set<string>();
	const merged: PostListItem[] = [];

	for (const list of lists) {
		for (const post of list) {
			if (seen.has(post.id)) {
				continue;
			}

			seen.add(post.id);
			merged.push(post);

			if (typeof limit === "number" && merged.length >= limit) {
				return merged;
			}
		}
	}

	return merged;
}

function matchesQuery(post: PostListItem, query: string) {
	const normalizedQuery = query.toLowerCase();

	return (
		post.title.toLowerCase().includes(normalizedQuery) ||
		post.author.toLowerCase().includes(normalizedQuery) ||
		post.mainTag.toLowerCase().includes(normalizedQuery) ||
		post.tags.some((tag) => tag.toLowerCase().includes(normalizedQuery)) ||
		post.description.toLowerCase().includes(normalizedQuery)
	);
}

function matchesTagSlugs(post: PostListItem, tagSlugs: string[]) {
	if (tagSlugs.length === 0) {
		return true;
	}

	const normalizedMainTag = getPostSlug(post.mainTag);
	const normalizedTags = post.tags.map((tag) => getPostSlug(tag));

	return tagSlugs.some(
		(tagSlug) =>
			tagSlug === normalizedMainTag || normalizedTags.includes(tagSlug),
	);
}

function paginatePosts(posts: PostListItem[], page?: number, limit?: number) {
	if (!limit) {
		return posts;
	}

	const safePage = Math.max(1, page ?? 1);
	const start = (safePage - 1) * limit;
	return posts.slice(start, start + limit);
}

function buildTagOptions(
	tags: string[],
	counts: Map<string, number>,
): PostTagOption[] {
	return tags
		.map((tag) => ({
			name: tag,
			slug: getPostSlug(tag),
			count: counts.get(getPostSlug(tag)) ?? 0,
		}))
		.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export async function getPostCatalog(options?: {
	page?: number;
	limit?: number;
	query?: string;
	tagSlugs?: string[];
	sort?: "recent" | "trending";
	userId?: string | null;
	locale?: Locale | null;
}): Promise<PostCatalogResponse> {
	const posts = await getPublishedPostList(options?.locale);
	const query = options?.query?.trim();
	const tagSlugs = options?.tagSlugs ?? [];

	let filtered = posts;

	if (query) {
		filtered = filtered.filter((post) => matchesQuery(post, query));
	}
	if (tagSlugs.length > 0) {
		filtered = filtered.filter((post) => matchesTagSlugs(post, tagSlugs));
	}

	const sorted =
		options?.sort === "trending"
			? sortTrendingPosts(filtered)
			: sortRecentPosts(filtered);
	const hydrated = await hydratePostReadingProgress(
		paginatePosts(sorted, options?.page, options?.limit),
		options?.userId,
	);

	return {
		posts: hydrated,
		total: sorted.length,
	};
}

function addWeight(map: Map<string, number>, key: string, amount: number) {
	map.set(key, (map.get(key) ?? 0) + amount);
}

async function getRecommendationSignals(
	userId: string,
): Promise<RecommendationSignals> {
	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: {
			bookmarks: {
				select: {
					post: {
						select: {
							id: true,
							authorId: true,
							mainTag: true,
							tags: true,
						},
					},
				},
			},
			views: {
				select: {
					post: {
						select: {
							id: true,
							authorId: true,
							mainTag: true,
							tags: true,
						},
					},
				},
			},
			feedback: {
				select: {
					score: true,
					post: {
						select: {
							id: true,
							authorId: true,
							mainTag: true,
							tags: true,
						},
					},
				},
			},
		},
	});

	if (!user) {
		return {
			authorWeights: new Map(),
			tagWeights: new Map(),
			excludedIds: new Set(),
			hasSignals: false,
		};
	}

	const authorWeights = new Map<string, number>();
	const tagWeights = new Map<string, number>();
	const excludedIds = new Set<string>();
	let hasSignals = false;

	for (const bookmark of user.bookmarks) {
		excludedIds.add(bookmark.post.id);
		hasSignals = true;
		addWeight(authorWeights, bookmark.post.authorId, 5);
		addWeight(tagWeights, bookmark.post.mainTag, 4);
		for (const tag of bookmark.post.tags) {
			addWeight(tagWeights, tag, 3);
		}
	}

	for (const feedback of user.feedback) {
		if (feedback.score < 0) {
			excludedIds.add(feedback.post.id);
			continue;
		}

		excludedIds.add(feedback.post.id);
		hasSignals = true;
		const weight = Math.max(2, feedback.score + 1);
		addWeight(authorWeights, feedback.post.authorId, weight * 2);
		addWeight(tagWeights, feedback.post.mainTag, weight * 2);
		for (const tag of feedback.post.tags) {
			addWeight(tagWeights, tag, weight);
		}
	}

	for (const view of user.views) {
		excludedIds.add(view.post.id);
		hasSignals = true;
		addWeight(authorWeights, view.post.authorId, 1);
		addWeight(tagWeights, view.post.mainTag, 1);
		for (const tag of view.post.tags) {
			addWeight(tagWeights, tag, 0.5);
		}
	}

	return {
		authorWeights,
		tagWeights,
		excludedIds,
		hasSignals,
	};
}

function scoreRecommendedPost(
	post: PostWithAuthor | PostWithAuthorAndTranslations,
	signals: RecommendationSignals,
) {
	const ageInDays = Math.max(
		0,
		(Date.now() - post.postedAt.getTime()) / (1000 * 60 * 60 * 24),
	);
	const recencyScore = Math.max(0, 6 - ageInDays / 10);
	const popularityScore = post.views * 0.02 + post.bookmarks * 0.35;
	const authorScore = signals.authorWeights.get(post.authorId) ?? 0;
	const tagScore =
		(signals.tagWeights.get(post.mainTag) ?? 0) +
		post.tags.reduce((sum, tag) => sum + (signals.tagWeights.get(tag) ?? 0), 0);

	return tagScore + authorScore + popularityScore + recencyScore;
}

export async function getRecommendedPostCatalog(options?: {
	userId?: string | null;
	limit?: number;
	locale?: Locale | null;
}): Promise<PostCatalogResponse> {
	const limit = options?.limit ?? 10;
	const allPosts = await getPublishedPostsWithAuthor(options?.locale);
	const fallbackPosts = await hydratePostReadingProgress(
		sortFallbackRecommendedPosts(
			allPosts.map((post) => mapPostForList(post, options?.locale)),
			limit,
		),
		options?.userId,
	);

	if (!options?.userId) {
		return {
			posts: fallbackPosts,
			total: fallbackPosts.length,
		};
	}

	const signals = await getRecommendationSignals(options.userId);
	if (!signals.hasSignals) {
		return {
			posts: fallbackPosts,
			total: fallbackPosts.length,
		};
	}

	const scoredPosts = allPosts
		.filter((post) => !signals.excludedIds.has(post.id))
		.map((post) => ({
			post,
			score: scoreRecommendedPost(post, signals),
		}))
		.filter((entry) => entry.score > 0)
		.sort(
			(a, b) =>
				b.score - a.score ||
				b.post.views - a.post.views ||
				b.post.postedAt.getTime() - a.post.postedAt.getTime(),
		)
		.map((entry) => mapPostForList(entry.post, options?.locale));

	const posts = mergeUniquePostLists([scoredPosts, fallbackPosts], limit);
	const hydratedPosts = await hydratePostReadingProgress(
		posts,
		options?.userId,
	);

	return {
		posts: hydratedPosts,
		total: hydratedPosts.length,
	};
}

export async function getPostTagCatalog(
	locale?: Locale | null,
): Promise<PostTagCatalogResponse> {
	const posts = await getPublishedPostList(locale);
	const counts = new Map<string, number>();

	for (const post of posts) {
		const uniqueTags = new Set([post.mainTag, ...post.tags]);
		for (const tag of uniqueTags) {
			const slug = getPostSlug(tag);
			counts.set(slug, (counts.get(slug) ?? 0) + 1);
		}
	}

	const mainTags = Array.from(
		new Set(posts.map((post) => post.mainTag.trim()).filter(Boolean)),
	);
	const otherTags = Array.from(
		new Set(
			posts.flatMap((post) =>
				post.tags.map((tag) => tag.trim()).filter(Boolean),
			),
		),
	);

	return {
		mainTags: buildTagOptions(mainTags, counts),
		otherTags: buildTagOptions(otherTags, counts),
	};
}
