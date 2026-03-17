import { type NextRequest, NextResponse } from "next/server";
import prisma from "@/database/prisma";
import { auth } from "@/lib/auth";
import {
	ensureUniquePostSlug,
	getPostBySlugWithAuthor,
} from "@/lib/posts";
import {
	buildPostDescription,
	canEditPost,
	canViewPost,
	canWriteRole,
} from "@/lib/post-shared";
import { createPostSchema } from "@/lib/validation/content";

export async function GET(
	_request: NextRequest,
	context: RouteContext<"/api/post/[slug]">,
): Promise<NextResponse> {
	const { slug } = await context.params;
	const session = await auth();

	try {
		const post = await getPostBySlugWithAuthor(slug);
		if (!post || !canViewPost(post, session?.user)) {
			return NextResponse.json({ error: "Post not found" }, { status: 404 });
		}

		return NextResponse.json({
			id: post.id,
			title: post.title,
			slug: post.slug,
			content: post.content,
			thumbnail: post.thumbnail,
			thumbnailAlt: post.thumbnailAlt,
			mainTag: post.mainTag,
			tags: post.tags,
			description: post.description,
			status: post.status,
			postedAt: post.postedAt,
			lastEditedAt: post.lastEditedAt,
			author: {
				id: post.author.id,
				name:
					post.author.name ||
					post.author.username ||
					post.author.slug ||
					post.author.id,
				slug: post.author.slug || post.author.id,
			},
		});
	} catch {
		return NextResponse.json(
			{ error: { message: "Unable to connect" } },
			{ status: 500 },
		);
	}
}

export async function PATCH(
	request: NextRequest,
	context: RouteContext<"/api/post/[slug]">,
): Promise<NextResponse> {
	const session = await auth();
	if (!session?.user?.id) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}
	if (!canWriteRole(session.user.role)) {
		return NextResponse.json(
			{ error: "You do not have permission to edit posts." },
			{ status: 403 },
		);
	}

	const { slug } = await context.params;
	const existing = await getPostBySlugWithAuthor(slug);
	if (!existing) {
		return NextResponse.json({ error: "Post not found" }, { status: 404 });
	}
	if (!canEditPost(existing, session.user)) {
		return NextResponse.json(
			{ error: "You do not have permission to edit this post." },
			{ status: 403 },
		);
	}

	const payload = await request.json().catch(() => null);
	const parsed = createPostSchema.safeParse(payload);
	if (!parsed.success) {
		return NextResponse.json(
			{
				error: "Please correct the post fields.",
				fields: parsed.error.flatten().fieldErrors,
			},
			{ status: 400 },
		);
	}

	try {
		const nextSlug = await ensureUniquePostSlug(
			parsed.data.slug || parsed.data.title,
			existing.id,
		);
		const nextStatus = parsed.data.status;
		const shouldRefreshPostedAt =
			existing.status !== "published" && nextStatus === "published";

		const post = await prisma.post.update({
			where: { id: existing.id },
			data: {
				title: parsed.data.title.trim(),
				slug: nextSlug,
				content: parsed.data.content.trim(),
				thumbnail: parsed.data.thumbnail.trim(),
				thumbnailAlt: parsed.data.thumbnailAlt.trim() || parsed.data.title.trim(),
				mainTag: parsed.data.mainTag.trim(),
				tags: parsed.data.tags.map((tag) => tag.trim()),
				description: buildPostDescription(
					parsed.data.content,
					parsed.data.description,
				),
				status: nextStatus,
				edited: true,
				editedById: session.user.id,
				lastEditedAt: new Date(),
				postedAt: shouldRefreshPostedAt ? new Date() : existing.postedAt,
			},
		});

		return NextResponse.json({
			id: post.id,
			slug: post.slug,
			status: post.status,
		});
	} catch {
		return NextResponse.json(
			{ error: "Unable to update post right now." },
			{ status: 500 },
		);
	}
}
