export const SOCIAL_PROVIDERS = [
	"linkedin",
	"github",
	"youtube",
	"twitter",
] as const;

export type SocialProvider = (typeof SOCIAL_PROVIDERS)[number];

export type SocialLinks = Record<SocialProvider, string>;

const SOCIAL_HOSTS: Record<SocialProvider, string[]> = {
	linkedin: ["linkedin.com"],
	github: ["github.com"],
	youtube: ["youtube.com", "youtu.be"],
	twitter: ["twitter.com", "x.com"],
};

export function emptySocialLinks(): SocialLinks {
	return {
		linkedin: "",
		github: "",
		youtube: "",
		twitter: "",
	};
}

export function isValidHttpUrl(value?: string | null) {
	if (!value) {
		return false;
	}

	try {
		const url = new URL(value);
		return url.protocol === "http:" || url.protocol === "https:";
	} catch {
		return false;
	}
}

export function hostOkFor(provider: SocialProvider, url: string) {
	if (!isValidHttpUrl(url)) {
		return false;
	}

	const { hostname } = new URL(url);
	return SOCIAL_HOSTS[provider].some(
		(host) => hostname === host || hostname.endsWith(`.${host}`),
	);
}

export function normalizeSocialLinks(input: unknown): SocialLinks {
	const raw =
		input && typeof input === "object"
			? (input as Partial<Record<SocialProvider, unknown>>)
			: {};

	return {
		linkedin: typeof raw.linkedin === "string" ? raw.linkedin.trim() : "",
		github: typeof raw.github === "string" ? raw.github.trim() : "",
		youtube: typeof raw.youtube === "string" ? raw.youtube.trim() : "",
		twitter: typeof raw.twitter === "string" ? raw.twitter.trim() : "",
	};
}

export function validateSocialLinks(links: SocialLinks) {
	const errors: Partial<Record<SocialProvider, string>> = {};

	for (const provider of SOCIAL_PROVIDERS) {
		const value = links[provider];
		if (!value) {
			continue;
		}

		if (!hostOkFor(provider, value)) {
			errors[provider] = `Invalid ${provider} URL.`;
		}
	}

	return errors;
}
