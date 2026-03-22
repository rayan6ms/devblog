import type { SocialLinks } from "@/lib/social-links";

export type UserRole =
	| "member"
	| "volunteer"
	| "writer"
	| "vip"
	| "admin"
	| "owner";

export type ProfileAvatarMode = "provider" | "generated" | "custom";

export type ProfilePost = {
	id: string;
	title: string;
	slug: string;
	mainTag: string;
	tags: string[];
	description: string | null;
	authorName?: string | null;
	authorSlug?: string | null;
};

export type ProfileComment = {
	id: string;
	content: string;
	postTitle: string;
	postSlug: string;
	postedAt: string;
	edited: boolean;
	editedAt: string | null;
};

export type ConnectedAccount = {
	provider: string;
	type: string;
};

export type ProfileStats = {
	bookmarks: number;
	views: number;
	comments: number;
};

export type ProfileUser = {
	id: string;
	name: string;
	email: string | null;
	username: string;
	slug: string;
	role: UserRole;
	description: string;
	profilePicture: string;
	providerPicture: string | null;
	generatedProfilePicture: string;
	avatarMode: ProfileAvatarMode;
	hasPassword: boolean;
	socialLinks: SocialLinks;
	connectedAccounts: ConnectedAccount[];
	stats: ProfileStats;
	bookmarks: ProfilePost[];
	viewedPosts: ProfilePost[];
	draftPosts: ProfilePost[];
	pendingReviewPosts: ProfilePost[];
	comments: ProfileComment[];
	isCurrentUser: boolean;
};
