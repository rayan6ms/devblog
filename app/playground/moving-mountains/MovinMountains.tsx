"use client";

import { useEffect, useRef, useState } from "react";

type PhaserModule = typeof import("phaser");
type PhaserGame = import("phaser").Game;
type PhaserScene = import("phaser").Scene;
type PhaserCanvasTexture = import("phaser").Textures.CanvasTexture;
type PhaserImage = import("phaser").GameObjects.Image;

type LoadStatus = "loading" | "ready" | "error";
type PaletteMode = "prism" | "ember" | "aurora" | "neon";
type MotionMode = "glide" | "surge" | "storm";
type DensityMode = "sparse" | "balanced" | "dense";
type AtmosphereMode = "clean" | "mist" | "electric";

type Size = {
	width: number;
	height: number;
};

type CurrentRef<T> = {
	current: T;
};

type SettingsSnapshot = {
	autoCycle: boolean;
	paletteMode: PaletteMode;
	motionMode: MotionMode;
	densityMode: DensityMode;
	atmosphereMode: AtmosphereMode;
};

type ColorValue = {
	r: number;
	g: number;
	b: number;
	css: string;
	int: number;
};

type RidgePalette = {
	top: ColorValue;
	bottom: ColorValue;
	edge: ColorValue;
	contour: ColorValue;
	glow: ColorValue;
};

type Palette = {
	backgroundTop: ColorValue;
	backgroundBottom: ColorValue;
	discCore: ColorValue;
	discOuter: ColorValue;
	mist: ColorValue;
	skyTrail: ColorValue;
	spark: ColorValue;
	ridges: RidgePalette[];
};

type WaveSpec = {
	frequency: number;
	amplitude: number;
	speed: number;
	phase: number;
};

type RidgeLayer = {
	baseline: number;
	amplitude: number;
	drift: number;
	stretch: number;
	sharpness: number;
	detailAmplitude: number;
	detailFrequency: number;
	detailSpeed: number;
	detailPhase: number;
	colorIndex: number;
	haze: number;
	edgeBoost: number;
	waveA: WaveSpec;
	waveB: WaveSpec;
	waveC: WaveSpec;
	warp: WaveSpec;
	points: Float32Array;
};

type Mote = {
	x: number;
	y: number;
	radius: number;
	speed: number;
	sway: number;
	phase: number;
	alpha: number;
};

type World = {
	size: Size;
	time: number;
	cycleElapsedMs: number;
	sampleXs: Float32Array;
	layers: RidgeLayer[];
	motes: Mote[];
	palette: Palette;
};

type Surface = {
	width: number;
	height: number;
	canvas: HTMLCanvasElement;
	context: CanvasRenderingContext2D;
	textureKey: string;
	texture: PhaserCanvasTexture;
	image: PhaserImage;
};

type UiState = {
	layers: number;
	pointsPerLayer: number;
	paletteLabel: string;
};

type Bridge = {
	settingsRef: CurrentRef<SettingsSnapshot>;
	rebuildRef: CurrentRef<(() => void) | undefined>;
	remixRef: CurrentRef<(() => void) | undefined>;
	applyPaletteRef: CurrentRef<(() => void) | undefined>;
	onUiState: (state: UiState) => void;
};

const TAU = Math.PI * 2;
const FIXED_STEP_MS = 1000 / 30;
const AUTO_CYCLE_MS = 9000;
const MAX_FRAME_DELTA_MS = 48;
const PALETTE_OPTIONS: PaletteMode[] = ["prism", "ember", "aurora", "neon"];
const MOTION_OPTIONS: MotionMode[] = ["glide", "surge", "storm"];
const DENSITY_OPTIONS: DensityMode[] = ["sparse", "balanced", "dense"];
const ATMOSPHERE_OPTIONS: AtmosphereMode[] = ["clean", "mist", "electric"];
const DEFAULT_SETTINGS: SettingsSnapshot = {
	autoCycle: true,
	paletteMode: "prism",
	motionMode: "surge",
	densityMode: "balanced",
	atmosphereMode: "mist",
};
const EMPTY_UI_STATE: UiState = {
	layers: 0,
	pointsPerLayer: 0,
	paletteLabel: DEFAULT_SETTINGS.paletteMode,
};
const MOTION_PROFILES: Record<
	MotionMode,
	{ timeScale: number; moteScale: number }
> = {
	glide: { timeScale: 0.65, moteScale: 0.55 },
	surge: { timeScale: 1, moteScale: 0.9 },
	storm: { timeScale: 1.4, moteScale: 1.25 },
};
const DENSITY_PROFILES: Record<
	DensityMode,
	{ layerCount: number; sampleStep: number; moteCount: number }
