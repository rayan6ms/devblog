import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { findUserProfile } from "@/lib/user-profile";

export async function GET(
	_request: NextRequest,
	context: RouteContext<"/api/user/[slug]">,
): Promise<NextResponse> {
	const { slug } = await context.params;

	try {
		const session = await auth();
		const user =
			slug === "me" && session?.user?.id
				? await findUserProfile(session.user.id, session.user.id)
				: await findUserProfile(slug, session?.user?.id);
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
