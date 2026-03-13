import Footer from "@/components/Footer";

export const dynamic = "force-dynamic";

const storyCards = [
	{
		text: "DEVBLOG is a software development blog built as both a working archive and a portfolio. It is where I collect tutorials, experiments, interface ideas, and the parts of frontend work I enjoy refining the most.",
	},
	{
		text: "The stack centers on Next.js, React, Tailwind CSS, Prisma, NextAuth, Phaser, and a few supporting libraries for data shaping and experiments. The idea is to keep the project practical while still leaving room for visual work and interaction.",
	},
	{
		text: "Beyond posts, the site leans into interactivity: tag-driven discovery, recommendations, user tools, and a playground full of games and sketches. The goal is to make the project feel authored, not templated.",
	},
];

const offsetVariants = [
	"lg:-translate-x-12",
	"lg:translate-x-0",
	"lg:translate-x-12",
];

const gradientVariants = [
	"bg-[linear-gradient(135deg,rgba(103,79,248,0.22),rgba(34,37,44,0.94)_34%,rgba(34,37,44,0.98)_100%)]",
	"bg-[linear-gradient(135deg,rgba(56,189,248,0.18),rgba(34,37,44,0.92)_28%,rgba(34,37,44,0.98)_100%)]",
	"bg-[linear-gradient(135deg,rgba(245,158,11,0.16),rgba(34,37,44,0.92)_26%,rgba(34,37,44,0.98)_100%)]",
];

function shuffle<T>(items: T[]) {
	const result = [...items];

	for (let index = result.length - 1; index > 0; index -= 1) {
		const randomIndex = Math.floor(Math.random() * (index + 1));
		[result[index], result[randomIndex]] = [result[randomIndex], result[index]];
	}

	return result;
}

export default function Page() {
	const offsets = shuffle(offsetVariants);
	const gradients = shuffle(gradientVariants);

	return (
		<>
			<div className="min-h-screen bg-darkBg text-gray">
				<section className="mx-auto w-full max-w-[1440px] px-4 pb-4 pt-8 sm:px-6 lg:px-8">
					<div className="overflow-hidden rounded-[30px] border border-zinc-700/50 bg-lessDarkBg/90 shadow-xl shadow-zinc-950/20">
						<div className="border-b border-zinc-700/50 px-6 py-10 sm:px-8">
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
						</div>

						<div className="px-6 py-8 sm:px-8">
							<div className="grid gap-6">
								{storyCards.map((card, index) => (
									<div
										key={card.text}
										className={`mx-auto w-full max-w-3xl rounded-[28px] border border-zinc-700/60 p-7 shadow-lg shadow-zinc-950/10 transition-transform duration-500 ${offsets[index]} ${gradients[index]}`}
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
