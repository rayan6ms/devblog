import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getMessages } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/request-locale";
import { buildPageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
	const locale = await getRequestLocale();
	const messages = getMessages(locale);

	return buildPageMetadata({
		title: messages.register.title,
		description:
			"Create a DevBlog account to comment, manage your profile, and participate in the site.",
		path: "/register",
		locale,
		index: false,
	});
}

export default function RegisterLayout({ children }: { children: ReactNode }) {
	return children;
}
