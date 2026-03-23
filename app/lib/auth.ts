import { PrismaAdapter } from "@auth/prisma-adapter";
import type { Role } from "@prisma/client";
import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import prisma from "@/database/prisma";
import { resolveRoleForAuthenticatedUser } from "@/lib/admin";
import { verifyPassword } from "@/lib/password";
import {
	ensureUserIdentityFields,
	normalizeEmail,
	resolveProfilePicture,
	resolveUserRole,
} from "@/lib/user-profile";
import { loginSchema } from "@/lib/validation/auth";

const AUTH_TOKEN_REFRESH_MS = 60_000;

type AuthUserSnapshot = {
	id: string;
	name: string | null;
	email: string | null;
	slug: string;
	role: ReturnType<typeof resolveUserRole>;
	picture: string;
};

type AuthUserCacheEntry = {
	expiresAt: number;
	user: AuthUserSnapshot;
};

const authUserCache = new Map<string, AuthUserCacheEntry>();

async function syncAuthenticatedUser(user: {
	id: string;
	name?: string | null;
	email?: string | null;
	image?: string | null;
}) {
	const [identityFields, existingUser] = await Promise.all([
		ensureUserIdentityFields({
			id: user.id,
			name: user.name ?? null,
			email: user.email ?? null,
		}),
		prisma.user.findUnique({
			where: { id: user.id },
			select: { role: true },
		}),
	]);
	const { username, slug } = identityFields;

	await prisma.user.upsert({
		where: { id: user.id },
		update: {
			name: user.name,
			email: user.email ? normalizeEmail(user.email) : null,
			username,
			slug,
			role: resolveRoleForAuthenticatedUser({
				currentRole: existingUser?.role,
				email: user.email ?? null,
			}),
			...(user.image
				? {
						image: user.image,
					}
				: {}),
		},
		create: {
			id: user.id,
			name: user.name,
			email: user.email ? normalizeEmail(user.email) : null,
			image: user.image,
			username,
			slug,
			role: resolveRoleForAuthenticatedUser({
				currentRole: "member",
				email: user.email ?? null,
			}),
		},
	});
}

function mapAuthUserSnapshot(user: {
	id: string;
	name: string | null;
	email: string | null;
	image: string | null;
	profilePic: string | null;
	role: Role | null;
	slug: string | null;
}) {
	return {
		id: user.id,
		name: user.name,
		email: user.email,
		slug: user.slug || user.id,
		role: resolveUserRole(user.role),
		picture: resolveProfilePicture(user),
	} satisfies AuthUserSnapshot;
}

function applyAuthUserSnapshot(
	token: Record<string, unknown>,
	user: AuthUserSnapshot,
) {
	token.sub = user.id;
	token.role = user.role;
	token.slug = user.slug;
	token.picture = user.picture;
	token.name = user.name || token.name;
	token.email = user.email || token.email;
	token.profileSyncedAt = Date.now();

	return token;
}

async function getAuthUserSnapshot(userId: string, forceRefresh = false) {
	const cached = authUserCache.get(userId);
	if (!forceRefresh && cached && cached.expiresAt > Date.now()) {
		return cached.user;
	}

	const dbUser = await prisma.user.findUnique({
		where: { id: userId },
		select: {
			id: true,
			name: true,
			email: true,
			image: true,
			profilePic: true,
			role: true,
			slug: true,
		},
	});

	if (!dbUser) {
		authUserCache.delete(userId);
		return null;
	}

	const snapshot = mapAuthUserSnapshot(dbUser);
	authUserCache.set(userId, {
		user: snapshot,
		expiresAt: Date.now() + AUTH_TOKEN_REFRESH_MS,
	});

	return snapshot;
}

const providers = [
	Credentials({
		name: "Email and password",
		credentials: {
			email: { label: "Email", type: "email" },
			password: { label: "Password", type: "password" },
		},
		async authorize(credentials) {
			const parsed = loginSchema.safeParse(credentials);
			if (!parsed.success) {
				return null;
			}

			const email = normalizeEmail(parsed.data.email);

			const user = await prisma.user.findUnique({
				where: {
					email,
				},
			});

			if (!user || !verifyPassword(parsed.data.password, user.passwordHash)) {
				return null;
			}

			return {
				id: user.id,
				email: user.email,
				name: user.name,
				image: user.image,
			};
		},
	}),
	...(process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET
		? [
				GitHub({
					clientId: process.env.AUTH_GITHUB_ID,
					clientSecret: process.env.AUTH_GITHUB_SECRET,
					profile(profile) {
						return {
							id: profile.id.toString(),
							name: profile.name ?? profile.login,
							email: profile.email,
							image: profile.avatar_url ?? null,
						};
					},
				}),
			]
		: []),
	...(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
		? [
				Google({
					clientId: process.env.AUTH_GOOGLE_ID,
					clientSecret: process.env.AUTH_GOOGLE_SECRET,
					profile(profile) {
						return {
							id: profile.sub,
							name: profile.name,
							email: profile.email,
							image: profile.picture ?? null,
						};
					},
				}),
			]
		: []),
];

export const authConfig = {
	adapter: PrismaAdapter(prisma),
	secret: process.env.AUTH_SECRET,
	session: {
		strategy: "jwt",
	},
	trustHost: true,
	providers,
	pages: {
		signIn: "/login",
	},
	callbacks: {
		async signIn() {
			return true;
		},
		async jwt({ token, user }) {
			const userId = user?.id || token.sub;
			if (!userId) {
				return token;
			}

			const needsRefresh =
				Boolean(user) ||
				typeof token.role !== "string" ||
				typeof token.slug !== "string" ||
				typeof token.picture !== "string" ||
				typeof token.profileSyncedAt !== "number" ||
				Date.now() - token.profileSyncedAt > AUTH_TOKEN_REFRESH_MS;

			if (!needsRefresh) {
				return token;
			}

			try {
				if (typeof user?.id === "string") {
					await syncAuthenticatedUser({
						id: user.id,
						name: user.name ?? null,
						email: user.email ?? null,
						image: user.image ?? null,
					});
				}

				const snapshot = await getAuthUserSnapshot(userId, Boolean(user));
				if (!snapshot) {
					return token;
				}

				return applyAuthUserSnapshot(token, snapshot);
			} catch (error) {
				console.error("[auth] Failed to refresh JWT session user", error);
				return token;
			}
		},
		async session({ session, token }) {
			if (!session.user || !token.sub) {
				return session;
			}

			session.user.id = token.sub;
			session.user.role = resolveUserRole(token.role as Role | string | null);
			session.user.slug =
				typeof token.slug === "string" ? token.slug : token.sub;
			session.user.image =
				typeof token.picture === "string" ? token.picture : session.user.image;

			return session;
		},
	},
} satisfies NextAuthConfig;

export const {
	handlers: { GET, POST },
	auth,
	signIn,
	signOut,
} = NextAuth(authConfig);
