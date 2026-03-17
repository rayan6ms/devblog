import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import slugify from "slugify";
import { auth } from "@/lib/auth";
import { canWriteRole } from "@/lib/post-shared";

const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Map([
	["image/jpeg", "jpg"],
	["image/png", "png"],
	["image/webp", "webp"],
	["image/gif", "gif"],
]);

export async function POST(request: Request) {
	const session = await auth();
	if (!session?.user?.id) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}
	if (!canWriteRole(session.user.role)) {
		return NextResponse.json(
			{ error: "You do not have permission to upload images." },
			{ status: 403 },
		);
	}

	const formData = await request.formData().catch(() => null);
	const file = formData?.get("file");

	if (!(file instanceof File)) {
		return NextResponse.json(
			{ error: "Image file is required." },
			{ status: 400 },
		);
	}

	const extension = ALLOWED_IMAGE_TYPES.get(file.type);
	if (!extension) {
		return NextResponse.json(
			{ error: "Only JPG, PNG, WEBP, and GIF files are supported." },
			{ status: 400 },
		);
	}
	if (file.size > MAX_UPLOAD_BYTES) {
		return NextResponse.json(
			{ error: "Images must be 4MB or smaller." },
			{ status: 400 },
		);
	}

	try {
		const baseName =
			slugify(file.name.replace(/\.[^.]+$/, ""), {
				lower: true,
				strict: true,
			}) || "image";
		const fileName = `${Date.now()}-${randomUUID().slice(0, 8)}-${baseName}.${extension}`;
		const relativePath = path.join("uploads", "posts", fileName);
		const absolutePath = path.join(process.cwd(), "public", relativePath);

		await mkdir(path.dirname(absolutePath), { recursive: true });
		await writeFile(absolutePath, Buffer.from(await file.arrayBuffer()));

		return NextResponse.json({
			url: `/${relativePath.replaceAll(path.sep, "/")}`,
			name: file.name,
			size: file.size,
		});
	} catch {
		return NextResponse.json(
			{ error: "Unable to upload image right now." },
			{ status: 500 },
		);
	}
}
