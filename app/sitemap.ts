import { stat } from "node:fs/promises";
import path from "node:path";
import type { MetadataRoute } from "next";
import prisma from "@/database/prisma";
import { DEFAULT_LOCALE, LOCALES, resolveLocale } from "@/lib/i18n";
import {
	buildAbsoluteLanguageAlternates,
	buildLocalizedUrl,
	getSiteUrl,
} from "@/lib/seo";

export const revalidate = 300;

type StaticRoute = {
	path: string;
	source: string;
	changeFrequency: NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>;
	priority: number;
};

const STATIC_ROUTES: StaticRoute[] = [
	{
		path: "/",
		source: "app/page.tsx",
		changeFrequency: "daily",
		priority: 1,
	},
	{
		path: "/about",
		source: "app/about/page.tsx",
		changeFrequency: "monthly",
		priority: 0.6,
	},
	{
		path: "/recent",
		source: "app/recent/page.tsx",
		changeFrequency: "daily",
		priority: 0.9,
	},
	{
		path: "/trending",
		source: "app/trending/page.tsx",
		changeFrequency: "daily",
		priority: 0.8,
	},
	{
		path: "/tag",
		source: "app/tag/page.tsx",
		changeFrequency: "daily",
		priority: 0.8,
	},
	{
		path: "/playground",
		source: "app/playground/page.tsx",
		changeFrequency: "weekly",
		priority: 0.7,
	},
];

function normalizePostLocale(locale?: string | null) {
	return resolveLocale(locale) || DEFAULT_LOCALE;
}

function uniqueLocales(locales: Array<string | null | undefined>) {
	return Array.from(
		new Set(locales.map((locale) => normalizePostLocale(locale)).filter(Boolean)),
	);
}

async function getFileModifiedDate(relativePath: string) {
	try {
		const { mtime } = await stat(path.join(process.cwd(), relativePath));
		return mtime;
	} catch {
		return undefined;
	}
}

async function getStaticEntries(): Promise<MetadataRoute.Sitemap> {
	return Promise.all(
		STATIC_ROUTES.map(async (route) => ({
			url: buildLocalizedUrl(route.path, DEFAULT_LOCALE),
			lastModified: await getFileModifiedDate(route.source),
			changeFrequency: route.changeFrequency,
			priority: route.priority,
			alternates: {
				languages: buildAbsoluteLanguageAlternates(route.path, LOCALES),
			},
		})),
	);
}

async function getPostEntries(): Promise<MetadataRoute.Sitemap> {
	const posts = await prisma.post.findMany({
		where: { status: "published" },
		select: {
			slug: true,
			locale: true,
			postedAt: true,
			updatedAt: true,
			lastEditedAt: true,
			translations: {
				select: {
					locale: true,
				},
			},
		},
		orderBy: [{ postedAt: "desc" }, { updatedAt: "desc" }],
	});

	return posts.map((post) => {
		const locales = uniqueLocales([
			post.locale,
			...post.translations.map((translation) => translation.locale),
		]);
		const canonicalLocale = locales[0] || DEFAULT_LOCALE;

		return {
			url: buildLocalizedUrl(`/post/${post.slug}`, canonicalLocale),
			lastModified: post.lastEditedAt || post.updatedAt || post.postedAt,
			changeFrequency: "weekly",
			priority: 0.92,
			alternates: {
				languages: buildAbsoluteLanguageAlternates(
					`/post/${post.slug}`,
					locales,
				),
			},
		};
	});
}

async function getProfileEntries(): Promise<MetadataRoute.Sitemap> {
	const authors = await prisma.user.findMany({
		where: {
			posts: {
				some: { status: "published" },
			},
		},
		select: {
			id: true,
			slug: true,
			updatedAt: true,
			posts: {
				where: { status: "published" },
				select: {
					postedAt: true,
					updatedAt: true,
					lastEditedAt: true,
				},
				orderBy: [{ updatedAt: "desc" }, { postedAt: "desc" }],
				take: 1,
			},
		},
		orderBy: [{ updatedAt: "desc" }],
	});

	return authors.map((author) => {
		const profileKey = author.slug || author.id;
		const freshestPost = author.posts[0];

		return {
			url: new URL(`/profile/${profileKey}`, getSiteUrl()).toString(),
			lastModified:
				freshestPost?.lastEditedAt ||
				freshestPost?.updatedAt ||
				freshestPost?.postedAt ||
				author.updatedAt,
			changeFrequency: "weekly",
			priority: 0.55,
			alternates: {
				languages: buildAbsoluteLanguageAlternates(
					`/profile/${profileKey}`,
					LOCALES,
				),
			},
		};
	});
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	const [staticEntries, postEntries, profileEntries] = await Promise.all([
		getStaticEntries(),
		getPostEntries(),
		getProfileEntries(),
	]);

	return [...staticEntries, ...postEntries, ...profileEntries].sort((a, b) =>
		a.url.localeCompare(b.url),
	);
}
