import { type NextRequest, NextResponse } from "next/server";
import { getPostBySlug } from "@/api/utils";

export async function GET(
	_request: NextRequest,
	context: RouteContext<"/api/post/[slug]">,
): Promise<NextResponse> {
	const { slug } = await context.params;

	try {
		const post = await getPostBySlug(slug);
		if (!post) {
			return NextResponse.json({ error: "Post not found" }, { status: 404 });
		}
		return NextResponse.json(post);
	} catch {
		return NextResponse.json(
			{ error: { message: "Unable to connect" } },
			{ status: 500 },
		);
	}
}
