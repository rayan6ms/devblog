import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getMessages } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/request-locale";
import { buildPageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
	const locale = await getRequestLocale();
	const messages = getMessages(locale);

	return buildPageMetadata({
		title: messages.tag.title,
		description: messages.tag.description,
		path: "/tag",
		locale,
	});
}

export default function TagLayout({ children }: { children: ReactNode }) {
	return children;
}
