import { NextResponse } from "next/server";
import prisma from "@/database/prisma";
import { auth } from "@/lib/auth";
import { buildPostDescription, canWriteRole } from "@/lib/post-shared";
import {
	ensureUniquePostSlug,
	getPostCatalog,
	getRecommendedPostCatalog,
} from "@/lib/posts";
import { createPostSchema } from "@/lib/validation/content";

function parsePositiveInt(
	value: string | null,
	options?: { fallback?: number; max?: number },
) {
	if (!value) {
		return options?.fallback;
	}

	const parsed = Number.parseInt(value, 10);
	if (!Number.isFinite(parsed) || parsed < 1) {
		return options?.fallback;
	}

	return options?.max ? Math.min(parsed, options.max) : parsed;
}

export async function GET(request: Request) {
	const session = await auth();
	const { searchParams } = new URL(request.url);
	const sort = searchParams.get("sort");
	const query = searchParams.get("q")?.trim() || undefined;
	const page = parsePositiveInt(searchParams.get("page"), { fallback: 1 });
	const limit = parsePositiveInt(searchParams.get("limit"), { max: 100 });
	const tags = (searchParams.get("tags") || "")
		.split(",")
		.map((tag) => tag.trim())
		.filter(Boolean);

	try {
		if (sort === "recommended") {
			const recommendations = await getRecommendedPostCatalog({
				userId: session?.user?.id ?? null,
				limit,
			});

			return NextResponse.json(recommendations);
		}

		const posts = await getPostCatalog({
			page,
			limit,
			query,
			tagSlugs: tags,
			sort: sort === "trending" ? "trending" : "recent",
			userId: session?.user?.id ?? null,
		});

		return NextResponse.json(posts);
	} catch {
		return NextResponse.json(
			{ error: "Unable to load posts right now." },
			{ status: 500 },
		);
	}
}

export async function POST(req: Request) {
	const session = await auth();
	if (!session?.user?.id) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}
	if (!canWriteRole(session.user.role)) {
		return NextResponse.json(
			{ error: "You do not have permission to create posts." },
			{ status: 403 },
		);
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

	try {
		const slug = await ensureUniquePostSlug(
			parsed.data.slug || parsed.data.title,
		);
		const post = await prisma.post.create({
			data: {
				title: parsed.data.title.trim(),
				slug,
				content: parsed.data.content.trim(),
				thumbnail: parsed.data.thumbnail.trim(),
				thumbnailAlt:
					parsed.data.thumbnailAlt.trim() || parsed.data.title.trim(),
				authorId: session.user.id,
				mainTag: parsed.data.mainTag.trim(),
				tags: parsed.data.tags.map((tag) => tag.trim()),
				description: buildPostDescription(
					parsed.data.content,
					parsed.data.description,
				),
				status: parsed.data.status,
				postedAt: parsed.data.status === "published" ? new Date() : undefined,
			},
		});

		return NextResponse.json({
			id: post.id,
			slug: post.slug,
			status: post.status,
		});
	} catch {
		return NextResponse.json(
			{ error: "Unable to create post right now." },
			{ status: 500 },
		);
	}
}
