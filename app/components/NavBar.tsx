"use client";

import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import {
	FaArrowRightFromBracket,
	FaLightbulb,
	FaPlus,
	FaRightToBracket,
	FaShieldHalved,
	FaUser,
} from "react-icons/fa6";
import { getAdminCopy } from "@/admin/copy";
import { useLocaleNavigation } from "@/hooks/useLocaleNavigation";
import { canManageUsers } from "@/lib/admin";
import HamburgerMenu from "./HamburgerMenu";
import Icons from "./Icons";
import LanguageSwitcher from "./LanguageSwitcher";
import { useI18n } from "./LocaleProvider";
import LocalizedLink from "./LocalizedLink";
import SearchBar from "./SearchBar";
import SuggestModal from "./SuggestModal";
import { useClientAuth } from "./useClientAuth";

const NAV_LINKS = [
	{ href: "/", key: "home" },
	{ href: "/recent", key: "recent" },
	{ href: "/trending", key: "trending" },
	{ href: "/tag", key: "tags" },
	{ href: "/about", key: "about" },
	{ href: "/playground", key: "playground" },
];

function LinkPill({
	active,
	href,
	label,
	onClick,
	compact = false,
}: {
	active: boolean;
	href: string;
	label: string;
	onClick?: () => void;
	compact?: boolean;
}) {
	return (
		<LocalizedLink
			href={href}
			onClick={onClick}
			className={`border font-semibold uppercase transition-colors ${
				compact
					? "rounded-2xl px-3 py-2 text-xs tracking-[0.15em]"
					: "rounded-full px-4 py-2 text-sm tracking-[0.18em]"
			} ${
				active
					? "border-purpleContrast/50 bg-purpleContrast/15 text-wheat"
					: "border-zinc-700/60 bg-greyBg/55 text-zinc-300 hover:border-zinc-500/70 hover:text-wheat"
			}`}
		>
			{label}
		</LocalizedLink>
	);
}

