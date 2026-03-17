import { type NextRequest, NextResponse } from "next/server";
import prisma from "@/database/prisma";
import { createProgressSchema } from "@/lib/validation/content";

export async function GET(request: NextRequest): Promise<NextResponse> {
	const { searchParams } = new URL(request.url);
	const userId = searchParams.get("userId");
	const postId = searchParams.get("postId");

	if (!userId || !postId) {
		return NextResponse.json(
			{ error: "userId and postId are required." },
			{ status: 400 },
		);
	}

	try {
		const progress = await prisma.progress.findUnique({
			where: {
				userId_postId: {
					userId,
					postId,
				},
			},
		});
		if (!progress) {
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

	const progress = await prisma.progress.create({
		data: {
			userId: parsed.data.user,
			postId: parsed.data.post,
			percentageRead: parsed.data.percentageRead,
		},
	});
	return NextResponse.json(progress);
}
