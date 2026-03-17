import { NextResponse } from "next/server";
import { getPostTagCatalog } from "@/lib/posts";

export async function GET() {
	try {
		return NextResponse.json(await getPostTagCatalog());
	} catch {
		return NextResponse.json(
			{ error: "Unable to load tag data right now." },
			{ status: 500 },
		);
	}
}
