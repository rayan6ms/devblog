import { PrismaAdapter } from "@auth/prisma-adapter";
import type { Role } from "@prisma/client";
import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import prisma from "@/database/prisma";
import { verifyPassword } from "@/lib/password";
import {
	ensureUserIdentityFields,
	normalizeEmail,
	resolveProfilePicture,
	resolveUserRole,
} from "@/lib/user-profile";
import { loginSchema } from "@/lib/validation/auth";

async function syncAuthenticatedUser(user: {
	id: string;
	name?: string | null;
	email?: string | null;
	image?: string | null;
}) {
	const { username, slug } = await ensureUserIdentityFields({
		id: user.id,
		name: user.name ?? null,
		email: user.email ?? null,
	});

	await prisma.user.upsert({
		where: { id: user.id },
		update: {
			name: user.name,
			email: user.email ? normalizeEmail(user.email) : null,
			username,
			slug,
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
			role: "member",
		},
	});
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
			if (typeof user?.id === "string") {
				await syncAuthenticatedUser({
					id: user.id,
					name: user.name ?? null,
					email: user.email ?? null,
					image: user.image ?? null,
				});
			}

			const userId = user?.id || token.sub;
			if (!userId) {
				return token;
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
				return token;
			}

			token.sub = dbUser.id;
			token.role = resolveUserRole(dbUser.role);
			token.slug = dbUser.slug || dbUser.id;
			token.picture = resolveProfilePicture(dbUser);
			token.name = dbUser.name || token.name;
			token.email = dbUser.email || token.email;

			return token;
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
