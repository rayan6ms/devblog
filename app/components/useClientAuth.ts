"use client";

import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import type { ProfileUser } from "@/profile/types";

const AUTH_CHANGE_EVENT = "devblog:auth-change";
const WRITER_ROLES = new Set(["owner", "admin", "writer", "volunteer"]);

export type ClientAuthState = {
	activeUser: string | null;
	canWrite: boolean;
	isAuthed: boolean;
	isLoading: boolean;
	profile: ProfileUser | null;
	role: string;
};

async function fetchCurrentProfile() {
	try {
		const response = await fetch("/api/user", { cache: "no-store" });
		if (!response.ok) {
			return null;
		}

		return (await response.json()) as ProfileUser;
	} catch {
		return null;
	}
}

export function emitClientAuthChange() {
	if (typeof window === "undefined") {
		return;
	}

	window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
}

export function useClientAuth(): ClientAuthState {
	const { data: session, status } = useSession();
	const [profile, setProfile] = useState<ProfileUser | null>(null);
	const [profileLoaded, setProfileLoaded] = useState(false);

	useEffect(() => {
		let cancelled = false;

		const sync = async () => {
			if (status !== "authenticated") {
				if (!cancelled) {
					setProfile(null);
					setProfileLoaded(true);
				}
				return;
			}

			setProfileLoaded(false);
			const nextProfile = await fetchCurrentProfile();
			if (!cancelled) {
				setProfile(nextProfile);
				setProfileLoaded(true);
			}
		};

		const handleAuthChange = () => {
			void sync();
		};

		void sync();
		window.addEventListener(AUTH_CHANGE_EVENT, handleAuthChange);

		return () => {
			cancelled = true;
			window.removeEventListener(AUTH_CHANGE_EVENT, handleAuthChange);
		};
	}, [session?.user?.id, status]);

	const role = (profile?.role || session?.user?.role || "member").toLowerCase();
	const activeUser = profile?.slug || session?.user?.slug || null;
	const isAuthed = status === "authenticated";
	const isLoading =
		status === "loading" || (status === "authenticated" && !profileLoaded);

	return useMemo(
		() => ({
			activeUser,
			canWrite: WRITER_ROLES.has(role),
			isAuthed,
			isLoading,
			profile,
			role,
		}),
		[activeUser, isAuthed, isLoading, profile, role],
	);
}
