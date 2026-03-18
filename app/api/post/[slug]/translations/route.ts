import { type NextRequest, NextResponse } from "next/server";
import prisma from "@/database/prisma";
import { auth } from "@/lib/auth";
import { DEFAULT_LOCALE, resolveLocale } from "@/lib/i18n";
import { getMessages } from "@/lib/i18n";
import { canEditPost, canWriteRole } from "@/lib/post-shared";
import { getPostBySlugWithAuthor } from "@/lib/posts";
import { getRequestLocale } from "@/lib/request-locale";
import { buildPostTranslationSchema } from "@/lib/validation/content";

export async function GET(
	_request: NextRequest,
	context: { params: Promise<{ slug: string }> },
) {
	const { slug } = await context.params;
	const session = await auth();

	try {
		const post = await getPostBySlugWithAuthor(slug);
		if (!post || !canEditPost(post, session?.user)) {
			return NextResponse.json({ error: "Post not found" }, { status: 404 });
		}

		const translations = await prisma.postTranslation.findMany({
			where: { postId: post.id },
			orderBy: { locale: "asc" },
			select: {
				locale: true,
				title: true,
				description: true,
				thumbnailAlt: true,
				content: true,
				updatedAt: true,
			},
		});

		return NextResponse.json({ translations });
	} catch {
		return NextResponse.json(
			{ error: "Unable to load translations right now." },
			{ status: 500 },
		);
	}
}

export async function POST(
	request: NextRequest,
	context: { params: Promise<{ slug: string }> },
) {
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
	const post = await getPostBySlugWithAuthor(slug);
	if (!post) {
		return NextResponse.json({ error: "Post not found" }, { status: 404 });
	}
	if (!canEditPost(post, session.user)) {
		return NextResponse.json(
			{ error: "You do not have permission to edit this post." },
			{ status: 403 },
		);
	}

	const payload = await request.json().catch(() => null);
	const locale = resolveLocale(payload?.locale) || null;
	const requestLocale = await getRequestLocale();
	const requestMessages = getMessages(requestLocale);
	const schema = buildPostTranslationSchema(requestMessages.postValidation);
	if (!locale) {
		return NextResponse.json(
			{
				error: "Please correct the translation fields.",
				fields: { locale: [requestMessages.postValidation.localeRequired] },
			},
			{ status: 400 },
		);
	}

	if (locale === (resolveLocale(post.locale) || DEFAULT_LOCALE)) {
		return NextResponse.json(
			{
				error:
					"Translations must use a different language from the original post.",
			},
			{ status: 400 },
		);
	}

	const parsed = schema.safeParse(payload);
	if (!parsed.success) {
		return NextResponse.json(
			{
				error: "Please correct the translation fields.",
				fields: parsed.error.flatten().fieldErrors,
			},
			{ status: 400 },
		);
	}

	try {
		const translation = await prisma.postTranslation.upsert({
			where: {
				postId_locale: {
					postId: post.id,
					locale,
				},
			},
			create: {
				postId: post.id,
				locale,
				title: parsed.data.title.trim(),
				content: parsed.data.content.trim(),
				description: parsed.data.description.trim(),
				thumbnailAlt: parsed.data.thumbnailAlt.trim(),
			},
			update: {
				title: parsed.data.title.trim(),
				content: parsed.data.content.trim(),
				description: parsed.data.description.trim(),
				thumbnailAlt: parsed.data.thumbnailAlt.trim(),
			},
			select: {
				locale: true,
				updatedAt: true,
			},
		});

		return NextResponse.json({
			locale: translation.locale,
			updatedAt: translation.updatedAt,
		});
	} catch {
		return NextResponse.json(
			{ error: "Unable to save the translation right now." },
			{ status: 500 },
		);
	}
}
