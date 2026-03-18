import type { Metadata } from "next";
import {
	DEFAULT_LOCALE,
	getIntlLocale,
	LOCALES,
	LOCALE_QUERY_PARAM,
	type Locale,
} from "@/lib/i18n";

export const SITE_NAME = "DevBlog";
export const SITE_DESCRIPTION =
	"DevBlog is a personal software development blog with tutorials, opinions, frontend notes, and interactive side projects.";

const DEFAULT_OG_IMAGE = "/opengraph-image";
const DEFAULT_TWITTER_IMAGE = "/twitter-image";

const DEFAULT_ROBOTS = {
	index: true,
	follow: true,
	googleBot: {
		index: true,
		follow: true,
		noimageindex: false,
		"max-video-preview": -1,
		"max-image-preview": "large",
		"max-snippet": -1,
	},
} as const;

const NOINDEX_ROBOTS = {
	index: false,
	follow: true,
	googleBot: {
		index: false,
		follow: true,
		noimageindex: false,
		"max-video-preview": -1,
		"max-image-preview": "large",
		"max-snippet": -1,
	},
} as const;

function normalizeSiteUrl(value?: string | null) {
	if (!value) {
		return null;
	}

	const trimmed = value.trim();
	if (!trimmed) {
		return null;
	}

	const withProtocol = /^https?:\/\//i.test(trimmed)
		? trimmed
		: trimmed.includes("localhost") || trimmed.startsWith("127.0.0.1")
			? `http://${trimmed}`
			: `https://${trimmed}`;

	try {
		return new URL(withProtocol).origin;
	} catch {
		return null;
	}
}

export function getSiteUrl() {
	return (
		normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL) ||
		normalizeSiteUrl(process.env.SITE_URL) ||
		normalizeSiteUrl(process.env.AUTH_URL) ||
		normalizeSiteUrl(process.env.NEXTAUTH_URL) ||
		normalizeSiteUrl(process.env.VERCEL_PROJECT_PRODUCTION_URL) ||
		normalizeSiteUrl(process.env.VERCEL_URL) ||
		"http://localhost:3000"
	);
}

export function getMetadataBase() {
	return new URL(getSiteUrl());
}

function normalizePath(path: string) {
	return path.startsWith("/") ? path : `/${path}`;
}

export function buildLocalizedPath(path: string, locale: Locale) {
	const url = new URL(normalizePath(path), getSiteUrl());

	if (locale !== DEFAULT_LOCALE) {
		url.searchParams.set(LOCALE_QUERY_PARAM, locale);
	}

	return `${url.pathname}${url.search}${url.hash}`;
}

export function buildLocalizedUrl(path: string, locale: Locale) {
	return new URL(buildLocalizedPath(path, locale), getSiteUrl()).toString();
}

export function buildLanguageAlternates(
	path: string,
	locales: readonly Locale[] = LOCALES,
) {
	const languages: Record<string, string> = {
		"x-default": normalizePath(path),
	};

	for (const locale of locales) {
		languages[getIntlLocale(locale)] = buildLocalizedPath(path, locale);
	}

	return languages;
}

export function buildAbsoluteLanguageAlternates(
	path: string,
	locales: readonly Locale[] = LOCALES,
) {
	const languages: Record<string, string> = {
		"x-default": new URL(normalizePath(path), getSiteUrl()).toString(),
	};

	for (const locale of locales) {
		languages[getIntlLocale(locale)] = buildLocalizedUrl(path, locale);
	}

	return languages;
}

export function resolveSeoImage(image?: string | null) {
	const value = image?.trim();

	if (!value || value.startsWith("data:")) {
		return DEFAULT_OG_IMAGE;
	}

	if (/^https?:\/\//i.test(value) || value.startsWith("/")) {
		return value;
	}

	return `/${value.replace(/^\/+/, "")}`;
}

export function resolveAbsoluteSeoImage(image?: string | null) {
	const normalized = resolveSeoImage(image);
	if (/^https?:\/\//i.test(normalized)) {
		return normalized;
	}

	return new URL(normalized, getSiteUrl()).toString();
}

export function serializeJsonLd(value: unknown) {
	return JSON.stringify(value).replace(/</g, "\\u003c");
}

type BuildPageMetadataOptions = {
	title?: string;
	description: string;
	path: string;
	locale: Locale;
	index?: boolean;
	type?: "website" | "article" | "profile";
	image?: string | null;
	keywords?: string[];
	authors?: string[];
	publishedTime?: string;
	modifiedTime?: string;
};

export function buildPageMetadata({
	title,
	description,
	path,
	locale,
	index = true,
	type = "website",
	image,
	keywords,
	authors,
	publishedTime,
	modifiedTime,
}: BuildPageMetadataOptions): Metadata {
	const resolvedImage = resolveSeoImage(image);
	const absoluteImage = resolveAbsoluteSeoImage(
		image || (type === "article" ? DEFAULT_TWITTER_IMAGE : DEFAULT_OG_IMAGE),
	);

	return {
		title,
		description,
		keywords,
		category: "technology",
		alternates: {
			canonical: buildLocalizedPath(path, locale),
			languages: buildLanguageAlternates(path),
		},
		robots: index ? DEFAULT_ROBOTS : NOINDEX_ROBOTS,
		openGraph: {
			type,
			url: buildLocalizedUrl(path, locale),
			siteName: SITE_NAME,
			title: title || SITE_NAME,
			description,
			locale: getIntlLocale(locale),
			images: [resolvedImage],
			...(authors?.length ? { authors } : {}),
			...(publishedTime ? { publishedTime } : {}),
			...(modifiedTime ? { modifiedTime } : {}),
		},
		twitter: {
			card: "summary_large_image",
			title: title || SITE_NAME,
			description,
			creator: "@rayan6ms",
			images: [absoluteImage],
		},
	};
}
