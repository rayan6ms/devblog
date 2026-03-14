import Footer from "@/components/Footer";

export const dynamic = "force-dynamic";

const storyCards = [
	{
		text: "devblog is my personal software development blog. It is where I publish tutorials, opinions, experiments, interface ideas, and the parts of web development I enjoy refining the most.",
	},
	{
		text: "The stack centers on Next.js, React, Tailwind CSS, Prisma, NextAuth, Phaser, and a few supporting libraries for data shaping and experiments. The goal is to keep the project practical, simple, and enjoyable to build without losing the visual side of the work.",
	},
	{
		text: "Beyond posts, the site leans into interactivity: tag-driven discovery, recommendations, user tools, and a playground full of games and sketches. I am not a game developer, but the playground is a good home for hobby projects and another way to show what I can build.",
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

function hueDistance(a: number, b: number) {
	const distance = Math.abs(a - b);
	return Math.min(distance, 360 - distance);
}

function pickDistinctHues(count: number, minimumDistance: number) {
	const hues: number[] = [];
	let attempts = 0;

	while (hues.length < count && attempts < 800) {
		const nextHue = randomBetween(0, 360);
		if (hues.every((value) => hueDistance(value, nextHue) >= minimumDistance)) {
			hues.push(nextHue);
		}
		attempts += 1;
	}

	while (hues.length < count) {
		hues.push(wrapHue(randomBetween(0, 360) + hues.length * (360 / count)));
	}

	return shuffle(hues);
}

function buildGradientSet(count: number) {
	const baseHues = pickDistinctHues(count, 58);
	const harmonyModes = shuffle([
		{ accent: 18, contrast: -28 },
		{ accent: 34, contrast: 176 },
		{ accent: -22, contrast: 148 },
		{ accent: 122, contrast: 236 },
		{ accent: 48, contrast: 196 },
	]);

	return Array.from({ length: count }, (_, index) => {
		const baseHue = baseHues[index];
		const mode = harmonyModes[index % harmonyModes.length];
		const primaryHue = wrapHue(baseHue + randomBetween(-10, 10));
		const accentHue = wrapHue(baseHue + mode.accent + randomBetween(-12, 12));
		const contrastHue = wrapHue(
			baseHue + mode.contrast + randomBetween(-14, 14),
		);
		const shellHue = wrapHue(baseHue + randomBetween(-20, 20));
		const originA = {
			x: randomBetween(16, 76).toFixed(0),
			y: randomBetween(16, 34).toFixed(0),
		};
		const originB = {
			x: randomBetween(24, 84).toFixed(0),
			y: randomBetween(58, 84).toFixed(0),
		};
		const originC = {
			x: randomBetween(62, 92).toFixed(0),
			y: randomBetween(12, 46).toFixed(0),
		};
		const primarySaturation = randomBetween(72, 88).toFixed(0);
		const accentSaturation = randomBetween(68, 86).toFixed(0);
		const contrastSaturation = randomBetween(66, 82).toFixed(0);

		return {
			backgroundImage: [
				`radial-gradient(circle at ${originA.x}% ${originA.y}%, hsl(${primaryHue} ${primarySaturation}% 64% / 0.22), transparent 34%)`,
				`radial-gradient(circle at ${originB.x}% ${originB.y}%, hsl(${accentHue} ${accentSaturation}% 58% / 0.16), transparent 30%)`,
				`radial-gradient(circle at ${originC.x}% ${originC.y}%, hsl(${contrastHue} ${contrastSaturation}% 54% / 0.13), transparent 27%)`,
				`linear-gradient(135deg, hsl(${shellHue} 26% 22% / 0.95), hsl(${wrapHue(contrastHue - 14)} 24% 11% / 0.97))`,
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
									A personal blog that also shows my work
								</h1>
								<p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-400 sm:text-base">
									This project is a writing space first, but it also works as a
									portfolio piece. The point is to show how I think about UI,
									frontend systems, and interactive work inside something I would
									actually keep using.
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
