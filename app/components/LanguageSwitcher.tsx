"use client";

import { useEffect, useId, useRef, useState, type HTMLAttributes } from "react";
import { useSearchParams } from "next/navigation";
import { FaCheck, FaGlobe } from "react-icons/fa6";
import { useLocaleNavigation } from "@/hooks/useLocaleNavigation";
import { localeOptions } from "@/lib/i18n";
import { useI18n } from "./LocaleProvider";

type MenuPosition = {
	left: number;
	top: number;
};

type LanguageSwitcherProps = {
	className?: string;
} & HTMLAttributes<HTMLDivElement>;

const MENU_OFFSET = 8;
const VIEWPORT_MARGIN = 12;
const FALLBACK_MENU_WIDTH = 240;
const FALLBACK_MENU_HEIGHT = 280;

export default function LanguageSwitcher({
	className = "",
	...props
}: LanguageSwitcherProps) {
	const { locale, messages } = useI18n();
	const searchParams = useSearchParams();
	const { replaceWithLocale } = useLocaleNavigation();
	const [isOpen, setIsOpen] = useState(false);
	const ref = useRef<HTMLDivElement>(null);
	const menuRef = useRef<HTMLDivElement>(null);
	const menuId = useId();
	const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
	const currentQuery = searchParams.toString();
	const activeLocale = localeOptions.find((option) => option.value === locale);

	useEffect(() => {
		if (!isOpen) {
			return;
		}

		const updatePosition = () => {
			const trigger = ref.current;
			if (!trigger) {
				return;
			}

			const rect = trigger.getBoundingClientRect();
			const menuWidth = menuRef.current?.offsetWidth ?? FALLBACK_MENU_WIDTH;
			const menuHeight = menuRef.current?.offsetHeight ?? FALLBACK_MENU_HEIGHT;
			const maxLeft = Math.max(VIEWPORT_MARGIN, window.innerWidth - menuWidth - VIEWPORT_MARGIN);
			const nextLeft = Math.min(
				maxLeft,
				Math.max(VIEWPORT_MARGIN, rect.right - menuWidth),
			);
			const showBelow =
				window.innerHeight - rect.bottom >= menuHeight + VIEWPORT_MARGIN ||
				rect.top < menuHeight + VIEWPORT_MARGIN;
			const nextTop = showBelow
				? rect.bottom + MENU_OFFSET
				: rect.top - menuHeight - MENU_OFFSET;

			setMenuPosition({
				left: nextLeft,
				top: Math.max(VIEWPORT_MARGIN, nextTop),
			});
		};

		updatePosition();
		window.addEventListener("resize", updatePosition);
		window.addEventListener("scroll", updatePosition, true);

		return () => {
			window.removeEventListener("resize", updatePosition);
			window.removeEventListener("scroll", updatePosition, true);
		};
	}, [isOpen]);

	useEffect(() => {
		const handlePointerDown = (event: MouseEvent) => {
			if (ref.current && !ref.current.contains(event.target as Node)) {
				setIsOpen(false);
			}
		};

		const handleEscape = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				setIsOpen(false);
			}
		};

		document.addEventListener("mousedown", handlePointerDown);
		document.addEventListener("keydown", handleEscape);

		return () => {
			document.removeEventListener("mousedown", handlePointerDown);
			document.removeEventListener("keydown", handleEscape);
		};
	}, []);

	return (
		<div className={className} ref={ref} {...props}>
			<button
				type="button"
				onClick={() => setIsOpen((current) => !current)}
				className={`group flex rounded-2xl border border-zinc-700/60 bg-greyBg/75 p-3 antialiased transition-colors hover:border-zinc-500/70 hover:bg-greyBg ${isOpen ? "border-zinc-500/80 bg-greyBg" : ""}`}
				aria-label={messages.language.ariaLabel}
				title={`${messages.language.menuTitle}${activeLocale ? `: ${activeLocale.label}` : ""}`}
				aria-expanded={isOpen}
				aria-haspopup="menu"
				aria-controls={menuId}
			>
				<FaGlobe className="text-lg text-wheat transition-colors ease-in-out group-hover:text-purpleContrast" />
			</button>

			{isOpen ? (
				<div
					ref={menuRef}
					id={menuId}
					role="menu"
					aria-orientation="vertical"
					aria-label={messages.language.menuTitle}
					style={menuPosition ?? undefined}
					className={`fixed z-[95] w-[min(15rem,calc(100vw-1.5rem))] overflow-hidden rounded-[20px] border border-zinc-700/70 bg-lessDarkBg/95 shadow-2xl shadow-black/35 backdrop-blur-xl ${menuPosition ? "" : "invisible"}`}
				>
					<div className="pointer-events-none absolute inset-0 overflow-hidden">
						<div className="absolute -right-8 top-0 h-24 w-24 rounded-full bg-purpleContrast/12 blur-3xl" />
						<div className="absolute left-0 top-12 h-24 w-24 rounded-full bg-wheat/5 blur-3xl" />
					</div>

					<div className="relative p-2">
						<p className="px-2.5 pb-2 pt-1 text-[11px] uppercase tracking-[0.18em] text-zinc-500">
							{messages.language.menuTitle}
						</p>

						<div className="space-y-1">
							{localeOptions.map((option) => {
								const isActive = option.value === locale;

								return (
									<button
										key={option.value}
										type="button"
										role="menuitemradio"
										aria-checked={isActive}
										onClick={() => {
											setIsOpen(false);
											replaceWithLocale(
												currentQuery ? `?${currentQuery}` : "?",
												option.value,
												{ scroll: false },
											);
										}}
										className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-3 py-2.5 text-left transition-all duration-200 focus-visible:outline-none ${
											isActive
												? "border-purpleContrast/35 bg-purpleContrast/12"
												: "border-transparent hover:border-zinc-600/70 hover:bg-greyBg/85 focus-visible:border-zinc-500/80 focus-visible:bg-greyBg/85"
										}`}
									>
										<div className="min-w-0">
											<p className="text-sm font-semibold text-wheat">
												{option.label}
											</p>
											<p className="text-xs uppercase tracking-[0.16em] text-zinc-500">
												{option.shortLabel}
											</p>
										</div>
										<span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-zinc-700/70 bg-darkBg/80 text-zinc-200">
											{isActive ? <FaCheck className="text-xs text-wheat" /> : null}
										</span>
									</button>
								);
							})}
						</div>
					</div>
				</div>
			) : null}
		</div>
	);
}
