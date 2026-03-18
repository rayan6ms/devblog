import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getMessages } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/request-locale";
import { buildPageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
	const locale = await getRequestLocale();
	const messages = getMessages(locale);

	return buildPageMetadata({
		title: messages.newPost.createPageTitle,
		description: messages.newPost.createPageDescription,
		path: "/new_post",
		locale,
		index: false,
	});
}

export default function NewPostLayout({ children }: { children: ReactNode }) {
	return children;
}