> = {
	sparse: { layerCount: 6, sampleStep: 24, moteCount: 14 },
	balanced: { layerCount: 8, sampleStep: 16, moteCount: 22 },
	dense: { layerCount: 10, sampleStep: 12, moteCount: 30 },
};

function clamp(value: number, min: number, max: number) {
	if (max < min) return min;
	return Math.min(max, Math.max(min, value));
}

function wrap01(value: number) {
	const wrapped = value % 1;
	return wrapped < 0 ? wrapped + 1 : wrapped;
}

function randomRange(min: number, max: number) {
	return min + Math.random() * (max - min);
}

function cycleOption<T>(values: readonly T[], current: T) {
	const index = values.indexOf(current);
	return values[(index + 1) % values.length] ?? values[0];
}

function clampByte(value: number) {
	return clamp(Math.round(value), 0, 255);
}

function signedPow(value: number, exponent: number) {
	const magnitude = Math.abs(value);
	return Math.sign(value) * magnitude ** exponent;
}

function resolveHostSize(host: HTMLDivElement): Size {
	const rect = host.getBoundingClientRect();
	return {
		width: Math.max(1, Math.floor(host.clientWidth || rect.width || 1)),
		height: Math.max(1, Math.floor(host.clientHeight || rect.height || 1)),
	};
}

function hslToColor(h: number, s: number, l: number): ColorValue {
	const hue = wrap01(h);
	const saturation = clamp(s, 0, 1);
	const lightness = clamp(l, 0, 1);

	if (saturation <= 0) {
		const channel = clampByte(lightness * 255);
		return {
			r: channel,
			g: channel,
			b: channel,
			css: `rgb(${channel} ${channel} ${channel})`,
			int: (channel << 16) | (channel << 8) | channel,
		};
	}

	const q =
		lightness < 0.5
			? lightness * (1 + saturation)
			: lightness + saturation - lightness * saturation;
	const p = 2 * lightness - q;
	const channel = (offset: number) => {
		let t = hue + offset;
		if (t < 0) t += 1;
		if (t > 1) t -= 1;
		if (t < 1 / 6) return p + (q - p) * 6 * t;
		if (t < 1 / 2) return q;
		if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
		return p;
	};

	const red = clampByte(channel(1 / 3) * 255);
	const green = clampByte(channel(0) * 255);
	const blue = clampByte(channel(-1 / 3) * 255);

	return {
		r: red,
		g: green,
		b: blue,
		css: `rgb(${red} ${green} ${blue})`,
		int: (red << 16) | (green << 8) | blue,
	};
}

function mixColor(a: ColorValue, b: ColorValue, amount: number): ColorValue {
	const t = clamp(amount, 0, 1);
	const red = clampByte(a.r + (b.r - a.r) * t);
	const green = clampByte(a.g + (b.g - a.g) * t);
	const blue = clampByte(a.b + (b.b - a.b) * t);
	return {
		r: red,
		g: green,
		b: blue,
		css: `rgb(${red} ${green} ${blue})`,
		int: (red << 16) | (green << 8) | blue,
	};
}

function cssWithAlpha(color: ColorValue, alpha: number) {
	return `rgba(${color.r}, ${color.g}, ${color.b}, ${clamp(alpha, 0, 1)})`;
}

function createPalette(mode: PaletteMode, layerCount: number): Palette {
	const jitter = randomRange(-0.025, 0.025);
	let skyHue = 0.6;
	let deepHue = 0.72;
	let ridgeStart = 0.56;
	let ridgeSpan = 0.34;
	let glowHue = 0.92;
	let sparkHue = 0.13;

	if (mode === "ember") {
		skyHue = 0.03;
		deepHue = 0.08;
		ridgeStart = 0.97;
		ridgeSpan = 0.18;
		glowHue = 0.12;
		sparkHue = 0.16;
	}
	if (mode === "aurora") {
		skyHue = 0.49;
		deepHue = 0.61;
		ridgeStart = 0.37;
		ridgeSpan = 0.24;
		glowHue = 0.79;
		sparkHue = 0.51;
	}
	if (mode === "neon") {
		skyHue = 0.77;
		deepHue = 0.86;
		ridgeStart = 0.82;
		ridgeSpan = 0.28;
		glowHue = 0.53;
		sparkHue = 0.3;
	}

	const backgroundTop = hslToColor(skyHue + jitter, 0.72, 0.13);
	const backgroundBottom = hslToColor(deepHue + jitter * 0.5, 0.56, 0.04);
	const discCore = hslToColor(glowHue + jitter, 0.9, 0.72);
	const discOuter = hslToColor(glowHue + 0.05 + jitter, 0.88, 0.4);
	const mist = hslToColor(ridgeStart + ridgeSpan * 0.4, 0.48, 0.42);
	const skyTrail = hslToColor(ridgeStart + ridgeSpan * 0.2, 0.78, 0.45);
	const spark = hslToColor(sparkHue + jitter, 0.86, 0.76);
	const ridges = Array.from({ length: layerCount }, (_, index) => {
		const progress = index / Math.max(layerCount - 1, 1);
		const hue =
			ridgeStart +
			ridgeSpan * progress +
			Math.sin(progress * TAU * 1.4 + jitter * TAU * 12) * 0.05;
		const top = hslToColor(hue, clamp(0.72 - progress * 0.12, 0.45, 0.92), 0.6 - progress * 0.22);
		const bottom = mixColor(
			hslToColor(hue + 0.025, clamp(0.82 - progress * 0.14, 0.38, 0.95), 0.34 - progress * 0.12),
			backgroundBottom,
			0.18 + progress * 0.34,
		);
		const edge = mixColor(top, discCore, 0.24 + progress * 0.18);
		const contour = mixColor(bottom, spark, 0.14 + (1 - progress) * 0.2);
		const glow = mixColor(edge, discOuter, 0.45);
		return { top, bottom, edge, contour, glow };
	});

	return {
		backgroundTop,
		backgroundBottom,
		discCore,
		discOuter,
		mist,
		skyTrail,
		spark,
		ridges,
	};
}

