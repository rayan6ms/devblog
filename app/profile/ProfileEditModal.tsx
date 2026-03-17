"use client";

import { useEffect, useMemo, useState } from "react";
import { buildLetterAvatar } from "@/lib/avatar";
import {
	hostOkFor,
	SOCIAL_PROVIDERS,
	type SocialProvider,
} from "@/lib/social-links";
import {
	getPasswordUpdateErrors,
	type PasswordUpdateValues,
} from "@/lib/validation/auth";
import {
	getHandleError,
	getProfileUploadError,
	normalizeHandle,
	PROFILE_UPLOAD_ACCEPT,
	PROFILE_UPLOAD_MAX_BYTES,
} from "@/lib/validation/profile";
import type { ProfileAvatarMode, ProfileUser } from "@/profile/types";

type ProfileUpdatePayload = {
	name: string;
	handle: string;
	description: string;
	avatarMode: ProfileAvatarMode;
	profilePicture: string;
	socialLinks: ProfileUser["socialLinks"];
	password: PasswordUpdateValues;
};

type Props = {
	isOpen: boolean;
	onClose: () => void;
	initialUser: ProfileUser;
	onSave: (payload: ProfileUpdatePayload) => Promise<void> | void;
};

const MAX_NAME = 60;
const MAX_DESC = 300;

export default function ProfileEditModal({
	isOpen,
	onClose,
	initialUser,
	onSave,
}: Props) {
	if (!isOpen) return null;

	return (
		<ProfileEditModalBody
			initialUser={initialUser}
			onClose={onClose}
			onSave={onSave}
		/>
	);
}

