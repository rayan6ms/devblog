interface HamburgerMenuProps {
	isMenuOpen: boolean;
	setIsMenuOpen: (isMenuOpen: boolean) => void;
	hideAt?: "md" | "lg" | "xl";
}

export default function HamburgerMenu({
	isMenuOpen,
	setIsMenuOpen,
	hideAt = "lg",
}: HamburgerMenuProps) {
	const hideClass = {
		md: "md:hidden",
		lg: "lg:hidden",
		xl: "xl:hidden",
	}[hideAt];

	return (
		<button
			type="button"
			onClick={() => setIsMenuOpen(!isMenuOpen)}
			className={`block h-fit w-fit rounded-2xl border border-zinc-700/60 bg-darkBg/70 p-1.5 shadow-lg shadow-zinc-950/10 transition-colors hover:border-zinc-500/70 hover:bg-greyBg/80 ${isMenuOpen ? "" : hideClass}`}
			aria-label={isMenuOpen ? "Close navigation menu" : "Open navigation menu"}
		>
			<svg
				className="h-8 w-8 -translate-y-[1px] fill-wheat transition-colors duration-200 hover:fill-purpleContrast sm:h-9 sm:w-9"
				viewBox="0 0 100 100"
				aria-hidden="true"
				focusable="false"
			>
				<rect
					className={`transition-transform duration-300 ${isMenuOpen ? "translate-y-0 translate-x-[39px] rotate-45" : ""}`}
					width="80"
					height="10"
					x="10"
					y="25"
					rx="5"
				/>
				<rect
					className={`transition-transform duration-400 ${isMenuOpen ? "opacity-0" : ""}`}
					width="80"
					height="10"
					x="10"
					y="45"
					rx="5"
				/>
				<rect
					className={`transition-transform duration-300 ${isMenuOpen ? "translate-y-[41px] -translate-x-[34px] -rotate-45" : ""}`}
					width="80"
					height="10"
					x="10"
					y="65"
					rx="5"
				/>
			</svg>
		</button>
	);
}