function createSampleXs(width: number, step: number) {
	const count = Math.max(16, Math.ceil(width / step) + 2);
	const samples = new Float32Array(count);
	const stride = width / Math.max(count - 1, 1);
	for (let index = 0; index < count; index += 1) {
		samples[index] = stride * index;
	}
	return samples;
}

function createMotes(size: Size, count: number): Mote[] {
	return Array.from({ length: count }, () => ({
		x: randomRange(0, size.width),
		y: randomRange(size.height * 0.08, size.height * 0.88),
		radius: randomRange(1.1, 3.2),
		speed: randomRange(10, 32),
		sway: randomRange(6, 22),
		phase: randomRange(0, TAU),
		alpha: randomRange(0.08, 0.36),
	}));
}

function createRidgeLayer(
	index: number,
	total: number,
	sampleCount: number,
	size: Size,
): RidgeLayer {
	const progress = index / Math.max(total - 1, 1);
	const depth = 1 - progress;
	const baseHeight = size.height * (0.28 + progress * 0.48);
	const amplitude = size.height * (0.04 + depth * 0.08 + randomRange(0.01, 0.025));

	return {
		baseline: baseHeight,
		amplitude,
		drift: randomRange(0.14, 0.34) * (0.5 + depth * 1.5),
		stretch: randomRange(0.82, 1.24) * (0.84 + progress * 0.22),
		sharpness: randomRange(1.05, 1.45 + depth * 0.28),
		detailAmplitude: amplitude * randomRange(0.05, 0.13),
		detailFrequency: randomRange(6.5, 13.5) * (1.05 + depth * 0.35),
		detailSpeed: randomRange(0.08, 0.2) * (0.6 + depth),
		detailPhase: randomRange(0, TAU),
		colorIndex: index,
		haze: 0.04 + (1 - depth) * 0.12,
		edgeBoost: 0.5 + depth * 1.2,
		waveA: {
			frequency: randomRange(1.5, 3.4),
			amplitude: randomRange(0.5, 0.72),
			speed: randomRange(0.1, 0.22),
			phase: randomRange(0, TAU),
		},
		waveB: {
			frequency: randomRange(3.6, 6.6),
			amplitude: randomRange(0.18, 0.34),
			speed: randomRange(0.12, 0.28),
			phase: randomRange(0, TAU),
		},
		waveC: {
			frequency: randomRange(7.2, 13.5),
			amplitude: randomRange(0.08, 0.18),
			speed: randomRange(0.18, 0.4),
			phase: randomRange(0, TAU),
		},
		warp: {
			frequency: randomRange(1.4, 2.8),
			amplitude: randomRange(0.05, 0.14),
			speed: randomRange(0.06, 0.16),
			phase: randomRange(0, TAU),
		},
		points: new Float32Array(sampleCount),
	};
}

function createWorld(size: Size, settings: SettingsSnapshot): World {
	const density = DENSITY_PROFILES[settings.densityMode];
	const sampleXs = createSampleXs(size.width, density.sampleStep);
	const layers = Array.from({ length: density.layerCount }, (_, index) =>
		createRidgeLayer(index, density.layerCount, sampleXs.length, size),
	);

	return {
		size,
		time: 0,
		cycleElapsedMs: 0,
		sampleXs,
		layers,
		motes: createMotes(size, density.moteCount),
		palette: createPalette(settings.paletteMode, density.layerCount),
	};
}

