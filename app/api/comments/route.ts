import { NextResponse } from "next/server";
import prisma from "@/database/prisma";
import { auth } from "@/lib/auth";
import { getCommentsForPost, mapCommentRecord } from "@/lib/comments";
import { createCommentSchema } from "@/lib/validation/content";

export async function GET(request: Request) {
	const { searchParams } = new URL(request.url);
	const postId = searchParams.get("postId")?.trim();

	if (!postId) {
		return NextResponse.json({ error: "postId is required." }, { status: 400 });
	}

	const post = await prisma.post.findUnique({
		where: { id: postId },
		select: {
			id: true,
			status: true,
		},
	});

	if (!post || post.status !== "published") {
		return NextResponse.json({ error: "Post not found" }, { status: 404 });
	}

	return NextResponse.json(await getCommentsForPost(postId));
}

export async function POST(req: Request) {
	const session = await auth();
	if (!session?.user?.id) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const payload = await req.json().catch(() => null);
	const parsed = createCommentSchema.safeParse(payload);
	if (!parsed.success) {
		return NextResponse.json(
			{
				error: "Please correct the comment fields.",
				fields: parsed.error.flatten().fieldErrors,
			},
			{ status: 400 },
		);
	}

	const post = await prisma.post.findUnique({
		where: { id: parsed.data.postId },
		select: {
			id: true,
			status: true,
		},
	});

	if (!post || post.status !== "published") {
		return NextResponse.json({ error: "Post not found" }, { status: 404 });
	}

	const comment = await prisma.comment.create({
		data: {
			text: parsed.data.text,
			postId: parsed.data.postId,
			authorId: session.user.id,
		},
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

	return NextResponse.json(mapCommentRecord(comment), { status: 201 });
}