export default function NavBar() {
	const pathname = usePathname();
	const hideNav =
		pathname === "/login" ||
		pathname === "/register" ||
		pathname === "/not-found";
	const inPost = pathname.includes("/post/");
	const { activeUser, canWrite, isAuthed, role } = useClientAuth();
	const { locale, messages } = useI18n();
	const { localizeHref } = useLocaleNavigation();
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const [isScrolled, setIsScrolled] = useState(false);
	const [progress, setProgress] = useState(0);
	const [isSuggestOpen, setIsSuggestOpen] = useState(false);
	const [hasModalOpen, setHasModalOpen] = useState(false);
	const canManageRoles = canManageUsers(role);
	const adminCopy = getAdminCopy(locale);

	useEffect(() => {
		const handleScroll = () => {
			setIsScrolled(window.scrollY > 320);

			const navOffset = 236;
			const scrollTop = Math.max(window.scrollY - navOffset, 0);
			const scrollHeight = document.documentElement.scrollHeight - navOffset;
			const clientHeight = document.documentElement.clientHeight;
			const nextProgress =
				scrollHeight > clientHeight
					? (scrollTop / (scrollHeight - clientHeight)) * 100
					: 0;

			setProgress(Math.max(0, Math.min(nextProgress, 100)));
		};

		handleScroll();
		window.addEventListener("scroll", handleScroll, { passive: true });

		return () => window.removeEventListener("scroll", handleScroll);
	}, [pathname]);

	useEffect(() => {
		document.body.classList.toggle("overflow-hidden", isMenuOpen);

		return () => {
			document.body.classList.remove("overflow-hidden");
		};
	}, [isMenuOpen]);

	useEffect(() => {
		const syncModalState = () => {
			setHasModalOpen(
				Boolean(document.querySelector('[role="dialog"][aria-modal="true"]')),
			);
		};

		syncModalState();

		const observer = new MutationObserver(syncModalState);
		observer.observe(document.body, {
			attributes: true,
			attributeFilter: ["class"],
			childList: true,
			subtree: true,
		});

		return () => observer.disconnect();
	}, []);

	if (hideNav) return null;

	const navLinks = NAV_LINKS.map((item) => ({
		...item,
		label: messages.common[item.key as keyof typeof messages.common] as string,
	}));
	const scrolledNavLinks = navLinks.filter((item) => item.href !== "/");

	return (
		<>
			<div className="bg-darkBg px-4 pb-4 sm:px-6 lg:px-8">
				<div className="mx-auto max-w-[1440px] rounded-b-[30px] border border-t-0 border-zinc-700/50 bg-greyBg/75 shadow-xl shadow-zinc-950/10">
					<div className="px-4 py-4 sm:px-6">
						<div className="flex flex-wrap items-center justify-between gap-3 lg:justify-start">
							<div className="shrink-0 lg:hidden">
								<HamburgerMenu
									isMenuOpen={isMenuOpen}
									setIsMenuOpen={setIsMenuOpen}
									hideAt="lg"
								/>
							</div>

							<ul className="hidden flex-1 flex-wrap items-center gap-2 lg:flex">
								{navLinks.map((item) => (
									<li
										key={`main-${item.href}`}
										className={
											item.href === "/playground"
												? "max-[1160px]:hidden"
												: undefined
										}
									>
										<LinkPill
											active={pathname === item.href}
											href={item.href}
											label={item.label}
										/>
									</li>
								))}
							</ul>

							<div className="min-w-0 flex-1 max-[340px]:hidden sm:w-[340px] sm:flex-none lg:ml-auto">
								<SearchBar
									reserveSpace
									widthClass="max-w-none sm:max-w-[340px]"
								/>
							</div>

							<div className="hidden w-full max-[340px]:block">
								<SearchBar forceExpanded reserveSpace widthClass="max-w-none" />
							</div>
						</div>
					</div>
				</div>
			</div>

			{isMenuOpen ? (
				<div className="fixed inset-0 z-[70] overflow-y-auto bg-black/60 px-4 py-4 backdrop-blur-sm sm:px-6">
					<div className="mx-auto max-w-[1440px] rounded-[30px] border border-zinc-700/50 bg-lessDarkBg/95 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
						<div className="border-b border-zinc-700/50 px-6 py-5 sm:px-8">
							<div className="flex items-center justify-between gap-4">
								<div>
									<p className="text-xs uppercase tracking-[0.22em] text-zinc-500">
										{messages.nav.navigation}
									</p>
									<h2 className="mt-2 text-4xl font-somerton text-wheat">
										devblog
									</h2>
								</div>
								<HamburgerMenu
									isMenuOpen={isMenuOpen}
									setIsMenuOpen={setIsMenuOpen}
									hideAt={isScrolled ? "xl" : "lg"}
								/>
							</div>
						</div>

						<div className="grid gap-6 px-6 py-6 sm:px-8 lg:grid-cols-[minmax(0,1fr)_300px]">
							<div>
								<div className="grid gap-3 sm:grid-cols-2">
									{navLinks.map((item) => (
										<LocalizedLink
											key={item.href}
											href={item.href}
											onClick={() => setIsMenuOpen(false)}
											className={`rounded-[24px] border px-5 py-4 text-lg font-semibold uppercase tracking-[0.16em] transition-colors ${
												pathname === item.href
													? "border-purpleContrast/50 bg-purpleContrast/15 text-wheat"
													: "border-zinc-700/60 bg-greyBg/75 text-zinc-300 hover:border-zinc-500/70 hover:text-wheat"
											}`}
										>
											{item.label}
										</LocalizedLink>
									))}
								</div>

								<div className="mt-6">
									<SearchBar forceExpanded />
								</div>
							</div>

							<div className="grid gap-3">
								<div className="min-[340px]:hidden">
									<LanguageSwitcher />
								</div>

								{isAuthed && activeUser ? (
									<LocalizedLink
										href={`/profile/${activeUser}`}
										onClick={() => setIsMenuOpen(false)}
										className="inline-flex items-center justify-center gap-2 rounded-full border border-zinc-700/60 bg-greyBg/75 px-4 py-3 text-sm font-semibold text-zinc-100 transition-colors hover:border-zinc-500/70 hover:text-wheat"
									>
										<FaUser className="text-xs" />
										{messages.common.profile}
									</LocalizedLink>
								) : null}

								{isAuthed && canManageRoles ? (
									<LocalizedLink
										href="/admin"
										onClick={() => setIsMenuOpen(false)}
										className="inline-flex items-center justify-center gap-2 rounded-full border border-zinc-700/60 bg-greyBg/75 px-4 py-3 text-sm font-semibold text-zinc-100 transition-colors hover:border-purpleContrast/60 hover:text-wheat"
									>
										<FaShieldHalved className="text-xs" />
										{adminCopy.navLabel}
									</LocalizedLink>
								) : null}

								{isAuthed ? (
									canWrite ? (
										<LocalizedLink
											href="/new_post"
											onClick={() => setIsMenuOpen(false)}
											className="inline-flex items-center justify-center gap-2 rounded-full border border-zinc-700/60 bg-greyBg/75 px-4 py-3 text-sm font-semibold text-zinc-100 transition-colors hover:border-purpleContrast/60 hover:text-wheat"
										>
											<FaPlus className="text-xs" />
											{messages.common.create}
										</LocalizedLink>
									) : (
										<button
											type="button"
											onClick={() => {
												setIsMenuOpen(false);
												setIsSuggestOpen(true);
											}}
											className="inline-flex items-center justify-center gap-2 rounded-full border border-zinc-700/60 bg-greyBg/75 px-4 py-3 text-sm font-semibold text-zinc-100 transition-colors hover:border-zinc-500/70 hover:text-wheat"
										>
											<FaLightbulb className="text-xs" />
											{messages.common.suggest}
										</button>
									)
								) : (
									<LocalizedLink
										href="/login"
										onClick={() => setIsMenuOpen(false)}
										className="inline-flex items-center justify-center gap-2 rounded-full border border-zinc-700/60 bg-greyBg/75 px-4 py-3 text-sm font-semibold text-zinc-100 transition-colors hover:border-zinc-500/70 hover:text-wheat"
									>
										<FaRightToBracket className="text-xs" />
										{messages.common.login}
									</LocalizedLink>
								)}

								{isAuthed ? (
									<button
										type="button"
										onClick={() => signOut({ callbackUrl: localizeHref("/") })}
										className="inline-flex items-center justify-center gap-2 rounded-full border border-zinc-700/60 bg-greyBg/75 px-4 py-3 text-sm font-semibold text-zinc-100 transition-colors hover:border-zinc-500/70 hover:text-wheat"
									>
										<FaArrowRightFromBracket className="text-xs" />
										{messages.common.logout}
									</button>
								) : null}

								<Icons className="justify-center" />
							</div>
						</div>
					</div>
				</div>
			) : null}

			<div
				className={`fixed inset-x-0 top-4 z-[60] transition-all duration-300 ${
					isScrolled && !hasModalOpen
						? "translate-y-0 opacity-100"
						: "pointer-events-none -translate-y-6 opacity-0"
				}`}
			>
				<div className="mx-auto max-w-[1440px] px-4">
					<div className="relative overflow-hidden rounded-[22px] border border-zinc-700/50 bg-lessDarkBg/92 shadow-xl shadow-zinc-950/20 backdrop-blur-xl">
						<nav className="px-3 py-3 sm:px-4">
							<div className="flex items-center gap-3">
								<div className="xl:hidden">
									<HamburgerMenu
										isMenuOpen={isMenuOpen}
										setIsMenuOpen={setIsMenuOpen}
										hideAt="xl"
									/>
								</div>

								<LocalizedLink
									href="/"
									className="hidden text-3xl font-somerton text-wheat xl:block"
								>
									devblog
								</LocalizedLink>

								<ul className="hidden flex-1 flex-wrap items-center gap-2 xl:flex">
									{scrolledNavLinks.map((item) => (
										<li key={`fixed-${item.href}`}>
											<LinkPill
												active={pathname === item.href}
												href={item.href}
												label={item.label}
												compact
											/>
										</li>
									))}
								</ul>

								<div className="ml-auto flex min-w-0 items-center gap-2 xl:gap-3">
									<div className="hidden min-[340px]:w-[220px] min-[340px]:block sm:hidden">
										<SearchBar
											forceExpanded
											reserveSpace
											widthClass="max-w-[220px]"
											tabIndex={isScrolled ? 0 : -1}
										/>
									</div>
									<div className="hidden sm:block sm:w-[240px] lg:w-[260px] xl:w-[280px]">
										<SearchBar
											reserveSpace
											widthClass="max-w-[280px] xl:max-w-[300px]"
											tabIndex={isScrolled ? 0 : -1}
										/>
									</div>

									{isAuthed && activeUser ? (
										<LocalizedLink
											href={`/profile/${activeUser}`}
											className="hidden items-center gap-2 rounded-full border border-zinc-700/60 bg-greyBg/75 px-4 py-2 text-sm font-semibold text-zinc-100 transition-colors hover:border-zinc-500/70 hover:text-wheat md:inline-flex"
										>
											<FaUser className="text-xs" />
											{messages.common.profile}
										</LocalizedLink>
									) : null}

									{isAuthed && canManageRoles ? (
										<LocalizedLink
											href="/admin"
											className="hidden items-center gap-2 rounded-full border border-zinc-700/60 bg-greyBg/75 px-4 py-2 text-sm font-semibold text-zinc-100 transition-colors hover:border-purpleContrast/60 hover:text-wheat md:inline-flex"
										>
											<FaShieldHalved className="text-xs" />
											{adminCopy.navLabel}
										</LocalizedLink>
									) : null}

									{isAuthed ? (
										canWrite ? (
											<LocalizedLink
												href="/new_post"
												className="hidden items-center gap-2 rounded-full border border-zinc-700/60 bg-greyBg/75 px-4 py-2 text-sm font-semibold text-zinc-100 transition-colors hover:border-purpleContrast/60 hover:text-wheat md:inline-flex"
											>
												<FaPlus className="text-xs" />
												{messages.common.create}
											</LocalizedLink>
										) : (
											<button
												type="button"
												onClick={() => setIsSuggestOpen(true)}
												className="hidden items-center gap-2 rounded-full border border-zinc-700/60 bg-greyBg/75 px-4 py-2 text-sm font-semibold text-zinc-100 transition-colors hover:border-zinc-500/70 hover:text-wheat md:inline-flex"
											>
												<FaLightbulb className="text-xs" />
												{messages.common.suggest}
											</button>
										)
									) : (
										<LocalizedLink
											href="/login"
											className="hidden items-center gap-2 rounded-full border border-zinc-700/60 bg-greyBg/75 px-4 py-2 text-sm font-semibold text-zinc-100 transition-colors hover:border-zinc-500/70 hover:text-wheat md:inline-flex"
										>
											<FaRightToBracket className="text-xs" />
											{messages.common.login}
										</LocalizedLink>
									)}

									{isAuthed ? (
										<button
											type="button"
											onClick={() =>
												signOut({ callbackUrl: localizeHref("/") })
											}
											className="hidden items-center gap-2 rounded-full border border-zinc-700/60 bg-greyBg/75 px-4 py-2 text-sm font-semibold text-zinc-100 transition-colors hover:border-zinc-500/70 hover:text-wheat md:inline-flex"
										>
											<FaArrowRightFromBracket className="text-xs" />
											{messages.common.logout}
										</button>
									) : null}
								</div>
							</div>
						</nav>

						{isScrolled && inPost ? (
							<div className="pointer-events-none absolute inset-x-0 bottom-0 h-[3px] bg-darkBg/70">
								<div
									style={{ width: `${progress}%` }}
									className="h-full bg-purpleContrast transition-[width] duration-150"
								/>
							</div>
						) : null}
					</div>
				</div>
			</div>

			<SuggestModal
				isOpen={isSuggestOpen}
				onClose={() => setIsSuggestOpen(false)}
				authorId={activeUser || "me"}
			/>
		</>
	);
}
