import "server-only";

import prisma from "@/database/prisma";
import { resolveProfilePicture } from "@/lib/user-profile";

type CommentRecord = {
	id: string;
	text: string;
	postedAt: Date;
	updatedAt: Date;
	upvotes: number;
	downvotes: number;
	author: {
		id: string;
		name: string | null;
		email: string | null;
		image: string | null;
		profilePic: string | null;
		username: string | null;
		slug: string | null;
	};
};

export type PostComment = {
	id: string;
	text: string;
	postedAt: string;
	updatedAt: string;
	edited: boolean;
	score: number;
	author: {
		id: string;
		name: string;
		slug: string;
		profilePicture: string;
	};
};

function resolveCommentAuthorName(author: CommentRecord["author"]) {
	return (
		author.name?.trim() ||
		author.username?.trim() ||
		author.slug?.trim() ||
		author.email?.trim() ||
		author.id
	);
}

export function mapCommentRecord(comment: CommentRecord): PostComment {
	return {
		id: comment.id,
		text: comment.text,
		postedAt: comment.postedAt.toISOString(),
		updatedAt: comment.updatedAt.toISOString(),
		edited: comment.updatedAt.getTime() !== comment.postedAt.getTime(),
		score: comment.upvotes - comment.downvotes,
		author: {
			id: comment.author.id,
			name: resolveCommentAuthorName(comment.author),
			slug: comment.author.slug || comment.author.id,
			profilePicture: resolveProfilePicture(comment.author),
		},
	};
}

export async function getCommentsForPost(postId: string) {
	const comments = await prisma.comment.findMany({
		where: {
			postId,
		},
		orderBy: [{ postedAt: "desc" }, { createdAt: "desc" }],
		include: {
			author: {
				select: {
					id: true,
					name: true,
					email: true,
					image: true,
					profilePic: true,
					username: true,
					slug: true,
				},
			},
		},
	});

	return comments.map(mapCommentRecord);
}