function sampleLayerPoint(
	layer: RidgeLayer,
	x: number,
	width: number,
	time: number,
	timeScale: number,
) {
	const normalizedX = width <= 0 ? 0 : x / width;
	const domain = normalizedX * layer.stretch;
	const t = time * timeScale;
	const warp =
		Math.sin(domain * TAU * layer.warp.frequency + t * layer.warp.speed + layer.warp.phase) *
		layer.warp.amplitude;
	const waveA = Math.sin(domain * TAU * layer.waveA.frequency + t * layer.waveA.speed + layer.waveA.phase);
	const waveB = Math.sin(
		domain * TAU * layer.waveB.frequency - t * layer.waveB.speed * 0.8 + layer.waveB.phase + warp,
	);
	const waveC = Math.cos(
		(domain + warp) * TAU * layer.waveC.frequency + t * layer.waveC.speed + layer.waveC.phase,
	);
	const composite =
		waveA * layer.waveA.amplitude +
		waveB * layer.waveB.amplitude +
		waveC * layer.waveC.amplitude;
	const ridge = signedPow(composite, layer.sharpness);
	const detail = Math.sin(
		(domain * layer.detailFrequency + t * layer.detailSpeed + layer.detailPhase) * TAU,
	);
	return (
		layer.baseline +
		ridge * layer.amplitude +
		detail * layer.detailAmplitude +
		Math.sin(t * layer.drift + layer.waveA.phase) * layer.amplitude * 0.08
	);
}

function resetMote(mote: Mote, size: Size) {
	mote.x = size.width + randomRange(8, size.width * 0.18);
	mote.y = randomRange(size.height * 0.1, size.height * 0.86);
	mote.radius = randomRange(1.1, 3.2);
	mote.speed = randomRange(10, 32);
	mote.sway = randomRange(6, 22);
	mote.phase = randomRange(0, TAU);
	mote.alpha = randomRange(0.08, 0.36);
}

function stepWorld(world: World, dt: number, settings: SettingsSnapshot) {
	const motion = MOTION_PROFILES[settings.motionMode];
	world.time += dt;

	for (const layer of world.layers) {
		for (let index = 0; index < world.sampleXs.length; index += 1) {
			const x = world.sampleXs[index];
			layer.points[index] = sampleLayerPoint(layer, x, world.size.width, world.time, motion.timeScale);
		}
	}

	for (const mote of world.motes) {
		mote.x -= mote.speed * dt * motion.moteScale;
		mote.y += Math.sin(world.time * 0.9 + mote.phase) * mote.sway * dt * 0.18;
		if (mote.x < -sizeAwareMoteMargin(mote.radius)) {
			resetMote(mote, world.size);
		}
	}
}

function sizeAwareMoteMargin(radius: number) {
	return Math.max(12, radius * 5);
}

function traceRidgeCurve(
	context: CanvasRenderingContext2D,
	sampleXs: Float32Array,
	points: Float32Array,
	offset = 0,
) {
	context.moveTo(sampleXs[0] ?? 0, (points[0] ?? 0) + offset);
	for (let index = 1; index < sampleXs.length - 1; index += 1) {
		const currentX = sampleXs[index] ?? 0;
		const currentY = (points[index] ?? 0) + offset;
		const nextX = sampleXs[index + 1] ?? currentX;
		const nextY = (points[index + 1] ?? currentY) + offset;
		context.quadraticCurveTo(
			currentX,
			currentY,
			(currentX + nextX) * 0.5,
			(currentY + nextY) * 0.5,
		);
	}
	context.lineTo(
		sampleXs[sampleXs.length - 1] ?? 0,
		(points[points.length - 1] ?? 0) + offset,
	);
}

function findMinPoint(points: Float32Array) {
	let min = Number.POSITIVE_INFINITY;
	for (let index = 0; index < points.length; index += 1) {
		const point = points[index] ?? 0;
		if (point < min) min = point;
	}
	return Number.isFinite(min) ? min : 0;
}

function drawBackground(
	context: CanvasRenderingContext2D,
	size: Size,
	palette: Palette,
	time: number,
) {
	const gradient = context.createLinearGradient(0, 0, 0, size.height);
	gradient.addColorStop(0, palette.backgroundTop.css);
	gradient.addColorStop(1, palette.backgroundBottom.css);
	context.fillStyle = gradient;
	context.fillRect(0, 0, size.width, size.height);

	const discX = size.width * (0.7 + Math.sin(time * 0.05) * 0.04);
	const discY = size.height * (0.22 + Math.cos(time * 0.04) * 0.03);
	const discRadius = Math.min(size.width, size.height) * 0.2;
	const disc = context.createRadialGradient(
		discX,
		discY,
		discRadius * 0.08,
		discX,
		discY,
		discRadius,
	);
	disc.addColorStop(0, cssWithAlpha(palette.discCore, 0.82));
	disc.addColorStop(0.45, cssWithAlpha(palette.discOuter, 0.38));
	disc.addColorStop(1, cssWithAlpha(palette.discOuter, 0));
	context.fillStyle = disc;
	context.fillRect(0, 0, size.width, size.height);

	const trail = context.createLinearGradient(0, 0, size.width, size.height * 0.78);
	trail.addColorStop(0, cssWithAlpha(palette.skyTrail, 0.12));
	trail.addColorStop(0.4, cssWithAlpha(palette.skyTrail, 0));
	trail.addColorStop(1, cssWithAlpha(palette.skyTrail, 0.08));
	context.fillStyle = trail;
	context.fillRect(0, 0, size.width, size.height);
}

