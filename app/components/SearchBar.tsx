"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { FaMagnifyingGlass } from "react-icons/fa6";
import { getSearchSuggestions } from "@/data/posts";

interface Post {
	image: string;
	mainTag: string;
	tags: string[];
	title: string;
	author: string;
	date: string;
	views: number;
	hasStartedReading: boolean;
	percentRead: number;
	description: string;
}

export default function SearchBar({
	tabIndex,
	reserveSpace = false,
}: {
	tabIndex?: number;
	reserveSpace?: boolean;
}) {
	const [isSearchOpen, setIsSearchOpen] = useState(false);
	const [query, setQuery] = useState("");
	const [suggestions, setSuggestions] = useState<Post[]>([]);
	const [activeIndex, setActiveIndex] = useState(-1);

	const searchInput = useRef<HTMLInputElement>(null);
	const containerRef = useRef<HTMLFormElement>(null);
	const router = useRouter();

	const goToResults = useCallback(
		(nextQuery: string) => {
			const queryString = encodeURIComponent(nextQuery.trim());
			if (!queryString) return;
			setSuggestions([]);
			setActiveIndex(-1);
			setIsSearchOpen(false);
			router.push(`/search?q=${queryString}&page=1`);
		},
		[router],
	);

	const closeSearch = useCallback(() => {
		setSuggestions([]);
		setActiveIndex(-1);
		setIsSearchOpen(false);
	}, []);

	useEffect(() => {
		if (isSearchOpen) {
			requestAnimationFrame(() => searchInput.current?.focus());
		}
	}, [isSearchOpen]);

	useEffect(() => {
		const handle = setTimeout(async () => {
			const trimmedQuery = query.trim();

			if (trimmedQuery.length >= 2) {
				const result = await getSearchSuggestions(trimmedQuery);
				setSuggestions(result);
				setActiveIndex(-1);
				return;
			}

			setSuggestions([]);
			setActiveIndex(-1);
		}, 180);

		return () => clearTimeout(handle);
	}, [query]);

	useEffect(() => {
		const handleMouseDown = (event: MouseEvent) => {
			if (!containerRef.current?.contains(event.target as Node)) {
				if (!query.trim()) {
					closeSearch();
				} else {
					setSuggestions([]);
					setActiveIndex(-1);
				}
			}
		};

		document.addEventListener("mousedown", handleMouseDown);

		return () => document.removeEventListener("mousedown", handleMouseDown);
	}, [closeSearch, query]);

	const handleSearch = (event: React.FormEvent) => {
		event.preventDefault();
		if (query.trim()) goToResults(query);
	};

	const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
		if (event.key === "Escape") {
			if (query.trim()) {
				setSuggestions([]);
				setActiveIndex(-1);
			} else {
				closeSearch();
			}
			return;
		}

		if (suggestions.length === 0) {
			if (event.key === "Enter" && query.trim()) {
				event.preventDefault();
				goToResults(query);
			}
			return;
		}

		if (event.key === "ArrowDown") {
			event.preventDefault();
			setActiveIndex((index) => (index + 1) % suggestions.length);
		} else if (event.key === "ArrowUp") {
			event.preventDefault();
			setActiveIndex(
				(index) => (index - 1 + suggestions.length) % suggestions.length,
			);
		} else if (event.key === "Enter") {
			event.preventDefault();
			const chosen = activeIndex >= 0 ? suggestions[activeIndex].title : query;
			goToResults(chosen);
		}
	};

	const handleButtonClick = () => {
		if (!isSearchOpen) {
			setIsSearchOpen(true);
			return;
		}

		if (query.trim()) {
			goToResults(query);
			return;
		}

		closeSearch();
	};

	return (
		<form
			ref={containerRef}
			onSubmit={handleSearch}
			className={`relative ml-auto h-[50px] ${reserveSpace ? "w-full max-w-[340px] min-w-[50px]" : "w-full"
				}`}
		>
			<div
				className={`absolute right-0 top-0 flex h-[50px] overflow-hidden rounded-[18px] border border-zinc-700/60 bg-darkBg/72 shadow-lg shadow-zinc-950/15 transition-[width,border-color] duration-300 focus-within:border-purpleContrast/50 hover:border-zinc-500/70 ${isSearchOpen ? "w-full" : "w-[50px]"
					}`}
			>
				<div className="flex min-w-0 flex-1 items-center overflow-hidden">
					<input
						ref={searchInput}
						tabIndex={tabIndex}
						type="text"
						value={query}
						onChange={(event) => setQuery(event.target.value)}
						onKeyDown={handleKeyDown}
						placeholder="Search posts"
						className={`h-full w-full bg-transparent text-sm text-zinc-100 outline-none transition-[opacity,padding,width] duration-300 placeholder:text-zinc-500 ${isSearchOpen
								? "pl-4 pr-3 opacity-100"
								: "pointer-events-none w-0 px-0 opacity-0"
							}`}
						aria-label="Search posts"
					/>
				</div>
				<div className="flex h-full w-[48px] shrink-0 items-center justify-center">
					<button
						type="button"
						onClick={handleButtonClick}
						tabIndex={tabIndex}
						className="flex h-[38px] w-[38px] items-center justify-center rounded-[14px] border border-purpleContrast/30 bg-purpleContrast/15 text-zinc-100 transition-colors hover:bg-purpleContrast/25"
						aria-label={isSearchOpen ? "Search" : "Open search"}
					>
						<FaMagnifyingGlass className="text-sm" />
					</button>
				</div>
			</div>

			{suggestions.length > 0 ? (
				<ul
					className="absolute right-0 top-[calc(100%+0.75rem)] z-[90] w-full overflow-hidden rounded-[22px] border border-zinc-700/60 bg-lessDarkBg/98 shadow-2xl shadow-zinc-950/40"
					aria-label="Search suggestions"
				>
					{suggestions.map((suggestion, index) => {
						const isActive = index === activeIndex;

						return (
							<li key={suggestion.title}>
								<button
									type="button"
									onMouseDown={(event) => {
										event.preventDefault();
										setQuery(suggestion.title);
										goToResults(suggestion.title);
									}}
									className={`w-full px-4 py-3 text-left text-sm leading-6 text-zinc-200 transition-colors ${isActive
										? "bg-purpleContrast/18"
										: "hover:bg-greyBg/80"
										}`}
								>
									{suggestion.title}
								</button>
							</li>
						);
					})}

					<li className="border-t border-zinc-700/60 px-4 py-3 text-right">
						<button
							type="button"
							onMouseDown={(event) => {
								event.preventDefault();
								goToResults(query);
							}}
							className="text-xs uppercase tracking-[0.16em] text-zinc-400 transition-colors hover:text-wheat"
						>
							View all results
						</button>
					</li>
				</ul>
			) : null}
		</form>
	);
}
