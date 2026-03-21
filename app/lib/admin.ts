import { type Role } from "@prisma/client";
import type { UserRole } from "@/profile/types";

const USER_MANAGEMENT_ROLES = new Set<UserRole>(["admin", "owner"]);
const OWNER_ROLE: UserRole = "owner";
const ADMIN_ROLE: UserRole = "admin";
const ADMIN_MANAGEABLE_ROLES = new Set<UserRole>([
	"member",
	"volunteer",
	"writer",
	"vip",
]);
const ALL_USER_ROLES: UserRole[] = [
	"member",
	"volunteer",
	"writer",
	"vip",
	"admin",
	"owner",
];

function normalizeEmail(email: string) {
	return email.trim().toLowerCase();
}

function resolveUserRole(role?: Role | UserRole | string | null): UserRole {
	const normalized = (role || "member").toString().toLowerCase();
	return ALL_USER_ROLES.includes(normalized as UserRole)
		? (normalized as UserRole)
		: "member";
}

function readOwnerEmail() {
	const configuredEmail = process.env.OWNER_EMAIL?.trim();
	return configuredEmail ? normalizeEmail(configuredEmail) : null;
}

export function isOwnerEmail(email?: string | null) {
	if (!email) {
		return false;
	}

	const ownerEmail = readOwnerEmail();
	return ownerEmail ? ownerEmail === normalizeEmail(email) : false;
}

export function canManageUsers(role?: Role | UserRole | string | null) {
	return USER_MANAGEMENT_ROLES.has(resolveUserRole(role));
}

export function canManageUserRole(
	actorRole?: Role | UserRole | string | null,
	targetRole?: Role | UserRole | string | null,
) {
	const actor = resolveUserRole(actorRole);
	const target = resolveUserRole(targetRole);

	if (actor === OWNER_ROLE) {
		return true;
	}

	return actor === ADMIN_ROLE && ADMIN_MANAGEABLE_ROLES.has(target);
}

export function canAssignUserRole(
	actorRole?: Role | UserRole | string | null,
	nextRole?: Role | UserRole | string | null,
) {
	const actor = resolveUserRole(actorRole);
	const next = resolveUserRole(nextRole);

	if (actor === OWNER_ROLE) {
		return true;
	}

	return actor === ADMIN_ROLE && ADMIN_MANAGEABLE_ROLES.has(next);
}

export function resolveRoleForAuthenticatedUser(options: {
	currentRole?: Role | UserRole | string | null;
	email?: string | null;
}) {
	const currentRole = resolveUserRole(options.currentRole);

	if (isOwnerEmail(options.email)) {
		return OWNER_ROLE;
	}

	return currentRole;
}

export function resolveRoleForNewUser(email?: string | null) {
	return isOwnerEmail(email) ? OWNER_ROLE : "member";
}
