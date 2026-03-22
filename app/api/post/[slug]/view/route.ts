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

	if (!session?.user?.id) {
		const updatedPost = await prisma.post.update({
			where: { id: post.id },
			data: {
				views: {
					increment: 1,
				},
			},
			select: {
				views: true,
			},
		});

		return NextResponse.json({
			tracked: true,
			views: updatedPost.views,
		});
	}

	const existingView = await prisma.userView.findUnique({
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

	if (existingView) {
		return NextResponse.json({
			tracked: false,
		});
	}

	const [, updatedPost] = await prisma.$transaction([
		prisma.userView.create({
			data: {
				userId: session.user.id,
				postId: post.id,
			},
		}),
		prisma.post.update({
			where: { id: post.id },
			data: {
				views: {
					increment: 1,
				},
			},
			select: {
				views: true,
			},
		}),
	]);

	return NextResponse.json({
		tracked: true,
		views: updatedPost.views,
	});
}
