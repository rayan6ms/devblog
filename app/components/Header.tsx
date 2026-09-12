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
import { canManageUsers } from "@/lib/admin";
import { useLocaleNavigation } from "@/hooks/useLocaleNavigation";
import LanguageSwitcher from "./LanguageSwitcher";
import { useI18n } from "./LocaleProvider";
import LocalizedLink from "./LocalizedLink";
import SuggestModal from "./SuggestModal";
import { useClientAuth } from "./useClientAuth";

const actionClass = "ui-button";

export default function Header() {
	const pathname = usePathname();
	const { messages, locale } = useI18n();
	const { localizeHref } = useLocaleNavigation();
	const { activeUser, canWrite, isAuthed, role } = useClientAuth();
	const [suggestOpen, setSuggestOpen] = useState(false);
	if (["/login", "/register", "/not-found"].includes(pathname)) return null;
	const admin = getAdminCopy(locale);
	return (
		<>
			<header className="site-masthead">
				<div className="site-container masthead-row">
					<LocalizedLink
						href="/"
						aria-label={messages.header.homeAria}
						className="min-w-0"
					>
						<span className="wordmark">devblog</span>
					</LocalizedLink>
					<div className="masthead-actions">
						<a
							className={`${actionClass} hidden sm:inline-flex`}
							href="https://t.me/+d-L4_z7gQjg5ZWQx"
							target="_blank"
							rel="noopener noreferrer"
						>
							<FaPaperPlane aria-hidden="true" />
							{messages.common.telegram}
						</a>
						{isAuthed && activeUser ? (
							<LocalizedLink
								className={actionClass}
								href={`/profile/${activeUser}`}
							>
								<FaUser aria-hidden="true" />
								{messages.common.profile}
							</LocalizedLink>
						) : null}
						{isAuthed && canManageUsers(role) ? (
							<LocalizedLink className={actionClass} href="/admin">
								<FaShieldHalved aria-hidden="true" />
								{admin.navLabel}
							</LocalizedLink>
						) : null}
						{isAuthed && canWrite ? (
							<LocalizedLink
								className="ui-button ui-button--primary"
								href="/new_post"
							>
								<FaPlus aria-hidden="true" />
								{messages.common.create}
							</LocalizedLink>
						) : null}
						{isAuthed && !canWrite ? (
							<button
								className={actionClass}
								type="button"
								onClick={() => setSuggestOpen(true)}
							>
								<FaLightbulb aria-hidden="true" />
								{messages.common.suggest}
							</button>
						) : null}
						{!isAuthed ? (
							<LocalizedLink className={actionClass} href="/login">
								<FaRightToBracket aria-hidden="true" />
								{messages.common.login}
							</LocalizedLink>
						) : null}
						{isAuthed ? (
							<button
								className={actionClass}
								type="button"
								onClick={() => signOut({ callbackUrl: localizeHref("/") })}
							>
								<FaArrowRightFromBracket aria-hidden="true" />
								{messages.common.logout}
							</button>
						) : null}
						<LanguageSwitcher />
					</div>
				</div>
			</header>
			{isAuthed && !canWrite ? (
				<SuggestModal
					isOpen={suggestOpen}
					onClose={() => setSuggestOpen(false)}
					authorId={activeUser || "me"}
				/>
			) : null}
		</>
	);
}
