"use client";

import { useMemo, useState } from "react";
import { FaCheck, FaShieldHalved, FaTriangleExclamation } from "react-icons/fa6";
import type { AdminCopy } from "@/admin/copy";
import type { AdminManagedUser } from "@/admin/types";
import type { Locale } from "@/lib/i18n";
import type { UserRole } from "@/profile/types";

const USER_ROLE_OPTIONS: UserRole[] = [
	"member",
	"volunteer",
	"writer",
	"vip",
	"admin",
	"owner",
];

const roleRank: Record<UserRole, number> = {
	owner: 0,
	admin: 1,
	writer: 2,
	volunteer: 3,
	vip: 4,
	member: 5,
};

const defaultRoleLabels: Record<UserRole, string> = {
	member: "Member",
	volunteer: "Volunteer",
	writer: "Writer",
	vip: "VIP",
	admin: "Admin",
	owner: "Owner",
};

const roleLabelsByLocale: Partial<Record<Locale, Record<UserRole, string>>> = {
	"pt-BR": {
		member: "Membro",
		volunteer: "Voluntário",
		writer: "Autor",
		vip: "VIP",
		admin: "Admin",
		owner: "Owner",
	},
	es: {
		member: "Miembro",
		volunteer: "Voluntario",
		writer: "Autor",
		vip: "VIP",
		admin: "Admin",
		owner: "Owner",
	},
};

function sortUsers(users: AdminManagedUser[]) {
	return [...users].sort((left, right) => {
		const roleDelta = roleRank[left.role] - roleRank[right.role];
		if (roleDelta !== 0) {
			return roleDelta;
		}

		return left.name.localeCompare(right.name);
	});
}

function getRoleLabel(role: UserRole, locale: Locale) {
	const localizedLabels = roleLabelsByLocale[locale];
	return localizedLabels?.[role] || defaultRoleLabels[role];
}

