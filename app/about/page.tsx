import type { CSSProperties } from "react";
import Footer from "@/components/Footer";
import { getMessages } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/request-locale";

export const dynamic = "force-dynamic";

type Tone = {
	hue: number;
	saturation: number;
	lightness: number;
};

type Palette = {
	shell: Tone;
	surface: Tone;
	line: Tone;
	accents: Tone[];
};

type AboutStyle = CSSProperties & {
	[key: `--${string}`]: string | number;
};

const horizontalVariants = [
	"lg:-translate-x-6",
	"lg:translate-x-0",
	"lg:translate-x-6",
];

const palettes: Palette[] = [
	{
		shell: { hue: 206, saturation: 24, lightness: 12 },
		surface: { hue: 212, saturation: 20, lightness: 18 },
		line: { hue: 336, saturation: 26, lightness: 72 },
		accents: [
			{ hue: 190, saturation: 70, lightness: 67 },
			{ hue: 344, saturation: 78, lightness: 72 },
			{ hue: 154, saturation: 44, lightness: 63 },
			{ hue: 342, saturation: 64, lightness: 72 },
		],
	},
	{
		shell: { hue: 224, saturation: 20, lightness: 11 },
		surface: { hue: 230, saturation: 18, lightness: 17 },
		line: { hue: 334, saturation: 24, lightness: 72 },
		accents: [
			{ hue: 338, saturation: 76, lightness: 72 },
			{ hue: 202, saturation: 72, lightness: 68 },
			{ hue: 352, saturation: 70, lightness: 72 },
			{ hue: 126, saturation: 38, lightness: 64 },
		],
	},
	{
		shell: { hue: 334, saturation: 22, lightness: 12 },
		surface: { hue: 328, saturation: 18, lightness: 18 },
		line: { hue: 340, saturation: 26, lightness: 73 },
		accents: [
			{ hue: 346, saturation: 76, lightness: 72 },
			{ hue: 318, saturation: 50, lightness: 70 },
			{ hue: 192, saturation: 56, lightness: 68 },
			{ hue: 148, saturation: 36, lightness: 64 },
		],
	},
	{
		shell: { hue: 252, saturation: 19, lightness: 12 },
		surface: { hue: 246, saturation: 18, lightness: 18 },
		line: { hue: 332, saturation: 26, lightness: 72 },
		accents: [
			{ hue: 170, saturation: 56, lightness: 66 },
			{ hue: 338, saturation: 72, lightness: 73 },
			{ hue: 308, saturation: 54, lightness: 74 },
			{ hue: 214, saturation: 72, lightness: 70 },
		],
	},
];

function shuffle<T>(items: T[]) {
	const next = [...items];

	for (let index = next.length - 1; index > 0; index -= 1) {
		const randomIndex = Math.floor(Math.random() * (index + 1));
		[next[index], next[randomIndex]] = [next[randomIndex], next[index]];
	}

	return next;
}

function clamp(value: number, min: number, max: number) {
	return Math.min(max, Math.max(min, value));
}

function randomBetween(min: number, max: number) {
	return Math.random() * (max - min) + min;
}

function wrapHue(value: number) {
	return ((value % 360) + 360) % 360;
}

function shiftTone(
	tone: Tone,
	adjustments: Partial<{ hue: number; saturation: number; lightness: number }>,
): Tone {
	return {
		hue: wrapHue(tone.hue + (adjustments.hue ?? 0)),
		saturation: clamp(tone.saturation + (adjustments.saturation ?? 0), 0, 100),
		lightness: clamp(tone.lightness + (adjustments.lightness ?? 0), 0, 100),
	};
}

function color(tone: Tone, alpha = 1) {
	return `hsl(${tone.hue} ${tone.saturation}% ${tone.lightness}% / ${alpha})`;
}

function pickPalette() {
	return palettes[Math.floor(Math.random() * palettes.length)];
}

function buildFrameStyle(palette: Palette): CSSProperties {
	const [accentA, accentB, accentC] = shuffle(palette.accents);

	return {
		backgroundImage: [
			`linear-gradient(160deg, ${color(shiftTone(palette.shell, { lightness: 4 }), 0.98)}, ${color(shiftTone(palette.shell, { hue: 12, lightness: -2 }), 0.98)})`,
			`radial-gradient(circle at 14% 18%, ${color(accentA, 0.13)}, transparent 30%)`,
			`radial-gradient(circle at 86% 12%, ${color(accentB, 0.11)}, transparent 24%)`,
			`radial-gradient(circle at 72% 82%, ${color(accentC, 0.09)}, transparent 22%)`,
		].join(", "),
	};
}

function buildPanelStyle(palette: Palette): CSSProperties {
	return {
		backgroundImage: `linear-gradient(180deg, ${color(shiftTone(palette.surface, { lightness: 3 }), 0.84)}, ${color(shiftTone(palette.shell, { lightness: 1 }), 0.9)})`,
	};
}

