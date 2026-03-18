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

let cachedProfile: ProfileUser | null | undefined;
let cachedProfileUserId: string | null = null;
let profilePromise: Promise<ProfileUser | null> | null = null;

function resetProfileCache() {
	cachedProfile = undefined;
	cachedProfileUserId = null;
	profilePromise = null;
}

async function fetchCurrentProfile(userId: string, force = false) {
	if (!force && cachedProfileUserId === userId && cachedProfile !== undefined) {
		return cachedProfile;
	}

	if (!force && cachedProfileUserId === userId && profilePromise) {
		return profilePromise;
	}

	try {
		cachedProfileUserId = userId;
		profilePromise = fetch("/api/user", { cache: "no-store" })
			.then(async (response) => {
				if (!response.ok) {
					return null;
				}

				return (await response.json()) as ProfileUser;
			})
			.catch(() => null)
			.finally(() => {
				profilePromise = null;
			});
		cachedProfile = await profilePromise;
		return cachedProfile;
	} catch {
		return null;
	}
}

export function emitClientAuthChange() {
	if (typeof window === "undefined") {
		return;
	}

	resetProfileCache();
	window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
}

export function useClientAuth(options?: {
	includeProfile?: boolean;
}): ClientAuthState {
	const { data: session, status } = useSession();
	const [profile, setProfile] = useState<ProfileUser | null>(null);
	const [profileLoaded, setProfileLoaded] = useState(false);
	const includeProfile = options?.includeProfile ?? false;

	useEffect(() => {
		let cancelled = false;

		const sync = async (force = false) => {
			if (status !== "authenticated" || !session?.user?.id) {
				resetProfileCache();
				if (!cancelled) {
					setProfile(null);
					setProfileLoaded(true);
				}
				return;
			}

			if (!includeProfile) {
				if (!cancelled) {
					setProfile(null);
					setProfileLoaded(true);
				}
				return;
			}

			setProfileLoaded(false);
			const nextProfile = await fetchCurrentProfile(session.user.id, force);
			if (!cancelled) {
				setProfile(nextProfile);
				setProfileLoaded(true);
			}
		};

		const handleAuthChange = () => {
			void sync(true);
		};

		void sync();
		window.addEventListener(AUTH_CHANGE_EVENT, handleAuthChange);

		return () => {
			cancelled = true;
			window.removeEventListener(AUTH_CHANGE_EVENT, handleAuthChange);
		};
	}, [includeProfile, session?.user?.id, status]);

	const role = (profile?.role || session?.user?.role || "member").toLowerCase();
	const activeUser = profile?.slug || session?.user?.slug || null;
	const isAuthed = status === "authenticated";
	const isLoading =
		status === "loading" ||
		(includeProfile && status === "authenticated" && !profileLoaded);

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
