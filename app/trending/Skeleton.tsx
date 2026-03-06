"use client";

import Footer from "@/components/Footer";

export default function SkeletonTrending() {
	return (
		<>
			<div className="min-h-screen bg-darkBg text-gray">
				<section className="mx-auto w-full max-w-[1440px] px-4 pb-4 pt-8 sm:px-6 lg:px-8">
					<div className="rounded-[30px] border border-zinc-700/50 bg-lessDarkBg/90 shadow-xl shadow-zinc-950/20">
						<div className="border-b border-zinc-700/50 px-6 py-8 sm:px-8">
							<div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
								<div className="max-w-3xl space-y-3">
									<div className="h-3 w-24 animate-pulse rounded-full bg-zinc-700/80" />
									<div className="h-12 w-full max-w-xl animate-pulse rounded-2xl bg-zinc-700/80" />
									<div className="h-4 w-full max-w-2xl animate-pulse rounded-full bg-zinc-700/70" />
									<div className="h-4 w-full max-w-xl animate-pulse rounded-full bg-zinc-700/60" />
								</div>

								<div className="grid gap-3 sm:grid-cols-3">
									{Array.from({ length: 3 }, (_, index) => (
										<div
											key={`stat-skeleton-${index}`}
											className="h-28 w-full min-w-[160px] animate-pulse rounded-2xl bg-zinc-700/70"
										/>
									))}
								</div>
							</div>
						</div>

						<div className="px-4 py-5 sm:px-6">
							<div className="grid h-[520px] gap-4 md:grid-cols-[3.4fr_1fr_1fr_1fr_1fr]">
								{Array.from({ length: 5 }, (_, index) => (
									<div
										key={`accordion-skeleton-${index}`}
										className="animate-pulse rounded-[28px] bg-zinc-700/70"
									/>
								))}
							</div>
						</div>
					</div>
				</section>

				<section className="mx-auto w-full max-w-[1440px] px-4 pb-10 sm:px-6 lg:px-8">
					<div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
						<div className="h-[520px] animate-pulse rounded-[26px] bg-zinc-700/70" />
						<div className="space-y-6">
							<div className="rounded-[26px] border border-zinc-700/50 bg-lessDarkBg/90 p-5">
								<div className="space-y-3">
									<div className="h-3 w-20 animate-pulse rounded-full bg-zinc-700/80" />
									<div className="h-10 w-64 animate-pulse rounded-2xl bg-zinc-700/80" />
									<div className="h-4 w-full max-w-xl animate-pulse rounded-full bg-zinc-700/60" />
								</div>
								<div className="mt-6 grid gap-4">
									{Array.from({ length: 6 }, (_, index) => (
										<div
											key={`ranked-skeleton-${index}`}
											className="h-36 animate-pulse rounded-[24px] bg-zinc-700/70"
										/>
									))}
								</div>
							</div>

							<div className="rounded-[26px] border border-zinc-700/50 bg-lessDarkBg/90 p-5">
								<div className="space-y-3">
									<div className="h-3 w-24 animate-pulse rounded-full bg-zinc-700/80" />
									<div className="h-10 w-56 animate-pulse rounded-2xl bg-zinc-700/80" />
								</div>
								<div className="mt-6 grid gap-4 lg:grid-cols-2">
									{Array.from({ length: 4 }, (_, index) => (
										<div
											key={`spotlight-skeleton-${index}`}
											className="h-[360px] animate-pulse rounded-[26px] bg-zinc-700/70"
										/>
									))}
								</div>
							</div>
						</div>
					</div>
				</section>
			</div>
			<Footer />
		</>
	);
}
