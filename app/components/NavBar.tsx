"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { FaLightbulb, FaPlus, FaRightToBracket, FaUser } from "react-icons/fa6";
import HamburgerMenu from "./HamburgerMenu";
import Icons from "./Icons";
import SearchBar from "./SearchBar";
import SuggestModal from "./SuggestModal";
import { useClientAuth } from "./useClientAuth";

const NAV_LINKS = [
	{ href: "/", label: "Home" },
	{ href: "/recent", label: "Recent" },
	{ href: "/trending", label: "Trending" },
	{ href: "/tag", label: "Tags" },
	{ href: "/about", label: "About" },
	{ href: "/playground", label: "Playground" },
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
		<Link
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
		</Link>
	);
}

export default function NavBar() {
	const pathname = usePathname();
	const hideNav =
		pathname === "/login" ||
		pathname === "/register" ||
		pathname === "/not-found";
	const inPost = pathname.includes("/post/");
	const { activeUser, canWrite, isAuthed } = useClientAuth();
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const [isScrolled, setIsScrolled] = useState(false);
	const [progress, setProgress] = useState(0);
	const [isSuggestOpen, setIsSuggestOpen] = useState(false);
	const [hasModalOpen, setHasModalOpen] = useState(false);

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
	}, []);

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

	return (
		<>
			<div className="bg-darkBg px-4 pb-4 sm:px-6 lg:px-8">
				<div className="mx-auto max-w-[1440px] rounded-b-[30px] border border-t-0 border-zinc-700/50 bg-greyBg/75 shadow-xl shadow-zinc-950/10">
					<div className="px-4 py-4 sm:px-6">
						<div className="flex items-center gap-3">
							<div className="md:hidden">
								<HamburgerMenu
									isMenuOpen={isMenuOpen}
									setIsMenuOpen={setIsMenuOpen}
								/>
							</div>

							<ul className="hidden flex-1 flex-wrap items-center gap-2 md:flex">
								{NAV_LINKS.map((item) => (
									<li key={`main-${item.href}`}>
										<LinkPill
											active={pathname === item.href}
											href={item.href}
											label={item.label}
										/>
									</li>
								))}
							</ul>

							<div className="ml-auto hidden md:block">
								<SearchBar />
							</div>
						</div>

						<div className="mt-4 md:hidden">
							<SearchBar />
						</div>
					</div>
				</div>
			</div>

			{isMenuOpen ? (
				<div className="fixed inset-0 z-[70] bg-black/60 px-4 py-4 backdrop-blur-sm sm:px-6">
					<div className="mx-auto max-w-[1440px] rounded-[30px] border border-zinc-700/50 bg-lessDarkBg/95 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
						<div className="border-b border-zinc-700/50 px-6 py-5 sm:px-8">
							<div className="flex items-center justify-between gap-4">
								<div>
									<p className="text-xs uppercase tracking-[0.22em] text-zinc-500">
										Navigation
									</p>
									<h2 className="mt-2 text-4xl font-somerton text-wheat">
										DEVBLoG
									</h2>
								</div>
								<HamburgerMenu
									isMenuOpen={isMenuOpen}
									setIsMenuOpen={setIsMenuOpen}
								/>
							</div>
						</div>

						<div className="grid gap-6 px-6 py-6 sm:px-8 lg:grid-cols-[minmax(0,1fr)_300px]">
							<div>
								<div className="grid gap-3 sm:grid-cols-2">
									{NAV_LINKS.map((item) => (
										<Link
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
										</Link>
									))}
								</div>

								<div className="mt-6">
									<SearchBar />
								</div>
							</div>

							<div className="grid gap-3">
								{isAuthed && activeUser ? (
									<Link
										href={`/profile/${activeUser}`}
										onClick={() => setIsMenuOpen(false)}
										className="inline-flex items-center justify-center gap-2 rounded-full border border-zinc-700/60 bg-greyBg/75 px-4 py-3 text-sm font-semibold text-zinc-100 transition-colors hover:border-zinc-500/70 hover:text-wheat"
									>
										<FaUser className="text-xs" />
										Profile
									</Link>
								) : null}

								{isAuthed ? (
									canWrite ? (
										<Link
											href="/new_post"
											onClick={() => setIsMenuOpen(false)}
											className="inline-flex items-center justify-center gap-2 rounded-full border border-zinc-700/60 bg-greyBg/75 px-4 py-3 text-sm font-semibold text-zinc-100 transition-colors hover:border-purpleContrast/60 hover:text-wheat"
										>
											<FaPlus className="text-xs" />
											Create
										</Link>
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
											Suggest
										</button>
									)
								) : (
									<Link
										href="/login"
										onClick={() => setIsMenuOpen(false)}
										className="inline-flex items-center justify-center gap-2 rounded-full border border-zinc-700/60 bg-greyBg/75 px-4 py-3 text-sm font-semibold text-zinc-100 transition-colors hover:border-zinc-500/70 hover:text-wheat"
									>
										<FaRightToBracket className="text-xs" />
										Login
									</Link>
								)}

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
					<div className="rounded-[22px] border border-zinc-700/50 bg-lessDarkBg/92 shadow-xl shadow-zinc-950/20 backdrop-blur-xl">
						<nav className="px-3 py-3 sm:px-4">
							<div className="flex items-center gap-3">
								<div className="lg:hidden">
									<HamburgerMenu
										isMenuOpen={isMenuOpen}
										setIsMenuOpen={setIsMenuOpen}
										fromScrollBar
									/>
								</div>

								<Link
									href="/"
									className="hidden text-3xl font-somerton text-wheat xl:block"
								>
									DEVBLoG
								</Link>

								<ul className="hidden flex-1 flex-wrap items-center gap-2 lg:flex">
									{NAV_LINKS.map((item) => (
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

								<div className="ml-auto flex items-center gap-3">
									<div className="hidden sm:block">
										<SearchBar tabIndex={isScrolled ? 0 : -1} />
									</div>

									{isAuthed && activeUser ? (
										<Link
											href={`/profile/${activeUser}`}
											className="hidden items-center gap-2 rounded-full border border-zinc-700/60 bg-greyBg/75 px-4 py-2 text-sm font-semibold text-zinc-100 transition-colors hover:border-zinc-500/70 hover:text-wheat md:inline-flex"
										>
											<FaUser className="text-xs" />
											Profile
										</Link>
									) : null}

									{isAuthed ? (
										canWrite ? (
											<Link
												href="/new_post"
												className="hidden items-center gap-2 rounded-full border border-zinc-700/60 bg-greyBg/75 px-4 py-2 text-sm font-semibold text-zinc-100 transition-colors hover:border-purpleContrast/60 hover:text-wheat md:inline-flex"
											>
												<FaPlus className="text-xs" />
												Create
											</Link>
										) : (
											<button
												type="button"
												onClick={() => setIsSuggestOpen(true)}
												className="hidden items-center gap-2 rounded-full border border-zinc-700/60 bg-greyBg/75 px-4 py-2 text-sm font-semibold text-zinc-100 transition-colors hover:border-zinc-500/70 hover:text-wheat md:inline-flex"
											>
												<FaLightbulb className="text-xs" />
												Suggest
											</button>
										)
									) : (
										<Link
											href="/login"
											className="hidden items-center gap-2 rounded-full border border-zinc-700/60 bg-greyBg/75 px-4 py-2 text-sm font-semibold text-zinc-100 transition-colors hover:border-zinc-500/70 hover:text-wheat md:inline-flex"
										>
											<FaRightToBracket className="text-xs" />
											Login
										</Link>
									)}
								</div>
							</div>
						</nav>

						{isScrolled && inPost ? (
							<div className="mt-1 h-1 rounded-b-[18px] bg-darkBg/80">
								<div
									style={{ width: `${progress}%` }}
									className="h-full rounded-r-[18px] bg-purpleContrast transition-[width] duration-150"
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
