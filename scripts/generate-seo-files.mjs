import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const publicDir = path.join(projectRoot, "public");

const LOCALES = ["en", "pt-BR", "es", "de", "ru", "fr", "ja"];
const DEFAULT_LOCALE = "en";
const LOCALE_QUERY_PARAM = "lang";
const LOCALE_TO_HREFLANG = {
	en: "en-US",
	"pt-BR": "pt-BR",
	es: "es-ES",
	de: "de-DE",
	ru: "ru-RU",
	fr: "fr-FR",
	ja: "ja-JP",
};

function normalizeSiteUrl(value) {
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

const siteUrl =
	normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL) ||
	normalizeSiteUrl(process.env.SITE_URL) ||
	"http://localhost:3000";

function xmlEscape(value) {
	return String(value)
		.replace(/&/g, "&amp;")
		.replace(/"/g, "&quot;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/'/g, "&apos;");
}

function toAbsoluteUrl(routePath, locale, options = {}) {
	const url = new URL(routePath.startsWith("/") ? routePath : `/${routePath}`, siteUrl);

	if (locale !== DEFAULT_LOCALE || options.forceLocaleQuery) {
		url.searchParams.set(LOCALE_QUERY_PARAM, locale);
	}

	return url.toString();
}

function normalizeLocale(locale) {
	if (!locale) {
		return null;
	}

	const normalized = locale.trim().toLowerCase();

	if (normalized === "en" || normalized === "en-us") return "en";
	if (normalized === "pt" || normalized === "pt-br" || normalized === "pt_br")
		return "pt-BR";
	if (normalized === "es" || normalized === "es-es") return "es";
	if (normalized === "de" || normalized === "de-de") return "de";
	if (normalized === "ru" || normalized === "ru-ru") return "ru";
	if (normalized === "fr" || normalized === "fr-fr") return "fr";
	if (normalized === "ja" || normalized === "ja-jp") return "ja";

	return null;
}

function uniqueLocales(locales) {
	return Array.from(new Set(locales.map(normalizeLocale).filter(Boolean)));
}

function sortEntries(entries) {
	return [...entries].sort((a, b) => a.loc.localeCompare(b.loc));
}

function buildAlternates(routePath, locales, canonicalLocale = DEFAULT_LOCALE) {
	const alternateLocales = uniqueLocales(locales);
	const links = alternateLocales.map((locale) => ({
		hreflang: LOCALE_TO_HREFLANG[locale] || locale,
		href: toAbsoluteUrl(routePath, locale),
	}));

	links.push({
		hreflang: "x-default",
		href: toAbsoluteUrl(routePath, canonicalLocale, {
			forceLocaleQuery: canonicalLocale !== DEFAULT_LOCALE,
		}),
	});

	return links;
}

async function getIsoMtime(relativePath) {
	try {
		const stat = await fs.stat(path.join(projectRoot, relativePath));
		return stat.mtime.toISOString();
	} catch {
		return null;
	}
}

async function getStaticEntries() {
	return sortEntries([
		{
			loc: toAbsoluteUrl("/", DEFAULT_LOCALE),
			lastmod: await getIsoMtime("app/page.tsx"),
			changefreq: "daily",
			priority: "1.0",
			alternates: buildAlternates("/", LOCALES),
		},
		{
			loc: toAbsoluteUrl("/about", DEFAULT_LOCALE),
			lastmod: await getIsoMtime("app/about/page.tsx"),
			changefreq: "monthly",
			priority: "0.6",
			alternates: buildAlternates("/about", LOCALES),
		},
		{
			loc: toAbsoluteUrl("/recent", DEFAULT_LOCALE),
			lastmod: await getIsoMtime("app/recent/page.tsx"),
			changefreq: "daily",
			priority: "0.9",
			alternates: buildAlternates("/recent", LOCALES),
		},
		{
			loc: toAbsoluteUrl("/trending", DEFAULT_LOCALE),
			lastmod: await getIsoMtime("app/trending/page.tsx"),
			changefreq: "daily",
			priority: "0.8",
			alternates: buildAlternates("/trending", LOCALES),
		},
		{
			loc: toAbsoluteUrl("/tag", DEFAULT_LOCALE),
			lastmod: await getIsoMtime("app/tag/page.tsx"),
			changefreq: "daily",
			priority: "0.8",
			alternates: buildAlternates("/tag", LOCALES),
		},
		{
			loc: toAbsoluteUrl("/playground", DEFAULT_LOCALE),
			lastmod: await getIsoMtime("app/playground/page.tsx"),
			changefreq: "weekly",
			priority: "0.7",
			alternates: buildAlternates("/playground", LOCALES),
		},
	]);
}

async function getDynamicEntries() {
	if (!process.env.DATABASE_URL) {
		console.warn(
			"[seo] DATABASE_URL is not set. Generating sitemap with static routes only.",
		);
		return [];
	}

	const prisma = new PrismaClient();

	try {
		const [posts, authors] = await Promise.all([
			prisma.post.findMany({
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
			}),
			prisma.user.findMany({
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
			}),
		]);

		const postEntries = posts.map((post) => {
			const canonicalLocale = normalizeLocale(post.locale) || DEFAULT_LOCALE;
			const locales = uniqueLocales([
				post.locale,
				...post.translations.map((translation) => translation.locale),
			]);
			const lastmod = (
				post.lastEditedAt ||
				post.updatedAt ||
				post.postedAt
			).toISOString();

			return {
				loc: toAbsoluteUrl(`/post/${post.slug}`, canonicalLocale, {
					forceLocaleQuery: canonicalLocale !== DEFAULT_LOCALE,
				}),
				lastmod,
				changefreq: "weekly",
				priority: "0.92",
				alternates: buildAlternates(`/post/${post.slug}`, locales, canonicalLocale),
			};
		});

		const profileEntries = authors.map((author) => {
			const key = author.slug || author.id;
			const freshestPost = author.posts[0];
			const lastmod = (
				freshestPost?.lastEditedAt ||
				freshestPost?.updatedAt ||
				freshestPost?.postedAt ||
				author.updatedAt
			).toISOString();

			return {
				loc: toAbsoluteUrl(`/profile/${key}`, DEFAULT_LOCALE),
				lastmod,
				changefreq: "weekly",
				priority: "0.55",
				alternates: buildAlternates(`/profile/${key}`, LOCALES),
			};
		});

		return sortEntries([...postEntries, ...profileEntries]);
	} finally {
		await prisma.$disconnect();
	}
}

function buildSitemapXml(entries) {
	const urls = entries
		.map((entry) => {
			const alternates = entry.alternates
				.map(
					(link) =>
						`    <xhtml:link rel="alternate" hreflang="${xmlEscape(link.hreflang)}" href="${xmlEscape(link.href)}" />`,
				)
				.join("\n");

			return [
				"  <url>",
				`    <loc>${xmlEscape(entry.loc)}</loc>`,
				alternates,
				entry.lastmod ? `    <lastmod>${xmlEscape(entry.lastmod)}</lastmod>` : "",
				`    <changefreq>${entry.changefreq}</changefreq>`,
				`    <priority>${entry.priority}</priority>`,
				"  </url>",
			]
				.filter(Boolean)
				.join("\n");
		})
		.join("\n");

	return [
		'<?xml version="1.0" encoding="UTF-8"?>',
		'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
		urls,
		"</urlset>",
		"",
	].join("\n");
}

function buildRobotsTxt() {
	return [
		"User-agent: *",
		"Allow: /",
		"Disallow: /api/",
		"Disallow: /login",
		"Disallow: /register",
		"Disallow: /new_post",
		"Disallow: /profile/me",
		"Disallow: /post/*/edit",
		"",
		`Sitemap: ${siteUrl}/sitemap.xml`,
		"",
	].join("\n");
}

await fs.mkdir(publicDir, { recursive: true });

const entries = [...(await getStaticEntries()), ...(await getDynamicEntries())];

await Promise.all([
	fs.writeFile(path.join(publicDir, "sitemap.xml"), buildSitemapXml(entries)),
	fs.writeFile(path.join(publicDir, "robots.txt"), buildRobotsTxt()),
]);

console.log(
	`[seo] Generated public/sitemap.xml (${entries.length} URLs) and public/robots.txt for ${siteUrl}.`,
);
