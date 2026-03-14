"use client";

import { useEffect, useMemo, useState } from "react";

const AUTH_CHANGE_EVENT = "devblog:auth-change";
const WRITER_ROLES = new Set(["owner", "admin", "writer"]);

type StoredAuthUser = {
	id?: string;
	role?: string;
};

type StoredUserProfile = {
	name?: string;
	role?: string;
	profilePicture?: string;
	description?: string;
	socialLinks?: Record<string, string>;
};

export type ClientAuthState = {
	activeUser: string | null;
	canWrite: boolean;
	isAuthed: boolean;
	profile: StoredUserProfile | null;
	role: string;
};

function readStoredAuth(): Omit<ClientAuthState, "canWrite"> {
	if (typeof window === "undefined") {
		return {
			activeUser: null,
			isAuthed: false,
			profile: null,
			role: "member",
		};
	}

	try {
		const authRaw = localStorage.getItem("authUser");
		const profileRaw = localStorage.getItem("userProfile");
		const authUser = authRaw ? (JSON.parse(authRaw) as StoredAuthUser) : null;
		const profile = profileRaw
			? (JSON.parse(profileRaw) as StoredUserProfile)
			: null;
		const role = (authUser?.role || profile?.role || "member").toLowerCase();

		return {
			activeUser: authUser?.id ?? null,
			isAuthed: Boolean(authUser?.id),
			profile,
			role,
		};
	} catch {
		return {
			activeUser: null,
			isAuthed: false,
			profile: null,
			role: "member",
		};
	}
}

export function emitClientAuthChange() {
	if (typeof window === "undefined") {
		return;
	}

	window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
}

export function writeMockAuth(
	profile: StoredUserProfile & {
		id?: string;
	},
) {
	if (typeof window === "undefined") {
		return;
	}

	const role = (profile.role || "member").toLowerCase();

	localStorage.setItem(
		"authUser",
		JSON.stringify({
			id: profile.id || "me",
			role,
		}),
	);

	localStorage.setItem(
		"userProfile",
		JSON.stringify({
			...profile,
			role,
		}),
	);

	emitClientAuthChange();
}

export function clearMockAuth() {
	if (typeof window === "undefined") {
		return;
	}

	localStorage.removeItem("authUser");
	emitClientAuthChange();
}

export function useClientAuth(): ClientAuthState {
	const [authState, setAuthState] = useState(() => readStoredAuth());

	useEffect(() => {
		const sync = () => {
			setAuthState(readStoredAuth());
		};

		sync();

		const handleStorage = (event: StorageEvent) => {
			if (event.key === "authUser" || event.key === "userProfile") {
				sync();
			}
		};

		window.addEventListener("storage", handleStorage);
		window.addEventListener(AUTH_CHANGE_EVENT, sync);

		return () => {
			window.removeEventListener("storage", handleStorage);
			window.removeEventListener(AUTH_CHANGE_EVENT, sync);
		};
	}, []);

	return useMemo(
		() => ({
			...authState,
			canWrite: WRITER_ROLES.has(authState.role),
		}),
		[authState],
	);
}
