"use client";

import { type ReactElement, useEffect, useRef } from "react";

const CELL_SIZE = 20;
const NOISE_SCALE = 0.002;
const FADE_ALPHA = 25 / 255;
const PERLIN_YWRAPB = 4;
const PERLIN_YWRAP = 1 << PERLIN_YWRAPB;
const PERLIN_ZWRAPB = 8;
const PERLIN_ZWRAP = 1 << PERLIN_ZWRAPB;
const PERLIN_SIZE = 4095;

type PhaserModule = typeof import("phaser");
type PhaserGame = import("phaser").Game;
type PhaserScene = import("phaser").Scene;
type PhaserCanvasRenderer = import("phaser").Renderer.Canvas.CanvasRenderer;

type RGBColor = {
	r: number;
	g: number;
	b: number;
};

type Palette = {
	baseColor: RGBColor;
	secondColor: RGBColor;
	thirdColor: RGBColor;
	fourthColor: RGBColor;
};

type GridSurface = {
	canvas: HTMLCanvasElement;
	context: CanvasRenderingContext2D;
	imageData: ImageData;
	pixels: Uint8ClampedArray;
	gridWidth: number;
	gridHeight: number;
	drawWidth: number;
	drawHeight: number;
	xNoise: Float32Array;
	yNoise: Float32Array;
};

class PerlinNoise {
	private perlin = Array.from(
		{ length: PERLIN_SIZE + 1 },
		() => Math.random(),
	);

	private readonly octaves = 4;

	private readonly ampFalloff = 0.5;

	private scaledCosine(value: number): number {
		return 0.5 * (1 - Math.cos(value * Math.PI));
	}

	noise(x: number, y = 0, z = 0): number {
		if (x < 0) x = -x;
		if (y < 0) y = -y;
		if (z < 0) z = -z;

		let xi = Math.floor(x);
		let yi = Math.floor(y);
		let zi = Math.floor(z);
		let xf = x - xi;
		let yf = y - yi;
		let zf = z - zi;
		let total = 0;
		let amplitude = 0.5;

		for (let octave = 0; octave < this.octaves; octave++) {
			let offset = xi + (yi << PERLIN_YWRAPB) + (zi << PERLIN_ZWRAPB);
			const rxf = this.scaledCosine(xf);
			const ryf = this.scaledCosine(yf);

			let n1 = this.perlin[offset & PERLIN_SIZE];
			n1 += rxf * (this.perlin[(offset + 1) & PERLIN_SIZE] - n1);
			let n2 = this.perlin[(offset + PERLIN_YWRAP) & PERLIN_SIZE];
			n2 +=
				rxf *
				(this.perlin[(offset + PERLIN_YWRAP + 1) & PERLIN_SIZE] - n2);
			n1 += ryf * (n2 - n1);

			offset += PERLIN_ZWRAP;
			n2 = this.perlin[offset & PERLIN_SIZE];
			n2 += rxf * (this.perlin[(offset + 1) & PERLIN_SIZE] - n2);
			let n3 = this.perlin[(offset + PERLIN_YWRAP) & PERLIN_SIZE];
			n3 +=
				rxf *
				(this.perlin[(offset + PERLIN_YWRAP + 1) & PERLIN_SIZE] - n3);
			n2 += ryf * (n3 - n2);

			n1 += this.scaledCosine(zf) * (n2 - n1);
			total += n1 * amplitude;
			amplitude *= this.ampFalloff;

			xi <<= 1;
			yi <<= 1;
			zi <<= 1;
			xf *= 2;
			yf *= 2;
			zf *= 2;

			if (xf >= 1) {
				xi++;
				xf--;
			}
			if (yf >= 1) {
				yi++;
				yf--;
			}
			if (zf >= 1) {
				zi++;
				zf--;
			}
		}

		return total;
	}
}

function getRandomColor(): RGBColor {
	return {
		r: Math.random() * 255,
		g: Math.random() * 255,
		b: Math.random() * 255,
	};
}

function colorDistance(c1: RGBColor, c2: RGBColor): number {
	const rDiff = c1.r - c2.r;
	const gDiff = c1.g - c2.g;
	const bDiff = c1.b - c2.b;

	return Math.sqrt(rDiff * rDiff + gDiff * gDiff + bDiff * bDiff);
}

function selectColors(): Palette {
	const base = getRandomColor();
	let second = getRandomColor();
	let third = getRandomColor();
	let fourth = getRandomColor();

	while (colorDistance(base, second) < 50) {
		second = getRandomColor();
	}
	while (colorDistance(base, third) < 50 || colorDistance(second, third) < 50) {
		third = getRandomColor();
	}
	while (
		colorDistance(base, fourth) < 50 ||
		colorDistance(second, fourth) < 50 ||
		colorDistance(third, fourth) < 50
	) {
		fourth = getRandomColor();
	}

	return {
		baseColor: base,
		secondColor: second,
		thirdColor: third,
		fourthColor: fourth,
	};
}

function mapValue(
	value: number,
	start1: number,
	stop1: number,
	start2: number,
	stop2: number,
): number {
	return start2 + ((stop2 - start2) * (value - start1)) / (stop1 - start1);
}

function lerpColor(start: RGBColor, end: RGBColor, amount: number): RGBColor {
	return {
		r: start.r + (end.r - start.r) * amount,
		g: start.g + (end.g - start.g) * amount,
		b: start.b + (end.b - start.b) * amount,
	};
}

