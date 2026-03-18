import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getMessages } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/request-locale";
import { buildPageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
	const locale = await getRequestLocale();
	const messages = getMessages(locale);

	return buildPageMetadata({
		title: messages.playgroundPage.title,
		description: messages.playgroundPage.description,
		path: "/playground",
		locale,
	});
}

export default function PlaygroundLayout({
	children,
}: {
	children: ReactNode;
}) {
	return children;
}
