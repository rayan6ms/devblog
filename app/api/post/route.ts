import slugify from "slugify";
import prisma from "@/database/prisma";
import { auth } from "../auth/[...nextauth]/route";

export async function POST(req: Request) {
	const session = await auth();
	if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

	const body = await req.json();
	// TODO: validate with zod
	const slug = slugify(body.title, { lower: true, strict: true });
	const post = await prisma.post.create({
		data: {
			title: body.title,
			slug,
			content: body.content,
			authorId: session.user.id,
			mainTag: body.mainTag,
			tags: body.tags || [],
			description: body.description,
			status: "draft",
		},
	});
	return Response.json({ id: post.id, slug: post.slug });
}
