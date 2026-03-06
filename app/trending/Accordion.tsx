"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { FaArrowRight, FaEye } from "react-icons/fa6";
import slugify from "slugify";
import type { IPost } from "@/data/posts";

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

	useEffect(() => {
		setActivePanel((current) =>
			visiblePosts.length === 0 ? 0 : Math.min(current, visiblePosts.length - 1),
		);
	}, [visiblePosts.length]);

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
					.map((_, index) => (index === activePanel ? "3.4fr" : "1fr"))
					.join(" "),
			}
		: {
				gridTemplateColumns: visiblePosts
					.map((_, index) => (index === activePanel ? "3.4fr" : "1fr"))
					.join(" "),
			};

	return (
		<div
			className={`grid gap-4 transition-[grid-template-columns,grid-template-rows] duration-700 ${
				isMobile ? "h-[720px]" : "h-[520px]"
			}`}
			style={trackStyle}
			onMouseEnter={() => setIsPaused(true)}
			onMouseLeave={() => setIsPaused(false)}
			onFocusCapture={() => setIsPaused(true)}
			onBlurCapture={() => setIsPaused(false)}
		>
			{visiblePosts.map((post, index) => {
				const isActive = activePanel === index;
				const postHref = `/post/${normalizeValue(post.title)}`;

				return (
					<article
						key={`${post.title}-${post.author}-${index}`}
						className={`group relative overflow-hidden rounded-[28px] border border-zinc-700/50 bg-greyBg shadow-lg shadow-zinc-950/20 transition-all duration-500 ${
							isActive ? "shadow-zinc-950/30" : "hover:border-zinc-500/60"
						}`}
					>
						<Image
							fill
							src={post.image}
							alt={post.title}
							className={`object-cover transition-transform duration-700 ${
								isActive ? "scale-100" : "scale-105"
							}`}
							sizes="(max-width: 960px) 100vw, 30vw"
						/>
						<div
							className={`absolute inset-0 bg-gradient-to-t from-darkBg via-darkBg/55 to-darkBg/10 transition-opacity duration-500 ${
								isActive ? "opacity-100" : "opacity-90"
							}`}
						/>

						{!isActive && (
							<button
								type="button"
								className="absolute inset-0 z-20"
								aria-label={`Focus ${post.title}`}
								onClick={() => setActivePanel(index)}
							/>
						)}

						<div className="relative z-10 flex h-full flex-col justify-between p-5">
							<div className="flex items-start justify-between gap-3">
								<div className="space-y-3">
									<span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-purpleContrast/40 bg-purpleContrast/20 text-sm font-semibold text-wheat">
										{index + 1}
									</span>
									<Link
										href={`/tag?selected=${normalizeValue(post.mainTag)}`}
										className={`inline-flex w-fit rounded-full border border-zinc-600/80 bg-black/35 px-3 py-1.5 text-xs uppercase tracking-[0.16em] text-zinc-200 transition-all hover:border-zinc-400 hover:text-wheat ${
											isActive ? "opacity-100" : "opacity-0 pointer-events-none"
										}`}
									>
										{post.mainTag}
									</Link>
								</div>

								<div
									className={`text-right transition-opacity duration-300 ${
										isActive ? "opacity-100" : "opacity-0"
									}`}
								>
									<p className="text-xs uppercase tracking-[0.18em] text-zinc-400">
										Views
									</p>
									<p className="mt-1 flex items-center justify-end gap-1 text-sm text-zinc-200">
										<FaEye />
										{formatViews(post.views)}
									</p>
								</div>
							</div>

							<div
								className={`transition-all duration-500 ${
									isActive
										? "translate-y-0 opacity-100"
										: "translate-y-6 opacity-0 pointer-events-none"
								}`}
							>
								<h2 className="max-w-xl text-2xl font-semibold leading-tight text-wheat sm:text-3xl">
									{post.title}
								</h2>
								<p className="mt-3 max-w-2xl line-clamp-4 text-sm leading-7 text-zinc-300 sm:text-base">
									{post.description}
								</p>

								<div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-zinc-400">
									<Link
										href={`/profile/${normalizeValue(post.author)}`}
										className="transition-colors hover:text-wheat"
									>
										{post.author}
									</Link>
									<span className="h-1 w-1 rounded-full bg-zinc-700" />
									<time dateTime={post.date}>
										{new Intl.DateTimeFormat("en-US", {
											month: "short",
											day: "numeric",
										}).format(new Date(post.date))}
									</time>
								</div>

								<Link
									href={postHref}
									className="mt-6 inline-flex items-center gap-2 rounded-full border border-zinc-500/80 bg-black/35 px-4 py-2 text-sm font-semibold text-wheat transition-colors hover:border-zinc-300 hover:bg-black/45"
								>
									Read post
									<FaArrowRight className="text-xs" />
								</Link>
							</div>

							<div
								className={`flex items-end justify-between transition-opacity duration-300 ${
									isActive ? "opacity-0 pointer-events-none" : "opacity-100"
								}`}
							>
								<div className="[writing-mode:vertical-rl] rotate-180 text-xs uppercase tracking-[0.22em] text-zinc-300">
									{post.mainTag}
								</div>
								<p className="line-clamp-3 max-w-[14rem] text-right text-sm font-medium text-zinc-100">
									{post.title}
								</p>
							</div>
						</div>
					</article>
				);
			})}
		</div>
	);
}
