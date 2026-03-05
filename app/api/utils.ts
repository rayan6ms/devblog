import prisma from "@/database/prisma";
import type { Prisma } from "@/generated/prisma";
import type { IComment, IFeedback, IPost, IProgress, IUser } from "./types";

interface TagCount {
	[key: string]: number;
}

export type PostWithAuthor = Prisma.PostGetPayload<{
	include: { author: true };
}>;
export type CommentWithAuthor = Prisma.CommentGetPayload<{
	include: { author: true };
}>;

export async function getPostBySlug(
	slug: string,
): Promise<PostWithAuthor | null> {
	return prisma.post.findUnique({
		where: { slug },
		include: { author: true },
	});
}

export async function getUserBySlug(slug: string) {
	return prisma.user.findUnique({ where: { slug } });
}

export async function getCommentsByPostSlug(
	slug: string,
): Promise<CommentWithAuthor[] | null> {
	const post = await prisma.post.findUnique({
		where: { slug },
		select: { id: true },
	});
	if (!post) return null;
	return prisma.comment.findMany({
		where: { postId: post.id },
		include: { author: true },
	});
}

export async function getProgress(userId: string, postId: string) {
	return prisma.progress.findUnique({
		where: {
			userId_postId: {
				userId,
				postId,
			},
		},
	});
}

export async function getTrendingPosts() {
	const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
	return prisma.post.findMany({
		where: { createdAt: { gte: oneWeekAgo } },
		orderBy: [{ views: "desc" }, { bookmarks: "desc" }],
		take: 10,
	});
}

export async function getRecentPosts() {
	return prisma.post.findMany({
		orderBy: { createdAt: "desc" },
		take: 10,
	});
}

export async function getRecommendationsBasedOnFeedback(userId: string) {
	const userFeedback = await prisma.feedback.findMany({ where: { userId } });
	const wantMorePosts = userFeedback
		.filter((feedback) => feedback.score === 1)
		.map((feedback) => feedback.postId);
	const wantLessPosts = userFeedback
		.filter((feedback) => feedback.score === -1)
		.map((feedback) => feedback.postId);

	if (wantMorePosts.length === 0) return [];

	const wantMoreAuthorsAndTags = await prisma.post.findMany({
		where: { id: { in: wantMorePosts } },
		select: { authorId: true, tags: true },
	});

	const authorIds = Array.from(
		new Set(wantMoreAuthorsAndTags.map((item) => item.authorId)),
	);
	const tags = Array.from(
		new Set(wantMoreAuthorsAndTags.flatMap((item) => item.tags)),
	);

	if (authorIds.length === 0 && tags.length === 0) return [];

	return prisma.post.findMany({
		where: {
			id: { notIn: [...wantLessPosts, ...wantMorePosts] },
			OR: [
				authorIds.length ? { authorId: { in: authorIds } } : undefined,
				tags.length ? { tags: { hasSome: tags } } : undefined,
			].filter(Boolean) as Prisma.PostWhereInput[],
		},
		take: 10,
	});
}

export async function getUserFavoriteTags(userId: string): Promise<string[]> {
	const user = await prisma.user.findUnique({
		where: { id: userId },
		include: {
			bookmarks: { include: { post: true } },
			views: { include: { post: true } },
		},
	});

	if (!user) return [];

	const allPosts = [
		...user.bookmarks.map((bookmark) => bookmark.post),
		...user.views.map((view) => view.post),
	];
	const allTags = allPosts.flatMap((post) => [...post.tags, post.mainTag]);

	const tagCounts: TagCount = allTags.reduce((acc: TagCount, tag: string) => {
		acc[tag] = (acc[tag] || 0) + 1;
		return acc;
	}, {});

	return Object.keys(tagCounts)
		.sort((a, b) => tagCounts[b] - tagCounts[a])
		.slice(0, 5);
}

export async function getRecommendationsFromSimilarUsers(userId: string) {
	const similarUserIds = await findSimilarUsers(userId);
	const viewedPostsIds = await getPostsViewedByUser(userId);

	if (similarUserIds.length === 0) return [];

	return prisma.post.findMany({
		where: {
			id: { notIn: viewedPostsIds },
			viewedBy: { some: { userId: { in: similarUserIds } } },
		},
		take: 10,
	});
}

async function findSimilarUsers(userId: string): Promise<string[]> {
	const user = await prisma.user.findUnique({
		where: { id: userId },
		include: { bookmarks: true, views: true },
	});

	if (!user) return [];

	const postIds = Array.from(
		new Set([
			...user.bookmarks.map((bookmark) => bookmark.postId),
			...user.views.map((view) => view.postId),
		]),
	);

	if (postIds.length === 0) return [];

	const usersWithCommonPosts = await prisma.user.findMany({
		where: {
			id: { not: userId },
			OR: [
				{ bookmarks: { some: { postId: { in: postIds } } } },
				{ views: { some: { postId: { in: postIds } } } },
			],
		},
		select: { id: true },
	});

	return usersWithCommonPosts.map((user) => user.id);
}

async function getPostsViewedByUser(userId: string): Promise<string[]> {
	const user = await prisma.user.findUnique({
		where: { id: userId },
		include: { views: true },
	});

	if (!user) return [];

	return user.views.map((view) => view.postId);
}

export async function getRecommendationsFromTags(userId: string) {
	const favoriteTags = await getUserFavoriteTags(userId);
	const viewedPostsIds = await getPostsViewedByUser(userId);

	if (favoriteTags.length === 0) return [];

	return prisma.post.findMany({
		where: {
			id: { notIn: viewedPostsIds },
			OR: [
				{ tags: { hasSome: favoriteTags } },
				{ mainTag: { in: favoriteTags } },
			],
		},
		take: 10,
	});
}

export async function createFeedback(data: IFeedback): Promise<IFeedback> {
	return prisma.feedback.create({
		data: {
			userId: data.userId,
			postId: data.postId,
			score: data.score,
		},
	});
}

export async function createPost(data: IPost): Promise<IPost> {
	return prisma.post.create({
		data: {
			title: data.title,
			slug: data.slug,
			content: data.content,
			authorId: data.author,
			mainTag: data.mainTag,
			tags: data.tags,
			description: data.description,
			views: data.views,
			bookmarks: data.bookmarks,
			edited: data.edited,
			editedById: data.editedBy,
			postedAt: data.postedAt,
			lastEditedAt: data.lastEditedAt,
			status: data.status,
		},
	});
}

export async function createUser(data: IUser): Promise<IUser> {
	return prisma.user.create({
		data: {
			username: data.username,
			slug: data.slug,
			profilePic: data.profilePic,
			bio: data.bio,
			socialLinks: data.socialLinks,
			role: data.role,
		},
	});
}

export async function createComment(data: IComment): Promise<IComment> {
	return prisma.comment.create({
		data: {
			text: data.text,
			authorId: data.author,
			postId: data.post,
			postedAt: data.postedAt,
			upvotes: data.upvotes,
			downvotes: data.downvotes,
		},
	});
}

export async function createProgress(data: IProgress): Promise<IProgress> {
	return prisma.progress.create({
		data: {
			userId: data.user,
			postId: data.post,
			percentageRead: data.percentageRead,
		},
	});
}