function buildPatternStyle(palette: Palette): CSSProperties {
	return {
		backgroundImage: [
			`repeating-linear-gradient(90deg, ${color(shiftTone(palette.line, { saturation: -10, lightness: -10 }), 0.07)} 0 1px, transparent 1px 76px)`,
			`repeating-linear-gradient(0deg, ${color(shiftTone(palette.line, { saturation: -12, lightness: -14 }), 0.05)} 0 1px, transparent 1px 76px)`,
			`radial-gradient(${color(shiftTone(palette.line, { saturation: -6, lightness: -12 }), 0.12)} 1px, transparent 1.2px)`,
		].join(", "),
		backgroundSize: "76px 76px, 76px 76px, 24px 24px",
		backgroundPosition: "0 0, 0 0, 12px 12px",
	};
}

function buildCardStyles(palette: Palette, count: number) {
	const accents = shuffle(palette.accents);

	return Array.from({ length: count }, (_, index) => {
		const accent = accents[index % accents.length];
		const contrast = accents[(index + 1) % accents.length];
		const originA = {
			x: randomBetween(14, 34).toFixed(0),
			y: randomBetween(16, 36).toFixed(0),
		};
		const originB = {
			x: randomBetween(64, 88).toFixed(0),
			y: randomBetween(54, 82).toFixed(0),
		};

		return {
			backgroundImage: [
				`linear-gradient(152deg, ${color(shiftTone(palette.surface, { lightness: 8 }), 0.84)}, ${color(shiftTone(palette.shell, { lightness: 2 }), 0.94)})`,
				`radial-gradient(circle at ${originA.x}% ${originA.y}%, ${color(accent, 0.16)}, transparent 34%)`,
				`radial-gradient(circle at ${originB.x}% ${originB.y}%, ${color(contrast, 0.1)}, transparent 28%)`,
			].join(", "),
			borderColor: color(shiftTone(accent, { saturation: -38, lightness: 8 }), 0.26),
			boxShadow: `0 28px 60px ${color({ hue: 0, saturation: 0, lightness: 0 }, 0.14)}`,
		} satisfies CSSProperties;
	});
}

function buildDecorations(palette: Palette) {
	const zones = [
		{ top: [4, 18], left: [4, 90] },
		{ top: [18, 70], left: [86, 98] },
		{ top: [80, 96], left: [8, 90] },
		{ top: [24, 76], left: [2, 16] },
		{ top: [28, 74], left: [22, 78] },
	] as const;
	const kinds = ["ring", "pill", "tile", "diamond"] as const;
	const accents = shuffle(palette.accents);

	return Array.from({ length: 20 }, (_, index) => {
		const zone = zones[index % zones.length];
		const accent = accents[index % accents.length];
		const kind = kinds[Math.floor(randomBetween(0, kinds.length))];
		const isPill = kind === "pill";
		const isRing = kind === "ring";
		const isDiamond = kind === "diamond";
		const width = isPill ? randomBetween(72, 168) : randomBetween(34, 124);
		const height = isPill ? randomBetween(16, 36) : randomBetween(34, 124);
		const style: AboutStyle = {
			top: `${randomBetween(zone.top[0], zone.top[1]).toFixed(1)}%`,
			left: `${randomBetween(zone.left[0], zone.left[1]).toFixed(1)}%`,
			width: `${width.toFixed(0)}px`,
			height: `${height.toFixed(0)}px`,
			borderRadius: isPill ? "999px" : isDiamond ? "18px" : "26px",
			backgroundImage: isRing
				? "none"
				: kind === "tile"
					? [
						`linear-gradient(140deg, ${color(accent, 0.18)}, ${color(shiftTone(accent, { lightness: -14, saturation: -24 }), 0.05)})`,
						`repeating-linear-gradient(90deg, ${color(shiftTone(accent, { lightness: 6 }), 0.32)} 0 1px, transparent 1px 7px)`,
					].join(", ")
					: `linear-gradient(140deg, ${color(accent, 0.18)}, ${color(shiftTone(accent, { lightness: -12, saturation: -20 }), 0.04)})`,
			border: `1px solid ${color(shiftTone(accent, { saturation: -34, lightness: 10 }), 0.24)}`,
			boxShadow: isRing
				? `0 0 0 1px ${color(shiftTone(accent, { saturation: -20, lightness: 16 }), 0.12)} inset`
				: `0 0 0 1px ${color(shiftTone(accent, { saturation: -30, lightness: 12 }), 0.08)} inset`,
			opacity: randomBetween(0.45, 1),
			filter: `blur(${randomBetween(0, 0.6).toFixed(1)}px)`,
			"--about-rotate": `${randomBetween(isDiamond ? 26 : -18, isDiamond ? 62 : 18).toFixed(0)}deg`,
			"--about-shift-x": `${randomBetween(-18, 18).toFixed(0)}px`,
			"--about-shift-y": `${randomBetween(-18, 12).toFixed(0)}px`,
			"--about-duration": `${randomBetween(10, 20).toFixed(1)}s`,
			"--about-delay": `${(index * 0.18).toFixed(1)}s`,
		};

		return {
			className:
				index < 10
					? "absolute animate-about-float"
					: "absolute hidden animate-about-float md:block",
			style,
		};
	});
}

