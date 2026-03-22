"use client";

import type React from "react";
import type { IconType } from "react-icons";
import { FaBookmark, FaClock, FaEye, FaFileLines } from "react-icons/fa6";
import slugify from "slugify";
import { useI18n } from "@/components/LocaleProvider";
import LocalizedLink from "@/components/LocalizedLink";
import { useLocaleNavigation } from "@/hooks/useLocaleNavigation";
import type { ProfilePost } from "@/profile/types";

type SliderProps = {
	title: string;
	iconKey: "bookmarks" | "viewedPosts" | "drafts" | "pendingReview";
	items?: ProfilePost[] | null;
};

const icons: Record<SliderProps["iconKey"], IconType> = {
	viewedPosts: FaEye,
	bookmarks: FaBookmark,
	drafts: FaFileLines,
	pendingReview: FaClock,
};

function SliderItem({ item }: { item: ProfilePost }) {
	const { push } = useLocaleNavigation();
	const { messages } = useI18n();

	const onTagClick = (event: React.MouseEvent<HTMLButtonElement>) => {
		event.preventDefault();
		event.stopPropagation();
		push(
			`/tag?selected=${slugify(item.mainTag, { lower: true, strict: true })}`,
		);
	};

	return (
		<LocalizedLink
			href={`/post/${item.slug}`}
			className="group w-[280px] shrink-0 rounded-[24px] border border-zinc-700/50 bg-greyBg/65 p-3 shadow-lg shadow-zinc-950/10 transition-transform hover:-translate-y-1"
		>
			<div className="relative flex h-40 flex-col justify-end overflow-hidden rounded-[20px] border border-zinc-700/40 bg-[radial-gradient(circle_at_top_left,rgba(103,79,248,0.35),transparent_56%),linear-gradient(180deg,rgba(52,56,64,0.35),rgba(23,25,29,0.95))] p-4">
				<p className="text-xs uppercase tracking-[0.3em] text-zinc-500">
					{item.slug}
				</p>
				<p className="mt-3 line-clamp-2 text-2xl font-somerton uppercase text-wheat">
					{item.title}
				</p>
				<button
					type="button"
					onClick={onTagClick}
					className="mt-4 w-fit rounded-full bg-darkBg/85 px-3 py-1 text-xs uppercase tracking-[0.12em] text-zinc-200 transition-colors hover:bg-purpleContrast"
				>
					{item.mainTag}
				</button>
			</div>

			<div className="pt-4">
				<p className="line-clamp-3 text-sm leading-7 text-zinc-300">
					{item.description || messages.common.noItemsYet}
				</p>
				{item.authorName ? (
					<p className="mt-3 text-xs uppercase tracking-[0.14em] text-zinc-500">
						{item.authorName}
					</p>
				) : null}
				<div className="mt-3 flex flex-wrap gap-2">
					{item.tags.slice(0, 3).map((tag) => (
						<span
							key={tag}
							className="rounded-full border border-zinc-600/50 bg-zinc-800/60 px-2.5 py-1 text-xs text-zinc-300"
						>
							{tag}
						</span>
					))}
				</div>
			</div>
		</LocalizedLink>
	);
}

export default function Slider({ title, iconKey, items = [] }: SliderProps) {
	const list: ProfilePost[] = Array.isArray(items) ? items : [];
	const { messages } = useI18n();
	const Icon = icons[iconKey];

	return (
		<section className="rounded-[30px] border border-zinc-700/50 bg-lessDarkBg/90 p-5 shadow-xl shadow-zinc-950/20 sm:p-6">
			<div className="mb-5 flex items-center gap-3 text-wheat">
				<div className="rounded-full border border-zinc-600/50 bg-greyBg/80 p-2">
					{Icon ? <Icon /> : null}
				</div>
				<div>
					<h3 className="font-somerton text-2xl uppercase">{title}</h3>
					<p className="text-sm text-zinc-400">
						{messages.profile.itemCount(list.length)}
					</p>
				</div>
			</div>

			<div className="flex gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
				{list.map((item) => (
					<SliderItem key={item.id} item={item} />
				))}
				{list.length === 0 ? (
					<div className="rounded-2xl border border-dashed border-zinc-700/60 bg-greyBg/45 px-4 py-6 text-sm text-zinc-400">
						{messages.common.noItemsYet}
					</div>
				) : null}
			</div>
		</section>
	);
}
