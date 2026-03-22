"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { IconType } from "react-icons";
import { FaBookmark, FaEllipsisVertical, FaShareNodes } from "react-icons/fa6";
import { emitClientAuthChange, useClientAuth } from "@/components/useClientAuth";
import { useLocaleNavigation } from "@/hooks/useLocaleNavigation";
import { getPostHref, type IPost } from "@/lib/posts-client";
import { useI18n } from "./LocaleProvider";

type PopoverProps = {
	post: IPost;
	iconSize?: "lg" | "xl" | number;
	hoverBg?: string;
};

export default function Popover({
	post,
	iconSize,
	hoverBg = "greyBg",
}: PopoverProps) {
	const { messages } = useI18n();
	const { isAuthed } = useClientAuth();
	const { push } = useLocaleNavigation();
	const [isOpen, setIsOpen] = useState(false);
	const [isBookmarked, setIsBookmarked] = useState(Boolean(post.isBookmarked));
	const ref = useRef<HTMLDivElement>(null);
	const menuId = useId();
	const hoverClass =
		hoverBg === "[#34373d]"
			? "hover:bg-[#34373d]/95"
			: hoverBg === "greyBg"
				? "hover:bg-greyBg/95"
				: "";
	const baseBgClass =
		hoverBg === "[#34373d]" ? "bg-[#34373d]/80" : "bg-lessDarkBg/85";

	function handleMenuClick(e: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
		e.preventDefault();
		e.stopPropagation();
		setIsOpen((prev) => !prev);
	}

	async function handleBookmark(
		e: React.MouseEvent<HTMLButtonElement, MouseEvent>,
	) {
		e.preventDefault();
		e.stopPropagation();

		if (!isAuthed) {
			setIsOpen(false);
			push("/login");
			return;
		}

		try {
			const response = await fetch(
				`/api/post/${encodeURIComponent(post.slug)}/bookmark`,
				{
					method: "POST",
					cache: "no-store",
				},
			);
			if (response.status === 401) {
				setIsOpen(false);
				push("/login");
				return;
			}

			if (!response.ok) {
				return;
			}

			const result = (await response.json()) as {
				bookmarked?: boolean;
			};
			setIsBookmarked(Boolean(result.bookmarked));
			emitClientAuthChange();
		} catch {}

		setIsOpen(false);
	}

	async function handleShare(e: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
		e.preventDefault();
		e.stopPropagation();

		const shareUrl = new URL(getPostHref(post), window.location.origin).toString();

		try {
			if (navigator.share) {
				await navigator.share({
					title: post.title,
					url: shareUrl,
				});
			} else if (navigator.clipboard?.writeText) {
				await navigator.clipboard.writeText(shareUrl);
			}
		} catch {}

		setIsOpen(false);
	}

	const buttonProperties: {
		icon: IconType;
		text: string;
		onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
	}[] = [
		{
			icon: FaBookmark,
			text: messages.popover.save,
			onClick: handleBookmark,
		},
		{
			icon: FaShareNodes,
			text: messages.popover.share,
			onClick: handleShare,
		},
	];

	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (ref.current && !ref.current.contains(e.target as Node)) {
				setIsOpen(false);
			}
		};

		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				setIsOpen(false);
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		document.addEventListener("keydown", handleEscape);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
			document.removeEventListener("keydown", handleEscape);
		};
	}, []);

	return (
		<div className="relative" ref={ref}>
			<button
				type="button"
				onClick={handleMenuClick}
				className={`z-10 flex h-9 w-9 items-center justify-center rounded-2xl border border-zinc-700/70 text-wheat shadow-lg shadow-zinc-950/20 backdrop-blur-md transition-all duration-200 ease-in-out xxl:opacity-0 group-hover:opacity-100 focus:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purpleContrast/70 ${baseBgClass} ${hoverClass} ${isOpen ? "border-zinc-500/80 bg-greyBg/95 text-wheat" : ""}`}
				aria-expanded={isOpen}
				aria-haspopup="menu"
				aria-controls={menuId}
			>
				<FaEllipsisVertical
					size={
						typeof iconSize === "number"
							? iconSize
							: iconSize === "xl"
								? 24
								: iconSize === "lg"
									? 20
									: 18
					}
				/>
			</button>
			{isOpen && (
				<div
					id={menuId}
					className="absolute right-0 z-20 mt-2 w-[15.5rem] origin-top-right overflow-hidden rounded-[20px] border border-zinc-700/70 bg-lessDarkBg/95 shadow-2xl shadow-black/35 backdrop-blur-xl"
					role="menu"
					aria-orientation="vertical"
					aria-label={messages.popover.aria}
				>
					<div className="pointer-events-none absolute inset-0 overflow-hidden">
						<div className="absolute -right-10 top-0 h-28 w-28 rounded-full bg-purpleContrast/12 blur-3xl" />
						<div className="absolute left-0 top-16 h-24 w-24 rounded-full bg-wheat/5 blur-3xl" />
					</div>
					<div className="relative space-y-1 p-2">
						{buttonProperties.map((button) => {
							const Icon = button.icon;
							return (
								<button
									key={button.text}
									type="button"
									className="flex w-full items-center gap-2 rounded-2xl border border-transparent px-2.5 py-2 text-left transition-all duration-200 hover:border-zinc-600/70 hover:bg-greyBg/85 focus-visible:border-zinc-500/80 focus-visible:bg-greyBg/85 focus-visible:outline-none"
									role="menuitem"
									onClick={button.onClick}
								>
									<span
										className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-zinc-700/70 bg-darkBg/80 text-zinc-200 ${
											button.icon === FaBookmark && isBookmarked
												? "border-purpleContrast/60 text-purpleContrast"
												: ""
										}`}
									>
										<Icon className="shrink-0" />
									</span>
									<span className="min-w-0 text-sm font-medium text-wheat">
										{button.text}
									</span>
								</button>
							);
						})}
					</div>
				</div>
			)}
		</div>
	);
}
