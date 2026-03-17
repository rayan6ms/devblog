import { NextResponse } from "next/server";
import prisma from "@/database/prisma";
import { hashPassword } from "@/lib/password";
import { registerPayloadSchema } from "@/lib/validation/auth";
import {
	ensureUniqueSlug,
	ensureUniqueUsername,
	normalizeEmail,
} from "@/lib/user-profile";

export async function POST(req: Request) {
	const payload = await req.json().catch(() => null);
	const parsed = registerPayloadSchema.safeParse(payload);

	if (!parsed.success) {
		const fieldErrors = parsed.error.flatten().fieldErrors;
		return NextResponse.json(
			{
				error: "Please correct the highlighted fields.",
				fields: fieldErrors,
			},
			{ status: 400 },
		);
	}

	const { name, password } = parsed.data;
	const email = normalizeEmail(parsed.data.email);
	const existingUser = await prisma.user.findUnique({
		where: { email },
		select: { id: true },
	});

	if (existingUser) {
		return NextResponse.json(
			{
				error: "An account with this email already exists.",
				fields: {
					email: ["An account with this email already exists."],
				},
			},
			{ status: 409 },
		);
	}

	const base = name || email.split("@")[0] || "user";
	const [username, slug] = await Promise.all([
		ensureUniqueUsername(base),
		ensureUniqueSlug(base),
	]);

	const user = await prisma.user.create({
		data: {
			name,
			email,
			passwordHash: hashPassword(password),
			username,
			slug,
			role: "member",
		},
		select: {
			id: true,
			email: true,
			name: true,
			slug: true,
			username: true,
		},
	});

	return NextResponse.json(user, { status: 201 });
}
