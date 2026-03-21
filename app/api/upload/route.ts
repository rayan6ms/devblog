import { randomUUID } from "node:crypto";
import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import slugify from "slugify";
import { auth } from "@/lib/auth";
import { ALLOWED_IMAGE_TYPES, MAX_UPLOAD_BYTES } from "@/lib/image-upload";
import { canWriteRole } from "@/lib/post-shared";

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
		if (!process.env.BLOB_READ_WRITE_TOKEN) {
			return NextResponse.json(
				{ error: "BLOB_READ_WRITE_TOKEN is not configured." },
				{ status: 500 },
			);
		}

		const baseName =
			slugify(file.name.replace(/\.[^.]+$/, ""), {
				lower: true,
				strict: true,
			}) || "image";
		const fileName = `${Date.now()}-${randomUUID().slice(0, 8)}-${baseName}.${extension}`;
		const blob = await put(`posts/${fileName}`, file, {
			access: "public",
			addRandomSuffix: false,
			contentType: file.type,
		});

		return NextResponse.json({
			url: blob.url,
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
