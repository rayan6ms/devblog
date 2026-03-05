"use client";

import { useEffect, useRef, useState } from "react";
import type { IconType } from "react-icons";
import {
	FaBookmark,
	FaEllipsisVertical,
	FaShareNodes,
	FaThumbsDown,
	FaThumbsUp,
} from "react-icons/fa6";

type PopoverProps = {
	iconSize?: "lg" | "xl" | number;
	hoverBg?: string;
};

export default function Popover({
	iconSize,
	hoverBg = "greyBg",
}: PopoverProps) {
	const [isOpen, setIsOpen] = useState(false);
	const ref = useRef<HTMLDivElement>(null);

	function handleMenuClick(e: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
		e.preventDefault();
		e.stopPropagation();
		setIsOpen((prev) => !prev);
	}

	// TODO - Rewrite buttons onClick to a single function
	function handleBookmark(e: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
		e.preventDefault();
		e.stopPropagation();
		console.log("Bookmark clicked");
		setIsOpen(false);
	}

	function handleShare(e: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
		e.preventDefault();
		e.stopPropagation();
		console.log("Share clicked");
		setIsOpen(false);
	}

	function handleShowMore(e: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
		e.preventDefault();
		e.stopPropagation();
		console.log("Show more clicked");
		setIsOpen(false);
	}

	function handleShowLess(e: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
		e.preventDefault();
		e.stopPropagation();
		console.log("Show less clicked");
		setIsOpen(false);
	}

	const buttonProperties: {
		icon: IconType;
		text: string;
		onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
	}[] = [
		{
			icon: FaBookmark,
			text: "Salvar nos Bookmarks",
			onClick: handleBookmark,
		},
		{
			icon: FaShareNodes,
			text: "Compartilhar",
			onClick: handleShare,
		},
		{
			icon: FaThumbsUp,
			text: "Mais posts como este",
			onClick: handleShowMore,
		},
		{
			icon: FaThumbsDown,
			text: "Menos posts como este",
			onClick: handleShowLess,
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
				className={`xxl:opacity-0 rounded-full px-[14px] py-1 group-hover:opacity-100 focus:opacity-100 hover:bg-${hoverBg} drop-shadow-lg transition-all duration-300 ease-in-out z-10 text-wheat`}
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
					className="origin-top-right absolute right-0 py-1 mt-1 w-56 rounded-md shadow-lg bg-greyBg ring-1 ring-black ring-opacity-5 z-20"
					role="menu"
					aria-orientation="vertical"
					aria-labelledby="options-menu"
				>
					{buttonProperties.map((button) => {
						const Icon = button.icon;
						return (
							<button
								key={button.text}
								type="button"
								className="w-full px-4 py-2 text-sm text-start text-wheat hover:bg-[#34373d] hover:text-purpleContrast"
								role="menuitem"
								onClick={button.onClick}
							>
								<Icon className="mr-2" />
								{button.text}
							</button>
						);
					})}
				</div>
			)}
		</div>
	);
}
