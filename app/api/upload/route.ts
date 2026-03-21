import { randomUUID } from "node:crypto";
import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import slugify from "slugify";
import { auth } from "@/lib/auth";
import { ALLOWED_IMAGE_TYPES, MAX_UPLOAD_BYTES } from "@/lib/image-upload";
import { canWriteRole } from "@/lib/post-shared";

function maskToken(token: string | undefined) {
	if (!token) {
		return null;
	}

	if (token.length <= 12) {
		return token;
	}

	return `${token.slice(0, 12)}...${token.slice(-6)}`;
}

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
		const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
		const debugContext = {
			hasToken: Boolean(blobToken),
			tokenPreview: maskToken(blobToken),
			tokenLength: blobToken?.length ?? 0,
			fileName: file.name,
			fileType: file.type,
			fileSize: file.size,
			nodeEnv: process.env.NODE_ENV,
			vercelEnv: process.env.VERCEL_ENV ?? null,
			vercelRegion: process.env.VERCEL_REGION ?? null,
		};

		console.log("[upload] starting blob upload", debugContext);

		if (!blobToken) {
			console.error("[upload] missing blob token", debugContext);
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
			token: blobToken,
		});

		console.log("[upload] blob upload succeeded", {
			...debugContext,
			pathname: blob.pathname,
			blobUrl: blob.url,
		});

		return NextResponse.json({
			url: blob.url,
			name: file.name,
			size: file.size,
		});
	} catch (error) {
		console.error("[upload] blob upload failed", {
			error,
			errorName: error instanceof Error ? error.name : "unknown",
			errorMessage: error instanceof Error ? error.message : String(error),
			errorStack: error instanceof Error ? error.stack : null,
			hasToken: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
			tokenPreview: maskToken(process.env.BLOB_READ_WRITE_TOKEN),
			tokenLength: process.env.BLOB_READ_WRITE_TOKEN?.length ?? 0,
			nodeEnv: process.env.NODE_ENV,
			vercelEnv: process.env.VERCEL_ENV ?? null,
			vercelRegion: process.env.VERCEL_REGION ?? null,
			fileName: file.name,
			fileType: file.type,
			fileSize: file.size,
		});

		return NextResponse.json(
			{ error: "Unable to upload image right now." },
			{ status: 500 },
		);
	}
}
