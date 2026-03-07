export default function SkeletonMain() {
	const skeletonItems = Array.from(
		{ length: 4 },
		(_, index) => `skeleton-recommended-${index + 1}`,
	);

	return (
		<>
			<main className="mx-auto grid w-full max-w-[1280px] items-start gap-8 xl:grid-cols-[minmax(280px,320px)_minmax(0,1fr)] xxl:grid-cols-[minmax(280px,320px)_minmax(520px,600px)_minmax(320px,360px)]">
				<div className="grid gap-6 md:grid-cols-2 xl:grid-cols-1">
					<div className="mx-auto h-[270px] w-full max-w-[420px] rounded-lg bg-gray-300 animate-pulse"></div>
					<div className="mx-auto h-[270px] w-full max-w-[420px] rounded-lg bg-gray-300 animate-pulse"></div>
				</div>
				<div className="mx-auto h-[420px] w-full max-w-[600px] rounded-lg bg-gray-300 animate-pulse xl:col-start-2"></div>
				<div className="xl:col-start-2 xxl:col-start-3">
					<div className="h-fit rounded-[26px] border border-zinc-700/50 bg-greyBg/70 p-5 shadow-lg shadow-zinc-950/10">
						<div className="mb-5 space-y-2">
							<div className="h-3 w-24 animate-pulse rounded-full bg-zinc-700/80" />
							<div className="h-8 w-40 animate-pulse rounded-2xl bg-zinc-700/70" />
						</div>
						<div className="flex flex-col divide-y divide-zinc-700/60">
							{skeletonItems.map((itemKey) => (
								<div
									key={itemKey}
									className="my-1.5 h-[100px] w-full max-w-[320px] rounded-lg bg-gray-300 animate-pulse"
								></div>
							))}
						</div>
					</div>
				</div>
			</main>
			<div className="mt-7 hidden w-full items-center justify-center xxl:flex">
				<div className="bg-zinc-500/60 w-44 h-0.5 mr-2 rounded-lg animate-pulse"></div>
				<div className="w-6 h-6 mx-4 bg-zinc-300 rounded-full animate-pulse"></div>
				<div className="bg-zinc-500/60 w-44 h-0.5 ml-2 rounded-lg animate-pulse"></div>
			</div>
		</>
	);
}
