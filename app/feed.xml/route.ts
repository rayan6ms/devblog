import type { Element, Root } from "hast";
import rehypeHighlight from "rehype-highlight";
import rehypeStringify from "rehype-stringify";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { type Plugin, unified } from "unified";
import { visit } from "unist-util-visit";
import { getPublishedPostsForFeed } from "@/lib/posts";
import { markdownRemarkPlugins } from "@/lib/markdown";
import {
	buildLocalizedUrl,
	getSiteUrl,
	resolveAbsoluteSeoImage,
	SITE_DESCRIPTION,
	SITE_NAME,
} from "@/lib/seo";

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

function getFeedImageUrl(image?: string | null) {
	const value = image?.trim();

	if (!value || value.startsWith("data:")) {
		return null;
	}

	return resolveAbsoluteSeoImage(value);
}

function absolutizeMarkdownUrl(url: string, postUrl: string) {
	const safeUrl = url.trim();
	if (!safeUrl) {
		return safeUrl;
	}

	if (/^(?:javascript|vbscript|data):/i.test(safeUrl)) {
		return "";
	}

	if (/^[a-z][a-z\d+.-]*:/i.test(safeUrl)) {
		return safeUrl;
	}

	return new URL(safeUrl, postUrl).toString();
}

function createRehypeAbsolutizeUrls(postUrl: string): Plugin<[], Root> {
	return function rehypeAbsolutizeUrls() {
		return (tree: Root) => {
			visit(tree, "element", (node: Element) => {
				if (!node.properties) {
					return;
				}

				const propertyNames =
					node.tagName === "a"
						? ["href"]
						: node.tagName === "img"
							? ["src"]
							: [];

				for (const propertyName of propertyNames) {
					const value = node.properties[propertyName];
					if (typeof value !== "string") {
						continue;
					}

					node.properties[propertyName] = absolutizeMarkdownUrl(value, postUrl);
				}
			});
		};
	};
}

async function renderFeedHtml(
	markdown: string,
	postUrl: string,
	options?: { featuredImageUrl?: string | null; featuredImageAlt?: string | null },
) {
	const result = await unified()
		.use(remarkParse)
		.use(markdownRemarkPlugins)
		.use(remarkRehype)
		.use(rehypeHighlight, { detect: true })
		.use(createRehypeAbsolutizeUrls(postUrl))
		.use(rehypeStringify)
		.process(markdown);

	const featuredImage = options?.featuredImageUrl
		? `<p><img src="${escapeXml(options.featuredImageUrl)}" alt="${escapeXml(
				options.featuredImageAlt || "",
			)}" /></p>`
		: "";

	return `${featuredImage}${String(result)}`;
}

export async function GET() {
	const siteUrl = getSiteUrl();
	const feedUrl = new URL("/feed.xml", siteUrl).toString();
	const posts = await getPublishedPostsForFeed();
	const lastBuildDate =
		posts
			.map((post) => post.lastEditedAt || post.postedAt)
			.sort((a, b) => b.localeCompare(a))[0] || new Date().toISOString();

	const items = await Promise.all(
		posts.map(async (post) => {
			const postUrl = buildLocalizedUrl(`/post/${post.slug}`, post.originalLocale);
			const feedImageUrl = getFeedImageUrl(post.thumbnail);
			const fullContent = await renderFeedHtml(post.content, postUrl, {
				featuredImageUrl: feedImageUrl,
				featuredImageAlt: post.thumbnailAlt,
			});
			const categories = [post.mainTag, ...post.tags]
				.filter(Boolean)
				.map((tag) => `<category>${escapeXml(tag)}</category>`)
				.join("");
			const media =
				feedImageUrl
					? `
<media:content url="${escapeXml(feedImageUrl)}" medium="image" />
<media:thumbnail url="${escapeXml(feedImageUrl)}" />`
					: "";

			return `<item>
<title>${escapeXml(post.title)}</title>
<link>${escapeXml(postUrl)}</link>
<guid isPermaLink="true">${escapeXml(postUrl)}</guid>
<pubDate>${new Date(post.postedAt).toUTCString()}</pubDate>
<description>${escapeXml(post.description)}</description>
<content:encoded><![CDATA[${escapeCdata(fullContent)}]]></content:encoded>
${categories}
${media}
</item>`;
		}),
	);

	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:media="http://search.yahoo.com/mrss/">
<channel>
<title>${escapeXml(SITE_NAME)}</title>
<link>${escapeXml(siteUrl)}</link>
<description>${escapeXml(SITE_DESCRIPTION)}</description>
<language>en-US</language>
<atom:link href="${escapeXml(feedUrl)}" rel="self" type="application/rss+xml" />
<lastBuildDate>${new Date(lastBuildDate).toUTCString()}</lastBuildDate>
<generator>Next.js</generator>
${items.join("\n")}
</channel>
</rss>`;

	return new Response(xml, {
		headers: {
			"Content-Type": "application/rss+xml; charset=utf-8",
			"Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
		},
	});
}
