"use client";
import type { ReactNode } from "react";
import LocalizedLink from "./LocalizedLink";
export default function AuthShell({
	title,
	description,
	children,
}: {
	title: string;
	description?: string;
	children: ReactNode;
}) {
	return (
		<main className="site-container py-10">
			<LocalizedLink href="/" className="wordmark">
				devblog
			</LocalizedLink>
			<div className="mx-auto my-8 w-full max-w-lg rounded-[var(--card-radius)] border border-[var(--line)] bg-[var(--surface-1)] p-5 sm:p-8">
				<h1 className="mb-6 font-somerton text-4xl">{title}</h1>
				{description && <p className="mt-3 mb-6 text-sm leading-7 text-zinc-400">
					{description}
				</p>}
				{children}
			</div>
		</main>
	);
}
