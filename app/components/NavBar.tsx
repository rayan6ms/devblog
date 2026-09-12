"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { FaBars, FaXmark } from "react-icons/fa6";
import { useI18n } from "./LocaleProvider";
import LocalizedLink from "./LocalizedLink";
import SearchBar from "./SearchBar";

const links = [
	{ href: "/", key: "home" },
	{ href: "/recent", key: "recent" },
	{ href: "/trending", key: "trending" },
	{ href: "/tag", key: "tags" },
	{ href: "/about", key: "about" },
	{ href: "/playground", key: "playground" },
] as const;
export default function NavBar() {
	const pathname = usePathname();
	const { messages } = useI18n();
	const [open, setOpen] = useState(false);
	const [stuck, setStuck] = useState(false);
	const sentinel = useRef<HTMLDivElement>(null);
	const dialog = useRef<HTMLDialogElement>(null);
	const close = () => {
		dialog.current?.close();
		setOpen(false);
	};
	useEffect(() => {
		const marker = sentinel.current;
		if (!marker) return;
		const observer = new IntersectionObserver(([entry]) =>
			setStuck(!entry.isIntersecting && entry.boundingClientRect.top < 0),
		);
		observer.observe(marker);
		return () => observer.disconnect();
	}, [pathname]);
	useEffect(() => {
		const desktop = matchMedia("(min-width: 1000px)");
		const closeAtDesktop = () => {
			if (desktop.matches) {
				dialog.current?.close();
				setOpen(false);
			}
		};
		desktop.addEventListener("change", closeAtDesktop);
		return () => desktop.removeEventListener("change", closeAtDesktop);
	}, []);
	if (["/login", "/register", "/not-found"].includes(pathname)) return null;
	return (
		<>
			<div ref={sentinel} className="h-px" aria-hidden="true" />
			<nav
				className="site-nav"
				data-stuck={stuck}
				aria-label={messages.nav.navigation}
			>
				<div className="site-container nav-row">
					<button
						type="button"
						className="icon-button nav-menu-button"
						aria-label={messages.nav.openMenu}
						aria-expanded={open}
						aria-haspopup="dialog"
						aria-controls="mobile-navigation"
						onClick={() => {
							dialog.current?.showModal();
							setOpen(true);
						}}
					>
						<FaBars aria-hidden="true" />
					</button>
					<div className="nav-links">
						{links.map((link) => (
							<LocalizedLink
								key={link.href}
								href={link.href}
								aria-current={pathname === link.href ? "page" : undefined}
							>
								{messages.common[link.key]}
							</LocalizedLink>
						))}
					</div>
					<div className="nav-search">
						<SearchBar key={pathname} />
					</div>
				</div>
			</nav>
			<dialog
				ref={dialog}
				id="mobile-navigation"
				className="nav-dialog"
				aria-label={messages.nav.navigation}
				onClose={() => setOpen(false)}
				onCancel={() => setOpen(false)}
			>
				<div className="nav-dialog__heading">
					<LocalizedLink href="/" className="wordmark" onClick={close}>
						devblog
					</LocalizedLink>
					<button
						type="button"
						className="icon-button"
						aria-label={messages.nav.closeMenu}
						onClick={close}
					>
						<FaXmark aria-hidden="true" />
					</button>
				</div>
				{open && <SearchBar forceExpanded onNavigate={close} />}
				<div className="nav-dialog__links">
					{links.map((link) => (
						<LocalizedLink
							key={link.href}
							href={link.href}
							aria-current={pathname === link.href ? "page" : undefined}
							onClick={close}
						>
							{messages.common[link.key]}
						</LocalizedLink>
					))}
				</div>
			</dialog>
		</>
	);
}
