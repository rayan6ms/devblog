import Footer from "@/components/Footer";

const storyCards = [
	{
		delay: "0.15s",
		text: "DEVBLOG is a software development blog built as both a working archive and a portfolio. It is where I collect tutorials, experiments, interface ideas, and the parts of frontend work I enjoy refining the most.",
	},
	{
		delay: "0.3s",
		text: "The stack centers on Next.js, React, Tailwind CSS, Prisma, NextAuth, Phaser, and a few supporting libraries for data shaping and experiments. The idea is to keep the project practical while still leaving room for visual work and interaction.",
	},
	{
		delay: "0.45s",
		text: "Beyond posts, the site leans into interactivity: tag-driven discovery, recommendations, user tools, and a playground full of games and sketches. The goal is to make the project feel authored, not templated.",
	},
];

const highlights = [
	{ label: "Writing + UI", value: "One place for articles and interface work" },
	{ label: "Interactive features", value: "Search, recommendations, and experiments" },
	{ label: "Built to evolve", value: "A portfolio that keeps growing with the code" },
];

export default function Page() {
	return (
		<>
			<div className="min-h-screen bg-darkBg text-gray">
				<section className="mx-auto w-full max-w-[1440px] px-4 pb-4 pt-8 sm:px-6 lg:px-8">
					<div className="overflow-hidden rounded-[30px] border border-zinc-700/50 bg-lessDarkBg/90 shadow-xl shadow-zinc-950/20">
						<div className="border-b border-zinc-700/50 px-6 py-10 sm:px-8">
							<div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)] lg:items-end">
								<div className="max-w-3xl">
									<p className="text-xs uppercase tracking-[0.28em] text-zinc-500">
										About the project
									</p>
									<h1 className="mt-3 text-4xl font-somerton uppercase text-wheat sm:text-5xl">
										The portfolio side of the archive
									</h1>
									<p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-400 sm:text-base">
										This page keeps the original intent, but frames it with the
										same visual language as the rest of the site: stronger
										structure, cleaner spacing, and room for the project&apos;s
										more personal side.
									</p>
								</div>
								<div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
									{highlights.map((item) => (
										<div
											key={item.label}
											className="rounded-2xl border border-zinc-700/50 bg-greyBg/75 px-4 py-4"
										>
											<p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
												{item.label}
											</p>
											<p className="mt-2 text-sm leading-6 text-zinc-300">
												{item.value}
											</p>
										</div>
									))}
								</div>
							</div>
						</div>

						<div className="relative px-6 py-8 sm:px-8">
							<div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top,#674FF81A,transparent_68%)]" />
							<div className="relative grid gap-6">
								{storyCards.map((card) => (
									<div
										key={card.text}
										className="mx-auto w-full max-w-3xl rounded-[28px] border border-zinc-700/60 bg-greyBg/75 p-7 shadow-lg shadow-zinc-950/10 animate-slide-down opacity-0"
										style={{
											animationDelay: card.delay,
											animationFillMode: "forwards",
										}}
									>
										<p className="text-base leading-8 text-zinc-200 sm:text-lg">
											{card.text}
										</p>
									</div>
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
