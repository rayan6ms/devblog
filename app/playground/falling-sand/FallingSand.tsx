"use client";

import { useEffect, useRef, useState, type MutableRefObject } from "react";

type PhaserModule = typeof import("phaser");
type PhaserGame = import("phaser").Game;
type PhaserScene = import("phaser").Scene;
type PhaserCanvasRenderer = import("phaser").Renderer.Canvas.CanvasRenderer;

const DEFAULT_CELL = 4;
const DEFAULT_BRUSH_DIAM = 7;
const BRUSH_DENSITY = 0.75;
const GRAVITY = 0.12;
const VEL_MAX = 14;
const SLEEP_CHECK = 8;
const NOISE_Z1 = 83492791;
const NOISE_Z2 = 196613;

type Particle = {
	col: number;
	row: number;
	v: number;
	hue: number;
	stuck: number;
	vMul: number;
};

type Brush = "circle" | "square" | "spray";
type HueMode = "cycle" | "random" | "randomLerp" | "single";
type Cohesion = "none" | "checker" | "rings" | "cross";
type Palette = "off" | "analogous" | "complementary" | "triad" | "mono";
type NoiseMode = "off" | "hue" | "liquid" | "granular";

type SettingsSnapshot = {
	brush: Brush;
	hueMode: HueMode;
	cohesion: Cohesion;
	singleHue: number;
	singleHex: string;
	singleS: number;
	singleV: number;
	randTargetHue: number;
	randCurrentHue: number;
	randT: number;
	solid: boolean;
	cell: number;
	brushDiam: number;
	eraser: boolean;
	palette: Palette;
	noiseMode: NoiseMode;
	noiseScale: number;
	shadow: boolean;
	shadowLayers: number;
	shadowDist: number;
};

type MountOptions = {
	settingsRef: MutableRefObject<SettingsSnapshot>;
	resetWorldRef: MutableRefObject<(() => void) | undefined>;
};

type Surface = {
	canvas: HTMLCanvasElement;
	context: CanvasRenderingContext2D;
};

const COLOR_CACHE = new Map<number, string>();

function fastNoise(c: number, r: number, z: number) {
	let n = (c * 73856093) ^ (r * 19349663) ^ (z * NOISE_Z1);
	n = (n ^ (n >>> 13)) * 1274126177;
	n ^= n >>> 16;
	return ((n >>> 8) & 0xffff) / 65535 - 0.5;
}

function lerpHue(a: number, b: number, t: number) {
	const d = ((b - a + 540) % 360) - 180;
	return (a + d * t + 360) % 360;
}

function hexToHsv(hex: string) {
	const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	if (!m) return { h: 0, s: 0, v: 0 };
	const r = parseInt(m[1], 16) / 255;
	const g = parseInt(m[2], 16) / 255;
	const b = parseInt(m[3], 16) / 255;
	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	const d = max - min;
	let h = 0;

	if (d !== 0) {
		switch (max) {
			case r:
				h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
				break;
			case g:
				h = ((b - r) / d + 2) * 60;
				break;
			case b:
				h = ((r - g) / d + 4) * 60;
				break;
		}
	}

	const s = max === 0 ? 0 : d / max;
	const v = max;
	return { h, s, v };
}

function clamp01(value: number) {
	if (value <= 0) return 0;
	if (value >= 1) return 1;
	return value;
}

function smoothstep(t: number) {
	return t * t * (3 - 2 * t);
}

function lerp(a: number, b: number, t: number) {
	return a + (b - a) * t;
}

function noiseValue(x: number, y: number, z: number) {
	const x0 = Math.floor(x);
	const y0 = Math.floor(y);
	const z0 = Math.floor(z);
	const tx = smoothstep(x - x0);
	const ty = smoothstep(y - y0);
	const tz = smoothstep(z - z0);

	const sample = (sx: number, sy: number, sz: number) =>
		fastNoise(sx, sy, sz) + 0.5;

	const c000 = sample(x0, y0, z0);
	const c100 = sample(x0 + 1, y0, z0);
	const c010 = sample(x0, y0 + 1, z0);
	const c110 = sample(x0 + 1, y0 + 1, z0);
	const c001 = sample(x0, y0, z0 + 1);
	const c101 = sample(x0 + 1, y0, z0 + 1);
	const c011 = sample(x0, y0 + 1, z0 + 1);
	const c111 = sample(x0 + 1, y0 + 1, z0 + 1);

	const x00 = lerp(c000, c100, tx);
	const x10 = lerp(c010, c110, tx);
	const x01 = lerp(c001, c101, tx);
	const x11 = lerp(c011, c111, tx);
	const y0i = lerp(x00, x10, ty);
	const y1i = lerp(x01, x11, ty);

	return clamp01(lerp(y0i, y1i, tz));
}

function wrap360(hue: number) {
	return ((hue % 360) + 360) % 360;
}

