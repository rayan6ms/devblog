import type { Prisma, Role, User } from "@prisma/client";
import slugify from "slugify";
import prisma from "@/database/prisma";
import { buildLetterAvatar, isGeneratedAvatar } from "@/lib/avatar";
import {
	emptySocialLinks,
	normalizeSocialLinks,
	type SocialLinks,
} from "@/lib/social-links";
import type {
	ConnectedAccount,
	ProfileAvatarMode,
	ProfileComment,
	ProfilePost,
	ProfileUser,
	UserRole,
} from "@/profile/types";

export const USER_ROLES: UserRole[] = [
	"member",
	"volunteer",
	"writer",
	"vip",
	"admin",
	"owner",
];

const publicProfileSelect = {
	id: true,
	name: true,
	email: true,
	username: true,
	slug: true,
	image: true,
	profilePic: true,
	bio: true,
	role: true,
	socialLinks: true,
	accounts: {
		select: {
			provider: true,
			type: true,
		},
	},
	bookmarks: {
		orderBy: {
			createdAt: "desc",
		},
		take: 12,
		select: {
			post: {
				select: {
					id: true,
					title: true,
					slug: true,
					mainTag: true,
					tags: true,
					description: true,
				},
			},
		},
	},
	views: {
		orderBy: {
			createdAt: "desc",
		},
		take: 12,
		select: {
			post: {
				select: {
					id: true,
					title: true,
					slug: true,
					mainTag: true,
					tags: true,
					description: true,
				},
			},
		},
	},
	comments: {
		orderBy: {
			postedAt: "desc",
		},
		take: 12,
		select: {
			id: true,
			text: true,
			postedAt: true,
			updatedAt: true,
			post: {
				select: {
					title: true,
					slug: true,
				},
			},
		},
	},
	_count: {
		select: {
			bookmarks: true,
			views: true,
			comments: true,
		},
	},
} satisfies Prisma.UserSelect;

const privateProfileSelect = {
	...publicProfileSelect,
	passwordHash: true,
} satisfies Prisma.UserSelect;

type PublicProfileRecord = Prisma.UserGetPayload<{
	select: typeof publicProfileSelect;
}>;

type PrivateProfileRecord = Prisma.UserGetPayload<{
	select: typeof privateProfileSelect;
}>;

type ProfileRecord = PublicProfileRecord | PrivateProfileRecord;

function slugBase(value: string) {
	return slugify(value, { lower: true, strict: true }) || "user";
}

function usernameBase(value: string) {
	return slugBase(value).replace(/-/g, "") || "user";
}

export function normalizeEmail(email: string) {
	return email.trim().toLowerCase();
}

export function resolveUserRole(role?: Role | string | null): UserRole {
	const normalized = (role || "member").toString().toLowerCase();
	return USER_ROLES.includes(normalized as UserRole)
		? (normalized as UserRole)
		: "member";
}

export function resolveAvatarMode(user: {
	image?: string | null;
	profilePic?: string | null;
}): ProfileAvatarMode {
	if (user.profilePic) {
		return isGeneratedAvatar(user.profilePic) ? "generated" : "custom";
	}

	return user.image ? "provider" : "generated";
}

export function resolveProfilePicture(user: {
	name?: string | null;
	email?: string | null;
	image?: string | null;
	profilePic?: string | null;
}) {
	return (
		user.profilePic ||
		user.image ||
		buildLetterAvatar(user.name || user.email || "User")
	);
}

export async function ensureUniqueSlug(base: string, excludeUserId?: string) {
	const raw = slugBase(base);
	let candidate = raw;
	let index = 1;

	while (
		await prisma.user.findFirst({
			where: {
				slug: candidate,
				...(excludeUserId ? { id: { not: excludeUserId } } : {}),
			},
			select: { id: true },
		})
	) {
		candidate = `${raw}-${index}`;
		index += 1;
	}

	return candidate;
}

export async function ensureUniqueUsername(
	base: string,
	excludeUserId?: string,
) {
	const raw = usernameBase(base);
	let candidate = raw;
	let index = 1;

	while (
		await prisma.user.findFirst({
			where: {
				username: candidate,
				...(excludeUserId ? { id: { not: excludeUserId } } : {}),
			},
			select: { id: true },
		})
	) {
		candidate = `${raw}${index}`;
		index += 1;
	}

	return candidate;
}

