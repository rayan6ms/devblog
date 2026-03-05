import { getServerSession } from "next-auth";
import prisma from "@/database/prisma";
import { authConfig } from "../auth/[...nextauth]/route";

export async function POST(req: Request) {
	const session = await getServerSession(authConfig);
	if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

	const { postId, text } = await req.json();
	if (!postId || !text) return new Response("Bad request", { status: 400 });

	const comment = await prisma.comment.create({
		data: {
			text,
			postId,
			authorId: session.user.id,
		},
	});
	return Response.json({ id: comment.id });
}
