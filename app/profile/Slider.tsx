"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type React from "react";
import type { IconType } from "react-icons";
import { FaBookmark, FaEye } from "react-icons/fa6";
import slugify from "slugify";
import type { IPost } from "@/data/posts";

type SliderProps = {
	title: string;
	items?: IPost[] | null;
};

const icons: Record<string, IconType> = {
	"viewed posts": FaEye,
	bookmarks: FaBookmark,
};

function SliderItem({ item }: { item: IPost }) {
	const router = useRouter();

	const onTagClick = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
		e.preventDefault();
		e.stopPropagation();
		router.push(
			`/tag?selected=${slugify(item.mainTag, { lower: true, strict: true })}`,
		);
	};

	return (
		<Link
			href={`/post/${slugify(item.title, { lower: true, strict: true })}`}
			className="group w-[280px] shrink-0 rounded-[24px] border border-zinc-700/50 bg-greyBg/65 p-3 shadow-lg shadow-zinc-950/10 transition-transform hover:-translate-y-1"
		>
			<div className="relative h-40 overflow-hidden rounded-[20px]">
				<Image
					src={item.image}
					alt={item.title}
					fill
					className="object-cover transition-transform duration-700 group-hover:scale-105"
					sizes="280px"
				/>
				<button
					type="button"
					onClick={onTagClick}
					className="absolute bottom-3 left-3 rounded-full bg-darkBg/85 px-3 py-1 text-xs uppercase tracking-[0.12em] text-zinc-200 transition-colors hover:bg-purpleContrast"
				>
					{item.mainTag}
				</button>
			</div>

			<div className="pt-4">
				<h3 className="line-clamp-2 text-lg font-semibold text-zinc-100">
					{item.title}
				</h3>
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
		</Link>
	);
}

export default function Slider({ title, items = [] }: SliderProps) {
	const list: IPost[] = Array.isArray(items) ? items : [];
	const Icon = icons[title.toLowerCase()];

	return (
		<section className="rounded-[30px] border border-zinc-700/50 bg-lessDarkBg/90 p-5 shadow-xl shadow-zinc-950/20 sm:p-6">
			<div className="mb-5 flex items-center gap-3 text-wheat">
				<div className="rounded-full border border-zinc-600/50 bg-greyBg/80 p-2">
					{Icon ? <Icon /> : null}
				</div>
				<div>
					<h3 className="font-somerton text-2xl uppercase">{title}</h3>
					<p className="text-sm text-zinc-400">
						{list.length} {list.length === 1 ? "item" : "items"}
					</p>
				</div>
			</div>

			<div className="flex gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
				{list.map((item) => (
					<SliderItem key={item.title} item={item} />
				))}
				{list.length === 0 && (
					<div className="rounded-2xl border border-dashed border-zinc-700/60 bg-greyBg/45 px-4 py-6 text-sm text-zinc-400">
						No items to show yet.
					</div>
				)}
			</div>
		</section>
	);
}
