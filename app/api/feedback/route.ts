import { type NextRequest, NextResponse } from "next/server";
import { createFeedback } from "@/api/utils";
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
		const feedback = await createFeedback(parsed.data);
		return NextResponse.json(feedback);
	} catch (_error) {
		return NextResponse.json(
			{ error: { message: "Unable to connect" } },
			{ status: 500 },
		);
	}
}
