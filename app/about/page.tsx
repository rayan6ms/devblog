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

const horizontalVariants = [
	"lg:-translate-x-10",
	"lg:translate-x-0",
	"lg:translate-x-10",
];

function shuffle<T>(items: T[]) {
	const next = [...items];

	for (let index = next.length - 1; index > 0; index -= 1) {
		const randomIndex = Math.floor(Math.random() * (index + 1));
		[next[index], next[randomIndex]] = [next[randomIndex], next[index]];
	}

	return next;
}

function randomBetween(min: number, max: number) {
	return Math.random() * (max - min) + min;
}

function wrapHue(value: number) {
	return ((value % 360) + 360) % 360;
}

function buildGradientSet(count: number) {
	const baseHue = randomBetween(208, 246);

	return Array.from({ length: count }, (_, index) => {
		const primaryHue = wrapHue(baseHue + index * randomBetween(18, 26));
		const accentHue = wrapHue(primaryHue + randomBetween(32, 54));
		const contrastHue = wrapHue(primaryHue - randomBetween(28, 46));
		const originA = {
			x: randomBetween(16, 76).toFixed(0),
			y: randomBetween(16, 34).toFixed(0),
		};
		const originB = {
			x: randomBetween(24, 84).toFixed(0),
			y: randomBetween(58, 84).toFixed(0),
		};
		const shellHue = wrapHue(primaryHue + randomBetween(-8, 10));

		return {
			backgroundImage: [
				`radial-gradient(circle at ${originA.x}% ${originA.y}%, hsl(${primaryHue} 78% 62% / 0.18), transparent 34%)`,
				`radial-gradient(circle at ${originB.x}% ${originB.y}%, hsl(${accentHue} 72% 60% / 0.12), transparent 28%)`,
				`linear-gradient(135deg, hsl(${shellHue} 18% 24% / 0.94), hsl(${contrastHue} 18% 13% / 0.95))`,
			].join(", "),
		};
	});
}

export default function Page() {
	const shuffledOffsets = shuffle(horizontalVariants);
	const gradientStyles = buildGradientSet(storyCards.length);

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
										className={`mx-auto w-full max-w-3xl rounded-[28px] border border-zinc-700/60 p-7 shadow-lg shadow-zinc-950/10 transition-transform duration-500 ${shuffledOffsets[index]} animate-slide-down opacity-0`}
										style={{
											animationDelay: `${0.15 + index * 0.15}s`,
											animationFillMode: "forwards",
											...gradientStyles[index],
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
