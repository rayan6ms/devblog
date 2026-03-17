"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Footer from "@/components/Footer";
import { emitClientAuthChange } from "@/components/useClientAuth";
import type { ProfileAvatarMode, ProfileUser } from "@/profile/types";
import Comments from "../Comments";
import Header from "../Header";
import ProfileEditModal from "../ProfileEditModal";
import Slider from "../Slider";

type ProfileUpdatePayload = {
	name: string;
	handle: string;
	description: string;
	avatarMode: ProfileAvatarMode;
	profilePicture: string;
	socialLinks: ProfileUser["socialLinks"];
	password: {
		currentPassword: string;
		newPassword: string;
		confirmPassword: string;
	};
};

function MetaCard({
	label,
	value,
	children,
}: {
	label: string;
	value?: string | null;
	children?: React.ReactNode;
}) {
	return (
		<div className="rounded-2xl border border-zinc-700/50 bg-greyBg/75 px-4 py-4">
			<p className="text-xs uppercase tracking-[0.2em] text-zinc-500">{label}</p>
			{value ? (
				<p className="mt-2 text-sm font-semibold text-zinc-100">{value}</p>
			) : children}
		</div>
	);
}

export default function Profile() {
	const [user, setUser] = useState<ProfileUser | null>(null);
	const [isEditOpen, setIsEditOpen] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const params = useParams<{ id: string }>();
	const router = useRouter();
	const profileId = params.id;

	useEffect(() => {
		let cancelled = false;

		const fetchProfile = async () => {
			setIsLoading(true);
			setError(null);

			try {
				const endpoint =
					profileId === "me"
						? "/api/user"
						: `/api/user/${encodeURIComponent(profileId)}`;
				const response = await fetch(endpoint, {
					cache: "no-store",
				});

				if (!response.ok) {
					if (response.status === 401) {
						setError("Please login to access your profile.");
					} else if (response.status === 404) {
						setError("This profile could not be found.");
					} else {
						setError("Unable to load this profile right now.");
					}
					setUser(null);
					return;
				}

				const nextUser = (await response.json()) as ProfileUser;
				if (!cancelled) {
					setUser(nextUser);
				}
			} catch {
				if (!cancelled) {
					setError("Unable to load this profile right now.");
					setUser(null);
				}
			} finally {
				if (!cancelled) {
					setIsLoading(false);
				}
			}
		};

		void fetchProfile();

		return () => {
			cancelled = true;
		};
	}, [profileId]);

	async function handleSaveProfile(updated: ProfileUpdatePayload) {
		const response = await fetch("/api/user", {
			method: "PATCH",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(updated),
		});

		if (!response.ok) {
			const result = (await response.json().catch(() => null)) as
				| {
						error?: string;
						fields?: Record<string, string>;
				  }
				| null;
			const error = new Error(result?.error || "Unable to save profile.") as Error & {
				fieldErrors?: Record<string, string>;
			};
			error.fieldErrors = result?.fields;
			throw error;
		}

		const nextUser = (await response.json()) as ProfileUser;
		setUser(nextUser);
		emitClientAuthChange();

		if (profileId !== "me" && profileId !== nextUser.slug) {
			router.replace(`/profile/${nextUser.slug}`);
		}
	}

	return (
		<>
			<div className="min-h-screen bg-darkBg text-gray">
				<section className="mx-auto w-full max-w-[1440px] px-4 pb-10 pt-8 sm:px-6 lg:px-8">
					{isLoading ? (
						<div className="rounded-[30px] border border-zinc-700/50 bg-lessDarkBg/90 px-6 py-16 text-center shadow-xl shadow-zinc-950/20 sm:px-8">
							<p className="text-sm uppercase tracking-[0.22em] text-zinc-500">
								Loading profile
							</p>
							<h1 className="mt-4 text-3xl font-somerton uppercase text-wheat">
								Preparing the page
							</h1>
						</div>
					) : error || !user ? (
						<div className="rounded-[30px] border border-zinc-700/50 bg-lessDarkBg/90 px-6 py-16 text-center shadow-xl shadow-zinc-950/20 sm:px-8">
							<p className="text-sm uppercase tracking-[0.22em] text-zinc-500">
								Profile unavailable
							</p>
							<h1 className="mt-4 text-3xl font-somerton uppercase text-wheat">
								{error || "Unable to load this profile."}
							</h1>
							{profileId === "me" ? (
								<Link
									href="/login"
									className="mt-6 inline-flex rounded-full border border-zinc-600/60 bg-greyBg/75 px-5 py-3 text-sm font-semibold text-zinc-100 transition-colors hover:border-zinc-500/70 hover:text-wheat"
								>
									Go to login
								</Link>
							) : null}
						</div>
					) : (
						<div className="grid gap-6">
							<div className="rounded-[30px] border border-zinc-700/50 bg-lessDarkBg/90 px-6 py-8 shadow-xl shadow-zinc-950/20 sm:px-8">
								<div className="mb-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
									<div className="max-w-3xl">
										<p className="text-xs uppercase tracking-[0.28em] text-zinc-500">
											Profile overview
										</p>
										<h1 className="mt-3 text-4xl font-somerton uppercase text-wheat sm:text-5xl">
											{user.isCurrentUser ? "Your profile" : user.name}
										</h1>
										<p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-400 sm:text-base">
											Real account data is now backed by the database, including
											role, connected providers, persisted profile fields, and live
											activity counts.
										</p>
									</div>
									<div className="grid gap-3 sm:grid-cols-3">
										<MetaCard label="Bookmarks" value={`${user.stats.bookmarks}`} />
										<MetaCard label="Viewed posts" value={`${user.stats.views}`} />
										<MetaCard label="Comments" value={`${user.stats.comments}`} />
									</div>
								</div>

								<Header
									user={user}
									onEdit={user.isCurrentUser ? () => setIsEditOpen(true) : undefined}
								/>
							</div>

							<div
								className={`grid gap-4 ${
									user.isCurrentUser ? "lg:grid-cols-4" : "lg:grid-cols-3"
								}`}
							>
								<MetaCard label="Handle" value={`@${user.slug}`} />
								{user.isCurrentUser ? (
									<MetaCard label="Email" value={user.email || "Not set"} />
								) : (
									<MetaCard label="Role" value={user.role} />
								)}
								{user.isCurrentUser ? (
									<MetaCard
										label="Password login"
										value={user.hasPassword ? "Configured" : "Not set"}
									/>
								) : null}
								<MetaCard label="Connected accounts">
									<div className="mt-2 flex flex-wrap gap-2">
										{user.connectedAccounts.length > 0 ? (
											user.connectedAccounts.map((account) => (
												<span
													key={account.provider}
													className="rounded-full border border-zinc-600/50 bg-zinc-800/60 px-3 py-1 text-xs uppercase tracking-[0.14em] text-zinc-200"
												>
													{account.provider}
												</span>
											))
										) : (
											<p className="mt-2 text-sm text-zinc-400">
												Credentials only
											</p>
										)}
									</div>
								</MetaCard>
							</div>

							<div className="grid gap-6 xl:grid-cols-2">
								<Slider title="Bookmarks" items={user.bookmarks} />
								<Slider title="Viewed Posts" items={user.viewedPosts} />
							</div>

							<Comments comments={user.comments} />
						</div>
					)}
				</section>
			</div>
			{user?.isCurrentUser ? (
				<ProfileEditModal
					isOpen={isEditOpen}
					onClose={() => setIsEditOpen(false)}
					initialUser={user}
					onSave={handleSaveProfile}
				/>
			) : null}
			<Footer />
		</>
	);
}
