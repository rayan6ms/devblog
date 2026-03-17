"use client";

/* eslint-disable @next/next/no-img-element */

import { signOut } from "next-auth/react";
import type { IconType } from "react-icons";
import {
	FaArrowRightFromBracket,
	FaBolt,
	FaCrown,
	FaHandHoldingHeart,
	FaPenNib,
	FaPenToSquare,
	FaStar,
	FaUser,
} from "react-icons/fa6";
import { useI18n } from "@/components/LocaleProvider";
import { useLocaleNavigation } from "@/hooks/useLocaleNavigation";
import type { ProfileUser } from "@/profile/types";
import SocialLinks from "./SocialLinks";

const roleStyles: Record<string, { color: string; icon: IconType }> = {
	member: { color: "bg-emerald-500/90", icon: FaUser },
	volunteer: { color: "bg-blue-500/90", icon: FaHandHoldingHeart },
	writer: { color: "bg-cyan-500/90", icon: FaPenNib },
	vip: { color: "bg-pink-600/90", icon: FaStar },
	admin: { color: "bg-red-700", icon: FaCrown },
	owner: { color: "bg-indigo-600", icon: FaBolt },
};

const roleLabels = {
	en: {
		member: "Member",
		volunteer: "Volunteer",
		writer: "Writer",
		vip: "VIP",
		admin: "Admin",
		owner: "Owner",
	},
	"pt-BR": {
		member: "Membro",
		volunteer: "Voluntário",
		writer: "Autor",
		vip: "VIP",
		admin: "Admin",
		owner: "Dono",
	},
	es: {
		member: "Miembro",
		volunteer: "Voluntario",
		writer: "Autor",
		vip: "VIP",
		admin: "Admin",
		owner: "Propietario",
	},
} as const;

export default function Header({
	user,
	onEdit,
}: {
	user: ProfileUser;
	onEdit?: () => void;
}) {
	const { locale, messages } = useI18n();
	const { localizeHref } = useLocaleNavigation();
	const role = (user.role || "member").toLowerCase();
	const { color, icon: RoleIcon } = roleStyles[role] || roleStyles.member;
	const roleLabel =
		roleLabels[locale][role as keyof (typeof roleLabels)[typeof locale]] ||
		user.role;

	return (
		<div className="relative overflow-hidden rounded-[30px] border border-zinc-700/50 bg-lessDarkBg/90 shadow-xl shadow-zinc-950/20">
			<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(155%_155%_at_8%_10%,rgba(103,79,248,0.52)_0%,rgba(103,79,248,0.32)_28%,rgba(84,67,198,0.2)_48%,rgba(51,47,108,0.14)_68%,rgba(34,37,44,0.08)_82%,rgba(34,37,44,0)_100%),linear-gradient(135deg,rgba(34,37,44,0.18),rgba(34,37,44,0.72))]" />
			<div className="relative px-6 py-8 sm:px-8">
				{user.isCurrentUser ? (
					<div className="absolute right-6 top-6 flex flex-wrap items-center justify-end gap-3">
						<button
							type="button"
							onClick={onEdit}
							className="flex items-center gap-2 rounded-full border border-zinc-500/40 bg-greyBg/75 px-4 py-2 text-sm font-semibold text-zinc-100 transition-colors hover:bg-greyBg"
						>
							<FaPenToSquare />
							{messages.profile.editProfile}
						</button>
						<button
							type="button"
							onClick={() => signOut({ callbackUrl: localizeHref("/") })}
							className="flex items-center gap-2 rounded-full border border-zinc-500/40 bg-greyBg/75 px-4 py-2 text-sm font-semibold text-zinc-100 transition-colors hover:bg-greyBg"
						>
							<FaArrowRightFromBracket />
							{messages.profile.logout}
						</button>
					</div>
				) : null}

				<div className="mt-10 grid gap-6 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-end">
					<div className="mx-auto h-28 w-28 overflow-hidden rounded-[28px] border-2 border-zinc-200/70 shadow-xl shadow-zinc-950/30 sm:h-32 sm:w-32 lg:mx-0">
						<img
							className="h-full w-full object-cover"
							src={user.profilePicture}
							alt={messages.profile.profileAlt(user.name)}
						/>
					</div>
					<div className="flex flex-col gap-5">
						<div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
							<div>
								<div className="flex flex-wrap items-center justify-center gap-3 lg:justify-start">
									<h2 className="text-center font-europa text-3xl text-zinc-100 lg:text-left">
										{user.name}
									</h2>
									<div
										className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm text-white ${color}`}
									>
										<RoleIcon className="text-xs" />
										<span
											className={role === "vip" ? "uppercase" : "capitalize"}
										>
											{roleLabel}
										</span>
									</div>
								</div>
								<p className="mx-auto mt-3 max-w-3xl text-center text-sm text-zinc-400 lg:mx-0 lg:text-left">
									@{user.slug}
								</p>
								<p className="mx-auto mt-4 max-w-3xl text-center text-sm leading-7 text-zinc-300 lg:mx-0 lg:text-left sm:text-base">
									{user.description || messages.common.noDescriptionYet}
								</p>
							</div>
							<div className="lg:max-w-[360px]">
								<SocialLinks links={user.socialLinks} />
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
