"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { FaArrowRight, FaEye } from "react-icons/fa6";
import slugify from "slugify";
import LocalizedLink from "@/components/LocalizedLink";
import { useI18n } from "@/components/LocaleProvider";
import { getIntlLocale } from "@/lib/i18n";
import {
	getAuthorHref,
	getPostHref,
	type IPost,
} from "@/lib/posts-client";

type AccordionProps = {
	posts: IPost[];
};

function normalizeValue(value: string) {
	return slugify(value, { lower: true, strict: true });
}

function formatViews(views: number) {
	return views >= 1000 ? `${(views / 1000).toFixed(1)}k` : `${views}`;
}

export default function Accordion({ posts }: AccordionProps) {
	const { locale, messages } = useI18n();
	const [activePanel, setActivePanel] = useState(0);
	const [windowWidth, setWindowWidth] = useState(0);
	const [isPaused, setIsPaused] = useState(false);
	const isMobile = windowWidth > 0 && windowWidth < 960;

	useEffect(() => {
		const handleResize = () => {
			setWindowWidth(window.innerWidth);
		};

		handleResize();
		window.addEventListener("resize", handleResize);

		return () => {
			window.removeEventListener("resize", handleResize);
		};
	}, []);

	const visiblePosts = useMemo(() => {
		const maxPanels = windowWidth > 0 && windowWidth < 1280 ? 5 : 7;
		return posts.slice(0, maxPanels);
	}, [posts, windowWidth]);
	const currentPanel =
		visiblePosts.length === 0
			? 0
			: Math.min(activePanel, visiblePosts.length - 1);

	useEffect(() => {
		if (visiblePosts.length <= 1 || isPaused) {
			return;
		}

		const intervalId = window.setInterval(() => {
			setActivePanel((current) => (current + 1) % visiblePosts.length);
		}, 6000);

		return () => {
			window.clearInterval(intervalId);
		};
	}, [isPaused, visiblePosts.length]);

	if (visiblePosts.length === 0) {
		return null;
	}

	const trackStyle = isMobile
		? {
			gridTemplateRows: visiblePosts
				.map((_, index) => (index === currentPanel ? "3.4fr" : "1fr"))
				.join(" "),
		}
		: {
			gridTemplateColumns: visiblePosts
				.map((_, index) => (index === currentPanel ? "3.4fr" : "1fr"))
				.join(" "),
		};

	return (
		<div
			className={`grid gap-4 transition-[grid-template-columns,grid-template-rows] duration-700 ${isMobile ? "h-[720px]" : "h-[520px]"
				}`}
			style={trackStyle}
			onMouseEnter={() => setIsPaused(true)}
			onMouseLeave={() => setIsPaused(false)}
			onFocusCapture={() => setIsPaused(true)}
			onBlurCapture={() => setIsPaused(false)}
		>
			{visiblePosts.map((post, index) => {
				const isActive = currentPanel === index;
				const postHref = getPostHref(post);

				return (
					<article
						key={`${post.title}-${post.author}-${index}`}
						className={`group relative overflow-hidden rounded-[28px] border border-zinc-700/50 bg-greyBg shadow-lg shadow-zinc-950/20 transition-all duration-500 ${isActive ? "shadow-zinc-950/30" : "hover:border-zinc-500/60"
							}`}
					>
						<Image
							fill
							src={post.image}
							alt={post.imageAlt}
							className={`object-cover transition-[filter,transform] duration-700 ${isActive ? "scale-100 brightness-[0.74]" : "scale-105 brightness-[0.80]"
								}`}
							sizes="(max-width: 960px) 100vw, 30vw"
						/>
						<div
							className={`absolute inset-0 bg-gradient-to-t from-darkBg/95 via-darkBg/65 to-darkBg/5 transition-opacity duration-500 ${isActive ? "opacity-100" : "opacity-0"
								}`}
						/>

						{!isActive && (
							<button
								type="button"
								className="absolute inset-0 z-20"
								aria-label={messages.trending.focusPost(post.title)}
								onClick={() => setActivePanel(index)}
							/>
						)}

						<div className="relative z-10 h-full p-5">
							<div
								className={`absolute top-5 z-20 flex items-center transition-all duration-500 ${isActive
									? "left-5 translate-x-0 gap-3"
									: "left-1/2 -translate-x-1/2 gap-0"
									}`}
							>
								<span className="inline-flex h-[50px] w-[50px] items-center justify-center rounded-[18px] border border-zinc-700/60 bg-darkBg/72 shadow-lg shadow-zinc-950/15 backdrop-blur-sm">
									<span className="inline-flex h-[38px] w-[38px] items-center justify-center rounded-[14px] border border-purpleContrast/30 bg-purpleContrast/15 px-2 text-sm font-semibold text-zinc-100">
										{index + 1}
									</span>
								</span>
								<LocalizedLink
									href={`/tag?selected=${normalizeValue(post.mainTag)}`}
									className={`inline-flex w-fit overflow-hidden rounded-full border bg-black/35 text-xs uppercase tracking-[0.16em] text-zinc-100 transition-all duration-500 hover:border-zinc-300 hover:text-wheat ${isActive
										? "max-w-[12rem] border-zinc-500/80 px-4 py-2 opacity-100"
										: "pointer-events-none max-w-0 border-transparent px-0 py-2 opacity-0"
										}`}
								>
									<span className="whitespace-nowrap">{post.mainTag}</span>
								</LocalizedLink>
							</div>

							<div
								className={`absolute right-5 top-5 z-20 text-right transition-all duration-300 ${isActive
									? "translate-y-0 opacity-100"
									: "pointer-events-none -translate-y-2 opacity-0"
									}`}
							>
								<p className="text-xs uppercase tracking-[0.18em] text-zinc-300/90">
									{messages.common.views}
								</p>
								<p className="mt-1 flex items-center justify-end gap-1 text-sm font-medium text-wheat drop-shadow-[0_3px_10px_rgba(0,0,0,0.7)]">
									<FaEye className="text-xs" />
									{formatViews(post.views)}
								</p>
							</div>

							<div
								className={`absolute inset-x-5 bottom-5 transition-all duration-500 ${isActive
									? "translate-y-0 opacity-100"
									: "pointer-events-none translate-y-8 opacity-0"
									}`}
							>
								<h2 className="max-w-xl text-2xl font-semibold leading-tight text-wheat drop-shadow-[0_6px_18px_rgba(0,0,0,0.8)] sm:text-3xl">
									{post.title}
								</h2>
								<p className="mt-3 max-w-2xl line-clamp-4 text-sm leading-7 text-zinc-100/90 drop-shadow-[0_4px_14px_rgba(0,0,0,0.7)] sm:text-base">
									{post.description}
								</p>

								<div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-zinc-200/85">
									<LocalizedLink
										href={getAuthorHref(post)}
										className="transition-colors hover:text-wheat"
									>
										{post.author}
									</LocalizedLink>
									<span className="h-1 w-1 rounded-full bg-zinc-500/80" />
									<time dateTime={post.date}>
										{new Intl.DateTimeFormat(getIntlLocale(locale), {
											month: "short",
											day: "numeric",
										}).format(new Date(post.date))}
									</time>
								</div>

								<LocalizedLink
									href={postHref}
									className="mt-6 inline-flex items-center gap-2 rounded-full border border-zinc-400/80 bg-darkBg/80 px-4 py-2 text-sm font-semibold text-wheat transition-colors hover:border-zinc-200 hover:bg-black/40"
								>
									{messages.trending.readPost}
									<FaArrowRight className="text-xs" />
								</LocalizedLink>
							</div>
						</div>
					</article>
				);
			})}
		</div>
	);
}
