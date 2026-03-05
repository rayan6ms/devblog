import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth, { type NextAuthConfig } from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import slugify from "slugify";
import prisma from "@/database/prisma";

async function uniqueSlug(base: string) {
	const raw = slugify(base, { lower: true, strict: true }) || "user";
	let candidate = raw;
	let i = 1;
	while (await prisma.user.findUnique({ where: { slug: candidate } })) {
		candidate = `${raw}-${i}`;
		i += 1;
	}
	return candidate;
}

async function uniqueUsername(base: string) {
	const raw = base.trim() || "user";
	let candidate = raw;
	let i = 1;
	while (await prisma.user.findUnique({ where: { username: candidate } })) {
		candidate = `${raw}${i}`;
		i += 1;
	}
	return candidate;
}

export const authConfig = {
	adapter: PrismaAdapter(prisma),
	session: { strategy: "jwt" },
	providers: [
		GitHub,
		Google,
		// You can add Credentials later for email+password
	],
	callbacks: {
		async signIn({ user }) {
			if (!user?.id) return false;
			const base = user.name || user.email?.split("@")[0] || "user";
			const existing = await prisma.user.findUnique({
				where: { id: user.id },
				select: { username: true, slug: true },
			});

			const username = existing?.username || (await uniqueUsername(base));
			const slug = existing?.slug || (await uniqueSlug(base));

			await prisma.user.upsert({
				where: { id: user.id },
				update: {
					name: user.name,
					email: user.email,
					image: user.image,
					...(existing?.username ? {} : { username }),
					...(existing?.slug ? {} : { slug }),
				},
				create: {
					id: user.id,
					name: user.name,
					email: user.email,
					image: user.image,
					username,
					slug,
					role: "member",
				},
			});
			return true;
		},
		async jwt({ token, user }) {
			if (user) token.uid = user.id;
			return token;
		},
		async session({ session, token }) {
			if (token?.uid) session.user.id = token.uid as string;
			return session;
		},
	},
} satisfies NextAuthConfig;

export const {
	handlers: { GET, POST },
	auth,
} = NextAuth(authConfig);
