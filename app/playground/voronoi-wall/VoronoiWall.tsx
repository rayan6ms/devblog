"use client";

import { useEffect, useRef, useState } from "react";

type PhaserModule = typeof import("phaser");
type PhaserGame = import("phaser").Game;
type PhaserScene = import("phaser").Scene;
type PhaserCanvasTexture = import("phaser").Textures.CanvasTexture;
type PhaserImage = import("phaser").GameObjects.Image;

type Size = {
	width: number;
	height: number;
};

type Point = {
	x: number;
	y: number;
};

type HslColor = {
	h: number;
	s: number;
	l: number;
};

type RgbColor = {
	r: number;
	g: number;
	b: number;
};

type MotionMode = "still" | "calm" | "drift";
type StyleMode = "flat" | "gradient" | "bloom" | "poster";
type LoadStatus = "loading" | "ready" | "error";

type Palette = {
	background: HslColor;
	cells: HslColor[];
	stroke: HslColor;
	glow: HslColor;
};

type RuntimeSeed = {
	baseX: number;
	baseY: number;
	ampX: number;
	ampY: number;
	freqX: number;
	freqY: number;
	phaseX: number;
	phaseY: number;
	colorIndex: number;
	tint: number;
};

type RenderSeed = {
	x: number;
	y: number;
	colorIndex: number;
	tint: number;
};

type Cell = {
	polygon: Point[];
	colorIndex: number;
	tint: number;
};

