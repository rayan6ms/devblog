import { NextResponse } from "next/server";
import prisma from "@/database/prisma";
import { auth } from "@/lib/auth";

export async function POST(
	_request: Request,
	context: {
		params: Promise<{
			slug: string;
		}>;
	},
) {
	const session = await auth();
	if (!session?.user?.id) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const { slug } = await context.params;
	const post = await prisma.post.findUnique({
		where: { slug },
		select: {
			id: true,
			status: true,
		},
	});

	if (!post || post.status !== "published") {
		return NextResponse.json({ error: "Post not found" }, { status: 404 });
	}

	const existingBookmark = await prisma.userBookmark.findUnique({
		where: {
			userId_postId: {
				userId: session.user.id,
				postId: post.id,
			},
		},
		select: {
			postId: true,
		},
	});

	if (existingBookmark) {
		const [, updatedPost] = await prisma.$transaction([
			prisma.userBookmark.delete({
				where: {
					userId_postId: {
						userId: session.user.id,
						postId: post.id,
					},
				},
			}),
			prisma.post.update({
				where: { id: post.id },
				data: {
					bookmarks: {
						decrement: 1,
					},
				},
				select: {
					bookmarks: true,
				},
			}),
		]);

		return NextResponse.json({
			bookmarked: false,
			bookmarks: Math.max(updatedPost.bookmarks, 0),
		});
	}

	const [, updatedPost] = await prisma.$transaction([
		prisma.userBookmark.create({
			data: {
				userId: session.user.id,
				postId: post.id,
			},
		}),
		prisma.post.update({
			where: { id: post.id },
			data: {
				bookmarks: {
					increment: 1,
				},
			},
			select: {
				bookmarks: true,
			},
		}),
	]);

	return NextResponse.json({
		bookmarked: true,
		bookmarks: updatedPost.bookmarks,
	});
}
