import type { Metadata } from "next";
import type { ReactNode } from "react";
import prisma from "@/database/prisma";
import { getRequestLocale } from "@/lib/request-locale";
import { buildPageMetadata } from "@/lib/seo";

type ProfileLayoutProps = {
	children: ReactNode;
	params: Promise<{ id: string }>;
};

export async function generateMetadata({
	params,
}: ProfileLayoutProps): Promise<Metadata> {
	const locale = await getRequestLocale();
	const { id } = await params;

	if (id === "me") {
		return buildPageMetadata({
			title: "Your profile",
			description:
				"Manage your DevBlog profile, account settings, connected providers, and recent activity.",
			path: "/profile/me",
			locale,
			index: false,
			type: "profile",
		});
	}

	const user = await prisma.user.findFirst({
		where: {
			OR: [{ id }, { slug: id }, { username: id }],
		},
		select: {
			id: true,
			name: true,
			username: true,
			slug: true,
			bio: true,
			posts: {
				where: { status: "published" },
				select: { id: true },
				take: 1,
			},
		},
	});

	const displayName =
		user?.name?.trim() || user?.username?.trim() || user?.slug?.trim() || "Profile";
	const canonicalKey = user?.slug?.trim() || user?.id || id;
	const hasPublishedPosts = Boolean(user?.posts.length);

	return buildPageMetadata({
		title: `${displayName} profile`,
		description:
			user?.bio?.trim() ||
			`${displayName}'s public profile, recent activity, and published posts on DevBlog.`,
		path: `/profile/${canonicalKey}`,
		locale,
		index: Boolean(user && hasPublishedPosts),
		type: "profile",
	});
}

export default function ProfileLayout({ children }: ProfileLayoutProps) {
	return children;
}