function drawMotes(
	context: CanvasRenderingContext2D,
	world: World,
	settings: SettingsSnapshot,
) {
	const motion = MOTION_PROFILES[settings.motionMode];
	const atmosphereBoost =
		settings.atmosphereMode === "electric"
			? 1.35
			: settings.atmosphereMode === "mist"
				? 1.1
				: 0.8;

	for (const mote of world.motes) {
		const pulse = 0.65 + Math.sin(world.time * 1.4 + mote.phase) * 0.35;
		const radius = mote.radius * atmosphereBoost * (0.85 + pulse * 0.28);
		const alpha = mote.alpha * (0.65 + motion.moteScale * 0.22);
		context.beginPath();
		context.fillStyle = cssWithAlpha(world.palette.spark, alpha);
		context.arc(mote.x, mote.y, radius, 0, TAU);
		context.fill();
	}
}

function drawLayer(
	context: CanvasRenderingContext2D,
	world: World,
	layer: RidgeLayer,
	index: number,
	settings: SettingsSnapshot,
) {
	const palette = world.palette.ridges[layer.colorIndex] ?? world.palette.ridges[index];
	const minY = findMinPoint(layer.points);
	const gradient = context.createLinearGradient(0, minY, 0, world.size.height);
	gradient.addColorStop(0, palette.top.css);
	gradient.addColorStop(1, palette.bottom.css);

	context.beginPath();
	context.moveTo(0, world.size.height);
	traceRidgeCurve(context, world.sampleXs, layer.points);
	context.lineTo(world.size.width, world.size.height);
	context.closePath();
	context.fillStyle = gradient;
	context.fill();

	context.beginPath();
	traceRidgeCurve(context, world.sampleXs, layer.points);
	context.lineWidth = 1 + layer.edgeBoost;
	context.strokeStyle = cssWithAlpha(
		palette.edge,
		settings.atmosphereMode === "electric" ? 0.92 : 0.72,
	);
	context.shadowColor = cssWithAlpha(
		palette.glow,
		settings.atmosphereMode === "electric" ? 0.8 : 0.35,
	);
	context.shadowBlur = settings.atmosphereMode === "electric" ? 18 : 8;
	context.stroke();
	context.shadowBlur = 0;

	const contourCount =
		index >= world.layers.length - 3
			? settings.densityMode === "dense"
				? 3
				: 2
			: index >= world.layers.length - 5
				? 1
				: 0;

	for (let contourIndex = 0; contourIndex < contourCount; contourIndex += 1) {
		context.beginPath();
		traceRidgeCurve(
			context,
			world.sampleXs,
			layer.points,
			layer.amplitude * (0.08 + contourIndex * 0.07),
		);
		context.lineWidth = 0.8;
		context.strokeStyle = cssWithAlpha(
			palette.contour,
			0.15 + contourIndex * 0.06 + layer.haze * 0.2,
		);
		context.stroke();
	}
}

function drawAtmosphereOverlay(
	context: CanvasRenderingContext2D,
	world: World,
	settings: SettingsSnapshot,
) {
	const { width, height } = world.size;
	const horizon = height * 0.42;

	if (settings.atmosphereMode !== "clean") {
		const haze = context.createLinearGradient(0, horizon, 0, height);
		haze.addColorStop(0, cssWithAlpha(world.palette.mist, settings.atmosphereMode === "mist" ? 0.22 : 0.08));
		haze.addColorStop(0.65, cssWithAlpha(world.palette.mist, settings.atmosphereMode === "mist" ? 0.12 : 0.04));
		haze.addColorStop(1, cssWithAlpha(world.palette.mist, settings.atmosphereMode === "mist" ? 0.32 : 0.12));
		context.fillStyle = haze;
		context.fillRect(0, horizon, width, height - horizon);
	}

	if (settings.atmosphereMode === "electric") {
		context.save();
		context.globalCompositeOperation = "screen";
		for (let index = 0; index < 3; index += 1) {
			const y = height * (0.18 + index * 0.1) + Math.sin(world.time * 0.6 + index) * 18;
			const band = context.createLinearGradient(0, y, width, y + 36);
			band.addColorStop(0, cssWithAlpha(world.palette.skyTrail, 0));
			band.addColorStop(0.25, cssWithAlpha(world.palette.skyTrail, 0.08));
			band.addColorStop(0.5, cssWithAlpha(world.palette.spark, 0.18));
			band.addColorStop(0.75, cssWithAlpha(world.palette.skyTrail, 0.08));
			band.addColorStop(1, cssWithAlpha(world.palette.skyTrail, 0));
			context.fillStyle = band;
			context.fillRect(0, y - 18, width, 36);
		}
		context.restore();
	}
}