function colorForNoiseValue(noiseValue: number, palette: Palette): RGBColor {
	if (noiseValue < 0.33) {
		return lerpColor(
			palette.baseColor,
			palette.secondColor,
			mapValue(noiseValue, 0, 0.33, 0, 1),
		);
	}

	if (noiseValue < 0.66) {
		return lerpColor(
			palette.secondColor,
			palette.thirdColor,
			mapValue(noiseValue, 0.33, 0.66, 0, 1),
		);
	}

	return lerpColor(
		palette.thirdColor,
		palette.fourthColor,
		mapValue(noiseValue, 0.66, 1, 0, 1),
	);
}

function createGridSurface(size: {
	width: number;
	height: number;
}): GridSurface {
	const gridWidth = Math.ceil(size.width / CELL_SIZE);
	const gridHeight = Math.ceil(size.height / CELL_SIZE);
	const canvas = document.createElement("canvas");
	canvas.width = gridWidth;
	canvas.height = gridHeight;

	const context = canvas.getContext("2d", { alpha: false });
	if (!context) {
		throw new Error("Unable to create background canvas context.");
	}

	const imageData = context.createImageData(gridWidth, gridHeight);
	const xNoise = new Float32Array(gridWidth);
	const yNoise = new Float32Array(gridHeight);

	for (let x = 0; x < gridWidth; x++) {
		xNoise[x] = x * CELL_SIZE * NOISE_SCALE;
	}
	for (let y = 0; y < gridHeight; y++) {
		yNoise[y] = y * CELL_SIZE * NOISE_SCALE;
	}

	return {
		canvas,
		context,
		imageData,
		pixels: imageData.data,
		gridWidth,
		gridHeight,
		drawWidth: gridWidth * CELL_SIZE,
		drawHeight: gridHeight * CELL_SIZE,
		xNoise,
		yNoise,
	};
}

function drawGrid(
	surface: GridSurface,
	time: number,
	palette: Palette,
	noise: PerlinNoise,
): void {
	const { pixels, gridWidth, gridHeight, xNoise, yNoise } = surface;

	for (let y = 0; y < gridHeight; y++) {
		const yOffset = y * gridWidth;
		const noiseY = yNoise[y];

		for (let x = 0; x < gridWidth; x++) {
			const noiseValue = noise.noise(xNoise[x] + time, noiseY);
			const color = colorForNoiseValue(noiseValue, palette);
			const index = (yOffset + x) * 4;

			pixels[index] = color.r;
			pixels[index + 1] = color.g;
			pixels[index + 2] = color.b;
			pixels[index + 3] = 255;
		}
	}

	surface.context.putImageData(surface.imageData, 0, 0);
}

function viewportSize(): { width: number; height: number } {
	return {
		width: Math.max(1, Math.floor(window.innerWidth)),
		height: Math.max(1, Math.floor(window.innerHeight)),
	};
}

function mountBackground(host: HTMLDivElement, PhaserLib: PhaserModule): () => void {
	const palette = selectColors();
	const noise = new PerlinNoise();
	let game: PhaserGame | null = null;
	let renderer: PhaserCanvasRenderer | null = null;
	let frameTime = 0;
	let size = viewportSize();
	let surface = createGridSurface(size);

	const drawFrame = (): void => {
		if (!renderer) return;

		const context = renderer.gameContext;
		context.imageSmoothingEnabled = false;
		context.globalCompositeOperation = "source-over";
		context.fillStyle = `rgba(255, 255, 255, ${FADE_ALPHA})`;
		context.fillRect(0, 0, size.width, size.height);
		drawGrid(surface, frameTime, palette, noise);
		context.drawImage(surface.canvas, 0, 0, surface.drawWidth, surface.drawHeight);
		frameTime += 0.001;
	};

	class BackgroundScene extends PhaserLib.Scene {
		constructor() {
			super("phaser-background");
		}

		create(): void {
			renderer = this.sys.game.renderer as PhaserCanvasRenderer;
			renderer.gameContext.imageSmoothingEnabled = false;
			this.game.events.on(PhaserLib.Core.Events.POST_RENDER, drawFrame);
		}
	}

	const resize = (): void => {
		size = viewportSize();
		surface = createGridSurface(size);
		game?.scale.resize(size.width, size.height);
		if (renderer) {
			renderer.gameContext.setTransform(1, 0, 0, 1, 0, 0);
			renderer.gameContext.imageSmoothingEnabled = false;
		}
	};

	game = new PhaserLib.Game({
		type: PhaserLib.CANVAS,
		parent: host,
		width: size.width,
		height: size.height,
		scene: new BackgroundScene() as PhaserScene,
		banner: false,
		disableContextMenu: true,
		audio: { noAudio: true },
		clearBeforeRender: false,
		transparent: true,
	});

	window.addEventListener("resize", resize);

	return () => {
		window.removeEventListener("resize", resize);
		if (game) {
			game.events.off(PhaserLib.Core.Events.POST_RENDER, drawFrame);
			game.destroy(true);
			game = null;
		}
	};
}

export default function PhaserBackground(): ReactElement {
	const hostRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		let cleanup: (() => void) | null = null;
		let cancelled = false;

		(async () => {
			if (!hostRef.current) return;

			const phaserModule = await import("phaser");
			if (cancelled || !hostRef.current) return;

			const PhaserLib = ("default" in phaserModule
				? phaserModule.default
				: phaserModule) as PhaserModule;

			cleanup = mountBackground(hostRef.current, PhaserLib);
		})();

		return () => {
			cancelled = true;
			cleanup?.();
		};
	}, []);

	return (
		<div
			ref={hostRef}
			style={{
				width: "100%",
				height: "100%",
				position: "relative",
				overflow: "hidden",
			}}
		/>
	);
}
