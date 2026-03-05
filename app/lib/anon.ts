import prisma from "@/database/prisma";

export async function GET(
	_: Request,
	{ params }: { params: { slug: string } },
) {
	const post = await prisma.post.findFirst({
		where: { slug: params.slug, status: "published" },
		include: {
			author: {
				select: {
					username: true,
					slug: true,
					profilePic: true,
					role: true,
				},
			},
		},
	});
	if (!post) return new Response("Not found", { status: 404 });
	return Response.json(post);
}
