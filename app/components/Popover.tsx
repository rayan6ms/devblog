"use client";
import { useId, useRef, useState } from "react";
import { FaBookmark, FaCheck, FaEllipsis, FaShareNodes } from "react-icons/fa6";
import { useLocaleNavigation } from "@/hooks/useLocaleNavigation";
import { getPostHref, type IPost } from "@/lib/posts-client";
import { useI18n } from "./LocaleProvider";
import { emitClientAuthChange, useClientAuth } from "./useClientAuth";

export default function Popover({
	post,
}: {
	post: IPost;
	iconSize?: "lg" | "xl" | number;
	hoverBg?: string;
}) {
	const { messages } = useI18n();
	const { isAuthed } = useClientAuth();
	const { push } = useLocaleNavigation();
	const [saved, setSaved] = useState(Boolean(post.isBookmarked));
	const [busy, setBusy] = useState(false);
	const [failed, setFailed] = useState(false);
	const [open, setOpen] = useState(false);
	const menu = useRef<HTMLDivElement>(null);
	const id = useId();
	async function bookmark() {
		if (!isAuthed) {
			menu.current?.hidePopover();
			push("/login");
			return;
		}
		setBusy(true);
		setFailed(false);
		try {
			const response = await fetch(
				`/api/post/${encodeURIComponent(post.slug)}/bookmark`,
				{ method: "POST", cache: "no-store" },
			);
			if (response.status === 401) {
				push("/login");
				return;
			}
			if (!response.ok) throw new Error("Bookmark request failed");
			const data = await response.json();
			setSaved(Boolean(data.bookmarked));
			emitClientAuthChange();
			menu.current?.hidePopover();
		} catch {
			setFailed(true);
		} finally {
			setBusy(false);
		}
	}
	async function share() {
		const url = new URL(getPostHref(post), location.origin).toString();
		try {
			if (navigator.share) await navigator.share({ title: post.title, url });
			else await navigator.clipboard?.writeText(url);
		} catch {
			/* Dismissing the system share sheet is expected. */
		}
		menu.current?.hidePopover();
	}
	return (
		<div className="post-actions">
			<button
				className="icon-button post-actions__trigger"
				type="button"
				aria-label={`${messages.popover.aria}: ${post.title}`}
				aria-expanded={open}
				popoverTarget={id}
				onClick={(event) => {
					const rect = event.currentTarget.getBoundingClientRect();
					if (menu.current) {
						menu.current.style.left = `${Math.max(12, Math.min(rect.right - 200, innerWidth - 212))}px`;
						menu.current.style.top = `${rect.bottom + 118 > innerHeight ? Math.max(12, rect.top - 118) : rect.bottom + 6}px`;
					}
				}}
			>
				<FaEllipsis aria-hidden="true" />
			</button>
			<div
				ref={menu}
				id={id}
				popover="auto"
				className="post-actions__menu"
				onToggle={(event) => setOpen(event.newState === "open")}
			>
				<button
					type="button"
					disabled={busy}
					aria-pressed={saved}
					onClick={bookmark}
				>
					{saved ? (
						<FaCheck aria-hidden="true" />
					) : (
						<FaBookmark aria-hidden="true" />
					)}
					{messages.popover.save}
				</button>
				<button type="button" onClick={share}>
					<FaShareNodes aria-hidden="true" />
					{messages.popover.share}
				</button>
				{failed && (
					<p role="status" className="px-3 py-2 text-sm text-red-300">
						{messages.popover.saveFailed}
					</p>
				)}
			</div>
		</div>
	);
}