function hsvToRgb(h: number, s255: number, v255: number) {
	const hue = wrap360(h);
	const s = clamp01(s255 / 255);
	const v = clamp01(v255 / 255);
	const c = v * s;
	const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
	const m = v - c;

	let r1 = 0;
	let g1 = 0;
	let b1 = 0;

	if (hue < 60) {
		r1 = c;
		g1 = x;
	} else if (hue < 120) {
		r1 = x;
		g1 = c;
	} else if (hue < 180) {
		g1 = c;
		b1 = x;
	} else if (hue < 240) {
		g1 = x;
		b1 = c;
	} else if (hue < 300) {
		r1 = x;
		b1 = c;
	} else {
		r1 = c;
		b1 = x;
	}

	return {
		r: Math.round((r1 + m) * 255),
		g: Math.round((g1 + m) * 255),
		b: Math.round((b1 + m) * 255),
	};
}

function colorFor(h: number, s255: number, v255: number) {
	const hueKey = Math.round(wrap360(h));
	const satKey = Math.max(0, Math.min(255, Math.round(s255)));
	const valKey = Math.max(0, Math.min(255, Math.round(v255)));
	const key = hueKey * 65536 + satKey * 256 + valKey;
	const cached = COLOR_CACHE.get(key);

	if (cached) return cached;

	const { r, g, b } = hsvToRgb(hueKey, satKey, valKey);
	const color = `rgb(${r} ${g} ${b})`;
	COLOR_CACHE.set(key, color);
	return color;
}

function createSurface(width: number, height: number): Surface {
	const canvas = document.createElement("canvas");
	canvas.width = Math.max(1, width);
	canvas.height = Math.max(1, height);
	const context = canvas.getContext("2d");

	if (!context) {
		throw new Error("Unable to create drawing surface.");
	}

	context.imageSmoothingEnabled = false;
	return { canvas, context };
}

function fillRoundRect(
	context: CanvasRenderingContext2D,
	x: number,
	y: number,
	width: number,
	height: number,
	radius: number,
) {
	const r = Math.max(0, Math.min(radius, width / 2, height / 2));
	context.beginPath();
	context.moveTo(x + r, y);
	context.lineTo(x + width - r, y);
	context.quadraticCurveTo(x + width, y, x + width, y + r);
	context.lineTo(x + width, y + height - r);
	context.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
	context.lineTo(x + r, y + height);
	context.quadraticCurveTo(x, y + height, x, y + height - r);
	context.lineTo(x, y + r);
	context.quadraticCurveTo(x, y, x + r, y);
	context.closePath();
	context.fill();
}

function resolveHostSize(host: HTMLDivElement) {
	const rect = host.getBoundingClientRect();
	return {
		width: Math.max(1, Math.floor(host.clientWidth || rect.width || 1)),
		height: Math.max(1, Math.floor(host.clientHeight || rect.height || 1)),
	};
}

