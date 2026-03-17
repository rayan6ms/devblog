import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/database/prisma";
import { auth } from "@/lib/auth";
import { buildLetterAvatar } from "@/lib/avatar";
import { hashPassword, verifyPassword } from "@/lib/password";
import { normalizeSocialLinks, validateSocialLinks } from "@/lib/social-links";
import { getCurrentUserProfile } from "@/lib/user-profile";
import {
	getPasswordUpdateErrors,
	type PasswordUpdateValues,
} from "@/lib/validation/auth";
import {
	getHandleError,
	getProfileUploadError,
	normalizeHandle,
} from "@/lib/validation/profile";

const profileUpdateSchema = z.object({
	name: z.string().trim().min(2).max(60),
	handle: z.string().trim().min(1).max(50),
	description: z.string().trim().max(300).optional().default(""),
	avatarMode: z.enum(["provider", "generated", "custom"]),
	profilePicture: z.string().trim().optional().default(""),
	socialLinks: z.unknown().optional(),
	password: z
		.object({
			currentPassword: z.string().max(128).optional().default(""),
			newPassword: z.string().max(128).optional().default(""),
			confirmPassword: z.string().max(128).optional().default(""),
		})
		.optional(),
});

export async function GET() {
	const session = await auth();
	if (!session?.user?.id) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const profile = await getCurrentUserProfile(session.user.id);
	if (!profile) {
		return NextResponse.json({ error: "User not found" }, { status: 404 });
	}

	return NextResponse.json(profile);
}

export async function PATCH(req: Request) {
	const session = await auth();
	if (!session?.user?.id) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const payload = await req.json().catch(() => null);
	const parsed = profileUpdateSchema.safeParse(payload);
	if (!parsed.success) {
		return NextResponse.json(
			{ error: "Invalid profile payload." },
			{ status: 400 },
		);
	}

	const socialLinks = normalizeSocialLinks(parsed.data.socialLinks);
	const socialErrors = validateSocialLinks(socialLinks);
	if (Object.keys(socialErrors).length > 0) {
		return NextResponse.json(
			{ error: "Invalid social links.", fields: socialErrors },
			{ status: 400 },
		);
	}

	if (parsed.data.avatarMode === "custom") {
		if (!parsed.data.profilePicture) {
			return NextResponse.json(
				{ error: "Upload a JPG, PNG, or WEBP image." },
				{ status: 400 },
			);
		}

		if (parsed.data.profilePicture.startsWith("data:image/")) {
			const uploadError = getProfileUploadError(parsed.data.profilePicture);
			if (uploadError) {
				return NextResponse.json(
					{ error: uploadError, fields: { profilePicture: uploadError } },
					{ status: 400 },
				);
			}
		} else {
			return NextResponse.json(
				{
					error: "Custom avatar image is invalid.",
					fields: {
						profilePicture: "Upload a JPG, PNG, or WEBP image.",
					},
				},
				{ status: 400 },
			);
		}
	}

	const currentUser = await prisma.user.findUnique({
		where: { id: session.user.id },
		select: {
			id: true,
			passwordHash: true,
			username: true,
			slug: true,
		},
	});

	if (!currentUser) {
		return NextResponse.json({ error: "User not found" }, { status: 404 });
	}

	const passwordValues: PasswordUpdateValues = {
		currentPassword: parsed.data.password?.currentPassword || "",
		newPassword: parsed.data.password?.newPassword || "",
		confirmPassword: parsed.data.password?.confirmPassword || "",
	};
	const passwordErrors = getPasswordUpdateErrors(passwordValues, {
		requireCurrentPassword: Boolean(currentUser.passwordHash),
	});

	if (Object.keys(passwordErrors).length > 0) {
		return NextResponse.json(
			{
				error: currentUser.passwordHash
					? "Unable to change password."
					: "Unable to set password.",
				fields: passwordErrors,
			},
			{ status: 400 },
		);
	}

	if (
		passwordValues.newPassword &&
		currentUser.passwordHash &&
		!verifyPassword(passwordValues.currentPassword, currentUser.passwordHash)
	) {
		return NextResponse.json(
			{
				error: "Unable to change password.",
				fields: {
					currentPassword: "Current password is incorrect.",
				},
			},
			{ status: 400 },
		);
	}

	const handleError = getHandleError(parsed.data.handle);
	if (handleError) {
		return NextResponse.json(
			{
				error: "Unable to save profile.",
				fields: {
					handle: handleError,
				},
			},
			{ status: 400 },
		);
	}

	const normalizedHandle = normalizeHandle(parsed.data.handle);
	if (
		normalizedHandle !== currentUser.slug ||
		normalizedHandle !== currentUser.username
	) {
		const conflictingUser = await prisma.user.findFirst({
			where: {
				id: {
					not: currentUser.id,
				},
				OR: [{ slug: normalizedHandle }, { username: normalizedHandle }],
			},
			select: {
				id: true,
			},
		});

		if (conflictingUser) {
			return NextResponse.json(
				{
					error: "Unable to save profile.",
					fields: {
						handle: "That handle is already taken.",
					},
				},
				{ status: 409 },
			);
		}
	}

	const profilePicture =
		parsed.data.avatarMode === "provider"
			? null
			: parsed.data.avatarMode === "generated"
				? buildLetterAvatar(parsed.data.name)
				: parsed.data.profilePicture || null;

	await prisma.user.update({
		where: { id: session.user.id },
		data: {
			name: parsed.data.name,
			username: normalizedHandle,
			slug: normalizedHandle,
			bio: parsed.data.description,
			profilePic: profilePicture,
			socialLinks,
			...(passwordValues.newPassword
				? {
						passwordHash: hashPassword(passwordValues.newPassword),
					}
				: {}),
		},
	});

	const profile = await getCurrentUserProfile(session.user.id);
	if (!profile) {
		return NextResponse.json({ error: "User not found" }, { status: 404 });
	}

	return NextResponse.json(profile);
}
