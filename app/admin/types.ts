import type { UserRole } from "@/profile/types";

export type AdminManagedUser = {
	id: string;
	name: string;
	email: string | null;
	username: string | null;
	slug: string | null;
	role: UserRole;
	createdAt: string;
	isOwnerEmail: boolean;
};