function ProfileEditModalBody({
	onClose,
	initialUser,
	onSave,
}: Omit<Props, "isOpen">) {
	const [name, setName] = useState(initialUser.name);
	const [handle, setHandle] = useState(initialUser.slug);
	const [description, setDescription] = useState(initialUser.description);
	const [links, setLinks] = useState(initialUser.socialLinks);
	const [avatarMode, setAvatarMode] = useState<ProfileAvatarMode>(
		initialUser.avatarMode,
	);
	const [uploadedAvatarData, setUploadedAvatarData] = useState(
		initialUser.avatarMode === "custom" &&
			initialUser.profilePicture.startsWith("data:image/")
			? initialUser.profilePicture
			: "",
	);
	const [uploadedAvatarName, setUploadedAvatarName] = useState(
		initialUser.avatarMode === "custom" &&
			initialUser.profilePicture.startsWith("data:image/")
			? "Uploaded image"
			: "",
	);
	const [saving, setSaving] = useState(false);
	const [errors, setErrors] = useState<Record<string, string>>({});
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [currentPassword, setCurrentPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");

	useEffect(() => {
		const handler = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				onClose();
			}
		};

		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [onClose]);

	const generatedAvatar = useMemo(
		() => buildLetterAvatar(name || initialUser.name || "User"),
		[name, initialUser.name],
	);
	const normalizedHandle = useMemo(() => normalizeHandle(handle), [handle]);
	const customAvatarValue = uploadedAvatarData;

	const avatarPreview =
		avatarMode === "provider"
			? initialUser.providerPicture || generatedAvatar
			: avatarMode === "generated"
				? generatedAvatar
				: customAvatarValue || initialUser.profilePicture || generatedAvatar;

	const dirty = useMemo(
		() =>
			name !== initialUser.name ||
			handle !== initialUser.slug ||
			description !== initialUser.description ||
			avatarMode !== initialUser.avatarMode ||
			customAvatarValue !==
				(initialUser.avatarMode === "custom" &&
				initialUser.profilePicture.startsWith("data:image/")
					? initialUser.profilePicture
					: "") ||
			SOCIAL_PROVIDERS.some(
				(provider) => links[provider] !== initialUser.socialLinks[provider],
			) ||
			currentPassword.length > 0 ||
			newPassword.length > 0 ||
			confirmPassword.length > 0,
		[
			avatarMode,
			confirmPassword,
			currentPassword,
			customAvatarValue,
			description,
			handle,
			initialUser,
			links,
			name,
			newPassword,
		],
	);

	function validate() {
		const nextErrors: Record<string, string> = {};

		if (!name.trim()) {
			nextErrors.name = "Name is required.";
		} else if (name.trim().length > MAX_NAME) {
			nextErrors.name = `Max ${MAX_NAME} characters.`;
		}

		const handleError = getHandleError(handle);
		if (handleError) {
			nextErrors.handle = handleError;
		}

		if (description.trim().length > MAX_DESC) {
			nextErrors.description = `Max ${MAX_DESC} characters.`;
		}

		if (avatarMode === "custom" && uploadedAvatarData) {
			const uploadError = getProfileUploadError(uploadedAvatarData);
			if (uploadError) {
				nextErrors.profilePicture = uploadError;
			}
		} else if (avatarMode === "custom") {
			nextErrors.profilePicture = "Upload a JPG, PNG, or WEBP image.";
		}

		for (const provider of SOCIAL_PROVIDERS) {
			const value = links[provider];
			if (value && !hostOkFor(provider, value)) {
				nextErrors[provider] = `Invalid ${provider} URL.`;
			}
		}

		Object.assign(
			nextErrors,
			getPasswordUpdateErrors(
				{
					currentPassword,
					newPassword,
					confirmPassword,
				},
				{
					requireCurrentPassword: initialUser.hasPassword,
				},
			),
		);

		setErrors(nextErrors);
		return Object.keys(nextErrors).length === 0;
	}

	function handleAvatarUpload(event: React.ChangeEvent<HTMLInputElement>) {
		const file = event.target.files?.[0];
		if (!file) {
			return;
		}

		if (!PROFILE_UPLOAD_ACCEPT.includes(file.type as (typeof PROFILE_UPLOAD_ACCEPT)[number])) {
			setErrors((current) => ({
				...current,
				profilePicture: "Only JPG, PNG, or WEBP images are allowed.",
			}));
			return;
		}

		if (file.size > PROFILE_UPLOAD_MAX_BYTES) {
			setErrors((current) => ({
				...current,
				profilePicture: "Max image size is 2MB.",
			}));
			return;
		}

		const reader = new FileReader();
		reader.onload = () => {
			const result = typeof reader.result === "string" ? reader.result : "";
			setAvatarMode("custom");
			setUploadedAvatarData(result);
			setUploadedAvatarName(file.name);
			setErrors((current) => {
				const nextErrors = { ...current };
				delete nextErrors.profilePicture;
				return nextErrors;
			});
		};
		reader.readAsDataURL(file);
		event.target.value = "";
	}

	async function handleSave() {
		if (!validate()) {
			return;
		}

		setSaving(true);

		try {
			setSubmitError(null);
			await onSave({
				name: name.trim(),
				handle: normalizedHandle,
				description: description.trim(),
				avatarMode,
				profilePicture: customAvatarValue.trim(),
				socialLinks: {
					linkedin: links.linkedin.trim(),
					github: links.github.trim(),
					youtube: links.youtube.trim(),
					twitter: links.twitter.trim(),
				},
				password: {
					currentPassword,
					newPassword,
					confirmPassword,
				},
			});
			onClose();
		} catch (error) {
			const fieldErrors =
				typeof error === "object" &&
				error !== null &&
				"fieldErrors" in error &&
				typeof error.fieldErrors === "object" &&
				error.fieldErrors !== null
					? (error.fieldErrors as Record<string, string>)
					: null;
			if (fieldErrors) {
				setErrors((current) => ({
					...current,
					...fieldErrors,
				}));
			}
			setSubmitError(
				error instanceof Error ? error.message : "Unable to save profile.",
			);
		} finally {
			setSaving(false);
		}
	}

	return (
		<div className="fixed inset-0 z-50 overflow-y-auto p-3 sm:p-4">
			<button
				type="button"
				className="fixed inset-0 bg-black/75 backdrop-blur-xl"
				aria-label="Close edit profile modal"
				onClick={onClose}
			/>
			<div className="relative flex min-h-full items-start justify-center sm:items-center">
				<div
					role="dialog"
					aria-modal="true"
					aria-labelledby="edit-profile-title"
					className="relative flex w-full max-w-4xl flex-col overflow-hidden rounded-[30px] border border-zinc-700/60 bg-lessDarkBg/95 shadow-[0_32px_120px_rgba(0,0,0,0.55)] max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-2rem)]"
				>
				<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(103,79,248,0.34),transparent_42%),linear-gradient(180deg,rgba(103,79,248,0.14),rgba(20,23,26,0.02)_28%,rgba(20,23,26,0.78)_100%)]" />
				<div className="relative flex items-center justify-between border-b border-zinc-700/50 px-6 py-5 sm:px-8">
					<div>
						<p className="text-xs uppercase tracking-[0.28em] text-zinc-500">
							Profile settings
						</p>
						<h3
							id="edit-profile-title"
							className="mt-2 text-3xl font-somerton uppercase text-wheat"
						>
							Edit profile
						</h3>
					</div>
					<button
						type="button"
						className="rounded-full border border-zinc-600/50 bg-greyBg/70 px-4 py-2 text-sm font-semibold text-zinc-100 transition-colors hover:border-zinc-500/70 hover:text-wheat"
						onClick={onClose}
						aria-label="Close"
					>
						Close
					</button>
				</div>

				<div className="relative grid min-h-0 flex-1 gap-6 overflow-y-auto px-6 py-6 sm:px-8 xl:grid-cols-[320px_minmax(0,1fr)]">
					<div className="rounded-[28px] border border-zinc-700/50 bg-greyBg/70 p-5 shadow-xl shadow-zinc-950/20">
						<p className="text-xs uppercase tracking-[0.24em] text-zinc-500">
							Preview
						</p>
						<div className="mt-5 mx-auto h-36 w-36 overflow-hidden rounded-[28px] border border-zinc-200/70 shadow-xl shadow-zinc-950/30">
						<img
							src={avatarPreview}
							alt="Profile preview"
							className="h-full w-full object-cover"
						/>
					</div>

						<p className="mt-4 text-center text-sm text-zinc-300">
							{normalizedHandle ? `@${normalizedHandle}` : "@handle"}
						</p>
						<p className="mt-1 text-center text-xs uppercase tracking-[0.18em] text-zinc-500">
							{initialUser.providerPicture
								? "Provider photo available"
								: "No provider photo on file"}
						</p>

						<div className="mt-6 grid gap-2">
							{initialUser.providerPicture ? (
							<AvatarOption
								label="Provider photo"
								active={avatarMode === "provider"}
								onClick={() => setAvatarMode("provider")}
							/>
						) : null}
						<AvatarOption
							label="Generated avatar"
							active={avatarMode === "generated"}
							onClick={() => setAvatarMode("generated")}
						/>
						<AvatarOption
							label="Upload photo"
							active={avatarMode === "custom"}
							onClick={() => setAvatarMode("custom")}
						/>
					</div>

					{avatarMode === "custom" ? (
						<div className="mt-5 space-y-3">
							<label className="inline-flex cursor-pointer items-center justify-center rounded-full border border-zinc-600/60 bg-greyBg/75 px-4 py-2 text-sm font-semibold text-zinc-100 transition-colors hover:border-zinc-500/70 hover:text-wheat">
								Upload photo
								<input
									type="file"
									accept={PROFILE_UPLOAD_ACCEPT.join(",")}
									className="hidden"
									onChange={handleAvatarUpload}
								/>
							</label>
							<p className="text-xs leading-5 text-zinc-400">
								JPG, PNG, or WEBP up to 2MB.
							</p>
							{uploadedAvatarName ? (
								<p className="rounded-2xl border border-zinc-700/50 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-200">
									Uploaded: {uploadedAvatarName}
								</p>
							) : null}
							{errors.profilePicture ? (
								<p className="mt-1 text-xs text-red-400">
									{errors.profilePicture}
								</p>
							) : null}
						</div>
					) : null}
				</div>

				<div className="grid grid-cols-1 gap-5">
					{submitError ? (
						<p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
							{submitError}
						</p>
					) : null}

					<div className="grid gap-5 lg:grid-cols-2">
						<div>
						<label
							htmlFor="profile-name"
							className="mb-2 block text-sm text-zinc-300"
						>
							Display name
						</label>
						<input
							id="profile-name"
							value={name}
							onChange={(event) => setName(event.target.value)}
							maxLength={MAX_NAME}
							className="w-full rounded-2xl border border-zinc-600/60 bg-zinc-900/60 px-4 py-3 text-zinc-100 outline-none transition-colors focus:border-purpleContrast"
						/>
						<div className="flex justify-between">
							{errors.name ? (
								<p className="mt-1 text-xs text-red-400">{errors.name}</p>
							) : null}
							<span className="ml-auto mt-1 text-xs text-zinc-400">
								{name.length}/{MAX_NAME}
							</span>
						</div>
					</div>

					<div>
						<label
							htmlFor="profile-handle"
							className="mb-2 block text-sm text-zinc-300"
						>
							Handle
						</label>
						<div className="rounded-2xl border border-zinc-600/60 bg-zinc-900/60 px-4 py-3 transition-colors focus-within:border-purpleContrast">
							<div className="flex items-center gap-2">
								<span className="text-zinc-500">@</span>
								<input
									id="profile-handle"
									value={handle}
									onChange={(event) => setHandle(event.target.value)}
									className="w-full bg-transparent text-zinc-100 outline-none"
									autoCapitalize="none"
									autoCorrect="off"
									spellCheck={false}
								/>
							</div>
						</div>
						<div className="flex justify-between gap-3">
							{errors.handle ? (
								<p className="mt-1 text-xs text-red-400">{errors.handle}</p>
							) : (
								<p className="mt-1 text-xs text-zinc-500">
									Profile URL: `/profile/{normalizedHandle || "handle"}`
								</p>
							)}
						</div>
					</div>
					</div>

					<div>
						<label
							htmlFor="profile-description"
							className="mb-2 block text-sm text-zinc-300"
						>
							Description
						</label>
						<textarea
							id="profile-description"
							value={description}
							onChange={(event) => setDescription(event.target.value)}
							maxLength={MAX_DESC}
							rows={4}
							className="w-full rounded-[24px] border border-zinc-600/60 bg-zinc-900/60 px-4 py-3 text-zinc-100 outline-none transition-colors focus:border-purpleContrast"
						/>
						<div className="flex justify-between">
							{errors.description ? (
								<p className="mt-1 text-xs text-red-400">
									{errors.description}
								</p>
							) : null}
							<span className="ml-auto mt-1 text-xs text-zinc-400">
								{description.length}/{MAX_DESC}
							</span>
						</div>
					</div>

					<div className="grid gap-4 sm:grid-cols-2">
						{SOCIAL_PROVIDERS.map((provider) => (
							<div key={provider}>
								<label
									htmlFor={`profile-social-${provider}`}
									className="mb-2 block text-sm capitalize text-zinc-300"
								>
									{provider}
								</label>
								<input
									id={`profile-social-${provider}`}
									type="url"
									placeholder={`https://${hostForPlaceholder(provider)}/username`}
									className="w-full rounded-2xl border border-zinc-600/60 bg-zinc-900/60 px-4 py-3 text-zinc-100 outline-none transition-colors focus:border-purpleContrast"
									value={links[provider]}
									onChange={(event) =>
										setLinks((current) => ({
											...current,
											[provider]: event.target.value,
										}))
									}
								/>
								{errors[provider] ? (
									<p className="mt-1 text-xs text-red-400">
										{errors[provider]}
									</p>
								) : null}
							</div>
						))}
					</div>

					<div className="rounded-[28px] border border-zinc-700/50 bg-greyBg/70 px-5 py-5">
						<div className="flex items-start justify-between gap-4">
							<div>
								<h4 className="text-sm font-semibold text-zinc-100">
									{initialUser.hasPassword ? "Change password" : "Create password"}
								</h4>
								<p className="mt-1 text-xs leading-5 text-zinc-400">
									{initialUser.hasPassword
										? "Update your email login password without losing your social sign-in."
										: "Add an email login password to this social account."}
								</p>
							</div>
							<span className="rounded-full border border-zinc-600/50 bg-zinc-800/70 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-zinc-300">
								{initialUser.hasPassword ? "Configured" : "Optional"}
							</span>
						</div>

						<div className="mt-4 grid gap-4 sm:grid-cols-2">
							{initialUser.hasPassword ? (
								<div className="sm:col-span-2">
									<label
										htmlFor="profile-current-password"
										className="mb-1 block text-sm text-zinc-300"
									>
										Current password
									</label>
									<input
										id="profile-current-password"
										type="password"
										value={currentPassword}
										onChange={(event) => setCurrentPassword(event.target.value)}
										className="w-full rounded-2xl border border-zinc-600/60 bg-zinc-900/60 px-4 py-3 text-zinc-100 outline-none transition-colors focus:border-purpleContrast"
									/>
									{errors.currentPassword ? (
										<p className="mt-1 text-xs text-red-400">
											{errors.currentPassword}
										</p>
									) : null}
								</div>
							) : null}

							<div>
								<label
									htmlFor="profile-new-password"
									className="mb-1 block text-sm text-zinc-300"
								>
									New password
								</label>
								<input
									id="profile-new-password"
									type="password"
									value={newPassword}
									onChange={(event) => setNewPassword(event.target.value)}
									className="w-full rounded-2xl border border-zinc-600/60 bg-zinc-900/60 px-4 py-3 text-zinc-100 outline-none transition-colors focus:border-purpleContrast"
								/>
								{errors.newPassword ? (
									<p className="mt-1 text-xs text-red-400">
										{errors.newPassword}
									</p>
								) : null}
							</div>

							<div>
								<label
									htmlFor="profile-confirm-password"
									className="mb-1 block text-sm text-zinc-300"
								>
									Confirm new password
								</label>
								<input
									id="profile-confirm-password"
									type="password"
									value={confirmPassword}
									onChange={(event) => setConfirmPassword(event.target.value)}
									className="w-full rounded-2xl border border-zinc-600/60 bg-zinc-900/60 px-4 py-3 text-zinc-100 outline-none transition-colors focus:border-purpleContrast"
								/>
								{errors.confirmPassword ? (
									<p className="mt-1 text-xs text-red-400">
										{errors.confirmPassword}
									</p>
								) : null}
							</div>
						</div>
					</div>
				</div>

				</div>

				<div className="relative flex items-center justify-end gap-3 border-t border-zinc-700/50 px-6 pb-6 pt-5 sm:px-8">
					<button
						type="button"
						className="rounded-full border border-zinc-600/50 bg-greyBg/75 px-5 py-3 text-sm font-semibold text-zinc-100 transition-colors hover:border-zinc-500/70 hover:text-wheat"
						onClick={onClose}
						disabled={saving}
					>
						Cancel
					</button>
					<button
						type="button"
						className="rounded-full border border-purpleContrast/50 bg-purpleContrast/85 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-purpleContrast/20 transition-colors hover:bg-purpleContrast disabled:cursor-not-allowed disabled:opacity-50"
						onClick={handleSave}
						disabled={saving || !dirty}
					>
						{saving ? "Saving…" : "Save profile"}
					</button>
				</div>
				</div>
			</div>
		</div>
	);
}

function AvatarOption({
	label,
	active,
	onClick,
}: {
	label: string;
	active: boolean;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={`rounded-full border px-3 py-2 text-sm font-semibold transition-colors ${
				active
					? "border-purpleContrast/60 bg-purpleContrast/20 text-wheat"
					: "border-zinc-600/50 bg-zinc-800/70 text-zinc-200 hover:border-zinc-500/70"
			}`}
		>
			{label}
		</button>
	);
}

function hostForPlaceholder(provider: SocialProvider) {
	if (provider === "youtube") {
		return "youtube.com";
	}

	if (provider === "twitter") {
		return "x.com";
	}

	return `${provider}.com`;
}