export async function ensureUserIdentityFields(
	user: Pick<User, "id" | "name" | "email">,
) {
	const base = user.name?.trim() || user.email?.split("@")[0] || "user";
	const existing = await prisma.user.findUnique({
		where: { id: user.id },
		select: { username: true, slug: true },
	});

	return {
		username: existing?.username || (await ensureUniqueUsername(base, user.id)),
		slug: existing?.slug || (await ensureUniqueSlug(base, user.id)),
	};
}

function mapPost(post: {
	id: string;
	title: string;
	slug: string;
	mainTag: string;
	tags: string[];
	description: string | null;
}): ProfilePost {
	return {
		id: post.id,
		title: post.title,
		slug: post.slug,
		mainTag: post.mainTag,
		tags: post.tags,
		description: post.description,
	};
}

function mapComment(comment: {
	id: string;
	text: string;
	postedAt: Date;
	updatedAt: Date;
	post: {
		title: string;
		slug: string;
	};
}): ProfileComment {
	return {
		id: comment.id,
		content: comment.text,
		postTitle: comment.post.title,
		postSlug: comment.post.slug,
		postedAt: comment.postedAt.toISOString(),
		edited: comment.updatedAt.getTime() !== comment.postedAt.getTime(),
		editedAt:
			comment.updatedAt.getTime() !== comment.postedAt.getTime()
				? comment.updatedAt.toISOString()
				: null,
	};
}

function mapAccounts(accounts: ConnectedAccount[]) {
	const seen = new Set<string>();
	return accounts.filter((account) => {
		if (seen.has(account.provider)) {
			return false;
		}
		seen.add(account.provider);
		return true;
	});
}

export function serializeProfile(
	user: ProfileRecord,
	options?: {
		isCurrentUser?: boolean;
		includePrivateFields?: boolean;
	},
): ProfileUser {
	const socialLinks = normalizeSocialLinks(user.socialLinks) as SocialLinks;
	const generatedProfilePicture = buildLetterAvatar(
		user.name || user.email || user.username || "User",
	);
	const profilePicture = resolveProfilePicture(user);
	const avatarMode = resolveAvatarMode(user);

	return {
		id: user.id,
		name: user.name?.trim() || user.username || "User",
		email: options?.includePrivateFields ? user.email : null,
		username: user.username || user.slug || "user",
		slug: user.slug || user.id,
		role: resolveUserRole(user.role),
		description: user.bio?.trim() || "",
		profilePicture,
		providerPicture: user.image || null,
		generatedProfilePicture,
		avatarMode,
		hasPassword:
			options?.includePrivateFields && "passwordHash" in user
				? Boolean(user.passwordHash)
				: false,
		socialLinks: socialLinks || emptySocialLinks(),
		connectedAccounts: options?.includePrivateFields
			? mapAccounts(user.accounts)
			: [],
		stats: {
			bookmarks: user._count.bookmarks,
			views: user._count.views,
			comments: user._count.comments,
		},
		bookmarks: user.bookmarks.map((bookmark) => mapPost(bookmark.post)),
		viewedPosts: user.views.map((view) => mapPost(view.post)),
		comments: user.comments.map(mapComment),
		isCurrentUser: Boolean(options?.isCurrentUser),
	};
}

export async function getCurrentUserProfile(userId: string) {
	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: privateProfileSelect,
	});

	if (!user) {
		return null;
	}

	return serializeProfile(user, {
		isCurrentUser: true,
		includePrivateFields: true,
	});
}

export async function findUserProfile(profileKey: string, viewerId?: string) {
	const user = await prisma.user.findFirst({
		where: {
			OR: [{ id: profileKey }, { slug: profileKey }, { username: profileKey }],
		},
		select: privateProfileSelect,
	});

	if (!user) {
		return null;
	}

	return serializeProfile(user, {
		isCurrentUser: viewerId === user.id,
		includePrivateFields: viewerId === user.id,
	});
}
