"use client";

import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState } from "react";
import {
	FaArrowRightFromBracket,
	FaLightbulb,
	FaPaperPlane,
	FaPlus,
	FaRightToBracket,
	FaShieldHalved,
	FaUser,
} from "react-icons/fa6";
import { getAdminCopy } from "@/admin/copy";
import { useLocaleNavigation } from "@/hooks/useLocaleNavigation";
import { canManageUsers } from "@/lib/admin";
import Icons from "./Icons";
import LanguageSwitcher from "./LanguageSwitcher";
import { useI18n } from "./LocaleProvider";
import LocalizedLink from "./LocalizedLink";
import SuggestModal from "./SuggestModal";
import { useClientAuth } from "./useClientAuth";

export default function Header() {
	const pathname = usePathname();
	const hideHeader =
		pathname === "/login" ||
		pathname === "/register" ||
		pathname === "/not-found";
	const { activeUser, canWrite, isAuthed, role } = useClientAuth();
	const { locale, messages } = useI18n();
	const { localizeHref } = useLocaleNavigation();
	const [isSuggestOpen, setIsSuggestOpen] = useState(false);
	const canManageRoles = canManageUsers(role);
	const adminCopy = getAdminCopy(locale);

	if (hideHeader) return null;

	const actionButtonClassName =
		"inline-flex items-center gap-2 rounded-full border border-zinc-700/60 bg-greyBg/75 px-4 py-2 text-sm font-semibold text-zinc-100 transition-colors hover:border-zinc-500/70 hover:text-wheat";
	const accentActionButtonClassName =
		"inline-flex items-center gap-2 rounded-full border border-zinc-700/60 bg-greyBg/75 px-4 py-2 text-sm font-semibold text-zinc-100 transition-colors hover:border-purpleContrast/60 hover:text-wheat";

	return (
		<>
			<header className="bg-darkBg px-4 pt-8 sm:px-6 lg:px-8">
				<div className="mx-auto max-w-[1440px] rounded-t-[30px] border border-b-0 border-zinc-700/50 bg-lessDarkBg/90">
					<div className="border-b border-zinc-700/50 px-6 py-6 sm:px-8">
						<div className="grid gap-4 lg:gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
							<div className="min-w-0">
								<p className="text-xs uppercase tracking-[0.28em] text-zinc-500">
									{messages.header.eyebrow}
								</p>
								<LocalizedLink href="/" aria-label={messages.header.homeAria}>
									<h1 className="mt-2 text-5xl font-somerton text-wheat sm:text-6xl">
										devblog
									</h1>
								</LocalizedLink>
							</div>

							<div className="flex flex-wrap items-center gap-3 lg:justify-end">
								<Icons />

								<a
									href="https://t.me/+d-L4_z7gQjg5ZWQx"
									target="_blank"
									rel="noopener"
									className="inline-flex items-center gap-2 rounded-full border border-purpleContrast/50 bg-purpleContrast/15 px-4 py-2 text-sm font-semibold text-wheat transition-colors hover:bg-purpleContrast/25"
								>
									<FaPaperPlane className="text-xs" />
									{messages.common.telegram}
								</a>
							</div>

							<div className="flex flex-col gap-3 sm:gap-4 lg:col-span-2 lg:grid lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:gap-6">
								<p className="max-w-2xl text-sm leading-7 text-zinc-400 sm:self-end sm:text-base">
									{messages.header.description}
								</p>

								<div className="flex flex-wrap items-center gap-3 lg:justify-end">
									{isAuthed && activeUser ? (
										<LocalizedLink
											href={`/profile/${activeUser}`}
											className={actionButtonClassName}
											aria-label={messages.common.profile}
										>
											<FaUser className="text-xs" />
											{messages.common.profile}
										</LocalizedLink>
									) : null}

									{isAuthed && canManageRoles ? (
										<LocalizedLink
											href="/admin"
											className={accentActionButtonClassName}
										>
											<FaShieldHalved className="text-xs" />
											{adminCopy.navLabel}
										</LocalizedLink>
									) : null}

									{isAuthed ? (
										canWrite ? (
											<LocalizedLink
												href="/new_post"
												className={accentActionButtonClassName}
												aria-label={messages.common.create}
											>
												<FaPlus className="text-xs" />
												{messages.common.create}
											</LocalizedLink>
										) : (
											<button
												type="button"
												onClick={() => setIsSuggestOpen(true)}
												className={actionButtonClassName}
												aria-label={messages.common.suggest}
												title={messages.header.suggestTitle}
											>
												<FaLightbulb className="text-xs" />
												{messages.common.suggest}
											</button>
										)
									) : (
										<LocalizedLink
											href="/login"
											className={actionButtonClassName}
											aria-label={messages.common.login}
										>
											<FaRightToBracket className="text-xs" />
											{messages.common.login}
										</LocalizedLink>
									)}

									{isAuthed ? (
										<button
											type="button"
											onClick={() => signOut({ callbackUrl: localizeHref("/") })}
											className={actionButtonClassName}
											aria-label={messages.common.logout}
										>
											<FaArrowRightFromBracket className="text-xs" />
											{messages.common.logout}
										</button>
									) : null}

									<LanguageSwitcher className="ml-auto shrink-0" />
								</div>
							</div>
						</div>
					</div>
				</div>
			</header>

			<SuggestModal
				isOpen={isSuggestOpen}
				onClose={() => setIsSuggestOpen(false)}
				authorId={activeUser || "me"}
			/>
		</>
	);
}
