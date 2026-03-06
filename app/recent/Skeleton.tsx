"use client";

import Footer from "@/components/Footer";

export default function SkeletonRecentPage() {
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
											key={`recent-stat-skeleton-${index}`}
											className="h-28 w-full min-w-[160px] animate-pulse rounded-2xl bg-zinc-700/70"
										/>
									))}
								</div>
							</div>
						</div>

						<div className="grid gap-4 px-4 py-5 sm:px-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
							<div className="aspect-[16/10] animate-pulse rounded-[26px] bg-zinc-700/70" />
							<div className="rounded-[26px] border border-zinc-700/50 bg-greyBg/70 p-5">
								<div className="space-y-3">
									<div className="h-3 w-24 animate-pulse rounded-full bg-zinc-700/80" />
									<div className="h-8 w-28 animate-pulse rounded-full bg-zinc-700/70" />
									<div className="h-10 w-full animate-pulse rounded-2xl bg-zinc-700/80" />
									<div className="h-4 w-full animate-pulse rounded-full bg-zinc-700/60" />
									<div className="h-4 w-5/6 animate-pulse rounded-full bg-zinc-700/60" />
								</div>
							</div>
						</div>
					</div>
				</section>

				<section className="mx-auto w-full max-w-[1440px] px-4 pb-10 sm:px-6 lg:px-8">
					<div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
						<div className="h-[520px] animate-pulse rounded-[26px] bg-zinc-700/70" />
						<div className="rounded-[26px] border border-zinc-700/50 bg-lessDarkBg/90 p-5">
							<div className="space-y-3">
								<div className="h-3 w-24 animate-pulse rounded-full bg-zinc-700/80" />
								<div className="h-10 w-64 animate-pulse rounded-2xl bg-zinc-700/80" />
								<div className="h-4 w-full max-w-xl animate-pulse rounded-full bg-zinc-700/60" />
							</div>
							<div className="mt-6 grid gap-4 md:grid-cols-2 xxl:grid-cols-3">
								{Array.from({ length: 6 }, (_, index) => (
									<div
										key={`recent-card-skeleton-${index}`}
										className="h-[430px] animate-pulse rounded-[26px] bg-zinc-700/70"
									/>
								))}
							</div>
						</div>
					</div>
				</section>
			</div>
			<Footer />
		</>
	);
}