function renderWorld(
	surface: Surface,
	world: World,
	settings: SettingsSnapshot,
) {
	const { context } = surface;
	context.setTransform(1, 0, 0, 1, 0, 0);
	context.clearRect(0, 0, surface.width, surface.height);
	context.imageSmoothingEnabled = true;

	drawBackground(context, world.size, world.palette, world.time);
	drawMotes(context, world, settings);

	for (let index = 0; index < world.layers.length; index += 1) {
		drawLayer(context, world, world.layers[index]!, index, settings);
	}

	drawAtmosphereOverlay(context, world, settings);
	surface.texture.refresh();
}

function createSurface(
	size: Size,
	scene: PhaserScene,
	PhaserLib: PhaserModule,
): Surface {
	const textureKey = `moving-mountains-${Math.random().toString(36).slice(2, 10)}`;
	const texture = scene.textures.createCanvas(textureKey, size.width, size.height);
	if (!texture) {
		throw new Error("Unable to create Moving Mountains canvas texture.");
	}
	const context = texture.context;
	const image = scene.add
		.image(size.width * 0.5, size.height * 0.5, textureKey)
		.setDisplaySize(size.width, size.height);

	image.setOrigin(0.5);

	return {
		width: size.width,
		height: size.height,
		canvas: texture.canvas,
		context,
		textureKey,
		texture,
		image,
	};
}

function destroySurface(scene: PhaserScene, surface: Surface | null) {
	if (!surface) return;
	surface.image.destroy();
	if (scene.textures.exists(surface.textureKey)) {
		scene.textures.remove(surface.textureKey);
	}
}

function mountMovingMountains(
	host: HTMLDivElement,
	PhaserLib: PhaserModule,
	bridge: Bridge,
) {
	let game: PhaserGame | null = null;
	let currentSize = resolveHostSize(host);
	let resizeScene: ((size: Size) => void) | null = null;

	class MovingMountainsScene extends PhaserLib.Scene {
		private surface: Surface | null = null;

		private world: World | null = null;

		private accumulatorMs = 0;

		constructor() {
			super("moving-mountains-phaser");
		}

		create() {
			this.cameras.main.setBackgroundColor("#050810");
			this.rebuild(currentSize);
			resizeScene = (size) => {
				this.handleResize(size);
			};

			this.events.once(PhaserLib.Scenes.Events.SHUTDOWN, this.cleanup, this);
			this.events.once(PhaserLib.Scenes.Events.DESTROY, this.cleanup, this);

			bridge.rebuildRef.current = () => {
				this.rebuild(currentSize);
			};
			bridge.remixRef.current = () => {
				if (!this.world || !this.surface) return;
				this.world.palette = createPalette(
					bridge.settingsRef.current.paletteMode,
					this.world.layers.length,
				);
				renderWorld(this.surface, this.world, bridge.settingsRef.current);
				this.syncUi();
			};
			bridge.applyPaletteRef.current = () => {
				if (!this.world || !this.surface) return;
				this.world.palette = createPalette(
					bridge.settingsRef.current.paletteMode,
					this.world.layers.length,
				);
				renderWorld(this.surface, this.world, bridge.settingsRef.current);
				this.syncUi();
			};
		}

		update(_time: number, deltaMs: number) {
			if (!this.world || !this.surface) return;

			const settings = bridge.settingsRef.current;
			const cappedDelta = Math.min(deltaMs, MAX_FRAME_DELTA_MS);
			let needsRender = false;
			if (settings.autoCycle) {
				this.world.cycleElapsedMs += cappedDelta;
				if (this.world.cycleElapsedMs >= AUTO_CYCLE_MS) {
					this.world.cycleElapsedMs = 0;
					this.world.palette = createPalette(settings.paletteMode, this.world.layers.length);
					this.syncUi();
					needsRender = true;
				}
			} else {
				this.world.cycleElapsedMs = 0;
			}

			this.accumulatorMs = Math.min(this.accumulatorMs + cappedDelta, FIXED_STEP_MS * 3);
			while (this.accumulatorMs >= FIXED_STEP_MS) {
				stepWorld(this.world, FIXED_STEP_MS / 1000, settings);
				this.accumulatorMs -= FIXED_STEP_MS;
				needsRender = true;
			}

			if (needsRender) {
				renderWorld(this.surface, this.world, settings);
			}
		}

		private rebuild(size: Size) {
			const settings = bridge.settingsRef.current;
			destroySurface(this, this.surface);
			this.surface = createSurface(size, this, PhaserLib);
			this.world = createWorld(size, settings);
			this.accumulatorMs = 0;
			stepWorld(this.world, 0, settings);
			renderWorld(this.surface, this.world, settings);
			this.syncUi();
		}

		private handleResize(size: Size) {
			currentSize = size;
			this.cameras.main.setSize(size.width, size.height);
			this.rebuild(size);
		}

		private syncUi() {
			if (!this.world) return;
			bridge.onUiState({
				layers: this.world.layers.length,
				pointsPerLayer: this.world.sampleXs.length,
				paletteLabel: bridge.settingsRef.current.paletteMode,
			});
		}

		private cleanup() {
			destroySurface(this, this.surface);
			this.surface = null;
			this.world = null;
			resizeScene = null;
			bridge.rebuildRef.current = undefined;
			bridge.remixRef.current = undefined;
			bridge.applyPaletteRef.current = undefined;
		}
	}

	game = new PhaserLib.Game({
		type: PhaserLib.CANVAS,
		parent: host,
		backgroundColor: "#050810",
		width: currentSize.width,
		height: currentSize.height,
		render: {
			antialias: true,
			pixelArt: false,
			roundPixels: false,
		},
		scale: {
			mode: PhaserLib.Scale.NONE,
			autoCenter: PhaserLib.Scale.NO_CENTER,
			width: currentSize.width,
			height: currentSize.height,
		},
		scene: [MovingMountainsScene],
	});

	if (game.canvas) {
		game.canvas.style.display = "block";
		game.canvas.style.width = "100%";
		game.canvas.style.height = "100%";
		game.canvas.style.imageRendering = "auto";
	}

	const resizeObserver = new ResizeObserver(() => {
		currentSize = resolveHostSize(host);
		if (!game) return;
		game.scale.resize(currentSize.width, currentSize.height);
		resizeScene?.(currentSize);
	});
	resizeObserver.observe(host);

	return () => {
		resizeObserver.disconnect();
		bridge.rebuildRef.current = undefined;
		bridge.remixRef.current = undefined;
		bridge.applyPaletteRef.current = undefined;
		resizeScene = null;
		game?.destroy(true);
		game = null;
	};
}