export default function AdminRoleManager({
	copy,
	currentUserId,
	currentUserRole,
	initialUsers,
	locale,
}: {
	copy: AdminCopy;
	currentUserId: string;
	currentUserRole: UserRole;
	initialUsers: AdminManagedUser[];
	locale: Locale;
}) {
	const [users, setUsers] = useState(() => sortUsers(initialUsers));
	const [filter, setFilter] = useState("");
	const [pendingUserId, setPendingUserId] = useState<string | null>(null);
	const [draftRoles, setDraftRoles] = useState<Record<string, UserRole>>(() =>
		Object.fromEntries(initialUsers.map((user) => [user.id, user.role])),
	);
	const [messagesByUserId, setMessagesByUserId] = useState<
		Record<string, { tone: "success" | "error"; text: string }>
	>({});

	const dateFormatter = useMemo(
		() =>
			new Intl.DateTimeFormat(locale, {
				dateStyle: "medium",
			}),
		[locale],
	);

	const visibleUsers = useMemo(() => {
		const query = filter.trim().toLowerCase();
		if (!query) {
			return users;
		}

		return users.filter((user) =>
			[user.name, user.email, user.username, user.slug]
				.filter(Boolean)
				.some((value) => value!.toLowerCase().includes(query)),
		);
	}, [filter, users]);

	const canAssignOwner = currentUserRole === "owner";

	async function handleSave(user: AdminManagedUser) {
		const nextRole = draftRoles[user.id];
		if (!nextRole || nextRole === user.role) {
			return;
		}

		setPendingUserId(user.id);
		setMessagesByUserId((current) => {
			const next = { ...current };
			delete next[user.id];
			return next;
		});

		try {
			const response = await fetch(`/api/admin/users/${user.id}`, {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ role: nextRole }),
			});
			const result = (await response.json().catch(() => null)) as
				| { error?: string; user?: AdminManagedUser }
				| null;

			if (!response.ok || !result?.user) {
				throw new Error(result?.error || copy.saveError);
			}
			const updatedUser = result.user;

			setUsers((current) =>
				sortUsers(
					current.map((entry) =>
						entry.id === updatedUser.id ? updatedUser : entry,
					),
				),
			);
			setDraftRoles((current) => ({
				...current,
				[updatedUser.id]: updatedUser.role,
			}));
			setMessagesByUserId((current) => ({
				...current,
				[updatedUser.id]: {
					tone: "success",
					text: copy.saveSuccess,
				},
			}));
		} catch (error) {
			setMessagesByUserId((current) => ({
				...current,
				[user.id]: {
					tone: "error",
					text: error instanceof Error ? error.message : copy.saveError,
				},
			}));
		} finally {
			setPendingUserId(null);
		}
	}

	return (
		<section className="rounded-[30px] border border-zinc-700/50 bg-lessDarkBg/90 px-6 py-6 shadow-xl shadow-zinc-950/20 sm:px-8">
			<div className="flex flex-col gap-4 border-b border-zinc-700/50 pb-6 lg:flex-row lg:items-end lg:justify-between">
				<div className="max-w-3xl">
					<p className="text-xs uppercase tracking-[0.24em] text-zinc-500">
						{copy.tableTitle}
					</p>
					<p className="mt-3 text-sm leading-7 text-zinc-400 sm:text-base">
						{copy.tableDescription}
					</p>
				</div>

				<div className="w-full max-w-md">
					<label
						htmlFor="admin-user-filter"
						className="mb-2 block text-xs uppercase tracking-[0.2em] text-zinc-500"
					>
						{copy.searchLabel}
					</label>
					<input
						id="admin-user-filter"
						type="search"
						value={filter}
						onChange={(event) => setFilter(event.target.value)}
						placeholder={copy.searchPlaceholder}
						className="w-full rounded-2xl border border-zinc-700/60 bg-greyBg/75 px-4 py-3 text-sm text-zinc-100 outline-none transition-colors focus:border-purpleContrast/60"
					/>
				</div>
			</div>

			<div className="mt-6 space-y-4">
				{visibleUsers.length === 0 ? (
					<div className="rounded-[26px] border border-dashed border-zinc-700/60 bg-greyBg/45 px-5 py-10 text-center text-sm text-zinc-400">
						{copy.searchEmpty}
					</div>
				) : (
					visibleUsers.map((user) => {
						const selectedRole = draftRoles[user.id] || user.role;
						const isSelf = user.id === currentUserId;
						const ownerLocked = currentUserRole !== "owner" && user.role === "owner";
						const adminScopeLocked =
							currentUserRole === "admin" &&
							(user.role === "admin" || user.role === "owner");
						const isSaving = pendingUserId === user.id;
						const statusMessage = isSelf
							? copy.selfProtected
							: ownerLocked
								? copy.ownerProtected
								: adminScopeLocked
									? copy.adminScopeProtected
									: user.isOwnerEmail && selectedRole !== "owner"
										? copy.ownerEmailProtected
									: null;
						const roleChanged = selectedRole !== user.role;

						return (
							<div
								key={user.id}
								className="rounded-[28px] border border-zinc-700/60 bg-greyBg/60 p-5"
							>
								<div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
									<div className="min-w-0 flex-1">
										<div className="flex flex-wrap items-center gap-3">
											<h3 className="text-xl font-semibold text-zinc-100">
												{user.name}
											</h3>
											<span className="rounded-full border border-zinc-600/70 bg-darkBg/80 px-3 py-1 text-xs uppercase tracking-[0.16em] text-zinc-300">
												{getRoleLabel(user.role, locale)}
											</span>
											{user.isOwnerEmail ? (
												<span className="inline-flex items-center gap-2 rounded-full border border-purpleContrast/35 bg-purpleContrast/12 px-3 py-1 text-xs font-semibold text-wheat">
													<FaShieldHalved className="text-[11px]" />
													{copy.ownerEmailBadge}
												</span>
											) : null}
										</div>

										<div className="mt-4 grid gap-3 text-sm text-zinc-300 sm:grid-cols-2 xl:grid-cols-4">
											<div>
												<p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
													{copy.emailLabel}
												</p>
												<p className="mt-1 break-all text-zinc-100">
													{user.email || copy.noEmail}
												</p>
											</div>
											<div>
												<p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
													{copy.handleLabel}
												</p>
												<p className="mt-1 text-zinc-100">
													{user.slug ? `@${user.slug}` : copy.noHandle}
												</p>
											</div>
											<div>
												<p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
													{copy.joinedLabel}
												</p>
												<p className="mt-1 text-zinc-100">
													{dateFormatter.format(new Date(user.createdAt))}
												</p>
											</div>
											<div>
												<p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
													{copy.statusLabel}
												</p>
												<p className="mt-1 flex items-center gap-2 text-zinc-100">
													{statusMessage ? (
														<>
															<FaTriangleExclamation className="text-xs text-amber-300" />
															{statusMessage}
														</>
													) : (
														<>
															<FaCheck className="text-xs text-emerald-300" />
															{copy.actionsLabel}
														</>
													)}
												</p>
											</div>
										</div>
									</div>

									<div className="w-full rounded-[24px] border border-zinc-700/60 bg-darkBg/65 p-4 xl:w-[320px]">
										<label
											htmlFor={`user-role-${user.id}`}
											className="text-[11px] uppercase tracking-[0.18em] text-zinc-500"
										>
											{copy.roleLabel}
										</label>
										<select
											id={`user-role-${user.id}`}
											value={selectedRole}
											onChange={(event) =>
												setDraftRoles((current) => ({
													...current,
													[user.id]: event.target.value as UserRole,
												}))
											}
											disabled={
												isSelf ||
												ownerLocked ||
												adminScopeLocked ||
												isSaving
											}
											className="mt-2 w-full rounded-2xl border border-zinc-700/60 bg-greyBg/75 px-4 py-3 text-sm text-zinc-100 outline-none transition-colors focus:border-purpleContrast/60 disabled:cursor-not-allowed disabled:opacity-60"
										>
											{USER_ROLE_OPTIONS.filter(
												(role) =>
													(canAssignOwner || role !== "owner") &&
													(currentUserRole === "owner" ||
														role === "member" ||
														role === "volunteer" ||
														role === "writer" ||
														role === "vip") &&
													(!user.isOwnerEmail || role === "owner"),
											).map((role) => (
												<option key={role} value={role}>
													{getRoleLabel(role, locale)}
												</option>
											))}
										</select>

										<button
											type="button"
											onClick={() => void handleSave(user)}
											disabled={
												isSelf ||
												ownerLocked ||
												adminScopeLocked ||
												isSaving ||
												!roleChanged
											}
											className="mt-3 inline-flex w-full items-center justify-center rounded-2xl border border-purpleContrast/45 bg-purpleContrast/20 px-4 py-3 text-sm font-semibold text-wheat transition-colors hover:bg-purpleContrast/30 disabled:cursor-not-allowed disabled:border-zinc-700/60 disabled:bg-greyBg/60 disabled:text-zinc-500"
										>
											{isSaving ? copy.savingRole : copy.saveRole}
										</button>

										{messagesByUserId[user.id] ? (
											<p
												className={`mt-3 text-sm ${
													messagesByUserId[user.id].tone === "success"
														? "text-emerald-300"
														: "text-red-300"
												}`}
											>
												{messagesByUserId[user.id].text}
											</p>
										) : null}
									</div>
								</div>
							</div>
						);
					})
				)}
			</div>
		</section>
	);
}