type Board = {
	size: Size;
	time: number;
	palette: Palette;
	seeds: RuntimeSeed[];
	guardSeeds: Point[];
	cells: Cell[];
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

type SettingsSnapshot = {
	autoCycle: boolean;
	cellCount: number;
	paletteSize: number;
	motionMode: MotionMode;
	styleMode: StyleMode;
};

type UiState = {
	cells: number;
	paletteSize: number;
};

type CurrentRef<T> = {
	current: T;
};

type Bridge = {
	settingsRef: CurrentRef<SettingsSnapshot>;
	newBoardRef: CurrentRef<(() => void) | undefined>;
	remixPaletteRef: CurrentRef<(() => void) | undefined>;
	onUiState: (state: UiState) => void;
};

const AUTO_CYCLE_MS = 6000;
const MOTION_STEP_MS = 1000 / 18;
const RELAXATION_PASSES = 2;
const MIN_CELLS = 16;
const MAX_CELLS = 44;
const CELL_OPTIONS = [20, 28, 36, 44];
const PALETTE_OPTIONS = [4, 5, 6, 7];
const MOTION_OPTIONS: MotionMode[] = ["still", "calm", "drift"];
const STYLE_OPTIONS: StyleMode[] = ["flat", "gradient", "bloom", "poster"];
const DEFAULT_SETTINGS: SettingsSnapshot = {
	autoCycle: false,
	cellCount: 28,
	paletteSize: 5,
	motionMode: "calm",
	styleMode: "gradient",
};
const EMPTY_UI_STATE: UiState = {
	cells: 0,
	paletteSize: 0,
};
const RGB_CACHE = new Map<number, string>();
const MOTION_PROFILES: Record<
	MotionMode,
	{ amplitude: number; speed: number }
> = {
	still: { amplitude: 0, speed: 0 },
	calm: { amplitude: 0.65, speed: 0.7 },
	drift: { amplitude: 1.15, speed: 1.05 },
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

function clampByte(value: number) {
	return clamp(Math.round(value), 0, 255);
}

function resolveHostSize(host: HTMLDivElement): Size {
	const rect = host.getBoundingClientRect();
	return {
		width: Math.max(1, Math.floor(host.clientWidth || rect.width || 1)),
		height: Math.max(1, Math.floor(host.clientHeight || rect.height || 1)),
	};
}

function hslToRgb(h: number, s: number, l: number): RgbColor {
	const hue = wrap01(h);
	if (s <= 0) {
		const value = clampByte(l * 255);
		return { r: value, g: value, b: value };
	}

	const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
	const p = 2 * l - q;
	const convert = (offset: number) => {
		let t = hue + offset;
		if (t < 0) t += 1;
		if (t > 1) t -= 1;
		if (t < 1 / 6) return p + (q - p) * 6 * t;
		if (t < 1 / 2) return q;
		if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
		return p;
	};

	return {
		r: clampByte(convert(1 / 3) * 255),
		g: clampByte(convert(0) * 255),
		b: clampByte(convert(-1 / 3) * 255),
	};
}

function rgbToCss(red: number, green: number, blue: number) {
	const r = clampByte(red);
	const g = clampByte(green);
	const b = clampByte(blue);
	const key = (r << 16) | (g << 8) | b;
	const cached = RGB_CACHE.get(key);
	if (cached) return cached;
	const value = `rgb(${r} ${g} ${b})`;
	RGB_CACHE.set(key, value);
	return value;
}

function cycleOption<T>(values: readonly T[], current: T) {
	const index = values.indexOf(current);
	return values[(index + 1) % values.length] ?? values[0];
}

function createPalette(count: number): Palette {
	const baseHue = Math.random();
	const cells = Array.from({ length: count }, (_, index) => {
		const progress = index / Math.max(count, 1);
		const hueOffset =
			progress < 0.5
				? progress * randomRange(0.3, 0.4)
				: 0.42 + (progress - 0.5) * randomRange(0.55, 0.82);
		return {
			h: wrap01(baseHue + hueOffset + randomRange(-0.03, 0.03)),
			s: clamp(randomRange(0.68, 0.94) - progress * 0.1, 0.52, 0.98),
			l: clamp(randomRange(0.42, 0.62) + (index % 2 === 0 ? 0.02 : -0.03), 0.32, 0.76),
		};
	});

	return {
		background: {
			h: wrap01(baseHue + 0.78 + randomRange(-0.05, 0.05)),
			s: randomRange(0.22, 0.38),
			l: randomRange(0.06, 0.1),
		},
		cells,
		stroke: {
			h: wrap01(baseHue + 0.03),
			s: randomRange(0.2, 0.34),
			l: randomRange(0.14, 0.24),
		},
		glow: {
			h: wrap01(baseHue + 0.08),
			s: randomRange(0.42, 0.62),
			l: randomRange(0.52, 0.66),
		},
	};
}

function createBaseSeeds(
	size: Size,
	cellCount: number,
	paletteSize: number,
): RenderSeed[] {
	const count = clamp(cellCount, MIN_CELLS, MAX_CELLS);
	const columns = Math.max(1, Math.ceil(Math.sqrt((count * size.width) / size.height)));
	const rows = Math.max(1, Math.ceil(count / columns));
	const seeds: RenderSeed[] = [];

	for (let index = 0; index < count; index += 1) {
		const column = index % columns;
		const row = Math.floor(index / columns);
		const jitterX = randomRange(-0.26, 0.26);
		const jitterY = randomRange(-0.26, 0.26);

		seeds.push({
			x: ((column + 0.5 + jitterX) / columns) * size.width,
			y: ((row + 0.5 + jitterY) / rows) * size.height,
			colorIndex: index % Math.max(paletteSize, 1),
			tint: randomRange(-0.08, 0.08),
		});
	}

	return seeds;
}

function createGuardSeeds(size: Size): Point[] {
	const padding = Math.max(84, Math.min(size.width, size.height) * 0.18);
	const points: Point[] = [];
	const horizontal = 6;
	const vertical = 5;

	for (let index = 0; index < horizontal; index += 1) {
		const x = (index / (horizontal - 1)) * size.width;
		points.push({ x, y: -padding });
		points.push({ x, y: size.height + padding });
	}

	for (let index = 1; index < vertical - 1; index += 1) {
		const y = (index / (vertical - 1)) * size.height;
		points.push({ x: -padding, y });
		points.push({ x: size.width + padding, y });
	}

	points.push({ x: -padding, y: -padding });
	points.push({ x: size.width + padding, y: -padding });
	points.push({ x: size.width + padding, y: size.height + padding });
	points.push({ x: -padding, y: size.height + padding });

	return points;
}

function clipPolygon(polygon: Point[], a: number, b: number, c: number): Point[] {
	if (polygon.length === 0) return polygon;

	const clipped: Point[] = [];
	let previous = polygon[polygon.length - 1];
	let previousInside = a * previous.x + b * previous.y <= c;

	for (const current of polygon) {
		const currentInside = a * current.x + b * current.y <= c;

		if (currentInside !== previousInside) {
			const previousValue = a * previous.x + b * previous.y - c;
			const currentValue = a * current.x + b * current.y - c;
			const denominator = previousValue - currentValue;
			const t = Math.abs(denominator) < 1e-9 ? 0 : previousValue / denominator;
			clipped.push({
				x: previous.x + (current.x - previous.x) * t,
				y: previous.y + (current.y - previous.y) * t,
			});
		}

		if (currentInside) {
			clipped.push(current);
		}

		previous = current;
		previousInside = currentInside;
	}

	return clipped;
}

function createVoronoiCells(
	size: Size,
	seeds: RenderSeed[],
	guardSeeds: Point[],
): Cell[] {
	const bleed = 4;
	const bounds: Point[] = [
		{ x: -bleed, y: -bleed },
		{ x: size.width + bleed, y: -bleed },
		{ x: size.width + bleed, y: size.height + bleed },
		{ x: -bleed, y: size.height + bleed },
	];
	const allSeeds: Array<RenderSeed | Point> = [...seeds, ...guardSeeds];
	const cells: Cell[] = [];

	for (let index = 0; index < seeds.length; index += 1) {
		const seed = seeds[index];
		let polygon = bounds.slice();

		for (let otherIndex = 0; otherIndex < allSeeds.length; otherIndex += 1) {
			if (otherIndex === index) continue;

			const other = allSeeds[otherIndex];
			const a = 2 * (other.x - seed.x);
			const b = 2 * (other.y - seed.y);
			const c =
				other.x * other.x +
				other.y * other.y -
				(seed.x * seed.x + seed.y * seed.y);

			polygon = clipPolygon(polygon, a, b, c);
			if (polygon.length === 0) break;
		}

		if (polygon.length >= 3) {
			cells.push({
				polygon,
				colorIndex: seed.colorIndex,
				tint: seed.tint,
			});
		}
	}

	return cells;
}

function polygonCentroid(polygon: Point[]): Point {
	let areaFactor = 0;
	let sumX = 0;
	let sumY = 0;

	for (let index = 0; index < polygon.length; index += 1) {
		const current = polygon[index];
		const next = polygon[(index + 1) % polygon.length];
		const cross = current.x * next.y - next.x * current.y;
		areaFactor += cross;
		sumX += (current.x + next.x) * cross;
		sumY += (current.y + next.y) * cross;
	}

	if (Math.abs(areaFactor) < 1e-6) {
		return polygon[0] ?? { x: 0, y: 0 };
	}

	return {
		x: sumX / (3 * areaFactor),
		y: sumY / (3 * areaFactor),
	};
}

function relaxSeeds(size: Size, seeds: RenderSeed[], guardSeeds: Point[]) {
	let current = seeds.slice();
	const inset = Math.max(20, Math.min(size.width, size.height) * 0.06);

	for (let pass = 0; pass < RELAXATION_PASSES; pass += 1) {
		const cells = createVoronoiCells(size, current, guardSeeds);
		current = current.map((seed, index) => {
			const cell = cells[index];
			if (!cell || cell.polygon.length < 3) return seed;
			const centroid = polygonCentroid(cell.polygon);
			return {
				...seed,
				x: clamp(centroid.x, inset, size.width - inset),
				y: clamp(centroid.y, inset, size.height - inset),
			};
		});
	}

	return current;
}

function createRuntimeSeeds(
	size: Size,
	cellCount: number,
	paletteSize: number,
): {
	seeds: RuntimeSeed[];
	guardSeeds: Point[];
} {
	const guardSeeds = createGuardSeeds(size);
	const relaxedSeeds = relaxSeeds(
		size,
		createBaseSeeds(size, cellCount, paletteSize),
		guardSeeds,
	);
	const region = Math.sqrt((size.width * size.height) / Math.max(relaxedSeeds.length, 1));
	const maxAmplitude = clamp(region * 0.08, 6, 14);

	return {
		guardSeeds,
		seeds: relaxedSeeds.map((seed) => ({
			baseX: seed.x,
			baseY: seed.y,
			ampX: randomRange(maxAmplitude * 0.35, maxAmplitude),
			ampY: randomRange(maxAmplitude * 0.35, maxAmplitude),
			freqX: randomRange(0.15, 0.32),
			freqY: randomRange(0.12, 0.28),
			phaseX: randomRange(0, Math.PI * 2),
			phaseY: randomRange(0, Math.PI * 2),
			colorIndex: seed.colorIndex,
			tint: seed.tint,
		})),
	};
}

function sampleSeeds(board: Board, motionMode: MotionMode): RenderSeed[] {
	const profile = MOTION_PROFILES[motionMode];
	if (profile.amplitude <= 0 || profile.speed <= 0) {
		return board.seeds.map((seed) => ({
			x: seed.baseX,
			y: seed.baseY,
			colorIndex: seed.colorIndex,
			tint: seed.tint,
		}));
	}

	const inset = Math.max(20, Math.min(board.size.width, board.size.height) * 0.06);
	return board.seeds.map((seed) => ({
		x: clamp(
			seed.baseX +
				Math.cos(board.time * seed.freqX * profile.speed + seed.phaseX) *
					seed.ampX *
					profile.amplitude,
			inset,
			board.size.width - inset,
		),
		y: clamp(
			seed.baseY +
				Math.sin(board.time * seed.freqY * profile.speed + seed.phaseY) *
					seed.ampY *
					profile.amplitude,
			inset,
			board.size.height - inset,
		),
		colorIndex: seed.colorIndex,
		tint:
			seed.tint +
			Math.sin(
				board.time * 0.24 * profile.speed + seed.phaseX * 0.6 + seed.phaseY * 0.4,
			) *
				0.03,
	}));
}

function createBoard(size: Size, settings: SettingsSnapshot): Board {
	const palette = createPalette(settings.paletteSize);
	const { seeds, guardSeeds } = createRuntimeSeeds(
		size,
		settings.cellCount,
		palette.cells.length,
	);
	const board: Board = {
		size,
		time: 0,
		palette,
		seeds,
		guardSeeds,
		cells: [],
	};
	board.cells = createVoronoiCells(size, sampleSeeds(board, settings.motionMode), guardSeeds);
	return board;
}

function stepBoard(board: Board, deltaSeconds: number, settings: SettingsSnapshot) {
	const profile = MOTION_PROFILES[settings.motionMode];
	if (profile.speed <= 0 || profile.amplitude <= 0) return false;
	board.time += deltaSeconds;
	board.cells = createVoronoiCells(
		board.size,
		sampleSeeds(board, settings.motionMode),
		board.guardSeeds,
	);
	return true;
}

function createSurface(
	size: Size,
	scene: PhaserScene,
	PhaserLib: PhaserModule,
): Surface {
	const pixelRatio = clamp(window.devicePixelRatio || 1, 1, 2);
	const canvas = document.createElement("canvas");
	canvas.width = Math.max(1, Math.floor(size.width * pixelRatio));
	canvas.height = Math.max(1, Math.floor(size.height * pixelRatio));

	const context = canvas.getContext("2d", { alpha: false });
	if (!context) {
		throw new Error("Unable to create Voronoi canvas context.");
	}

	context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
	context.imageSmoothingEnabled = false;

	const textureKey = `voronoi-wall-${Math.random().toString(36).slice(2, 10)}`;
	const texture = scene.textures.addCanvas(textureKey, canvas);
	if (!texture) {
		throw new Error("Unable to create Voronoi canvas texture.");
	}
	texture.setFilter(PhaserLib.Textures.FilterMode.LINEAR);

	const image = scene.add.image(0, 0, textureKey).setOrigin(0);
	image.setDisplaySize(size.width, size.height);

	return {
		width: size.width,
		height: size.height,
		canvas,
		context,
		textureKey,
		texture,
		image,
	};
}

function destroySurface(scene: PhaserScene, surface: Surface | null) {
	if (!surface) return;
	surface.image.destroy();
	scene.textures.remove(surface.textureKey);
}

function fillPolygon(context: CanvasRenderingContext2D, polygon: Point[]) {
	context.beginPath();
	context.moveTo(polygon[0].x, polygon[0].y);
	for (let index = 1; index < polygon.length; index += 1) {
		context.lineTo(polygon[index].x, polygon[index].y);
	}
	context.closePath();
}

function polygonBounds(polygon: Point[]) {
	let minX = polygon[0]?.x ?? 0;
	let maxX = minX;
	let minY = polygon[0]?.y ?? 0;
	let maxY = minY;

	for (const point of polygon) {
		if (point.x < minX) minX = point.x;
		if (point.x > maxX) maxX = point.x;
		if (point.y < minY) minY = point.y;
		if (point.y > maxY) maxY = point.y;
	}

	return { minX, maxX, minY, maxY };
}

function makeCellFill(
	context: CanvasRenderingContext2D,
	cell: Cell,
	palette: Palette,
	styleMode: StyleMode,
) {
	const base = palette.cells[cell.colorIndex % palette.cells.length];
	const primary = hslToRgb(
		base.h,
		clamp(base.s + cell.tint * 0.5, 0.46, 0.98),
		clamp(base.l + cell.tint, 0.28, 0.8),
	);

	if (styleMode === "flat") {
		return rgbToCss(primary.r, primary.g, primary.b);
	}

	const bounds = polygonBounds(cell.polygon);
	const centroid = polygonCentroid(cell.polygon);
	const secondary = hslToRgb(
		wrap01(base.h + 0.03 + cell.tint * 0.08),
		clamp(base.s * 0.86, 0.4, 0.96),
		clamp(base.l + 0.1, 0.34, 0.86),
	);
	const dark = hslToRgb(
		wrap01(base.h - 0.025),
		clamp(base.s * 0.92, 0.44, 0.96),
		clamp(base.l - 0.12, 0.18, 0.68),
	);

	if (styleMode === "gradient" || styleMode === "poster") {
		const gradient = context.createLinearGradient(
			bounds.minX,
			bounds.minY,
			bounds.maxX,
			bounds.maxY,
		);
		gradient.addColorStop(0, rgbToCss(secondary.r, secondary.g, secondary.b));
		gradient.addColorStop(
			styleMode === "poster" ? 0.52 : 0.62,
			rgbToCss(primary.r, primary.g, primary.b),
		);
		gradient.addColorStop(1, rgbToCss(dark.r, dark.g, dark.b));
		return gradient;
	}

	const glow = hslToRgb(
		palette.glow.h,
		clamp(palette.glow.s * 0.9, 0.32, 0.84),
		clamp(palette.glow.l + 0.06, 0.46, 0.84),
	);
	const gradient = context.createRadialGradient(
		centroid.x,
		centroid.y,
		Math.max(10, Math.min(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY) * 0.08),
		centroid.x,
		centroid.y,
		Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY) * 0.75,
	);
	gradient.addColorStop(0, rgbToCss(glow.r, glow.g, glow.b));
	gradient.addColorStop(0.35, rgbToCss(secondary.r, secondary.g, secondary.b));
	gradient.addColorStop(1, rgbToCss(dark.r, dark.g, dark.b));
	return gradient;
}

function renderBoard(surface: Surface, board: Board, styleMode: StyleMode) {
	const { context, width, height } = surface;
	const background = hslToRgb(
		board.palette.background.h,
		board.palette.background.s,
		board.palette.background.l,
	);
	const stroke = hslToRgb(
		board.palette.stroke.h,
		board.palette.stroke.s,
		board.palette.stroke.l,
	);

	context.clearRect(0, 0, width, height);
	context.fillStyle = rgbToCss(background.r, background.g, background.b);
	context.fillRect(0, 0, width, height);
	context.lineJoin = "round";
	context.lineCap = "round";
	context.lineWidth = styleMode === "poster" ? 1.7 : 1.1;
	context.strokeStyle = rgbToCss(stroke.r, stroke.g, stroke.b);

	for (const cell of board.cells) {
		fillPolygon(context, cell.polygon);
		context.save();
		context.fillStyle = makeCellFill(context, cell, board.palette, styleMode);
		if (styleMode === "bloom") {
			const glow = hslToRgb(
				board.palette.glow.h,
				board.palette.glow.s,
				board.palette.glow.l,
			);
			context.shadowColor = rgbToCss(glow.r, glow.g, glow.b);
			context.shadowBlur = 18;
		}
		context.fill();
		context.restore();
		context.stroke();
	}

	surface.texture.refresh();
}

function mountVoronoiWall(
	host: HTMLDivElement,
	PhaserLib: PhaserModule,
	bridge: Bridge,
) {
	let game: PhaserGame | null = null;
	let observer: ResizeObserver | null = null;
	let lastSize = resolveHostSize(host);
	let sceneRef: VoronoiWallScene | null = null;

	class VoronoiWallScene extends PhaserLib.Scene {
		private surface: Surface | null = null;

		private board: Board | null = null;

		private accumulatorMs = 0;

		private lastStyleMode: StyleMode = bridge.settingsRef.current.styleMode;

		private autoCycleElapsedMs = 0;

		constructor() {
			super("voronoi-wall-phaser");
		}

		create() {
			sceneRef = this;
			this.cameras.main.setBackgroundColor("#070a12");
			this.rebuild(lastSize);
			this.events.once(PhaserLib.Scenes.Events.SHUTDOWN, this.cleanup, this);
			this.events.once(PhaserLib.Scenes.Events.DESTROY, this.cleanup, this);

			bridge.newBoardRef.current = () => {
				this.rebuild(lastSize);
			};
			bridge.remixPaletteRef.current = () => {
				if (!this.surface || !this.board) return;
				this.board.palette = createPalette(bridge.settingsRef.current.paletteSize);
				renderBoard(this.surface, this.board, bridge.settingsRef.current.styleMode);
				bridge.onUiState({
					cells: this.board.cells.length,
					paletteSize: this.board.palette.cells.length,
				});
			};
		}

		handleResize(size: Size) {
			this.cameras.main.setSize(size.width, size.height);
			this.rebuild(size);
		}

		update(_time: number, deltaMs: number) {
			if (!this.surface || !this.board) return;
			const settings = bridge.settingsRef.current;
			let needsRender = false;

			if (settings.autoCycle) {
				this.autoCycleElapsedMs += Math.min(deltaMs, 250);
				if (this.autoCycleElapsedMs >= AUTO_CYCLE_MS) {
					this.rebuild(lastSize);
					needsRender = true;
				}
			} else {
				this.autoCycleElapsedMs = 0;
			}

			this.accumulatorMs = Math.min(
				this.accumulatorMs + Math.min(deltaMs, MOTION_STEP_MS * 2),
				MOTION_STEP_MS * 2,
			);
			while (this.accumulatorMs >= MOTION_STEP_MS) {
				if (stepBoard(this.board, MOTION_STEP_MS / 1000, settings)) {
					needsRender = true;
				}
				this.accumulatorMs -= MOTION_STEP_MS;
			}

			if (this.lastStyleMode !== settings.styleMode) {
				this.lastStyleMode = settings.styleMode;
				needsRender = true;
			}

			if (needsRender) {
				renderBoard(this.surface, this.board, settings.styleMode);
			}
		}

		private rebuild(size: Size) {
			const settings = bridge.settingsRef.current;
			destroySurface(this, this.surface);
			this.surface = createSurface(size, this, PhaserLib);
			this.board = createBoard(size, settings);
			this.accumulatorMs = 0;
			this.autoCycleElapsedMs = 0;
			this.lastStyleMode = settings.styleMode;
			renderBoard(this.surface, this.board, settings.styleMode);
			bridge.onUiState({
				cells: this.board.cells.length,
				paletteSize: this.board.palette.cells.length,
			});
		}

		private cleanup() {
			destroySurface(this, this.surface);
			this.surface = null;
			this.board = null;
			if (sceneRef === this) {
				sceneRef = null;
			}
			bridge.newBoardRef.current = undefined;
			bridge.remixPaletteRef.current = undefined;
		}
	}

	game = new PhaserLib.Game({
		type: PhaserLib.CANVAS,
		parent: host,
		backgroundColor: "#070a12",
		width: lastSize.width,
		height: lastSize.height,
		render: {
			antialias: true,
			pixelArt: false,
			roundPixels: false,
		},
		scale: {
			mode: PhaserLib.Scale.NONE,
			autoCenter: PhaserLib.Scale.NO_CENTER,
			width: lastSize.width,
			height: lastSize.height,
		},
		scene: [VoronoiWallScene],
	});

	if (game.canvas) {
		game.canvas.style.display = "block";
		game.canvas.style.width = "100%";
		game.canvas.style.height = "100%";
		game.canvas.style.imageRendering = "auto";
	}

	observer = new ResizeObserver(() => {
		const nextSize = resolveHostSize(host);
		if (
			nextSize.width === lastSize.width &&
			nextSize.height === lastSize.height
		) {
			return;
		}

		lastSize = nextSize;
		game?.scale.resize(nextSize.width, nextSize.height);
		sceneRef?.handleResize(nextSize);
	});
	observer.observe(host);

	return () => {
		observer?.disconnect();
		observer = null;
		sceneRef = null;
		bridge.newBoardRef.current = undefined;
		bridge.remixPaletteRef.current = undefined;
		game?.destroy(true);
		game = null;
	};
}

export default function VoronoiWall() {
	const hostRef = useRef<HTMLDivElement | null>(null);
	const settingsRef = useRef<SettingsSnapshot>({ ...DEFAULT_SETTINGS });
	const newBoardRef = useRef<(() => void) | undefined>(undefined);
	const remixPaletteRef = useRef<(() => void) | undefined>(undefined);
	const [status, setStatus] = useState<LoadStatus>("loading");
	const [uiState, setUiState] = useState<UiState>(EMPTY_UI_STATE);
	const [autoCycle, setAutoCycle] = useState(DEFAULT_SETTINGS.autoCycle);
	const [cellCount, setCellCount] = useState(DEFAULT_SETTINGS.cellCount);
	const [paletteSize, setPaletteSize] = useState(DEFAULT_SETTINGS.paletteSize);
	const [motionMode, setMotionMode] = useState<MotionMode>(
		DEFAULT_SETTINGS.motionMode,
	);
	const [styleMode, setStyleMode] = useState<StyleMode>(DEFAULT_SETTINGS.styleMode);

	useEffect(() => {
		settingsRef.current.autoCycle = autoCycle;
	}, [autoCycle]);

	useEffect(() => {
		settingsRef.current.motionMode = motionMode;
	}, [motionMode]);

	useEffect(() => {
		settingsRef.current.styleMode = styleMode;
	}, [styleMode]);

	useEffect(() => {
		settingsRef.current.cellCount = cellCount;
		newBoardRef.current?.();
	}, [cellCount]);

	useEffect(() => {
		settingsRef.current.paletteSize = paletteSize;
		newBoardRef.current?.();
	}, [paletteSize]);

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

				cleanup = mountVoronoiWall(hostRef.current, PhaserLib, {
					settingsRef,
					newBoardRef,
					remixPaletteRef,
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
		<div className="flex h-full min-h-0 w-full select-none flex-col overflow-hidden bg-[radial-gradient(circle_at_top,#173150_0%,#0b1422_35%,#050810_100%)] text-slate-100">
			<div className="border-b border-[#233247] bg-[#07111d]/92 backdrop-blur">
				<div className="flex flex-wrap items-center gap-3 px-4 py-4 sm:px-5">
					<div className="mr-auto font-mono text-xs text-slate-400">
						Bounded animated Voronoi cells with manual controls for motion, style, palette, and density.
					</div>
					<div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] uppercase tracking-[0.2em] text-slate-400">
						<span>Cells <span className="text-slate-100">{uiState.cells}</span></span>
						<span>Palette <span className="text-slate-100">{uiState.paletteSize}</span></span>
						<span>Motion <span className="text-slate-100">{motionMode}</span></span>
						<span>Style <span className="text-slate-100">{styleMode}</span></span>
						<span>Cycle <span className="text-slate-100">{autoCycle ? "6s" : "Off"}</span></span>
						<span className="text-slate-200">
							{status === "loading"
								? "Loading"
								: status === "error"
									? "Error"
									: "Ready"}
						</span>
					</div>
				</div>

				<div className="flex flex-wrap gap-2 px-4 pb-4 sm:px-5">
					<button
						type="button"
						onClick={() => newBoardRef.current?.()}
						className="select-none rounded-full bg-slate-100 px-4 py-2 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-slate-950 transition hover:bg-white"
					>
						New Board
					</button>
					<button
						type="button"
						onClick={() => remixPaletteRef.current?.()}
						className="select-none rounded-full border border-[#223048] bg-[#0b1320] px-4 py-2 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-slate-100 transition hover:border-[#2d4262] hover:bg-[#10192a]"
					>
						Remix Colors
					</button>
					<button
						type="button"
						onClick={() => setMotionMode((value) => cycleOption(MOTION_OPTIONS, value))}
						className="select-none rounded-full border border-[#223048] bg-[#0b1320] px-4 py-2 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-slate-100 transition hover:border-[#2d4262] hover:bg-[#10192a]"
					>
						Motion {motionMode}
					</button>
					<button
						type="button"
						onClick={() => setAutoCycle((value) => !value)}
						className="select-none rounded-full border border-[#223048] bg-[#0b1320] px-4 py-2 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-slate-100 transition hover:border-[#2d4262] hover:bg-[#10192a]"
					>
						Auto Cycle {autoCycle ? "On" : "Off"}
					</button>
					<button
						type="button"
						onClick={() => setCellCount((value) => cycleOption(CELL_OPTIONS, value))}
						className="select-none rounded-full border border-[#223048] bg-[#0b1320] px-4 py-2 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-slate-100 transition hover:border-[#2d4262] hover:bg-[#10192a]"
					>
						Cells {cellCount}
					</button>
					<button
						type="button"
						onClick={() =>
							setPaletteSize((value) => cycleOption(PALETTE_OPTIONS, value))
						}
						className="select-none rounded-full border border-[#223048] bg-[#0b1320] px-4 py-2 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-slate-100 transition hover:border-[#2d4262] hover:bg-[#10192a]"
					>
						Palette {paletteSize}
					</button>
					<button
						type="button"
						onClick={() => setStyleMode((value) => cycleOption(STYLE_OPTIONS, value))}
						className="select-none rounded-full border border-[#223048] bg-[#0b1320] px-4 py-2 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-slate-100 transition hover:border-[#2d4262] hover:bg-[#10192a]"
					>
						Style {styleMode}
					</button>
				</div>
			</div>

			<div className="relative min-h-0 flex-1">
				<div ref={hostRef} className="absolute inset-0" />

				{status === "loading" && (
					<div className="absolute inset-0 grid place-items-center bg-[#050810]/70 font-mono text-sm text-slate-300">
						Booting Phaser scene...
					</div>
				)}

				{status === "error" && (
					<div className="absolute inset-0 grid place-items-center bg-[#050810]/85 px-6 text-center font-mono text-sm text-rose-300">
						Unable to load the Voronoi scene.
					</div>
				)}
			</div>
		</div>
	);
}
