"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { IconType } from "react-icons";
import {
	FaLinkedin,
	FaSquareGithub,
	FaSquareTwitter,
	FaSquareYoutube,
} from "react-icons/fa6";

const coreLinks = [
	{ href: "/", label: "Home" },
	{ href: "/recent", label: "Recent" },
	{ href: "/trending", label: "Trending" },
	{ href: "/tag", label: "Tags" },
	{ href: "/about", label: "About" },
];

const socialLinks: { href: string; icon: IconType; label: string }[] = [
	{
		href: "https://github.com/rayan6ms",
		icon: FaSquareGithub,
		label: "GitHub",
	},
	{
		href: "https://twitter.com/rayan6ms",
		icon: FaSquareTwitter,
		label: "Twitter",
	},
	{
		href: "https://linkedin.com/in/rayan6ms",
		icon: FaLinkedin,
		label: "LinkedIn",
	},
	{
		href: "https://youtube.com/@migole",
		icon: FaSquareYoutube,
		label: "YouTube",
	},
];

export default function Footer() {
	const pathname = usePathname();
	const filteredLinks = coreLinks.filter((item) => item.href !== pathname);
	const visibleLinks =
		filteredLinks.length === 4 ? filteredLinks : coreLinks.slice(0, 4);

	return (
		<footer className="bg-darkBg px-4 pb-10 pt-6 sm:px-6 lg:px-8">
			<div className="mx-auto max-w-[1440px] rounded-[30px] border border-zinc-700/50 bg-lessDarkBg/90 shadow-xl shadow-zinc-950/20">
				<div className="border-b border-zinc-700/50 px-6 py-8 sm:px-8">
					<div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(260px,0.8fr)] lg:items-start">
						<div>
							<p className="text-xs uppercase tracking-[0.24em] text-zinc-500">
								devblog
							</p>
							<h2 className="mt-3 text-4xl font-somerton text-wheat sm:text-5xl">
								Posts, experiments, interface work.
							</h2>
							<p className="mt-4 max-w-xl text-sm leading-7 text-zinc-400 sm:text-base">
								A personal development blog with writing, interaction studies,
								and a playground for ideas that are easier to show than describe.
							</p>
						</div>

						<div className="grid gap-6 sm:grid-cols-2">
							<div>
								<p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
									Navigate
								</p>
								<div className="mt-4 grid gap-2">
									{visibleLinks.map((item) => (
										<Link
											key={item.href}
											href={item.href}
											className="rounded-2xl border border-zinc-700/60 bg-greyBg/70 px-4 py-3 text-sm font-semibold text-zinc-200 transition-colors hover:border-zinc-500/70 hover:text-wheat"
										>
											{item.label}
										</Link>
									))}
								</div>
							</div>

							<div>
								<p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
									Socials
								</p>
								<div className="mt-4 grid gap-2">
									{socialLinks.map(({ href, icon: Icon, label }) => (
										<a
											key={href}
											href={href}
											target="_blank"
											rel="noopener noreferrer"
											className="inline-flex items-center gap-3 rounded-2xl border border-zinc-700/60 bg-greyBg/70 px-4 py-3 text-sm font-semibold text-zinc-200 transition-colors hover:border-zinc-500/70 hover:text-wheat"
										>
											<Icon className="text-lg" />
											{label}
										</a>
									))}
								</div>
							</div>
						</div>
					</div>
				</div>

				<div className="flex flex-col gap-3 px-6 py-4 text-sm text-zinc-500 sm:flex-row sm:items-center sm:justify-between sm:px-8">
					<p>&copy; {new Date().getFullYear()} devblog.</p>
					<p>Articles, UI experiments, and interactive side work.</p>
				</div>
			</div>
		</footer>
	);
}