export default async function Page() {
	const locale = await getRequestLocale();
	const messages = getMessages(locale);
	const storyCards = messages.about.storyCards;
	const palette = pickPalette();
	const shuffledOffsets = shuffle(horizontalVariants);
	const frameStyle = buildFrameStyle(palette);
	const panelStyle = buildPanelStyle(palette);
	const patternStyle = buildPatternStyle(palette);
	const cardStyles = buildCardStyles(palette, storyCards.length);
	const decorations = buildDecorations(palette);

	return (
		<>
			<div className="min-h-screen bg-darkBg text-gray">
				<section className="mx-auto w-full max-w-[1440px] px-4 pb-4 pt-8 sm:px-6 lg:px-8">
					<div
						className="relative overflow-hidden rounded-[34px] border border-zinc-700/60 shadow-[0_28px_90px_rgba(0,0,0,0.38)]"
						style={frameStyle}
					>
						<div className="relative p-2 sm:p-3">
							<div
								className="relative overflow-hidden rounded-[30px] border border-white/6"
								style={panelStyle}
							>
								<div className="pointer-events-none absolute inset-0 opacity-90">
									<div
										className="absolute inset-0 opacity-75 animate-about-pan"
										style={patternStyle}
									/>
									<div className="absolute left-[6%] top-[8%] h-52 w-52 rounded-full bg-white/4 blur-3xl" />
									<div className="absolute bottom-[8%] right-[8%] h-64 w-64 rounded-full bg-white/3 blur-3xl" />
									{decorations.map((decoration, index) => (
										<div
											key={`about-decoration-${index}`}
											aria-hidden="true"
											className={decoration.className}
											style={decoration.style}
										/>
									))}
								</div>

								<div className="border-b border-zinc-700/50 px-6 py-10 sm:px-8">
									<div className="max-w-3xl">
										<p className="text-xs uppercase tracking-[0.28em] text-zinc-500">
											{messages.about.eyebrow}
										</p>
										<h1 className="mt-3 text-4xl font-somerton uppercase text-wheat sm:text-5xl">
											{messages.about.title}
										</h1>
										<p className="mt-4 text-sm leading-7 text-zinc-400 sm:text-base">
											{messages.about.description}
										</p>
									</div>
								</div>

								<div className="relative px-6 py-8 sm:px-8">
									<div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-zinc-600/50 to-transparent" />
									<div className="grid gap-6">
										{storyCards.map((card, index) => (
											<div
												key={card.title}
												className={`relative mx-auto w-full max-w-4xl overflow-hidden rounded-[28px] border p-7 transition-transform duration-500 ${shuffledOffsets[index]} animate-slide-down opacity-0`}
												style={{
													animationDelay: `${0.15 + index * 0.15}s`,
													animationFillMode: "forwards",
													...cardStyles[index],
												}}
											>
												<div className="pointer-events-none absolute inset-0 opacity-50">
													<div
														className="absolute inset-0"
														style={{
															backgroundImage: [
																`linear-gradient(90deg, ${color(shiftTone(palette.line, { lightness: -22 }), 0.04)} 1px, transparent 1px)`,
																`linear-gradient(0deg, ${color(shiftTone(palette.line, { lightness: -22 }), 0.035)} 1px, transparent 1px)`,
															].join(", "),
															backgroundSize: "28px 28px",
														}}
													/>
												</div>

												<div className="relative flex items-start justify-between gap-4">
													<div>
														<p className="text-xs uppercase tracking-[0.24em] text-zinc-500">
															{card.label}
														</p>
														<h2 className="mt-2 text-2xl font-somerton uppercase text-wheat sm:text-3xl">
															{card.title}
														</h2>
													</div>
												</div>

												<p className="relative mt-5 max-w-3xl text-base leading-8 text-zinc-200 sm:text-lg">
													{card.text}
												</p>

												<div className="relative mt-6 flex items-center gap-3">
													<span
														className="h-2 w-2 rounded-full"
														style={{
															backgroundColor: color(
																palette.accents[index % palette.accents.length],
																0.9,
															),
														}}
													/>
													<span className="h-px flex-1 bg-gradient-to-r from-white/20 via-white/8 to-transparent" />
												</div>
											</div>
										))}
									</div>
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
