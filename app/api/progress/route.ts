import { type NextRequest, NextResponse } from "next/server";
import { createProgress, getProgress } from "@/api/utils";
import { createProgressSchema } from "@/lib/validation/content";

export async function GET(request: NextRequest): Promise<NextResponse> {
	const { userId, postId } = await request.json();

	try {
		const progress = await getProgress(userId, postId);
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

	const progress = await createProgress(parsed.data);
	return NextResponse.json(progress);
}
