import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ReactMarkdown, { defaultUrlTransform } from "react-markdown";
import { getPublishedPostsForFeed } from "@/lib/posts";
import { markdownRemarkPlugins } from "@/lib/markdown";
import { buildLocalizedUrl, getSiteUrl, SITE_DESCRIPTION, SITE_NAME } from "@/lib/seo";

export const revalidate = 3600;

function escapeXml(value: string) {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}

function escapeCdata(value: string) {
	return value.replaceAll("]]>", "]]]]><![CDATA[>");
}

function absolutizeMarkdownUrl(url: string, postUrl: string) {
	const safeUrl = defaultUrlTransform(url);

	if (/^[a-z][a-z\d+.-]*:/i.test(safeUrl)) {
		return safeUrl;
	}

	return new URL(safeUrl, postUrl).toString();
}

function renderFeedHtml(markdown: string, postUrl: string) {
	return renderToStaticMarkup(
		createElement(
			ReactMarkdown,
			{
				remarkPlugins: markdownRemarkPlugins,
				urlTransform: (url) => absolutizeMarkdownUrl(url, postUrl),
			},
			markdown,
		),
	);
}

export async function GET() {
	const siteUrl = getSiteUrl();
	const feedUrl = new URL("/feed.xml", siteUrl).toString();
	const posts = await getPublishedPostsForFeed();
	const lastBuildDate =
		posts
			.map((post) => post.lastEditedAt || post.postedAt)
			.sort((a, b) => b.localeCompare(a))[0] || new Date().toISOString();

	const items = posts
		.map((post) => {
			const postUrl = buildLocalizedUrl(`/post/${post.slug}`, post.originalLocale);
			const fullContent = renderFeedHtml(post.content, postUrl);
			const categories = [post.mainTag, ...post.tags]
				.filter(Boolean)
				.map((tag) => `<category>${escapeXml(tag)}</category>`)
				.join("");

			return `<item>
<title>${escapeXml(post.title)}</title>
<link>${escapeXml(postUrl)}</link>
<guid isPermaLink="true">${escapeXml(postUrl)}</guid>
<pubDate>${new Date(post.postedAt).toUTCString()}</pubDate>
<description>${escapeXml(post.description)}</description>
<content:encoded><![CDATA[${escapeCdata(fullContent)}]]></content:encoded>
${categories}
</item>`;
		})
		.join("\n");

	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
<channel>
<title>${escapeXml(SITE_NAME)}</title>
<link>${escapeXml(siteUrl)}</link>
<description>${escapeXml(SITE_DESCRIPTION)}</description>
<language>en-US</language>
<atom:link href="${escapeXml(feedUrl)}" rel="self" type="application/rss+xml" />
<lastBuildDate>${new Date(lastBuildDate).toUTCString()}</lastBuildDate>
<generator>Next.js</generator>
${items}
</channel>
</rss>`;

	return new Response(xml, {
		headers: {
			"Content-Type": "application/rss+xml; charset=utf-8",
			"Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
		},
	});
}
