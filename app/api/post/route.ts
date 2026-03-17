import { NextResponse } from "next/server";
import slugify from "slugify";
import prisma from "@/database/prisma";
import { auth } from "@/lib/auth";
import { createPostSchema } from "@/lib/validation/content";

export async function POST(req: Request) {
	const session = await auth();
	if (!session?.user?.id) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const payload = await req.json().catch(() => null);
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

	const slug = slugify(parsed.data.title, { lower: true, strict: true });
	const post = await prisma.post.create({
		data: {
			title: parsed.data.title,
			slug,
			content: parsed.data.content,
			authorId: session.user.id,
			mainTag: parsed.data.mainTag,
			tags: parsed.data.tags,
			description: parsed.data.description || null,
			status: parsed.data.status,
		},
	});

	return NextResponse.json({ id: post.id, slug: post.slug });
}
