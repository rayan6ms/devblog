export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

export const ALLOWED_IMAGE_TYPES = new Map([
	["image/jpeg", "jpg"],
	["image/png", "png"],
	["image/webp", "webp"],
	["image/gif", "gif"],
]);

export const ACCEPTED_IMAGE_TYPES = Array.from(ALLOWED_IMAGE_TYPES.keys());

export const PENDING_IMAGE_PREFIX = "pending-upload://";

export type ImageUploadResponse = {
	url: string;
	name: string;
	size: number;
};

export function createPendingImageUrl(id: string) {
	return `${PENDING_IMAGE_PREFIX}${id}`;
}

export function validateImageFile(file: { size: number; type: string }) {
	if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
		return "Only JPG, PNG, WEBP, and GIF files are supported.";
	}

	if (file.size > MAX_UPLOAD_BYTES) {
		return "Images must be 4MB or smaller.";
	}

	return null;
}

export async function uploadImageFile(file: File) {
	const body = new FormData();
	body.append("file", file);

	const response = await fetch("/api/upload", {
		method: "POST",
		body,
	});

	const data = (await response.json().catch(() => null)) as
		| ImageUploadResponse
		| { error?: string }
		| null;

	if (!response.ok || !data || typeof data !== "object" || !("url" in data)) {
		throw new Error(
			data && "error" in data && typeof data.error === "string"
				? data.error
				: "Unable to upload image right now.",
		);
	}

	return data;
}
