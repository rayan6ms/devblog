"use client";

import { useParams } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";
import Footer from "@/components/Footer";
import { useI18n } from "@/components/LocaleProvider";
import LocalizedLink from "@/components/LocalizedLink";
import { emitClientAuthChange } from "@/components/useClientAuth";
import { useLocaleNavigation } from "@/hooks/useLocaleNavigation";
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
	children?: ReactNode;
}) {
	return (
		<div className="rounded-2xl border border-zinc-700/50 bg-greyBg/75 px-4 py-4">
			<p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
				{label}
			</p>
			{value ? (
				<p className="mt-2 text-sm font-semibold text-zinc-100">{value}</p>
			) : (
				children
			)}
		</div>
	);
}

export default function Profile() {
	const { messages } = useI18n();
	const [user, setUser] = useState<ProfileUser | null>(null);
	const [isEditOpen, setIsEditOpen] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const params = useParams<{ id: string }>();
	const { replace } = useLocaleNavigation();
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
						setError(messages.profile.loadLoginRequired);
					} else if (response.status === 404) {
						setError(messages.profile.loadNotFound);
					} else {
						setError(messages.profile.loadError);
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
					setError(messages.profile.loadError);
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
	}, [
		messages.profile.loadError,
		messages.profile.loadLoginRequired,
		messages.profile.loadNotFound,
		profileId,
	]);

	async function handleSaveProfile(updated: ProfileUpdatePayload) {
		const response = await fetch("/api/user", {
			method: "PATCH",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(updated),
		});

		if (!response.ok) {
			const result = (await response.json().catch(() => null)) as {
				error?: string;
				fields?: Record<string, string>;
			} | null;
			const error = new Error(
				result?.error || messages.profile.saveError,
			) as Error & {
				fieldErrors?: Record<string, string>;
			};
			error.fieldErrors = result?.fields;
			throw error;
		}

		const nextUser = (await response.json()) as ProfileUser;
		setUser(nextUser);
		emitClientAuthChange();

		if (profileId !== "me" && profileId !== nextUser.slug) {
			replace(`/profile/${nextUser.slug}`);
		}
	}

	return (
		<>
			<div className="min-h-screen bg-darkBg text-gray">
				<section className="mx-auto w-full max-w-[1440px] px-4 pb-10 pt-8 sm:px-6 lg:px-8">
					{isLoading ? (
						<div className="rounded-[30px] border border-zinc-700/50 bg-lessDarkBg/90 px-6 py-16 text-center shadow-xl shadow-zinc-950/20 sm:px-8">
							<p className="text-sm uppercase tracking-[0.22em] text-zinc-500">
								{messages.common.loadingProfile}
							</p>
							<h1 className="mt-4 text-3xl font-somerton uppercase text-wheat">
								{messages.common.preparingPage}
							</h1>
						</div>
					) : error || !user ? (
						<div className="rounded-[30px] border border-zinc-700/50 bg-lessDarkBg/90 px-6 py-16 text-center shadow-xl shadow-zinc-950/20 sm:px-8">
							<p className="text-sm uppercase tracking-[0.22em] text-zinc-500">
								{messages.profile.unavailable}
							</p>
							<h1 className="mt-4 text-3xl font-somerton uppercase text-wheat">
								{error || messages.profile.loadError}
							</h1>
							{profileId === "me" ? (
								<LocalizedLink
									href="/login"
									className="mt-6 inline-flex rounded-full border border-zinc-600/60 bg-greyBg/75 px-5 py-3 text-sm font-semibold text-zinc-100 transition-colors hover:border-zinc-500/70 hover:text-wheat"
								>
									{messages.profile.goToLogin}
								</LocalizedLink>
							) : null}
						</div>
					) : (
						<div className="grid gap-6">
							<div className="rounded-[30px] border border-zinc-700/50 bg-lessDarkBg/90 px-6 py-8 shadow-xl shadow-zinc-950/20 sm:px-8">
								<div className="mb-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
									<div className="max-w-3xl">
										<p className="text-xs uppercase tracking-[0.28em] text-zinc-500">
											{messages.profile.overview}
										</p>
										<h1 className="mt-3 text-4xl font-somerton uppercase text-wheat sm:text-5xl">
											{user.isCurrentUser
												? messages.profile.yourProfile
												: user.name}
										</h1>
										<p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-400 sm:text-base">
											{messages.profile.description}
										</p>
									</div>
									<div className="grid gap-3 sm:grid-cols-3">
										<MetaCard
											label={messages.profile.bookmarks}
											value={`${user.stats.bookmarks}`}
										/>
										<MetaCard
											label={messages.profile.viewedPosts}
											value={`${user.stats.views}`}
										/>
										<MetaCard
											label={messages.profile.comments}
											value={`${user.stats.comments}`}
										/>
									</div>
								</div>

								<Header
									user={user}
									onEdit={
										user.isCurrentUser ? () => setIsEditOpen(true) : undefined
									}
								/>
							</div>

							<div
								className={`grid gap-4 ${
									user.isCurrentUser ? "lg:grid-cols-4" : "lg:grid-cols-3"
								}`}
							>
								<MetaCard
									label={messages.profile.handle}
									value={`@${user.slug}`}
								/>
								{user.isCurrentUser ? (
									<MetaCard
										label={messages.profile.email}
										value={user.email || messages.profile.notSet}
									/>
								) : (
									<MetaCard label={messages.profile.role} value={user.role} />
								)}
								{user.isCurrentUser ? (
									<MetaCard
										label={messages.profile.passwordLogin}
										value={
											user.hasPassword
												? messages.profile.configured
												: messages.profile.notSet
										}
									/>
								) : null}
								<MetaCard label={messages.profile.connectedAccounts}>
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
												{messages.profile.credentialsOnly}
											</p>
										)}
									</div>
								</MetaCard>
							</div>

							<div className="grid gap-6 xl:grid-cols-2">
								<Slider
									title={messages.profile.bookmarks}
									iconKey="bookmarks"
									items={user.bookmarks}
								/>
								<Slider
									title={messages.profile.viewedPosts}
									iconKey="viewedPosts"
									items={user.viewedPosts}
								/>
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
