import prisma from "@/database/prisma";

export async function GET() {
	const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
	const posts = await prisma.post.findMany({
		where: { status: "published", createdAt: { gte: weekAgo } },
		orderBy: [{ views: "desc" }, { bookmarks: "desc" }],
		take: 10,
	});
	return Response.json(posts);
}
