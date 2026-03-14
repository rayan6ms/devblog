"use client";

import type { ReactNode } from "react";
import PhaserBackground from "@/PhaserBackground";

type AuthShellProps = {
	eyebrow: string;
	title: string;
	description: string;
	asideTitle: string;
	asideBody: string;
	children: ReactNode;
};

export default function AuthShell({
	eyebrow,
	title,
	description,
	asideTitle,
	asideBody,
	children,
}: AuthShellProps) {
	return (
		<div className="relative min-h-screen overflow-hidden bg-darkBg text-gray">
			<div className="absolute inset-0">
				<PhaserBackground />
			</div>
			<div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(103,79,248,0.22),transparent_42%),linear-gradient(180deg,rgba(20,23,26,0.28),rgba(20,23,26,0.82))]" />
			<div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1440px] items-center px-4 py-10 sm:px-6 lg:px-8">
				<div className="grid w-full overflow-hidden rounded-[32px] border border-zinc-700/50 bg-lessDarkBg/88 shadow-2xl shadow-zinc-950/40 lg:grid-cols-[minmax(0,0.95fr)_minmax(420px,0.85fr)]">
					<div className="relative border-b border-zinc-700/50 px-6 py-10 sm:px-8 lg:border-b-0 lg:border-r">
						<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(237,231,218,0.08),transparent_50%)]" />
						<div className="relative max-w-xl">
							<p className="text-xs uppercase tracking-[0.28em] text-zinc-500">
								{eyebrow}
							</p>
							<h1 className="mt-4 text-4xl font-somerton uppercase text-wheat sm:text-5xl">
								{title}
							</h1>
							<p className="mt-4 max-w-lg text-sm leading-7 text-zinc-400 sm:text-base">
								{description}
							</p>
						</div>
						<div className="relative mt-10 max-w-md rounded-[28px] border border-zinc-700/50 bg-greyBg/70 p-6 shadow-lg shadow-zinc-950/10">
							<p className="text-xs uppercase tracking-[0.22em] text-zinc-500">
								Inside devblog
							</p>
							<h2 className="mt-3 text-2xl font-somerton uppercase text-wheat">
								{asideTitle}
							</h2>
							<p className="mt-3 text-sm leading-7 text-zinc-300">
								{asideBody}
							</p>
						</div>
					</div>
					<div className="px-6 py-8 sm:px-8 sm:py-10">{children}</div>
				</div>
			</div>
		</div>
	);
}
