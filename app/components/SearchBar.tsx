"use client";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { FaMagnifyingGlass, FaXmark } from "react-icons/fa6";
import { useLocaleNavigation } from "@/hooks/useLocaleNavigation";
import { getSearchSuggestions, type IPost } from "@/lib/posts-client";
import { useI18n } from "./LocaleProvider";

export default function SearchBar({
	forceExpanded = false,
	onNavigate,
}: {
	forceExpanded?: boolean;
	onNavigate?: () => void;
}) {
	const { messages } = useI18n();
	const { push } = useLocaleNavigation();
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState("");
	const [suggestions, setSuggestions] = useState<IPost[]>([]);
	const [active, setActive] = useState(-1);
	const [focused, setFocused] = useState(false);
	const root = useRef<HTMLFormElement>(null);
	const input = useRef<HTMLInputElement>(null);
	const trigger = useRef<HTMLButtonElement>(null);
	const id = useId();
	const expanded = forceExpanded || open;
	const showSuggestions = expanded && focused && query.trim().length >= 2;

	useEffect(() => {
		if (!showSuggestions) return;
		const controller = new AbortController();
		const timer = setTimeout(async () => {
			const posts = await getSearchSuggestions(query, controller.signal);
			if (!controller.signal.aborted) setSuggestions(posts);
		}, 250);
		return () => {
			clearTimeout(timer);
			controller.abort();
		};
	}, [query, showSuggestions]);
	useEffect(() => {
		if (!open) return;
		input.current?.focus();
		const outside = (event: PointerEvent) => {
			if (!root.current?.contains(event.target as Node)) {
				setOpen(false);
				setFocused(false);
			}
		};
		document.addEventListener("pointerdown", outside);
		return () => document.removeEventListener("pointerdown", outside);
	}, [open]);
	const close = () => {
		setOpen(false);
		setFocused(false);
		setActive(-1);
		trigger.current?.focus();
	};
	const search = (value = query) => {
		if (!value.trim()) {
			input.current?.focus();
			return;
		}
		setOpen(false);
		setFocused(false);
		setSuggestions([]);
		setActive(-1);
		onNavigate?.();
		push(`/search?q=${encodeURIComponent(value.trim())}&page=1`);
	};
	const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
		if (event.key === "Escape") {
			event.preventDefault();
			event.stopPropagation();
			close();
		}
		if (
			suggestions.length &&
			showSuggestions &&
			(event.key === "ArrowDown" || event.key === "ArrowUp")
		) {
			event.preventDefault();
			setActive(
				(index) =>
					(index + (event.key === "ArrowDown" ? 1 : -1) + suggestions.length) %
					suggestions.length,
			);
		}
		if (
			event.key === "Enter" &&
			active >= 0 &&
			showSuggestions &&
			suggestions[active]
		) {
			event.preventDefault();
			search(suggestions[active].title);
		}
	};
	return (
		<form
			ref={root}
			className="expand-search"
			role="search"
			data-expanded={expanded}
			onSubmit={(event) => {
				event.preventDefault();
				search();
			}}
		>
			<div className="expand-search__field">
				<input
					id={id}
					ref={input}
					type="search"
					value={query}
					disabled={!expanded}
					aria-label={messages.searchBar.ariaLabel}
					placeholder={messages.searchBar.placeholder}
					autoComplete="off"
					onFocus={() => setFocused(true)}
					onKeyDown={onKeyDown}
					onChange={(event) => {
						setQuery(event.target.value);
						setSuggestions([]);
						setActive(-1);
					}}
				/>
				{expanded && !forceExpanded && (
					<button
						className="icon-button"
						type="button"
						onClick={close}
						aria-label={messages.common.close}
					>
						<FaXmark aria-hidden="true" />
					</button>
				)}
				<button
					ref={trigger}
					className="icon-button"
					type="button"
					aria-label={
						expanded ? messages.common.search : messages.searchBar.openSearch
					}
					aria-expanded={expanded}
					aria-controls={id}
					onClick={() => (expanded ? search() : setOpen(true))}
				>
					<FaMagnifyingGlass aria-hidden="true" />
				</button>
			</div>
			{showSuggestions && suggestions.length > 0 && (
				<ul
					className="search-suggestions"
					aria-label={messages.searchBar.searchSuggestions}
				>
					{suggestions.map((post, index) => (
						<li key={post.id}>
							<button
								type="button"
								data-active={index === active}
								onClick={() => search(post.title)}
							>
								{post.title}
							</button>
						</li>
					))}
					<li>
						<button type="button" onClick={() => search()}>
							{messages.searchBar.viewAllResults}
						</button>
					</li>
				</ul>
			)}
		</form>
	);
}