export default function MovinMountains() {
	const hostRef = useRef<HTMLDivElement | null>(null);
	const settingsRef = useRef<SettingsSnapshot>({ ...DEFAULT_SETTINGS });
	const rebuildRef = useRef<(() => void) | undefined>(undefined);
	const remixRef = useRef<(() => void) | undefined>(undefined);
	const applyPaletteRef = useRef<(() => void) | undefined>(undefined);
	const [status, setStatus] = useState<LoadStatus>("loading");
	const [uiState, setUiState] = useState<UiState>(EMPTY_UI_STATE);
	const [autoCycle, setAutoCycle] = useState(DEFAULT_SETTINGS.autoCycle);
	const [paletteMode, setPaletteMode] = useState<PaletteMode>(
		DEFAULT_SETTINGS.paletteMode,
	);
	const [motionMode, setMotionMode] = useState<MotionMode>(
		DEFAULT_SETTINGS.motionMode,
	);
	const [densityMode, setDensityMode] = useState<DensityMode>(
		DEFAULT_SETTINGS.densityMode,
	);
	const [atmosphereMode, setAtmosphereMode] = useState<AtmosphereMode>(
		DEFAULT_SETTINGS.atmosphereMode,
	);

	useEffect(() => {
		settingsRef.current.autoCycle = autoCycle;
	}, [autoCycle]);

	useEffect(() => {
		settingsRef.current.motionMode = motionMode;
	}, [motionMode]);

	useEffect(() => {
		settingsRef.current.atmosphereMode = atmosphereMode;
	}, [atmosphereMode]);

	useEffect(() => {
		settingsRef.current.densityMode = densityMode;
		rebuildRef.current?.();
	}, [densityMode]);

	useEffect(() => {
		settingsRef.current.paletteMode = paletteMode;
		applyPaletteRef.current?.();
	}, [paletteMode]);

	useEffect(() => {
		let cleanup: (() => void) | null = null;
		let cancelled = false;

		(async () => {
			if (!hostRef.current) return;

			try {
				const phaserModule = await import("phaser");
				if (cancelled || !hostRef.current) return;

				const PhaserLib = ("default" in phaserModule
					? phaserModule.default
					: phaserModule) as PhaserModule;

				cleanup = mountMovingMountains(hostRef.current, PhaserLib, {
					settingsRef,
					rebuildRef,
					remixRef,
					applyPaletteRef,
					onUiState: setUiState,
				});
				setStatus("ready");
			} catch {
				if (!cancelled) setStatus("error");
			}
		})();

		return () => {
			cancelled = true;
			cleanup?.();
		};
	}, []);

	return (
		<div className="relative flex h-full min-h-[540px] w-full overflow-hidden rounded-[30px] border border-[#243347] bg-[radial-gradient(circle_at_top,#173150_0%,#0b1422_35%,#050810_100%)] text-slate-100 shadow-[0_28px_90px_rgba(0,0,0,0.45)]">
			<div ref={hostRef} className="absolute inset-0" />

			<div className="pointer-events-none absolute inset-x-4 top-4 z-10 flex flex-col gap-3 sm:inset-x-5">
				<div className="pointer-events-auto flex flex-wrap items-center gap-3 rounded-[22px] border border-[#223048] bg-[#07111d]/72 px-4 py-3 backdrop-blur-xl">
					<div className="mr-auto min-w-44">
						<div className="font-mono text-sm font-semibold uppercase tracking-[0.28em] text-slate-100">
							Moving Mountains
						</div>
						<div className="font-mono text-[11px] text-slate-400">
							Watch-only spectral ridges rendered in Phaser with layered color motion.
						</div>
					</div>
					<div className="flex flex-wrap items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-slate-300">
						<div className="rounded-full border border-[#1b2535] bg-[#0b1320] px-3 py-1.5">
							Watch Only
						</div>
						<div className="rounded-full border border-[#1b2535] bg-[#0b1320] px-3 py-1.5">
							Layers {uiState.layers}
						</div>
						<div className="rounded-full border border-[#1b2535] bg-[#0b1320] px-3 py-1.5">
							Samples {uiState.pointsPerLayer}
						</div>
						<div className="rounded-full border border-[#1b2535] bg-[#0b1320] px-3 py-1.5">
							Palette {uiState.paletteLabel}
						</div>
						<div className="rounded-full border border-[#1b2535] bg-[#0b1320] px-3 py-1.5">
							{status === "loading"
								? "Loading"
								: status === "error"
									? "Error"
									: "Ready"}
						</div>
					</div>
				</div>

				<div className="pointer-events-auto flex flex-wrap gap-2">
					<button
						type="button"
						onClick={() => rebuildRef.current?.()}
						className="rounded-full bg-slate-100 px-4 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-950 transition hover:bg-white"
					>
						New Range
					</button>
					<button
						type="button"
						onClick={() => remixRef.current?.()}
						className="rounded-full border border-[#223048] bg-[#0b1320]/88 px-4 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-100 transition hover:border-[#2d4262] hover:bg-[#10192a]"
					>
						Remix Colors
					</button>
					<button
						type="button"
						onClick={() => setPaletteMode((value) => cycleOption(PALETTE_OPTIONS, value))}
						className="rounded-full border border-[#223048] bg-[#0b1320]/88 px-4 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-100 transition hover:border-[#2d4262] hover:bg-[#10192a]"
					>
						Palette {paletteMode}
					</button>
					<button
						type="button"
						onClick={() => setMotionMode((value) => cycleOption(MOTION_OPTIONS, value))}
						className="rounded-full border border-[#223048] bg-[#0b1320]/88 px-4 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-100 transition hover:border-[#2d4262] hover:bg-[#10192a]"
					>
						Motion {motionMode}
					</button>
					<button
						type="button"
						onClick={() => setDensityMode((value) => cycleOption(DENSITY_OPTIONS, value))}
						className="rounded-full border border-[#223048] bg-[#0b1320]/88 px-4 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-100 transition hover:border-[#2d4262] hover:bg-[#10192a]"
					>
						Density {densityMode}
					</button>
					<button
						type="button"
						onClick={() =>
							setAtmosphereMode((value) => cycleOption(ATMOSPHERE_OPTIONS, value))
						}
						className="rounded-full border border-[#223048] bg-[#0b1320]/88 px-4 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-100 transition hover:border-[#2d4262] hover:bg-[#10192a]"
					>
						Atmosphere {atmosphereMode}
					</button>
					<button
						type="button"
						onClick={() => setAutoCycle((value) => !value)}
						className="rounded-full border border-[#223048] bg-[#0b1320]/88 px-4 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-100 transition hover:border-[#2d4262] hover:bg-[#10192a]"
					>
						Auto Cycle {autoCycle ? "On" : "Off"}
					</button>
				</div>
			</div>

			{status === "loading" && (
				<div className="absolute inset-0 grid place-items-center bg-[#050810]/45 font-mono text-sm text-slate-300">
					Booting Phaser scene...
				</div>
			)}

			{status === "error" && (
				<div className="absolute inset-0 grid place-items-center bg-[#050810]/82 px-6 text-center font-mono text-sm text-rose-300">
					Unable to load the mountain scene.
				</div>
			)}
		</div>
	);
}
