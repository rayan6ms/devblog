import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getMessages } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/request-locale";
import { buildPageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
	const locale = await getRequestLocale();
	const messages = getMessages(locale);

	return buildPageMetadata({
		title: messages.login.title,
		description:
			"Sign in to manage your DevBlog account, bookmarks, profile settings, and authoring access.",
		path: "/login",
		locale,
		index: false,
	});
}

export default function LoginLayout({ children }: { children: ReactNode }) {
	return children;
}
