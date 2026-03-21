import { Role } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/database/prisma";
import {
	canAssignUserRole,
	canManageUserRole,
	canManageUsers,
	isOwnerEmail,
} from "@/lib/admin";
import { auth } from "@/lib/auth";
import { resolveUserRole } from "@/lib/user-profile";

const updateUserRoleSchema = z.object({
	role: z.nativeEnum(Role),
});

function mapManagedUser(user: {
	id: string;
	name: string | null;
	email: string | null;
	username: string | null;
	slug: string | null;
	role: Role;
	createdAt: Date;
}) {
	return {
		id: user.id,
		name: user.name?.trim() || user.username?.trim() || user.slug?.trim() || "User",
		email: user.email,
		username: user.username,
		slug: user.slug,
		role: resolveUserRole(user.role),
		createdAt: user.createdAt.toISOString(),
		isOwnerEmail: isOwnerEmail(user.email),
	};
}

export async function PATCH(
	request: Request,
	context: RouteContext<"/api/admin/users/[id]">,
) {
	const session = await auth();
	if (!session?.user?.id) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}
	if (!canManageUsers(session.user.role)) {
		return NextResponse.json(
			{ error: "You do not have permission to manage users." },
			{ status: 403 },
		);
	}

	const payload = await request.json().catch(() => null);
	const parsed = updateUserRoleSchema.safeParse(payload);
	if (!parsed.success) {
		return NextResponse.json({ error: "Invalid role payload." }, { status: 400 });
	}

	const { id } = await context.params;
	if (id === session.user.id) {
		return NextResponse.json(
			{ error: "You cannot change your own role from this page." },
			{ status: 400 },
		);
	}

	const targetUser = await prisma.user.findUnique({
		where: { id },
		select: {
			id: true,
			name: true,
			email: true,
			username: true,
			slug: true,
			role: true,
			createdAt: true,
		},
	});

	if (!targetUser) {
		return NextResponse.json({ error: "User not found." }, { status: 404 });
	}
	if (!canManageUserRole(session.user.role, targetUser.role)) {
		return NextResponse.json(
			{ error: "You do not have permission to edit this user." },
			{ status: 403 },
		);
	}
	if (!canAssignUserRole(session.user.role, parsed.data.role)) {
		return NextResponse.json(
			{ error: "You do not have permission to assign that role." },
			{ status: 403 },
		);
	}
	if (
		isOwnerEmail(targetUser.email) &&
		parsed.data.role !== Role.owner
	) {
		return NextResponse.json(
			{
				error: "Remove this email from OWNER_EMAIL before lowering its role.",
			},
			{ status: 400 },
		);
	}

	const updatedUser =
		parsed.data.role === targetUser.role
			? targetUser
			: await prisma.user.update({
					where: { id: targetUser.id },
					data: { role: parsed.data.role },
					select: {
						id: true,
						name: true,
						email: true,
						username: true,
						slug: true,
						role: true,
						createdAt: true,
					},
				});

	return NextResponse.json({ user: mapManagedUser(updatedUser) });
}
