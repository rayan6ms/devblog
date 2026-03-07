export default function SkeletonSecondSection() {
	const sections = ["Trending Posts", "Recent Posts", "Recommended Posts"];

	return (
		<section className="grid w-full gap-8 xl:grid-cols-3">
			{sections.map((section) => (
				<div
					key={section}
					className="mx-auto flex w-full max-w-[380px] flex-col items-stretch gap-5 rounded-[26px] border border-zinc-700/50 bg-greyBg/70 p-5 shadow-lg shadow-zinc-950/10 animate-pulse lg:p-8 xl:max-w-none"
				>
					<h2 className="sr-only">{section}</h2>
					<div className="w-full space-y-2">
						<div className="h-3 w-16 rounded-full bg-gray-300"></div>
						<div className="h-8 w-40 rounded-md bg-gray-300"></div>
						<div className="h-4 w-full rounded-full bg-gray-300"></div>
					</div>
					<div className="h-[270px] w-full rounded-lg bg-gray-300"></div>
					<div className="flex flex-col gap-3 w-full">
						<div className="h-[120px] w-full rounded-lg bg-gray-300"></div>
						<div className="h-[120px] w-full rounded-lg bg-gray-300"></div>
					</div>
					<div className="h-12 w-full rounded-full bg-gray-300"></div>
				</div>
			))}
		</section>
	);
}
