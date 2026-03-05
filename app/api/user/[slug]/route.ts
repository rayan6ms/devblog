import { type NextRequest, NextResponse } from "next/server";
import { getUserBySlug } from "@/api/utils";

export async function GET(
	_request: NextRequest,
	context: RouteContext<"/api/user/[slug]">,
): Promise<NextResponse> {
	const { slug } = await context.params;

	try {
		const user = await getUserBySlug(slug);
		if (!user) {
			return NextResponse.json({ error: "User not found" }, { status: 404 });
		}
		return NextResponse.json(user);
	} catch {
		return NextResponse.json(
			{ error: { message: "Unable to connect" } },
			{ status: 500 },
		);
	}
}
