import { type NextRequest, NextResponse } from "next/server";
import prisma from "@/database/prisma";
import { createFeedbackSchema } from "@/lib/validation/content";

export async function POST(request: NextRequest): Promise<NextResponse> {
	const payload = await request.json().catch(() => null);
	const parsed = createFeedbackSchema.safeParse(payload);
	if (!parsed.success) {
		return NextResponse.json(
			{
				error: "Please correct the feedback payload.",
				fields: parsed.error.flatten().fieldErrors,
			},
			{ status: 400 },
		);
	}

	try {
		const feedback = await prisma.feedback.create({
			data: {
				userId: parsed.data.userId,
				postId: parsed.data.postId,
				score: parsed.data.score,
			},
		});
		return NextResponse.json(feedback);
	} catch (_error) {
		return NextResponse.json(
			{ error: { message: "Unable to connect" } },
			{ status: 500 },
		);
	}
}
