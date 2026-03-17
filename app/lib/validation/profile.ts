const HANDLE_MIN_LENGTH = 3;
const HANDLE_MAX_LENGTH = 30;

export type ProfileValidationMessages = {
	nameRequired: string;
	maxChars: (max: number) => string;
	handleRequired: string;
	handleLettersNumbersOnly: string;
	handleMin: (min: number) => string;
	handleMax: (max: number) => string;
	uploadRequired: string;
	uploadAllowed: string;
	uploadMaxSize: string;
};

const defaultProfileValidationMessages: ProfileValidationMessages = {
	nameRequired: "Name is required.",
	maxChars: (max) => `Max ${max} characters.`,
	handleRequired: "Handle is required.",
	handleLettersNumbersOnly: "Use letters and numbers only.",
	handleMin: (min) => `Handle must be at least ${min} characters.`,
	handleMax: (max) => `Handle must be ${max} characters or fewer.`,
	uploadRequired: "Upload a JPG, PNG, or WEBP image.",
	uploadAllowed: "Only JPG, PNG, or WEBP images are allowed.",
	uploadMaxSize: "Max image size is 2MB.",
};

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

export function getHandleError(
	value: string,
	messages: ProfileValidationMessages = defaultProfileValidationMessages,
) {
	const normalized = normalizeHandle(value);

	if (!value.trim()) {
		return messages.handleRequired;
	}

	if (!normalized) {
		return messages.handleLettersNumbersOnly;
	}

	if (normalized.length < HANDLE_MIN_LENGTH) {
		return messages.handleMin(HANDLE_MIN_LENGTH);
	}

	if (normalized.length > HANDLE_MAX_LENGTH) {
		return messages.handleMax(HANDLE_MAX_LENGTH);
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

export function getProfileUploadError(
	value: string,
	messages: ProfileValidationMessages = defaultProfileValidationMessages,
) {
	const parsed = parseUploadedAvatarDataUrl(value);

	if (!parsed) {
		return messages.uploadAllowed;
	}

	if (
		!PROFILE_UPLOAD_ACCEPT.includes(
			parsed.mimeType as (typeof PROFILE_UPLOAD_ACCEPT)[number],
		)
	) {
		return messages.uploadAllowed;
	}

	if (parsed.sizeInBytes > PROFILE_UPLOAD_MAX_BYTES) {
		return messages.uploadMaxSize;
	}

	return null;
}
