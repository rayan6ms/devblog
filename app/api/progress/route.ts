import { type NextRequest, NextResponse } from "next/server";
import prisma from "@/database/prisma";
import { auth } from "@/lib/auth";
import {
	clampReadingProgress,
	shouldClearReadingProgress,
	shouldPersistReadingProgress,
} from "@/lib/reading-progress";
import { createProgressSchema } from "@/lib/validation/content";

export async function GET(request: NextRequest): Promise<NextResponse> {
	const session = await auth();
	if (!session?.user?.id) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const { searchParams } = new URL(request.url);
	const postId = searchParams.get("postId");

	if (!postId) {
		return NextResponse.json({ error: "postId is required." }, { status: 400 });
	}

	try {
		const progress = await prisma.progress.findUnique({
			where: {
				userId_postId: {
					userId: session.user.id,
					postId,
				},
			},
		});
		if (!progress || !shouldPersistReadingProgress(progress.percentageRead)) {
			return NextResponse.json(
				{ error: "Progress not found" },
				{ status: 404 },
			);
		}
		return NextResponse.json(progress);
	} catch (_error) {
		return NextResponse.json(
			{ error: { message: "Unable to connect" } },
			{ status: 500 },
		);
	}
}

export async function POST(req: NextRequest): Promise<NextResponse> {
	const session = await auth();
	if (!session?.user?.id) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const payload = await req.json().catch(() => null);
	const parsed = createProgressSchema.safeParse(payload);
	if (!parsed.success) {
		return NextResponse.json(
			{
				error: "Please correct the progress payload.",
				fields: parsed.error.flatten().fieldErrors,
			},
			{ status: 400 },
		);
	}

	const userId = session.user.id;
	const postId = parsed.data.post;
	const percentageRead = clampReadingProgress(parsed.data.percentageRead);

	try {
		if (shouldClearReadingProgress(percentageRead)) {
			await prisma.progress.deleteMany({
				where: {
					userId,
					postId,
				},
			});

			return NextResponse.json({
				cleared: true,
				postId,
				saved: false,
			});
		}

		if (!shouldPersistReadingProgress(percentageRead)) {
			return NextResponse.json({
				ignored: true,
				postId,
				saved: false,
			});
		}

		const existing = await prisma.progress.findUnique({
			where: {
				userId_postId: {
					userId,
					postId,
				},
			},
			select: {
				percentageRead: true,
			},
		});
		const nextPercentageRead = Math.max(
			existing?.percentageRead ?? 0,
			percentageRead,
		);

		const progress = await prisma.progress.upsert({
			where: {
				userId_postId: {
					userId,
					postId,
				},
			},
			update: {
				percentageRead: nextPercentageRead,
			},
			create: {
				userId,
				postId,
				percentageRead: nextPercentageRead,
			},
		});

		return NextResponse.json({
			percentageRead: progress.percentageRead,
			postId,
			saved: true,
		});
	} catch (_error) {
		return NextResponse.json(
			{ error: { message: "Unable to connect" } },
			{ status: 500 },
		);
	}
}