function mountFallingSand(
	host: HTMLDivElement,
	PhaserLib: PhaserModule,
	{ settingsRef, resetWorldRef }: MountOptions,
): () => void {
	let game: PhaserGame | null = null;
	let renderer: PhaserCanvasRenderer | null = null;
	let canvas: HTMLCanvasElement | null = null;
	let observer: ResizeObserver | null = null;
	let cols = 0;
	let rows = 0;
	let grid = new Int32Array(0);
	let particles: Particle[] = [];
	let active: number[] = [];
	let nextActive: number[] = [];
	let hueValue = 200;
	let frameId = 0;
	let fpsAccMs = 0;
	let fpsAccFrames = 0;
	let fpsDisplay = 60;
	let lastFpsAt = performance.now();
	let pointerClientX = 0;
	let pointerClientY = 0;
	let pointerInside = false;
	let pointerDown = false;
	let staticSurface = createSurface(1, 1);

	const idx = (c: number, r: number) => r * cols + c;
	const inBounds = (c: number, r: number) =>
		c >= 0 && c < cols && r >= 0 && r < rows;

	const makeWorld = (width: number, height: number) => {
		const { cell } = settingsRef.current;
		cols = Math.max(1, Math.floor(width / cell));
		rows = Math.max(1, Math.floor(height / cell));
		grid = new Int32Array(cols * rows);
		grid.fill(-1);
		particles = [];
		active = [];
		nextActive = [];
	};

	const clearStatic = () => {
		staticSurface.context.setTransform(1, 0, 0, 1, 0, 0);
		staticSurface.context.clearRect(
			0,
			0,
			staticSurface.canvas.width,
			staticSurface.canvas.height,
		);
	};

	const resizeCanvas = (width: number, height: number) => {
		if (!game) return;

		const { cell } = settingsRef.current;
		const drawWidth = Math.max(cell, Math.floor(width / cell) * cell);
		const drawHeight = Math.max(cell, Math.floor(height / cell) * cell);

		staticSurface = createSurface(drawWidth, drawHeight);
		makeWorld(drawWidth, drawHeight);
		frameId = 0;
		game.scale.resize(drawWidth, drawHeight);

		if (canvas) {
			canvas.style.width = `${drawWidth}px`;
			canvas.style.height = `${drawHeight}px`;
			canvas.style.display = "block";
			canvas.style.cursor = "crosshair";
			canvas.style.touchAction = "none";
		}

		if (renderer) {
			renderer.gameContext.imageSmoothingEnabled = false;
			renderer.gameContext.setTransform(1, 0, 0, 1, 0, 0);
		}
	};

	const resetWorld = () => {
		if (!canvas) return;
		clearStatic();
		makeWorld(canvas.width, canvas.height);
		frameId = 0;
	};

	const applyPalette = (base: number) => {
		const cfg = settingsRef.current;
		const origin = wrap360(base);

		if (cfg.palette === "mono" || cfg.palette === "off") return origin;

		const jitter = () => Math.random() * 12 - 6;

		if (cfg.palette === "analogous") {
			const offsets = [-30, -15, 0, 15, 30];
			return wrap360(
				origin + offsets[Math.floor(Math.random() * offsets.length)] + jitter(),
			);
		}

		if (cfg.palette === "complementary") {
			const offset = Math.random() < 0.55 ? 180 : Math.random() < 0.5 ? -20 : 20;
			return wrap360(origin + offset + jitter());
		}

		if (cfg.palette === "triad") {
			const offsets = [0, 120, 240];
			const pick = offsets[Math.floor(Math.random() * offsets.length)];
			return wrap360(origin + pick + (Math.random() < 0.5 ? jitter() : 0));
		}

		return origin;
	};

	const svFor = (c: number, r: number) => {
		const cfg = settingsRef.current;

		if (cfg.palette !== "mono") {
			return {
				s255: cfg.hueMode === "single" ? Math.round(cfg.singleS * 255) : 255,
				v255: cfg.hueMode === "single" ? Math.round(cfg.singleV * 255) : 255,
			};
		}

		const freq = 1 / Math.max(0.0001, cfg.noiseScale);
		const n = noiseValue(c / freq, r / freq, frameId * 0.01);
		return {
			s255: Math.round(160 + n * 95),
			v255: Math.round(160 + (1 - n) * 95),
		};
	};

	const noiseHueDelta = (c: number, r: number) => {
		const cfg = settingsRef.current;
		const freq = 1 / Math.max(0.0001, cfg.noiseScale);
		const n = fastNoise(
			Math.floor(c / freq),
			Math.floor(r / freq),
			Math.floor(frameId * 0.6),
		);
		return n * 90;
	};

	const drawStaticCell = (c: number, r: number, hue: number, vMul = 1) => {
		const cfg = settingsRef.current;
		const { s255, v255 } = svFor(c, r);
		staticSurface.context.fillStyle = colorFor(
			hue,
			s255,
			Math.max(0, Math.min(255, Math.round(v255 * vMul))),
		);
		staticSurface.context.fillRect(c * cfg.cell, r * cfg.cell, cfg.cell, cfg.cell);
	};

	const addParticle = (c: number, r: number, hue: number, vMul = 1) => {
		if (!inBounds(c, r)) return;
		const id = idx(c, r);
		if (grid[id] !== -1) return;

		const particle: Particle = {
			col: c,
			row: r,
			v: 1,
			hue,
			stuck: 0,
			vMul,
		};

		const particleId = particles.push(particle) - 1;
		grid[id] = particleId;
		active.push(particleId);
	};

	const drawShadowCell = (c: number, r: number, hue: number) => {
		const cfg = settingsRef.current;
		if (!cfg.shadow) return;

		const layers = Math.max(1, cfg.shadowLayers);
		for (let i = 1; i <= layers; i += 1) {
			const offset = i * Math.max(0, cfg.shadowDist);
			const shadowRow = r + offset;
			if (!inBounds(c, shadowRow)) continue;
			if (((c + shadowRow) & 1) !== 0) continue;

			const t = i / (layers + 1);
			const vMul = Math.max(0.18, 0.38 - 0.06 * (i - 1)) * (0.9 + 0.05 * t);
			const id = idx(c, shadowRow);
			if (grid[id] !== -1) continue;

			if (cfg.solid) {
				grid[id] = -2;
				drawStaticCell(c, shadowRow, hue, vMul);
			} else {
				addParticle(c, shadowRow, hue, vMul);
			}
		}
	};

	const hasSolidBelow = (particle: Particle) => {
		const nextRow = particle.row + 1;
		if (nextRow >= rows) return true;
		return grid[idx(particle.col, nextRow)] !== -1;
	};

	const tryMoveTo = (particleId: number, nextCol: number, nextRow: number) => {
		const particle = particles[particleId];
		if (!Number.isInteger(nextCol) || !Number.isInteger(nextRow)) return false;
		if (!inBounds(nextCol, nextRow)) return false;

		const nextId = idx(nextCol, nextRow);
		if (grid[nextId] !== -1) return false;

		grid[idx(particle.col, particle.row)] = -1;
		grid[nextId] = particleId;
		particle.col = nextCol;
		particle.row = nextRow;
		return true;
	};

	const compactParticles = () => {
		const map = new Int32Array(particles.length);
		map.fill(-1);

		let newCount = 0;
		for (let i = 0; i < grid.length; i += 1) {
			const old = grid[i];
			if (old >= 0 && map[old] === -1) {
				map[old] = newCount;
				newCount += 1;
			}
		}

		if (newCount === particles.length) return;

		const nextParticles = new Array<Particle>(newCount);
		for (let i = 0; i < grid.length; i += 1) {
			const old = grid[i];
			if (old >= 0) {
				grid[i] = map[old];
			}
		}

		for (let i = 0; i < particles.length; i += 1) {
			const mapped = map[i];
			if (mapped !== -1) nextParticles[mapped] = particles[i];
		}

		const nextActiveIds: number[] = [];
		for (let i = 0; i < active.length; i += 1) {
			const mapped = active[i] < map.length ? map[active[i]] : -1;
			if (mapped !== -1) nextActiveIds.push(mapped);
		}

		particles = nextParticles;
		active = nextActiveIds;
		nextActive.length = 0;
	};

	const eraseCell = (c: number, r: number) => {
		if (!inBounds(c, r)) return;
		const id = idx(c, r);
		if (grid[id] >= 0) particles[grid[id]].col = -1;
		grid[id] = -1;

		const { cell } = settingsRef.current;
		staticSurface.context.clearRect(c * cell, r * cell, cell, cell);
	};

	const pointerPosition = () => {
		if (!canvas) return null;
		const rect = canvas.getBoundingClientRect();
		if (rect.width <= 0 || rect.height <= 0) return null;

		const localX = (pointerClientX - rect.left) * (canvas.width / rect.width);
		const localY = (pointerClientY - rect.top) * (canvas.height / rect.height);

		if (localX < 0 || localX >= canvas.width || localY < 0 || localY >= canvas.height) {
			return null;
		}

		return { x: localX, y: localY };
	};

	const spawnAtPointer = () => {
		if (!pointerDown || !pointerInside) return;

		const pointer = pointerPosition();
		if (!pointer) return;

		const cfg = settingsRef.current;
		const midCol = Math.floor(pointer.x / cfg.cell);
		const midRow = Math.floor(pointer.y / cfg.cell);
		const brushExtent = Math.floor(cfg.brushDiam / 2);
		const r2 = brushExtent * brushExtent;

		const mask = (dx: number, dy: number) => {
			switch (cfg.cohesion) {
				case "checker":
					return ((dx & 1) ^ (dy & 1)) === 0;
				case "rings":
					return Math.floor(Math.hypot(dx, dy)) % 2 === 0;
				case "cross":
					return dx === 0 || dy === 0 || Math.abs(dx) === Math.abs(dy);
				default:
					return true;
			}
		};

		if (cfg.hueMode === "cycle") {
			hueValue = (hueValue + 0.9) % 360;
		} else if (cfg.hueMode === "randomLerp") {
			cfg.randT += 0.08;
			if (cfg.randT >= 1) {
				cfg.randCurrentHue = cfg.randTargetHue;
				cfg.randTargetHue = Math.random() * 360;
				cfg.randT = 0;
			}
		}

		const hueFor = (c: number, r: number) => {
			let baseHue: number;

			switch (cfg.hueMode) {
				case "single":
					baseHue = cfg.singleHue;
					break;
				case "random":
					baseHue = Math.random() * 360;
					break;
				case "randomLerp": {
					const t = cfg.randT < 0 ? 0 : cfg.randT > 1 ? 1 : cfg.randT;
					const lerped = lerpHue(cfg.randCurrentHue, cfg.randTargetHue, t);
					baseHue = wrap360(lerped + (Math.random() * 70 - 35));
					break;
				}
				case "cycle":
				default:
					baseHue = hueValue;
					break;
			}

			let nextHue = applyPalette(baseHue);
			if (cfg.noiseMode === "hue") {
				nextHue = wrap360(nextHue + noiseHueDelta(c, r));
			}
			return nextHue;
		};

		const applyBrushCell = (c: number, r: number) => {
			if (!inBounds(c, r)) return;
			if (!(Math.random() < BRUSH_DENSITY)) return;

			if (cfg.eraser) {
				eraseCell(c, r);
				return;
			}

			if (grid[idx(c, r)] !== -1) return;

			const hue = hueFor(c, r);
			drawShadowCell(c, r, hue);

			if (cfg.solid) {
				grid[idx(c, r)] = -2;
				drawStaticCell(c, r, hue, 1);
			} else {
				addParticle(c, r, hue, 1);
			}
		};

		if (cfg.brush === "spray") {
			for (let i = 0; i < 96; i += 1) {
				const dx = Math.floor(Math.random() * (brushExtent * 2 + 1)) - brushExtent;
				const dy = Math.floor(Math.random() * (brushExtent * 2 + 1)) - brushExtent;
				if (!mask(dx, dy)) continue;
				if (dx * dx + dy * dy > r2) continue;
				applyBrushCell(midCol + dx, midRow + dy);
			}
			return;
		}

		for (let dy = -brushExtent; dy <= brushExtent; dy += 1) {
			for (let dx = -brushExtent; dx <= brushExtent; dx += 1) {
				if (!mask(dx, dy)) continue;
				if (cfg.brush === "circle" && dx * dx + dy * dy > r2) continue;
				applyBrushCell(midCol + dx, midRow + dy);
			}
		}
	};

	const update = () => {
		const z1 = frameId * 3 + NOISE_Z2;
		const z2 = frameId * 2 + NOISE_Z2;
		const nm = settingsRef.current.noiseMode;
		const gravityMul = nm === "liquid" ? 0.7 : nm === "granular" ? 1.1 : 1;
		const sleepThresh =
			nm === "liquid"
				? Math.round(SLEEP_CHECK * 1.8)
				: nm === "granular"
					? Math.max(3, Math.round(SLEEP_CHECK * 0.75))
					: SLEEP_CHECK;

		nextActive.length = 0;
		const leftFirst = (frameId & 1) === 0;
		const len = active.length;
		if (len === 0) return;

		const start = (frameId * 9973) % len;
		for (let t = 0; t < len; t += 1) {
			const k = (start + t) % len;
			const particleId = active[k];
			const particle = particles[particleId];
			if (!particle) continue;

			const cellId = idx(particle.col, particle.row);
			if (cellId < 0 || cellId >= grid.length || grid[cellId] !== particleId) continue;

			particle.v = Math.min(VEL_MAX, particle.v + GRAVITY * gravityMul);
			let moved = false;

			const driftNoise =
				nm === "hue" || nm === "liquid" ? fastNoise(particle.col, particle.row, z1) : 0;
			const driftDir = Math.abs(driftNoise) > 0.02 ? (driftNoise >= 0 ? 1 : -1) : 0;
			const granularJitter =
				nm === "granular" && Math.random() < 0.25
					? Math.random() < 0.5
						? -1
						: 1
					: 0;

			const steps = Math.max(1, Math.floor(particle.v));
			for (let s = 0; s < steps; s += 1) {
				if (tryMoveTo(particleId, particle.col, particle.row + 1)) {
					moved = true;
					continue;
				}

				const tryDiag = (dc: number) =>
					tryMoveTo(particleId, particle.col + dc, particle.row + 1);

				if (leftFirst) {
					if (tryDiag(-1) || tryDiag(1)) {
						moved = true;
						continue;
					}
				} else if (tryDiag(1) || tryDiag(-1)) {
					moved = true;
					continue;
				}

				if (driftDir !== 0 && tryMoveTo(particleId, particle.col + driftDir, particle.row)) {
					moved = true;
					continue;
				}

				if (
					granularJitter !== 0 &&
					tryMoveTo(particleId, particle.col + granularJitter, particle.row)
				) {
					moved = true;
					continue;
				}

				break;
			}

			if (!moved && nm === "liquid") {
				const flow = fastNoise(particle.col, particle.row, z2);
				const dir = flow >= 0 ? 1 : -1;
				if (tryMoveTo(particleId, particle.col + dir, particle.row)) {
					moved = true;
				}
			}

			if (moved) {
				particle.stuck = 0;
				nextActive.push(particleId);
				continue;
			}

			if (hasSolidBelow(particle)) {
				particle.stuck += 1;
				if (particle.v > VEL_MAX * 0.9 && particle.stuck >= sleepThresh) {
					const staticId = idx(particle.col, particle.row);
					grid[staticId] = -2;
					drawStaticCell(particle.col, particle.row, particle.hue, particle.vMul);
					continue;
				}
			} else {
				particle.stuck = Math.max(0, particle.stuck - 1);
			}

			nextActive.push(particleId);
		}

		const current = active;
		active = nextActive;
		nextActive = current;
	};

	const drawActive = (context: CanvasRenderingContext2D) => {
		const { cell } = settingsRef.current;
		for (let i = 0; i < active.length; i += 1) {
			const particle = particles[active[i]];
			if (!particle) continue;

			const { s255, v255 } = svFor(particle.col, particle.row);
			context.fillStyle = colorFor(
				particle.hue,
				s255,
				Math.max(0, Math.min(255, Math.round(v255 * particle.vMul))),
			);
			context.fillRect(particle.col * cell, particle.row * cell, cell, cell);
		}
	};

	const drawFps = (context: CanvasRenderingContext2D) => {
		const now = performance.now();
		fpsAccMs += now - lastFpsAt;
		fpsAccFrames += 1;
		lastFpsAt = now;

		if (fpsAccMs >= 600) {
			fpsDisplay = (fpsAccFrames * 1000) / fpsAccMs;
			fpsAccMs = 0;
			fpsAccFrames = 0;
		}

		const label = `FPS: ${Math.round(fpsDisplay)}`;
		context.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
		const textWidth = context.measureText(label).width;
		const width = textWidth + 20;
		const height = 22;

		context.fillStyle = "rgba(58, 58, 60, 0.9)";
		fillRoundRect(context, 8, 8, width, height, 999);

		context.fillStyle = "rgb(245 245 245)";
		context.textAlign = "left";
		context.textBaseline = "middle";
		context.fillText(label, 18, 19.5);
	};

	const drawFrame = () => {
		if (!renderer || !canvas) return;

		frameId += 1;
		spawnAtPointer();
		update();
		if ((frameId & 511) === 0) compactParticles();

		const context = renderer.gameContext;
		context.setTransform(1, 0, 0, 1, 0, 0);
		context.imageSmoothingEnabled = false;
		context.globalCompositeOperation = "source-over";
		context.clearRect(0, 0, canvas.width, canvas.height);
		context.fillStyle = "rgb(0 0 0)";
		context.fillRect(0, 0, canvas.width, canvas.height);
		context.drawImage(staticSurface.canvas, 0, 0, canvas.width, canvas.height);
		drawActive(context);
		drawFps(context);
	};

	const handlePointerMove = (event: PointerEvent) => {
		pointerClientX = event.clientX;
		pointerClientY = event.clientY;
		pointerInside = true;
	};

	const handlePointerDown = (event: PointerEvent) => {
		pointerClientX = event.clientX;
		pointerClientY = event.clientY;
		pointerInside = true;
		pointerDown = true;
	};

	const handlePointerLeave = () => {
		pointerInside = false;
	};

	const handlePointerUp = () => {
		pointerDown = false;
	};

	class FallingSandScene extends PhaserLib.Scene {
		constructor() {
			super("falling-sand-phaser");
		}

		create() {
			renderer = this.sys.game.renderer as PhaserCanvasRenderer;
			canvas = this.game.canvas;
			canvas.style.display = "block";
			canvas.style.cursor = "crosshair";
			canvas.style.touchAction = "none";
			renderer.gameContext.imageSmoothingEnabled = false;
			lastFpsAt = performance.now();
			canvas.addEventListener("pointermove", handlePointerMove);
			canvas.addEventListener("pointerdown", handlePointerDown);
			canvas.addEventListener("pointerleave", handlePointerLeave);
			window.addEventListener("pointerup", handlePointerUp);
			this.game.events.on(PhaserLib.Core.Events.POST_RENDER, drawFrame);
			resetWorldRef.current = resetWorld;
			const size = resolveHostSize(host);
			resizeCanvas(size.width, size.height);
		}
	}

	host.innerHTML = "";
	const initialSize = resolveHostSize(host);

	game = new PhaserLib.Game({
		type: PhaserLib.CANVAS,
		parent: host,
		width: initialSize.width,
		height: initialSize.height,
		scene: new FallingSandScene() as PhaserScene,
		banner: false,
		disableContextMenu: true,
		audio: { noAudio: true },
		clearBeforeRender: false,
		transparent: false,
		antialias: false,
		pixelArt: true,
		backgroundColor: "#000000",
	});

	observer = new ResizeObserver(() => {
		if (!host) return;
		const nextSize = resolveHostSize(host);
		resizeCanvas(nextSize.width, nextSize.height);
	});
	observer.observe(host);

	return () => {
		observer?.disconnect();
		observer = null;
		resetWorldRef.current = undefined;

		if (canvas) {
			canvas.removeEventListener("pointermove", handlePointerMove);
			canvas.removeEventListener("pointerdown", handlePointerDown);
			canvas.removeEventListener("pointerleave", handlePointerLeave);
		}

		window.removeEventListener("pointerup", handlePointerUp);

		if (game) {
			game.events.off(PhaserLib.Core.Events.POST_RENDER, drawFrame);
			game.destroy(true);
			game = null;
		}

		renderer = null;
		canvas = null;
	};
}

