"use client";

import { useEffect, useState } from "react";
import Footer from "@/components/Footer";
import { useClientAuth } from "@/components/useClientAuth";
import { getAllMainTags } from "@/data/posts";
import Form from "./Form";

const allowedRoles = ["volunteer", "writer", "admin", "owner"];

export default function Page() {
	const [mainTags, setMainTags] = useState<string[]>([]);
	const { isAuthed, profile, role } = useClientAuth();
	const hasPermission = Boolean(
		isAuthed && role && allowedRoles.includes(role),
	);

	useEffect(() => {
		if (!hasPermission) return;

		const fetchMainTags = async () => {
			const tags = await getAllMainTags();
			setMainTags(tags);
		};

		fetchMainTags();
	}, [hasPermission]);

	if (!hasPermission) {
		return (
			<>
				<main className="min-h-screen bg-darkBg px-4 pb-12 pt-6 text-gray sm:px-6 lg:px-8">
					<div className="mx-auto flex w-full max-w-[1440px] flex-col gap-8">
						<section className="rounded-[30px] border border-zinc-700/50 bg-lessDarkBg/90 px-6 py-8 shadow-xl shadow-zinc-950/20 sm:px-8">
							<p className="text-xs uppercase tracking-[0.24em] text-zinc-500">
								New Post
							</p>
							<h1 className="mt-3 text-4xl font-somerton text-wheat sm:text-5xl">
								Author access required
							</h1>
							<p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-400 sm:text-base">
								This page is reserved for contributor accounts. Sign in with a
								writer-capable profile to draft and review mock posts.
							</p>
						</section>
					</div>
				</main>
				<Footer />
			</>
		);
	}

	if (!mainTags.length) {
		return (
			<>
				<main className="min-h-screen bg-darkBg px-4 pb-12 pt-6 text-gray sm:px-6 lg:px-8">
					<div className="mx-auto flex w-full max-w-[1440px] flex-col gap-8">
						<section className="rounded-[30px] border border-zinc-700/50 bg-lessDarkBg/90 px-6 py-8 shadow-xl shadow-zinc-950/20 sm:px-8">
							<p className="text-xs uppercase tracking-[0.24em] text-zinc-500">
								New Post
							</p>
							<h1 className="mt-3 text-4xl font-somerton text-wheat sm:text-5xl">
								Preparing editor
							</h1>
							<p className="mt-4 text-sm leading-7 text-zinc-400 sm:text-base">
								Loading available main tags and authoring controls.
							</p>
						</section>
					</div>
				</main>
				<Footer />
			</>
		);
	}

	return (
		<>
			<main className="min-h-screen bg-darkBg px-4 pb-12 pt-6 text-gray sm:px-6 lg:px-8">
				<div className="mx-auto flex w-full max-w-[1440px] flex-col gap-8">
					<section className="rounded-[30px] border border-zinc-700/50 bg-lessDarkBg/90 shadow-xl shadow-zinc-950/20">
						<div className="grid gap-8 px-6 py-8 sm:px-8 lg:grid-cols-[minmax(0,1.2fr)_auto] lg:items-end">
							<div>
								<p className="text-xs uppercase tracking-[0.24em] text-zinc-500">
									New Post
								</p>
								<h1 className="mt-3 text-4xl font-somerton text-wheat sm:text-5xl">
									Create a new article
								</h1>
								<p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-400 sm:text-base">
									Use the same mock authoring flow that powers the post preview
									routes. Draft content, review the metadata, and publish to the
									local mock archive.
								</p>
							</div>

							<div className="flex flex-wrap gap-3 lg:justify-end">
								<div className="rounded-2xl border border-zinc-700/60 bg-greyBg/70 px-4 py-3">
									<p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
										Role
									</p>
									<p className="mt-1 text-lg font-semibold capitalize text-zinc-100">
										{role}
									</p>
								</div>
								<div className="rounded-2xl border border-zinc-700/60 bg-greyBg/70 px-4 py-3">
									<p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
										Author
									</p>
									<p className="mt-1 text-lg font-semibold text-zinc-100">
										{profile?.name || "Mock author"}
									</p>
								</div>
							</div>
						</div>
					</section>

					<section className="rounded-[30px] border border-zinc-700/50 bg-lessDarkBg/90 px-4 py-5 shadow-xl shadow-zinc-950/20 sm:px-6 sm:py-6">
						<Form
							mainTagsOptions={mainTags}
							initialValues={{ author: profile?.name || "mock-user-id-1" }}
						/>
					</section>
				</div>
			</main>
			<Footer />
		</>
	);
}
