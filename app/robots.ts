import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
	const siteUrl = getSiteUrl();

	return {
		rules: {
			userAgent: "*",
			allow: "/",
			disallow: [
				"/api/",
				"/login",
				"/register",
				"/new_post",
				"/profile/me",
				"/post/*/edit",
			],
		},
		sitemap: `${siteUrl}/sitemap.xml`,
	};
}
