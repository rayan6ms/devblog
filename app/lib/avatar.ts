const AVATAR_SIZE = 128;

function pickAvatarColors(seed: string) {
	let hash = 0;
	for (const char of seed) {
		hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
	}

	const hue = hash % 360;
	const accent = (hue + 42) % 360;

	return {
		background: `hsl(${hue} 68% 42%)`,
		accent: `hsl(${accent} 78% 62%)`,
	};
}

export function getAvatarInitial(name?: string | null, fallback = "U") {
	return (name || fallback).trim().charAt(0).toUpperCase() || fallback;
}

export function buildLetterAvatar(name?: string | null, fallback = "User") {
	const label = name?.trim() || fallback;
	const initial = getAvatarInitial(label);
	const { background, accent } = pickAvatarColors(label.toLowerCase());

	const svg = `
		<svg xmlns="http://www.w3.org/2000/svg" width="${AVATAR_SIZE}" height="${AVATAR_SIZE}" viewBox="0 0 ${AVATAR_SIZE} ${AVATAR_SIZE}" role="img" aria-label="${initial}">
			<defs>
				<linearGradient id="avatarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
					<stop offset="0%" stop-color="${accent}" />
					<stop offset="100%" stop-color="${background}" />
				</linearGradient>
			</defs>
			<rect width="${AVATAR_SIZE}" height="${AVATAR_SIZE}" rx="28" fill="url(#avatarGradient)" />
			<circle cx="102" cy="26" r="22" fill="rgba(255,255,255,0.14)" />
			<text x="50%" y="53%" dominant-baseline="middle" text-anchor="middle" fill="#fdf8ef" font-family="Inter, Arial, sans-serif" font-size="56" font-weight="700">
				${initial}
			</text>
		</svg>
	`.trim();

	return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export function isGeneratedAvatar(value?: string | null) {
	return typeof value === "string" && value.startsWith("data:image/svg+xml");
}
