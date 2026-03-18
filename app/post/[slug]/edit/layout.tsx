import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getMessages } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/request-locale";
import { buildPageMetadata } from "@/lib/seo";

type EditPostLayoutProps = {
	children: ReactNode;
	params: Promise<{ slug: string }>;
};

export async function generateMetadata({
	params,
}: EditPostLayoutProps): Promise<Metadata> {
	const locale = await getRequestLocale();
	const messages = getMessages(locale);
	const { slug } = await params;

	return buildPageMetadata({
		title: messages.newPost.editPageTitle,
		description: messages.newPost.editPageDescription,
		path: `/post/${slug}/edit`,
		locale,
		index: false,
	});
}

export default function EditPostLayout({ children }: EditPostLayoutProps) {
	return children;
}
