const HANDLE_MIN_LENGTH = 3;
const HANDLE_MAX_LENGTH = 30;

export const PROFILE_UPLOAD_ACCEPT = [
	"image/jpeg",
	"image/png",
	"image/webp",
] as const;

export const PROFILE_UPLOAD_MAX_BYTES = 2 * 1024 * 1024;

export function normalizeHandle(value: string) {
	return value
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.replace(/-{2,}/g, "-");
}

export function getHandleError(value: string) {
	const normalized = normalizeHandle(value);

	if (!value.trim()) {
		return "Handle is required.";
	}

	if (!normalized) {
		return "Use letters and numbers only.";
	}

	if (normalized.length < HANDLE_MIN_LENGTH) {
		return `Handle must be at least ${HANDLE_MIN_LENGTH} characters.`;
	}

	if (normalized.length > HANDLE_MAX_LENGTH) {
		return `Handle must be ${HANDLE_MAX_LENGTH} characters or fewer.`;
	}

	return null;
}

export function parseUploadedAvatarDataUrl(value: string) {
	const match = value.match(
		/^data:(image\/(?:jpeg|png|webp));base64,([a-z0-9+/=]+)$/i,
	);

	if (!match) {
		return null;
	}

	const mimeType = match[1].toLowerCase();
	const base64 = match[2];
	const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
	const sizeInBytes = (base64.length * 3) / 4 - padding;

	return {
		mimeType,
		sizeInBytes,
	};
}

export function getProfileUploadError(value: string) {
	const parsed = parseUploadedAvatarDataUrl(value);

	if (!parsed) {
		return "Only JPG, PNG, or WEBP images are allowed.";
	}

	if (
		!PROFILE_UPLOAD_ACCEPT.includes(
			parsed.mimeType as (typeof PROFILE_UPLOAD_ACCEPT)[number],
		)
	) {
		return "Only JPG, PNG, or WEBP images are allowed.";
	}

	if (parsed.sizeInBytes > PROFILE_UPLOAD_MAX_BYTES) {
		return "Max image size is 2MB.";
	}

	return null;
}
