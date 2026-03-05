import prisma from "@/database/prisma";

export async function GET() {
	const posts = await prisma.post.findMany({
		where: { status: "published" },
		orderBy: { createdAt: "desc" },
		take: 10,
	});
	return Response.json(posts);
}