export default function FallingSand() {
	const hostRef = useRef<HTMLDivElement | null>(null);
	const resetWorldRef = useRef<(() => void) | undefined>(undefined);

	const [cell, setCell] = useState<number>(DEFAULT_CELL);
	const [brushDiam, setBrushDiam] = useState<number>(DEFAULT_BRUSH_DIAM);
	const [eraser, setEraser] = useState<boolean>(false);
	const [brush, setBrush] = useState<Brush>("circle");
	const [hueMode, setHueMode] = useState<HueMode>("cycle");
	const [cohesion, setCohesion] = useState<Cohesion>("none");
	const [solid, setSolid] = useState(false);
	const [palette, setPalette] = useState<Palette>("off");
	const [noiseMode, setNoiseMode] = useState<NoiseMode>("off");
	const [noiseScale, setNoiseScale] = useState<number>(0.045);
	const [shadow, setShadow] = useState<boolean>(false);
	const [shadowLayers, setShadowLayers] = useState<number>(3);
	const [shadowDist, setShadowDist] = useState<number>(2);

	const [singleHex, setSingleHex] = useState<string>("#3B82F6");
	const singleHSV = hexToHsv(singleHex);
	const singleHue = singleHSV.h;

	const [colorName, setColorName] = useState<string>("—");
	const [contrastHex, setContrastHex] = useState<string>("#FFFFFF");

	const settingsRef = useRef<SettingsSnapshot>({
		brush: "circle",
		hueMode: "cycle",
		cohesion: "none",
		singleHue: 210,
		singleHex: "#3B82F6",
		singleS: 1,
		singleV: 1,
		randTargetHue: Math.random() * 360,
		randCurrentHue: Math.random() * 360,
		randT: 0,
		solid: false,
		cell: DEFAULT_CELL,
		brushDiam: DEFAULT_BRUSH_DIAM,
		eraser: false,
		palette: "off",
		noiseMode: "off",
		noiseScale: 0.045,
		shadow: false,
		shadowLayers: 3,
		shadowDist: 2,
	});

	useEffect(() => {
		settingsRef.current.brush = brush;
	}, [brush]);

	useEffect(() => {
		settingsRef.current.hueMode = hueMode;
	}, [hueMode]);

	useEffect(() => {
		settingsRef.current.cohesion = cohesion;
	}, [cohesion]);

	useEffect(() => {
		settingsRef.current.solid = solid;
	}, [solid]);

	useEffect(() => {
		settingsRef.current.cell = cell;
	}, [cell]);

	useEffect(() => {
		settingsRef.current.brushDiam = brushDiam;
	}, [brushDiam]);

	useEffect(() => {
		settingsRef.current.eraser = eraser;
	}, [eraser]);

	useEffect(() => {
		settingsRef.current.palette = palette;
	}, [palette]);

	useEffect(() => {
		settingsRef.current.noiseMode = noiseMode;
	}, [noiseMode]);

	useEffect(() => {
		settingsRef.current.noiseScale = noiseScale;
	}, [noiseScale]);

	useEffect(() => {
		settingsRef.current.shadow = shadow;
	}, [shadow]);

	useEffect(() => {
		settingsRef.current.shadowLayers = shadowLayers;
	}, [shadowLayers]);

	useEffect(() => {
		settingsRef.current.shadowDist = shadowDist;
	}, [shadowDist]);

	useEffect(() => {
		settingsRef.current.singleHue = singleHue;
		settingsRef.current.singleHex = singleHex;
		settingsRef.current.singleS = singleHSV.s;
		settingsRef.current.singleV = singleHSV.v;
	}, [singleHex, singleHue, singleHSV.s, singleHSV.v]);

	useEffect(() => {
		resetWorldRef.current?.();
	}, [cell]);

	useEffect(() => {
		const abortController = new AbortController();
		const hex = singleHex.replace("#", "");
		const timer = setTimeout(async () => {
			try {
				const response = await fetch(`https://www.thecolorapi.com/id?hex=${hex}`, {
					signal: abortController.signal,
				});
				const data = await response.json();
				setColorName(data?.name?.value ?? "Unnamed");
				setContrastHex(data?.contrast?.value ?? "#FFFFFF");
			} catch {
				// Ignore transient lookup failures.
			}
		}, 150);

		return () => {
			abortController.abort();
			clearTimeout(timer);
		};
	}, [singleHex]);

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

			cleanup = mountFallingSand(hostRef.current, PhaserLib, {
				settingsRef,
				resetWorldRef,
			});
		})();

		return () => {
			cancelled = true;
			cleanup?.();
		};
	}, []);

	return (
		<div className="flex h-full w-full flex-col gap-2">
			<div className="flex flex-wrap items-center gap-3">
				<div className="flex items-center gap-2">
					<span className="text-sm text-zinc-300">Brush</span>
					<div className="inline-flex overflow-hidden rounded-lg border border-zinc-700/60">
						{(["circle", "square", "spray"] as Brush[]).map((value) => (
							<button
								key={value}
								onClick={() => setBrush(value)}
								className={`px-2 py-1.5 text-sm ${brush === value ? "bg-zinc-200 text-zinc-900" : "bg-zinc-800/60 text-zinc-200 hover:bg-zinc-700/60"}`}
							>
								{value[0].toUpperCase() + value.slice(1)}
							</button>
						))}
					</div>
				</div>

				<div className="flex items-center gap-2">
					<span className="text-sm text-zinc-300">Color</span>
					<div className="inline-flex overflow-hidden rounded-lg border border-zinc-700/60">
						{(
							[
								["cycle", "Cycle"],
								["random", "Random"],
								["randomLerp", "Random Lerp"],
								["single", "Single"],
							] as [HueMode, string][]
						).map(([key, label]) => (
							<button
								key={key}
								onClick={() => setHueMode(key)}
								className={`px-2 py-1.5 text-sm ${hueMode === key ? "bg-zinc-200 text-zinc-900" : "bg-zinc-800/60 text-zinc-200 hover:bg-zinc-700/60"}`}
							>
								{label}
							</button>
						))}
					</div>
					{hueMode === "single" && (
						<div className="flex items-center gap-2">
							<input
								type="color"
								value={singleHex}
								onChange={(event) => setSingleHex(event.target.value)}
								className="h-8 w-10 rounded border border-zinc-700/60 bg-zinc-900"
								style={{ colorScheme: "dark" }}
								title="Pick color"
							/>
							<div
								className="rounded-xl border px-3 py-1.5 text-sm"
								style={{
									background: singleHex,
									color: contrastHex,
									borderColor: "rgba(255,255,255,0.15)",
									textAlign: "center",
								}}
							>
								{colorName}
							</div>
						</div>
					)}
				</div>

				<div className="flex items-center gap-2">
					<span className="text-sm text-zinc-300">Palette</span>
					<select
						value={palette}
						onChange={(event) => setPalette(event.target.value as Palette)}
						className="rounded-md border border-zinc-700 bg-zinc-800/70 py-1.5 text-center text-sm text-zinc-100"
					>
						<option value="off">Off</option>
						<option value="analogous">Analogous</option>
						<option value="complementary">Complementary</option>
						<option value="triad">Triad</option>
						<option value="mono">Monochrome</option>
					</select>
				</div>

				<div className="flex items-center gap-2">
					<span className="text-sm text-zinc-300">Cohesion</span>
					<select
						value={cohesion}
						onChange={(event) => setCohesion(event.target.value as Cohesion)}
						className="rounded-md border border-zinc-700 bg-zinc-800/70 py-1.5 text-center text-sm text-zinc-100"
					>
						<option value="none">None</option>
						<option value="checker">Checker</option>
						<option value="rings">Rings</option>
						<option value="cross">Cross</option>
					</select>
				</div>

				<div className="flex items-center gap-2">
					<span className="text-sm text-zinc-300">Noise</span>
					<select
						value={noiseMode}
						onChange={(event) => setNoiseMode(event.target.value as NoiseMode)}
						className="rounded-md border border-zinc-700 bg-zinc-800/70 py-1.5 text-center text-sm text-zinc-100"
					>
						<option value="off">Off</option>
						<option value="hue">Hue</option>
						<option value="liquid">Liquid</option>
						<option value="granular">Granular</option>
					</select>
					<span className="text-sm text-zinc-300">Scale</span>
					<input
						type="range"
						min={0.01}
						max={0.12}
						step={0.005}
						value={noiseScale}
						onChange={(event) => setNoiseScale(parseFloat(event.target.value))}
						className="w-24 accent-zinc-200"
					/>
				</div>

				<div className="flex items-center gap-2">
					<button
						onClick={() => setSolid((value) => !value)}
						className={`rounded-lg border px-3 py-1.5 text-sm ${solid ? "border-emerald-500 bg-emerald-400 text-emerald-900" : "border-zinc-700/60 bg-zinc-800/60 text-zinc-200 hover:bg-zinc-700/60"}`}
					>
						{solid ? "Solid: On" : "Solid: Off"}
					</button>

					<div className="flex items-center gap-2">
						<span className="text-sm text-zinc-300">Pixel</span>
						<select
							value={cell}
							onChange={(event) => setCell(parseInt(event.target.value, 10))}
							className="rounded-md border border-zinc-700 bg-zinc-800/70 py-1.5 text-center text-sm text-zinc-100"
						>
							<option value={3}>Small (3)</option>
							<option value={4}>Medium (4)</option>
							<option value={6}>Large (6)</option>
							<option value={8}>Huge (8)</option>
						</select>
					</div>

					<div className="flex items-center gap-2">
						<span className="text-sm text-zinc-300">Brush</span>
						<input
							type="range"
							min={3}
							max={25}
							step={2}
							value={brushDiam}
							onChange={(event) => setBrushDiam(parseInt(event.target.value, 10))}
							className="w-20 accent-zinc-200"
						/>
						<span className="w-fit text-right text-xs text-zinc-400">
							{brushDiam}
						</span>
					</div>

					<div className="flex items-center gap-2">
						<button
							onClick={() => setShadow((value) => !value)}
							className={`rounded-lg border px-3 py-1.5 text-sm ${shadow ? "border-sky-500 bg-sky-400 text-sky-900" : "border-zinc-700/60 bg-zinc-800/60 text-zinc-200 hover:bg-zinc-700/60"}`}
						>
							{shadow ? "Shadow: On" : "Shadow: Off"}
						</button>
						<span className="text-sm text-zinc-300">Layers</span>
						<input
							type="range"
							min={1}
							max={6}
							step={1}
							value={shadowLayers}
							onChange={(event) =>
								setShadowLayers(parseInt(event.target.value, 10))
							}
							className="w-16 accent-zinc-200"
						/>
						<span className="text-sm text-zinc-300">Offset</span>
						<input
							type="range"
							min={0}
							max={6}
							step={1}
							value={shadowDist}
							onChange={(event) =>
								setShadowDist(parseInt(event.target.value, 10))
							}
							className="w-16 accent-zinc-200"
						/>
					</div>

					<div className="flex items-center gap-2">
						<button
							onClick={() => setEraser((value) => !value)}
							className={`rounded-lg border px-3 py-1.5 text-sm ${eraser ? "border-rose-500 bg-rose-400 text-rose-950" : "border-zinc-700/60 bg-zinc-800/60 text-zinc-200 hover:bg-zinc-700/60"}`}
						>
							{eraser ? "Eraser: On" : "Eraser: Off"}
						</button>
					</div>

					<button
						onClick={() => resetWorldRef.current?.()}
						className="rounded-lg border border-red-400 bg-red-500 px-3 py-1.5 text-sm text-white hover:bg-red-400"
					>
						Reset
					</button>
				</div>
			</div>

			<div
				ref={hostRef}
				className="min-h-0 flex-1 overflow-hidden rounded-2xl bg-neutral-900 shadow-xl"
			/>
		</div>
	);
}
