"use client";

import Avatar from "@/components/Avatar";
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
import type { Locale } from "@/lib/i18n-shared";
import type { ProfileUser } from "@/profile/types";
import SocialLinks from "./SocialLinks";

type RoleLabelMap = Record<
	"member" | "volunteer" | "writer" | "vip" | "admin" | "owner",
	string
>;

const roleStyles: Record<string, { color: string; icon: IconType }> = {
	member: { color: "bg-emerald-500/90", icon: FaUser },
	volunteer: { color: "bg-blue-500/90", icon: FaHandHoldingHeart },
	writer: { color: "bg-cyan-500/90", icon: FaPenNib },
	vip: { color: "bg-pink-600/90", icon: FaStar },
	admin: { color: "bg-red-700", icon: FaCrown },
	owner: { color: "bg-indigo-600", icon: FaBolt },
};

const defaultRoleLabels: RoleLabelMap = {
	member: "Member",
	volunteer: "Volunteer",
	writer: "Writer",
	vip: "VIP",
	admin: "Admin",
	owner: "Owner",
};

const roleLabels: Record<Locale, RoleLabelMap> = {
	en: defaultRoleLabels,
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
	de: defaultRoleLabels,
	ru: defaultRoleLabels,
	fr: defaultRoleLabels,
	ja: defaultRoleLabels,
};

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
	const localizedRoleLabels = roleLabels[locale] || roleLabels.en;
	const roleLabel =
		localizedRoleLabels[role as keyof typeof defaultRoleLabels] || user.role;

	return (
		<div className="surface-panel relative overflow-hidden">
			<div className="relative px-6 py-8 sm:px-8">
				{user.isCurrentUser ? (
					<div className="mb-6 flex flex-wrap items-center justify-end gap-3">
						<button
							type="button"
							onClick={onEdit}
							className="ui-button"
						>
							<FaPenToSquare />
							{messages.profile.editProfile}
						</button>
						<button
							type="button"
							onClick={() => signOut({ callbackUrl: localizeHref("/") })}
							className="ui-button"
						>
							<FaArrowRightFromBracket />
							{messages.profile.logout}
						</button>
					</div>
				) : null}

				<div className="grid gap-6 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-end">
					<Avatar src={user.profilePicture} name={user.name} className="mx-auto h-28 w-28 text-4xl lg:mx-0" />
					<div className="flex flex-col gap-5">
						<div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
							<div>
								<div className="flex flex-wrap items-center justify-center gap-3 lg:justify-start">
									<h1 className="text-center font-somerton text-4xl text-wheat lg:text-left">
										{user.name}
									</h1>
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
