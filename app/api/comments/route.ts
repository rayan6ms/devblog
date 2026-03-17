import { NextResponse } from "next/server";
import prisma from "@/database/prisma";
import { auth } from "@/lib/auth";
import { createCommentSchema } from "@/lib/validation/content";

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

	const comment = await prisma.comment.create({
		data: {
			text: parsed.data.text,
			postId: parsed.data.postId,
			authorId: session.user.id,
		},
	});

	return NextResponse.json({ id: comment.id });
}
