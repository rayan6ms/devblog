export default function SkeletonFirstSection() {
	const skeletonItems = Array.from(
		{ length: 4 },
		(_, index) => `skeleton-trending-${index + 1}`,
	);

	return (
		<section>
			<div className="grid w-full justify-items-center gap-6 py-2 md:grid-cols-2 xl:gap-8 xxl:grid-cols-4 xxl:gap-6">
				{skeletonItems.map((itemKey) => (
					<div
						key={itemKey}
						className="group flex gap-6 w-full h-[130px] sm:h-[180px] md:w-[320px] md:h-[120px] lg:w-[380px] lg:h-[150px] xxl:w-[300px] xxl:h-[100px] box-content animate-pulse"
					>
						<div className="flex relative min-w-[130px] max-w-[130px] h-[130px] sm:min-w-[180px] sm:max-w-[180px] sm:h-[180px] md:min-w-[150px] md:max-w-[150px] md:h-[150px] xxl:min-w-[105px] xxl:max-w-[105px] xxl:h-[105px] bg-gray-300 rounded-lg"></div>
						<div className="flex flex-col justify-center w-fit h-full">
							<div className="flex justify-between mb-2">
								<div className="bg-gray-300 h-5 w-20 rounded animate-pulse"></div>
							</div>
							<div className="bg-gray-300 h-6 w-32 md:w-48 rounded animate-pulse"></div>
						</div>
					</div>
				))}
			</div>
		</section>
	);
}
