"use client";

import { useEffect, useRef, useState } from "react";

type PhaserModule = typeof import("phaser");
type PhaserGame = import("phaser").Game;
type PhaserScene = import("phaser").Scene;
type PhaserGraphics = import("phaser").GameObjects.Graphics;
type PhaserCanvasTexture = import("phaser").Textures.CanvasTexture;
type PhaserImage = import("phaser").GameObjects.Image;

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

type Palette = {
	name: string;
	biome: string;
	sky: HslColor;
	ground: HslColor;
	facetStroke: HslColor;
	glow: HslColor;
	antPrimary: HslColor;
	antSecondary: HslColor;
	antCarrier: HslColor;
	spiderPrimary: HslColor;
	spiderEyes: HslColor;
	foodA: HslColor;
	foodB: HslColor;
	trail: HslColor;
	danger: HslColor;
	nest: HslColor;
	panel: HslColor;
};

type UiState = {
	phase: "loading" | "running" | "victory" | "collapse" | "error";
	round: number;
	roundsSurvived: number;
	bestRounds: number;
	points: number;
	spiderFood: number;
	target: number;
	ants: number;
	antCap: number;
	spiders: number;
	spiderCap: number;
	storedFood: number;
	foodSources: number;
	richestFood: number;
	biome: string;
	paletteName: string;
	eventLabel: string;
	eventDetails: string;
	progress: number;
	bloomIn: number;
	hatchQueue: number;
	accent: string;
	secondaryAccent: string;
	dangerAccent: string;
	panelTint: string;
};

type LoadStatus = "loading" | "ready" | "error";

type BoardSize = {
	width: number;
	height: number;
};

type RoundConfig = {
	round: number;
	targetScore: number;
	antCap: number;
	initialAnts: number;
	spiderCap: number;
	initialSpiders: number;
	spiderSpawnThreshold: number;
	sourceCount: number;
	sourceCapacity: number;
	sourceRegen: number;
	spawnThreshold: number;
	bloomInterval: number;
};

type FoodSource = {
	id: number;
	pos: Point;
	radius: number;
	maxAmount: number;
	amount: number;
	regenRate: number;
	pulse: number;
	wobble: number;
};

type AntRole = "scout" | "worker" | "carrier";

type Ant = {
	id: number;
	role: AntRole;
	pos: Point;
	vel: Point;
	angle: number;
	stridePhase: number;
	size: number;
	speed: number;
	vision: number;
	carryCapacity: number;
	trailStrength: number;
	carrying: number;
	state: "forage" | "return" | "panic";
	panicTimer: number;
	wander: number;
	webbedTimer: number;
	targetFoodId: number | null;
	targetPoint: Point | null;
	exploreTimer: number;
	alive: boolean;
};

type Spider = {
	id: number;
	pos: Point;
	vel: Point;
	angle: number;
	stridePhase: number;
	size: number;
	speed: number;
	vision: number;
	state: "patrol" | "hunt" | "return";
	carryingVictim: boolean;
	loot: number;
	cooldown: number;
	webCooldown: number;
	wander: number;
	targetAntId: number | null;
	targetPoint: Point | null;
	patrolTimer: number;
	huntTimer: number;
};

type WebShot = {
	pos: Point;
	vel: Point;
	life: number;
	age: number;
	spiderId: number;
};

type Cocoon = {
	timer: number;
	role: AntRole;
	spin: number;
	orbitRadius: number;
	orbitAngle: number;
};

type Particle = {
	pos: Point;
	vel: Point;
	life: number;
	maxLife: number;
	size: number;
	color: number;
	alpha: number;
};

type SignalField = {
	cols: number;
	rows: number;
	cellSize: number;
	forage: Float32Array;
	forageNext: Float32Array;
	danger: Float32Array;
	dangerNext: Float32Array;
};

type Surface = {
	canvas: HTMLCanvasElement;
	context: CanvasRenderingContext2D;
	textureKey: string;
	texture: PhaserCanvasTexture;
	image: PhaserImage;
};

type Bridge = {
	onUiState: (state: UiState) => void;
};

type Simulation = {
	width: number;
	height: number;
	palette: Palette;
	config: RoundConfig;
	phase: "running" | "victory" | "collapse";
	phaseTimer: number;
	time: number;
	dayPhase: number;
	antHome: Point;
	spiderHome: Point;
	corridor: Point;
	perpendicular: Point;
	homeDistance: number;
	contestedCenter: Point;
	antSafeRadius: number;
	spiderLeashRadius: number;
	foods: FoodSource[];
	ants: Ant[];
	spiders: Spider[];
	webs: WebShot[];
	cocoons: Cocoon[];
	particles: Particle[];
	field: SignalField;
	points: number;
	colonyReserve: number;
	spiderReserve: number;
	spiderPoints: number;
	roundsSurvived: number;
	bestRounds: number;
	lastHarvestAt: number;
	nextBloomAt: number;
	eventLabel: string;
	eventDetails: string;
	eventTimer: number;
	nextFoodId: number;
	nextAntId: number;
	nextSpiderId: number;
};

type BackdropSeed = {
	x: number;
	y: number;
	color: HslColor;
	alpha: number;
};

type BackdropCell = {
	polygon: Point[];
	color: HslColor;
	alpha: number;
};

let WORLD_WIDTH = 1600;
let WORLD_HEIGHT = 900;
const FIELD_CELL_SIZE = 32;
const SIM_STEP_MS = 1000 / 45;
const UI_PUSH_MS = 120;
const FONT_STACK =
	'"Azeret Mono", "JetBrains Mono", "SFMono-Regular", Consolas, monospace';

const EMPTY_UI_STATE: UiState = {
	phase: "loading",
	round: 1,
	roundsSurvived: 0,
	bestRounds: 0,
	points: 0,
	spiderFood: 0,
	target: 1,
	ants: 0,
	antCap: 0,
	spiders: 0,
	spiderCap: 0,
	storedFood: 0,
	foodSources: 0,
	richestFood: 0,
	biome: "Loading biome",
	paletteName: "Signal Bloom",
	eventLabel: "Spawning simulation",
	eventDetails: "Booting watch-only colony systems.",
	progress: 0,
	bloomIn: 0,
	hatchQueue: 0,
	accent: "rgb(99 232 197)",
	secondaryAccent: "rgb(250 219 92)",
	dangerAccent: "rgb(252 99 136)",
	panelTint: "rgba(11, 19, 30, 0.84)",
};

const BIOME_WORDS_A = [
	"Citrus",
	"Neon",
	"Amber",
	"Prism",
	"Lagoon",
	"Verdant",
	"Solar",
	"Coral",
	"Ember",
	"Velvet",
];

const BIOME_WORDS_B = [
	"Burrow",
	"Thicket",
	"Grove",
	"Bloom",
	"Drift",
	"Canopy",
	"Hollows",
	"Patch",
	"Meadow",
	"Sprawl",
];

function clamp(value: number, min: number, max: number) {
	return Math.max(min, Math.min(max, value));
}

function setWorldSize(width: number, height: number) {
	WORLD_WIDTH = Math.max(720, Math.floor(width));
	WORLD_HEIGHT = Math.max(420, Math.floor(height));
}

function lerp(a: number, b: number, t: number) {
	return a + (b - a) * t;
}

function angleDifference(a: number, b: number) {
	return Math.atan2(Math.sin(b - a), Math.cos(b - a));
}

function lerpAngle(a: number, b: number, t: number) {
	const delta = angleDifference(a, b);
	return a + delta * t;
}

function inverseLerp(min: number, max: number, value: number) {
	if (Math.abs(max - min) < 1e-6) return 0;
	return clamp((value - min) / (max - min), 0, 1);
}

function randomRange(min: number, max: number) {
	return min + Math.random() * (max - min);
}

function randomInt(min: number, max: number) {
	return Math.floor(randomRange(min, max + 1));
}

function pickOne<T>(values: readonly T[]) {
	return values[Math.floor(Math.random() * values.length)] ?? values[0];
}

function wrap01(value: number) {
	const wrapped = value % 1;
	return wrapped < 0 ? wrapped + 1 : wrapped;
}

function magnitude(vector: Point) {
	return Math.hypot(vector.x, vector.y);
}

function normalize(vector: Point, fallback: Point = { x: 1, y: 0 }) {
	const length = magnitude(vector);
	if (length < 1e-6) return { ...fallback };
	return { x: vector.x / length, y: vector.y / length };
}

function add(a: Point, b: Point) {
	return { x: a.x + b.x, y: a.y + b.y };
}

function subtract(a: Point, b: Point) {
	return { x: a.x - b.x, y: a.y - b.y };
}

function scale(vector: Point, value: number) {
	return { x: vector.x * value, y: vector.y * value };
}

function dot(a: Point, b: Point) {
	return a.x * b.x + a.y * b.y;
}

function distance(a: Point, b: Point) {
	return Math.hypot(a.x - b.x, a.y - b.y);
}

function rotate(vector: Point, angle: number) {
	const cosine = Math.cos(angle);
	const sine = Math.sin(angle);
	return {
		x: vector.x * cosine - vector.y * sine,
		y: vector.x * sine + vector.y * cosine,
	};
}

function pointFromAngle(angle: number) {
	return { x: Math.cos(angle), y: Math.sin(angle) };
}

function angleToPoint(from: Point, to: Point) {
	return Math.atan2(to.y - from.y, to.x - from.x);
}

function blendPoints(a: Point, b: Point, t: number) {
	return add(scale(a, 1 - t), scale(b, t));
}

function clampPoint(point: Point, insetX: number, insetY = insetX) {
	return {
		x: clamp(point.x, insetX, WORLD_WIDTH - insetX),
		y: clamp(point.y, insetY, WORLD_HEIGHT - insetY),
	};
}

function distanceToNearestWall(point: Point) {
	return Math.min(point.x, WORLD_WIDTH - point.x, point.y, WORLD_HEIGHT - point.y);
}

function isNearBounds(point: Point, padding: number) {
	return distanceToNearestWall(point) < padding;
}

function pickNestLaunchAngle(home: Point, spread: number) {
	const boardCenter = { x: WORLD_WIDTH * 0.5, y: WORLD_HEIGHT * 0.5 };
	const baseAngle = Math.atan2(boardCenter.y - home.y, boardCenter.x - home.x);
	return baseAngle + randomRange(-spread, spread);
}

function clampByte(value: number) {
	return clamp(Math.round(value), 0, 255);
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

function colorInt(color: HslColor) {
	const rgb = hslToRgb(color.h, color.s, color.l);
	return (rgb.r << 16) | (rgb.g << 8) | rgb.b;
}

function colorCss(color: HslColor) {
	const rgb = hslToRgb(color.h, color.s, color.l);
	return `rgb(${rgb.r} ${rgb.g} ${rgb.b})`;
}

function rgbaCss(color: HslColor, alpha: number) {
	const rgb = hslToRgb(color.h, color.s, color.l);
	return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${clamp(alpha, 0, 1)})`;
}

function mixHsl(a: HslColor, b: HslColor, t: number): HslColor {
	return {
		h: wrap01(lerp(a.h, b.h, t)),
		s: lerp(a.s, b.s, t),
		l: lerp(a.l, b.l, t),
	};
}

function createPalette(round: number): Palette {
	const baseHue = wrap01(Math.random() + round * 0.043);
	const secondaryHue = wrap01(baseHue + randomRange(0.18, 0.36));
	const accentHue = wrap01(baseHue + randomRange(0.42, 0.68));

	return {
		name: `${pickOne(BIOME_WORDS_A)} ${pickOne(BIOME_WORDS_B)}`,
		biome: `${pickOne(BIOME_WORDS_A)} ${pickOne(BIOME_WORDS_B)} biome`,
		sky: { h: wrap01(baseHue + 0.88), s: 0.45, l: 0.08 },
		ground: { h: wrap01(baseHue + 0.02), s: 0.38, l: 0.12 },
		facetStroke: { h: wrap01(baseHue + 0.1), s: 0.32, l: 0.3 },
		glow: { h: secondaryHue, s: 0.8, l: 0.62 },
		antPrimary: { h: wrap01(baseHue + 0.06), s: 0.72, l: 0.62 },
		antSecondary: { h: secondaryHue, s: 0.78, l: 0.68 },
		antCarrier: { h: accentHue, s: 0.92, l: 0.64 },
		spiderPrimary: { h: wrap01(baseHue + 0.58), s: 0.55, l: 0.26 },
		spiderEyes: { h: wrap01(accentHue + 0.06), s: 0.98, l: 0.72 },
		foodA: { h: secondaryHue, s: 0.88, l: 0.64 },
		foodB: { h: accentHue, s: 0.84, l: 0.58 },
		trail: { h: wrap01(baseHue + 0.24), s: 0.84, l: 0.6 },
		danger: { h: wrap01(accentHue + 0.12), s: 0.88, l: 0.62 },
		nest: { h: wrap01(baseHue + 0.17), s: 0.62, l: 0.52 },
		panel: { h: wrap01(baseHue + 0.95), s: 0.3, l: 0.12 },
	};
}

function createRoundConfig(round: number): RoundConfig {
	return {
		round,
		targetScore: Math.round(18 + round * 5 + round * round * 0.65),
		antCap: clamp(14 + round * 3, 14, 30),
		initialAnts: clamp(3 + Math.floor((round - 1) / 2), 3, 7),
		spiderCap: clamp(3 + Math.floor(round / 2), 3, 8),
		initialSpiders: 1,
		spiderSpawnThreshold: clamp(8.5 + round * 0.45, 8.5, 12.5),
		sourceCount: 1,
		sourceCapacity: 6,
		sourceRegen: 0,
		spawnThreshold: clamp(3.25 + round * 0.08, 3.25, 5.1),
		bloomInterval: clamp(13.5 - round * 0.28, 8.5, 13.5),
	};
}

function createSignalField(width: number, height: number): SignalField {
	const cols = Math.ceil(width / FIELD_CELL_SIZE);
	const rows = Math.ceil(height / FIELD_CELL_SIZE);
	const size = cols * rows;
	return {
		cols,
		rows,
		cellSize: FIELD_CELL_SIZE,
		forage: new Float32Array(size),
		forageNext: new Float32Array(size),
		danger: new Float32Array(size),
		dangerNext: new Float32Array(size),
	};
}

function fieldIndex(field: SignalField, x: number, y: number) {
	const cellX = clamp(Math.floor(x / field.cellSize), 0, field.cols - 1);
	const cellY = clamp(Math.floor(y / field.cellSize), 0, field.rows - 1);
	return cellY * field.cols + cellX;
}

function stampField(
	values: Float32Array,
	field: SignalField,
	center: Point,
	radius: number,
	strength: number,
) {
	const cellRadius = Math.max(1, Math.ceil(radius / field.cellSize));
	const originX = clamp(
		Math.floor(center.x / field.cellSize),
		0,
		field.cols - 1,
	);
	const originY = clamp(
		Math.floor(center.y / field.cellSize),
		0,
		field.rows - 1,
	);

	for (let offsetY = -cellRadius; offsetY <= cellRadius; offsetY += 1) {
		const cellY = originY + offsetY;
		if (cellY < 0 || cellY >= field.rows) continue;
		for (let offsetX = -cellRadius; offsetX <= cellRadius; offsetX += 1) {
			const cellX = originX + offsetX;
			if (cellX < 0 || cellX >= field.cols) continue;
			const dx = offsetX * field.cellSize;
			const dy = offsetY * field.cellSize;
			const falloff = 1 - Math.hypot(dx, dy) / Math.max(radius, 1);
			if (falloff <= 0) continue;
			const index = cellY * field.cols + cellX;
			values[index] = clamp(values[index] + falloff * strength, 0, 3.8);
		}
	}
}

function diffuseField(
	source: Float32Array,
	target: Float32Array,
	field: SignalField,
	retention: number,
	spread: number,
) {
	for (let cellY = 0; cellY < field.rows; cellY += 1) {
		for (let cellX = 0; cellX < field.cols; cellX += 1) {
			const index = cellY * field.cols + cellX;
			let total = source[index];
			let weight = 1;

			if (cellX > 0) {
				total += source[index - 1];
				weight += 1;
			}
			if (cellX < field.cols - 1) {
				total += source[index + 1];
				weight += 1;
			}
			if (cellY > 0) {
				total += source[index - field.cols];
				weight += 1;
			}
			if (cellY < field.rows - 1) {
				total += source[index + field.cols];
				weight += 1;
			}

			const average = total / weight;
			target[index] = clamp(source[index] * retention + average * spread, 0, 3.8);
		}
	}
}

function sampleField(values: Float32Array, field: SignalField, point: Point) {
	const sample = clampPoint(point, 0);
	return values[fieldIndex(field, sample.x, sample.y)] ?? 0;
}

function sampleGradient(values: Float32Array, field: SignalField, point: Point) {
	const offset = field.cellSize * 0.75;
	return {
		x:
			sampleField(values, field, { x: point.x + offset, y: point.y }) -
			sampleField(values, field, { x: point.x - offset, y: point.y }),
		y:
			sampleField(values, field, { x: point.x, y: point.y + offset }) -
			sampleField(values, field, { x: point.x, y: point.y - offset }),
	};
}

function chooseNestPair() {
	const antStartsLeft = Math.random() < 0.5;
	const leftHome = {
		x: randomRange(110, 160),
		y: randomRange(210, WORLD_HEIGHT - 210),
	};
	const rightHome = {
		x: randomRange(WORLD_WIDTH - 160, WORLD_WIDTH - 110),
		y: randomRange(210, WORLD_HEIGHT - 210),
	};

	return antStartsLeft
		? { antHome: leftHome, spiderHome: rightHome }
		: { antHome: rightHome, spiderHome: leftHome };
}

function createFoodSources(
	config: RoundConfig,
	antHome: Point,
	spiderHome: Point,
) {
	const foods: FoodSource[] = [];
	const corridor = normalize(subtract(spiderHome, antHome));
	const perpendicular = { x: -corridor.y, y: corridor.x };
	const homeDistance = distance(antHome, spiderHome);

	for (let index = 0; index < config.sourceCount; index += 1) {
		let attempts = 0;
		let pos = blendPoints(antHome, spiderHome, 0.66);
		do {
			const alongDistance = homeDistance * randomRange(0.58, 0.72);
			const lateralBand = homeDistance * 0.1;
			pos = clampPoint(
				add(
					add(
						antHome,
						scale(corridor, alongDistance),
					),
					add(
						scale(perpendicular, randomRange(-lateralBand, lateralBand)),
						rotate(
							{
								x: randomRange(20, 56),
								y: randomRange(-26, 26),
							},
							randomRange(0, Math.PI * 2),
						),
					),
				),
				60,
			);
			attempts += 1;
		} while (
			attempts < 20 &&
			(distance(pos, antHome) < homeDistance * 0.4 ||
				distance(pos, spiderHome) < homeDistance * 0.16 ||
				distance(pos, spiderHome) > homeDistance * 0.32 ||
				foods.some((food) => distance(food.pos, pos) < food.radius + 56))
		);

		const radius = randomRange(30, 40);
		const maxAmount = config.sourceCapacity;
		foods.push({
			id: index,
			pos,
			radius,
			maxAmount,
			amount: maxAmount,
			regenRate: 0,
			pulse: randomRange(0, Math.PI * 2),
			wobble: randomRange(0.2, 1),
		});
	}

	return foods;
}

function pickAntRole(): AntRole {
	const roll = Math.random();
	if (roll < 0.22) return "scout";
	if (roll > 0.76) return "carrier";
	return "worker";
}

function createAnt(id: number, home: Point, role: AntRole = pickAntRole()): Ant {
	const launchAngle =
		role === "scout"
			? pickNestLaunchAngle(home, 1.1)
			: role === "carrier"
				? pickNestLaunchAngle(home, 0.82)
				: pickNestLaunchAngle(home, 0.92);
	const launch = pointFromAngle(launchAngle);
	if (role === "scout") {
		return {
			id,
			role,
			pos: add(home, scale(launch, randomRange(10, 20))),
			vel: scale(launch, 58),
			angle: launchAngle,
			stridePhase: randomRange(0, Math.PI * 2),
			size: 5.5,
			speed: 84,
			vision: 230,
			carryCapacity: 0.95,
			trailStrength: 0.42,
			carrying: 0,
			state: "forage",
			panicTimer: 0,
			wander: randomRange(0, Math.PI * 2),
			webbedTimer: 0,
			targetFoodId: null,
			targetPoint: null,
			exploreTimer: 0,
			alive: true,
		};
	}
	if (role === "carrier") {
		return {
			id,
			role,
			pos: add(home, scale(launch, randomRange(8, 18))),
			vel: scale(launch, 46),
			angle: launchAngle,
			stridePhase: randomRange(0, Math.PI * 2),
			size: 6.8,
			speed: 66,
			vision: 180,
			carryCapacity: 1.8,
			trailStrength: 0.68,
			carrying: 0,
			state: "forage",
			panicTimer: 0,
			wander: randomRange(0, Math.PI * 2),
			webbedTimer: 0,
			targetFoodId: null,
			targetPoint: null,
			exploreTimer: 0,
			alive: true,
		};
	}
	return {
		id,
		role,
		pos: add(home, scale(launch, randomRange(8, 18))),
		vel: scale(launch, 50),
		angle: launchAngle,
		stridePhase: randomRange(0, Math.PI * 2),
		size: 6.1,
		speed: 74,
		vision: 205,
		carryCapacity: 1.25,
		trailStrength: 0.56,
		carrying: 0,
		state: "forage",
		panicTimer: 0,
		wander: randomRange(0, Math.PI * 2),
		webbedTimer: 0,
		targetFoodId: null,
		targetPoint: null,
		exploreTimer: 0,
		alive: true,
	};
}

function createSpider(id: number, home: Point): Spider {
	const angle = pickNestLaunchAngle(home, 0.72);
	const launch = pointFromAngle(angle);
	return {
		id,
		pos: add(home, scale(launch, randomRange(10, 22))),
		vel: scale(launch, 44),
		angle,
		stridePhase: randomRange(0, Math.PI * 2),
		size: randomRange(10, 14),
		speed: randomRange(56, 66),
		vision: randomRange(240, 320),
		state: "patrol",
		carryingVictim: false,
		loot: 0,
		cooldown: randomRange(0.2, 1.1),
		webCooldown: randomRange(0.4, 1.2),
		wander: randomRange(0, Math.PI * 2),
		targetAntId: null,
		targetPoint: null,
		patrolTimer: 0,
		huntTimer: 0,
	};
}

function createParticle(color: number, pos: Point, speed: number): Particle {
	const angle = randomRange(0, Math.PI * 2);
	return {
		pos: { ...pos },
		vel: scale(pointFromAngle(angle), speed * randomRange(0.5, 1)),
		life: randomRange(0.6, 1.3),
		maxLife: 1.3,
		size: randomRange(2, 5.5),
		color,
		alpha: randomRange(0.4, 1),
	};
}

function emitBurst(
	simulation: Simulation,
	center: Point,
	color: number,
	count: number,
	speed: number,
) {
	for (let index = 0; index < count; index += 1) {
		simulation.particles.push(createParticle(color, center, speed));
	}
}

function setEvent(
	simulation: Simulation,
	label: string,
	details: string,
	duration = 3.2,
) {
	simulation.eventLabel = label;
	simulation.eventDetails = details;
	simulation.eventTimer = duration;
}

function createWebShot(spider: Spider, target: Point): WebShot {
	const direction = normalize(subtract(target, spider.pos), pointFromAngle(spider.angle));
	return {
		pos: add(spider.pos, scale(direction, spider.size * 0.7)),
		vel: scale(direction, 190),
		life: 1.35,
		age: 0,
		spiderId: spider.id,
	};
}

function resetSignals(simulation: Simulation) {
	simulation.field.forage.fill(0);
	simulation.field.forageNext.fill(0);
	simulation.field.danger.fill(0);
	simulation.field.dangerNext.fill(0);
}

function createSimulation(round = 1, roundsSurvived = 0, bestRounds = 0): Simulation {
	const palette = createPalette(round);
	const config = createRoundConfig(round);
	const nests = chooseNestPair();
	const corridor = normalize(subtract(nests.spiderHome, nests.antHome));
	const perpendicular = { x: -corridor.y, y: corridor.x };
	const homeDistance = distance(nests.antHome, nests.spiderHome);
	const foods = createFoodSources(config, nests.antHome, nests.spiderHome);
	const simulation: Simulation = {
		width: WORLD_WIDTH,
		height: WORLD_HEIGHT,
		palette,
		config,
		phase: "running",
		phaseTimer: 0,
		time: 0,
		dayPhase: randomRange(0, Math.PI * 2),
		antHome: nests.antHome,
		spiderHome: nests.spiderHome,
		corridor,
		perpendicular,
		homeDistance,
		contestedCenter: blendPoints(nests.antHome, nests.spiderHome, 0.52),
		antSafeRadius: clamp(homeDistance * 0.19, 120, 170),
		spiderLeashRadius: clamp(homeDistance * 0.44, 250, 420),
		foods,
		ants: [],
		spiders: [],
		webs: [],
		cocoons: [],
		particles: [],
		field: createSignalField(WORLD_WIDTH, WORLD_HEIGHT),
		points: 0,
		colonyReserve: 0,
		spiderReserve: 0,
		spiderPoints: 0,
		roundsSurvived,
		bestRounds,
		lastHarvestAt: 0,
		nextBloomAt: config.bloomInterval,
		eventLabel: "Neutral bloom opened",
		eventDetails: "Ants rush the lane while spiders wait to intercept.",
		eventTimer: 5,
		nextFoodId: foods.length,
		nextAntId: 0,
		nextSpiderId: 0,
	};

	for (let index = 0; index < config.initialAnts; index += 1) {
		simulation.ants.push(
			createAnt(
				simulation.nextAntId++,
				simulation.antHome,
				index === 0 ? "scout" : undefined,
			),
		);
	}
	for (let index = 0; index < config.initialSpiders; index += 1) {
		simulation.spiders.push(createSpider(simulation.nextSpiderId++, simulation.spiderHome));
	}

	resetSignals(simulation);
	return simulation;
}

function maybeQueueAnt(simulation: Simulation) {
	while (
		simulation.colonyReserve >= simulation.config.spawnThreshold &&
		simulation.ants.length + simulation.cocoons.length < simulation.config.antCap
	) {
		simulation.colonyReserve -= simulation.config.spawnThreshold;
		simulation.cocoons.push({
			timer: randomRange(2.1, 5.4),
			role: pickAntRole(),
			spin: randomRange(0, Math.PI * 2),
			orbitRadius: randomRange(20, 38),
			orbitAngle: randomRange(0, Math.PI * 2),
		});
		setEvent(
			simulation,
			"Larva chamber active",
			"Fresh ants are hatching from the harvest reserve.",
			2.8,
		);
	}
}

function maybeQueueSpider(simulation: Simulation) {
	while (
		simulation.spiderReserve >= simulation.config.spiderSpawnThreshold &&
		simulation.spiders.length < simulation.config.spiderCap
	) {
		simulation.spiderReserve -= simulation.config.spiderSpawnThreshold;
		simulation.spiders.push(
			createSpider(simulation.nextSpiderId++, simulation.spiderHome),
		);
		emitBurst(
			simulation,
			simulation.spiderHome,
			colorInt(simulation.palette.danger),
			14,
			28,
		);
		setEvent(
			simulation,
			"Web brood expanded",
			"Predators converted stolen food into another hunter.",
			2.8,
		);
	}
}

function triggerBloom(simulation: Simulation, urgent = false) {
	const foods = [...simulation.foods].sort(
		(a, b) => a.amount / a.maxAmount - b.amount / b.maxAmount,
	);
	const boosted = foods.slice(0, Math.min(2, foods.length));
	for (const food of boosted) {
		const bonus = food.maxAmount * randomRange(urgent ? 0.18 : 0.12, urgent ? 0.3 : 0.22);
		food.amount = clamp(food.amount + bonus, 0, food.maxAmount);
		emitBurst(simulation, food.pos, colorInt(simulation.palette.foodA), 14, 34);
	}

	simulation.nextBloomAt = simulation.config.bloomInterval * randomRange(0.76, 1.22);
	setEvent(
		simulation,
		urgent ? "Emergency bloom" : "Bloom surge",
		urgent
			? "The field replenished to keep the colony from stalling."
			: "Nearby blooms have refreshed and brightened.",
		3.6,
	);
}

function updateSignals(simulation: Simulation) {
	diffuseField(
		simulation.field.forage,
		simulation.field.forageNext,
		simulation.field,
		0.79,
		0.12,
	);
	diffuseField(
		simulation.field.danger,
		simulation.field.dangerNext,
		simulation.field,
		0.83,
		0.14,
	);
	simulation.field.forage.set(simulation.field.forageNext);
	simulation.field.danger.set(simulation.field.dangerNext);

	stampField(
		simulation.field.danger,
		simulation.field,
		simulation.spiderHome,
		100,
		0.28,
	);
	for (const spider of simulation.spiders) {
		stampField(
			simulation.field.danger,
			simulation.field,
			spider.pos,
			spider.size * 5.5,
			spider.carryingVictim ? 0.95 : 0.64,
		);
	}
	for (const ant of simulation.ants) {
		if (ant.carrying <= 0) continue;
		const homeTrailDepth = inverseLerp(
			simulation.antSafeRadius * 0.72,
			simulation.homeDistance * 0.92,
			distance(ant.pos, simulation.antHome),
		);
		stampField(
			simulation.field.forage,
			simulation.field,
			ant.pos,
			lerp(24, 38, homeTrailDepth),
			ant.trailStrength * lerp(0.2, 1.42, homeTrailDepth),
		);
	}
}

function steerAwayFromBounds(point: Point, direction: Point = { x: 0, y: 0 }) {
	const inset = 176;
	const hardInset = 28;
	const steer = { x: 0, y: 0 };
	if (point.x < inset) {
		const pressure = inverseLerp(inset, hardInset, point.x);
		steer.x += 4.8 + pressure * 5.4;
		if (direction.x < -0.08) {
			steer.x += -direction.x * (2.8 + pressure * 4.2);
		}
	}
	if (point.x > WORLD_WIDTH - inset) {
		const pressure = inverseLerp(WORLD_WIDTH - inset, WORLD_WIDTH - hardInset, point.x);
		steer.x -= 4.8 + pressure * 5.4;
		if (direction.x > 0.08) {
			steer.x -= direction.x * (2.8 + pressure * 4.2);
		}
	}
	if (point.y < inset) {
		const pressure = inverseLerp(inset, hardInset, point.y);
		steer.y += 4.8 + pressure * 5.4;
		if (direction.y < -0.08) {
			steer.y += -direction.y * (2.8 + pressure * 4.2);
		}
	}
	if (point.y > WORLD_HEIGHT - inset) {
		const pressure = inverseLerp(WORLD_HEIGHT - inset, WORLD_HEIGHT - hardInset, point.y);
		steer.y -= 4.8 + pressure * 5.4;
		if (direction.y > 0.08) {
			steer.y -= direction.y * (2.8 + pressure * 4.2);
		}
	}
	return steer;
}

function steerOffWalls(point: Point, direction: Point) {
	const warning = 132;
	const hard = 36;
	const steer = { x: 0, y: 0 };
	const verticalSign = point.y < WORLD_HEIGHT * 0.5 ? 1 : -1;
	const horizontalSign = point.x < WORLD_WIDTH * 0.5 ? 1 : -1;

	if (point.x < warning && direction.x < -0.02) {
		const pressure = inverseLerp(warning, hard, point.x);
		steer.x += 9.5 + pressure * 12;
		steer.y += verticalSign * (1.8 + pressure * 3.4);
	}
	if (point.x > WORLD_WIDTH - warning && direction.x > 0.02) {
		const pressure = inverseLerp(WORLD_WIDTH - warning, WORLD_WIDTH - hard, point.x);
		steer.x -= 9.5 + pressure * 12;
		steer.y += verticalSign * (1.8 + pressure * 3.4);
	}
	if (point.y < warning && direction.y < -0.02) {
		const pressure = inverseLerp(warning, hard, point.y);
		steer.y += 9.5 + pressure * 12;
		steer.x += horizontalSign * (1.8 + pressure * 3.4);
	}
	if (point.y > WORLD_HEIGHT - warning && direction.y > 0.02) {
		const pressure = inverseLerp(WORLD_HEIGHT - warning, WORLD_HEIGHT - hard, point.y);
		steer.y -= 9.5 + pressure * 12;
		steer.x += horizontalSign * (1.8 + pressure * 3.4);
	}

	return steer;
}

function moveAgent(
	position: Point,
	velocity: Point,
	angle: number,
	steer: Point,
	speed: number,
	smoothing: number,
	deltaSeconds: number,
) {
	const currentDirection = normalize(velocity, pointFromAngle(angle));
	const rawDesired = normalize(steer, currentDirection);
	const steerMagnitude = magnitude(steer);
	const steerInfluence = clamp(steerMagnitude / Math.max(speed * 0.78, 18), 0, 1);
	const desired = normalize(
		blendPoints(currentDirection, rawDesired, lerp(0.1, 1, steerInfluence)),
		currentDirection,
	);
	const desiredAngle = Math.atan2(desired.y, desired.x);
	const currentAngle = Math.atan2(currentDirection.y, currentDirection.x);
	const angleDelta = angleDifference(currentAngle, desiredAngle);
	const turnSeverity = inverseLerp(0, Math.PI * 0.9, Math.abs(angleDelta));
	const turnAuthority = lerp(0.38, 1, Math.max(steerInfluence, turnSeverity * 0.72));
	const maxTurnStep =
		(0.11 + smoothing * 0.008 + turnSeverity * 0.16) *
		turnAuthority *
		deltaSeconds *
		60;
	const nextAngle = currentAngle + clamp(angleDelta, -maxTurnStep, maxTurnStep);
	const steeringDirection = pointFromAngle(nextAngle);
	const alignment = dot(currentDirection, steeringDirection);
	const braking = lerp(1, 0.52, turnSeverity);
	const dampedVelocity = scale(velocity, braking);
	const targetVelocity = scale(
		steeringDirection,
		speed *
			lerp(0.56, 1, Math.max(alignment, 0)) *
			lerp(0.74, 1, steerInfluence),
	);
	const blend = clamp(
		(smoothing * 0.66 + turnSeverity * 3.6) * turnAuthority * deltaSeconds,
		0,
		1,
	);
	const nextVelocity = {
		x: lerp(dampedVelocity.x, targetVelocity.x, blend),
		y: lerp(dampedVelocity.y, targetVelocity.y, blend),
	};
	const unclampedPos = add(position, scale(nextVelocity, deltaSeconds));
	const clampedPos = clampPoint(unclampedPos, 12);
	const hitVerticalWall = Math.abs(clampedPos.x - unclampedPos.x) > 1e-3;
	const hitHorizontalWall = Math.abs(clampedPos.y - unclampedPos.y) > 1e-3;
	const resolvedVelocity = {
		x: hitVerticalWall ? nextVelocity.x * 0.16 : nextVelocity.x,
		y: hitHorizontalWall ? nextVelocity.y * 0.16 : nextVelocity.y,
	};
	const resolvedAngle =
		magnitude(resolvedVelocity) < 1e-3
			? nextAngle
			: lerpAngle(nextAngle, Math.atan2(resolvedVelocity.y, resolvedVelocity.x), 0.32);

	return {
		vel: resolvedVelocity,
		pos: clampedPos,
		angle: resolvedAngle,
	};
}

function getFoodById(simulation: Simulation, id: number | null) {
	if (id === null) return null;
	return simulation.foods.find((food) => food.id === id) ?? null;
}

function getAntById(simulation: Simulation, id: number | null) {
	if (id === null) return null;
	return simulation.ants.find((ant) => ant.id === id && ant.alive) ?? null;
}

function isWithinVisionCone(
	origin: Point,
	facingAngle: number,
	target: Point,
	radius: number,
	halfAngle: number,
) {
	const range = distance(origin, target);
	if (range > radius) return false;
	if (range < 18) return true;
	return Math.abs(angleDifference(facingAngle, angleToPoint(origin, target))) <= halfAngle;
}

function antVisionHalfAngle(role: AntRole) {
	if (role === "scout") return 1.15;
	if (role === "carrier") return 0.78;
	return 0.92;
}

function chooseVisibleSpiderForAnt(simulation: Simulation, ant: Ant) {
	let selected: Spider | null = null;
	let bestScore = -Infinity;
	const facingAngle = ant.angle;
	for (const spider of simulation.spiders) {
		const range = distance(ant.pos, spider.pos);
		const visible =
			range < 30 ||
			isWithinVisionCone(
				ant.pos,
				facingAngle,
				spider.pos,
				ant.vision * 0.84,
				antVisionHalfAngle(ant.role),
			);
		if (!visible) continue;
		const score = inverseLerp(ant.vision, 0, range) + (spider.carryingVictim ? 0.2 : 0);
		if (score > bestScore) {
			bestScore = score;
			selected = spider;
		}
	}
	return selected;
}

function chooseVisibleFood(simulation: Simulation, ant: Ant) {
	let selected: FoodSource | null = null;
	let bestScore = -Infinity;
	const facingAngle = ant.angle;
	for (const food of simulation.foods) {
		if (food.amount <= 0.1) continue;
		const range = distance(ant.pos, food.pos);
		if (
			!isWithinVisionCone(
				ant.pos,
				facingAngle,
				food.pos,
				ant.vision,
				antVisionHalfAngle(ant.role),
			)
		) {
			continue;
		}
		const foodFullness = inverseLerp(0, food.maxAmount, food.amount);
		const score =
			inverseLerp(ant.vision, 0, range) * 1.15 +
			foodFullness * 0.8;
		if (score > bestScore) {
			bestScore = score;
			selected = food;
		}
	}
	return selected;
}

function isInsideAntSafeZone(simulation: Simulation, point: Point, padding = 0) {
	return distance(simulation.antHome, point) <= simulation.antSafeRadius + padding;
}

function projectOnCorridor(simulation: Simulation, point: Point) {
	return dot(subtract(point, simulation.antHome), simulation.corridor);
}

function pickAntExploreTarget(
	simulation: Simulation,
	ant: Ant,
	preferSafe = false,
) {
	const roleRanges: Record<AntRole, { min: number; max: number; lateral: number }> = {
		scout: { min: 0.38, max: 0.76, lateral: 0.2 },
		worker: { min: 0.34, max: 0.66, lateral: 0.17 },
		carrier: { min: 0.3, max: 0.56, lateral: 0.13 },
	};
	const profile = roleRanges[ant.role];
	const minT = preferSafe ? 0.24 : profile.min;
	const maxT = preferSafe ? Math.min(0.46, profile.max) : profile.max;

	for (let attempt = 0; attempt < 16; attempt += 1) {
		const along = simulation.homeDistance * randomRange(minT, maxT);
		const lateral = simulation.homeDistance * profile.lateral * randomRange(-1, 1);
		const point = clampPoint(
			add(
				add(simulation.antHome, scale(simulation.corridor, along)),
				scale(simulation.perpendicular, lateral),
			),
			40,
		);
		if (distance(point, simulation.antHome) < 220) continue;
		if (distance(point, simulation.spiderHome) < simulation.antSafeRadius + 120) continue;
		if (distance(point, ant.pos) < 96) continue;
		if (ant.targetPoint && distance(point, ant.targetPoint) < simulation.homeDistance * 0.14) {
			continue;
		}
		if (projectOnCorridor(simulation, point) > simulation.homeDistance * 0.72) continue;
		if (isNearBounds(point, 58)) continue;
		return point;
	}

	return blendPoints(simulation.antHome, simulation.contestedCenter, preferSafe ? 0.42 : 0.64);
}

function pickAntExitTarget(simulation: Simulation, ant: Ant) {
	const laneOffset = ((ant.id % 5) - 2) * 16;
	return clampPoint(
		add(
			add(simulation.antHome, scale(simulation.corridor, 76)),
			scale(simulation.perpendicular, laneOffset),
		),
		40,
	);
}

function chooseSpiderPressurePoint(simulation: Simulation, spider: Spider | null = null) {
	let selected: Ant | null = null;
	let bestScore = -Infinity;
	for (const ant of simulation.ants) {
		if (!ant.alive) continue;
		if (isInsideAntSafeZone(simulation, ant.pos, 18)) continue;
		const homeRange = distance(simulation.spiderHome, ant.pos);
		if (homeRange > simulation.spiderLeashRadius * 0.98) continue;
		const spiderRange = spider ? distance(spider.pos, ant.pos) : homeRange;
		const laneDepth = projectOnCorridor(simulation, ant.pos);
		const score =
			(ant.carrying > 0 ? 2.1 : 0) +
			(ant.role === "carrier" ? 0.55 : 0) +
			inverseLerp(simulation.homeDistance * 0.18, simulation.homeDistance * 0.78, laneDepth) *
				0.85 +
			inverseLerp(simulation.spiderLeashRadius * 1.05, 32, homeRange) * 0.64 +
			inverseLerp((spider?.vision ?? simulation.spiderLeashRadius) * 1.2, 0, spiderRange) *
				0.5;
		if (score > bestScore) {
			bestScore = score;
			selected = ant;
		}
	}

	if (selected) {
		return add(
			selected.pos,
			scale(
				normalize(selected.vel, simulation.corridor),
				clamp(magnitude(selected.vel) * 0.24, 12, 34),
			),
		);
	}

	const food = simulation.foods[0] ?? null;
	return food
		? blendPoints(simulation.spiderHome, food.pos, 0.72)
		: blendPoints(simulation.spiderHome, simulation.contestedCenter, 0.52);
}

function pickSpiderPatrolTarget(simulation: Simulation, spider: Spider | null = null) {
	const anchor = chooseSpiderPressurePoint(simulation, spider);
	const travelDirection = spider
		? normalize(spider.vel, normalize(subtract(anchor, spider.pos), simulation.corridor))
		: simulation.corridor;
	for (let attempt = 0; attempt < 18; attempt += 1) {
		const lateral = simulation.homeDistance * 0.18 * randomRange(-1, 1);
		const along = simulation.homeDistance * 0.06 * randomRange(-1, 1);
		const point = clampPoint(
			add(
				add(anchor, scale(travelDirection, randomRange(12, 42))),
				scale(simulation.perpendicular, lateral),
			),
			58,
		);
		const shifted = clampPoint(add(point, scale(simulation.corridor, along)), 58);
		if (isInsideAntSafeZone(simulation, shifted, 40)) continue;
		if (distance(shifted, simulation.spiderHome) > simulation.spiderLeashRadius * 0.94) {
			continue;
		}
		if (isNearBounds(shifted, 62)) continue;
		if (spider?.targetPoint && distance(shifted, spider.targetPoint) < 72) continue;
		return shifted;
	}

	const fallback = clampPoint(anchor, 58);
	if (!isInsideAntSafeZone(simulation, fallback, 32)) {
		return fallback;
	}

	return clampPoint(
		blendPoints(simulation.spiderHome, simulation.contestedCenter, 0.32),
		58,
	);
}

function updateAnt(simulation: Simulation, ant: Ant, deltaSeconds: number) {
	if (!ant.alive) return;

	ant.webbedTimer = Math.max(0, ant.webbedTimer - deltaSeconds);
	ant.wander += deltaSeconds * (0.72 + (ant.id % 5) * 0.11);
	ant.panicTimer = Math.max(0, ant.panicTimer - deltaSeconds);
	ant.exploreTimer = Math.max(0, ant.exploreTimer - deltaSeconds);

	const homeDistance = distance(ant.pos, simulation.antHome);
	const homeApproachWallBlend =
		ant.carrying > 0 ? inverseLerp(18, 120, homeDistance) : 1;
	const travelDirection = normalize(ant.vel, pointFromAngle(ant.angle));
	const lookAhead = add(ant.pos, scale(travelDirection, 48));
	let steer = add(
		scale(steerAwayFromBounds(ant.pos, travelDirection), 1.05 * homeApproachWallBlend),
		scale(steerAwayFromBounds(lookAhead, travelDirection), 1.2 * homeApproachWallBlend),
	);
	steer = add(
		steer,
		scale(steerOffWalls(ant.pos, travelDirection), 1.35 * homeApproachWallBlend),
	);
	steer = add(
		steer,
		scale(steerOffWalls(lookAhead, travelDirection), 1.45 * homeApproachWallBlend),
	);
	const inSafeZone = isInsideAntSafeZone(simulation, ant.pos);
	const pheromoneGradient = sampleGradient(
		simulation.field.forage,
		simulation.field,
		ant.pos,
	);
	const pheromoneStrength = magnitude(pheromoneGradient);
	const nearestSpider = chooseVisibleSpiderForAnt(simulation, ant);
	const nearestSpiderDistance = nearestSpider
		? distance(ant.pos, nearestSpider.pos)
		: Infinity;
	const activeThreatRadius = ant.carrying > 0 ? 176 : 124;
	const underThreat =
		nearestSpider !== null && nearestSpiderDistance < Math.min(ant.vision * 0.7, activeThreatRadius);

	if (nearestSpider && underThreat) {
		const away = normalize(subtract(ant.pos, nearestSpider.pos));
		steer = add(
			steer,
			scale(away, inverseLerp(activeThreatRadius, 24, nearestSpiderDistance) * 2.9),
		);
		ant.panicTimer = Math.max(ant.panicTimer, randomRange(0.35, 0.9));
		if (nearestSpiderDistance < 96) {
			ant.targetPoint = pickAntExploreTarget(simulation, ant, true);
			ant.exploreTimer = randomRange(1, 1.8);
		}
	}

	for (const other of simulation.ants) {
		if (other.id === ant.id || !other.alive) continue;
		const gap = distance(ant.pos, other.pos);
		if (gap <= 0 || gap > 26) continue;
		if (homeDistance < 72 && distance(other.pos, simulation.antHome) < 72) continue;
		if (ant.carrying > 0 && distance(ant.pos, simulation.antHome) < 90) continue;
		steer = add(
			steer,
			scale(normalize(subtract(ant.pos, other.pos)), inverseLerp(26, 0, gap) * 0.34),
		);
	}

	if (ant.carrying > 0) {
		if (homeDistance <= 26) {
			simulation.points += ant.carrying;
			simulation.colonyReserve += ant.carrying;
			simulation.lastHarvestAt = simulation.time;
			emitBurst(
				simulation,
				ant.pos,
				colorInt(simulation.palette.antCarrier),
				8,
				26,
			);
			ant.carrying = 0;
			ant.state = "forage";
			ant.targetFoodId = null;
			ant.targetPoint = pickAntExploreTarget(simulation, ant);
			ant.exploreTimer = randomRange(2.6, 4.8);
			const relaunch = normalize(
				subtract(ant.targetPoint ?? simulation.contestedCenter, ant.pos),
				simulation.corridor,
			);
			ant.vel = scale(relaunch, ant.speed * 0.52);
			ant.angle = Math.atan2(relaunch.y, relaunch.x);
			maybeQueueAnt(simulation);
			if (simulation.points < simulation.config.targetScore) {
				setEvent(
					simulation,
					"Food delivered",
					"Harvest converted into score and new colony growth.",
					1.6,
				);
			}
			return;
		}

		ant.state = ant.panicTimer > 0.1 ? "panic" : "return";
		ant.targetPoint = simulation.antHome;
		steer = add(
			steer,
			scale(normalize(subtract(simulation.antHome, ant.pos)), homeDistance < 96 ? 8.8 : 7.2),
		);
		steer = add(
			steer,
			scale(normalize(subtract(simulation.antHome, ant.pos)), homeDistance < 72 ? 3.1 : 2.2),
		);
		if (nearestSpider && nearestSpiderDistance < 140) {
			steer = add(
				steer,
				scale(
					normalize(subtract(ant.pos, nearestSpider.pos)),
					inverseLerp(140, 30, nearestSpiderDistance) * 0.7,
				),
			);
		}
	} else {
		ant.state = ant.panicTimer > 0.1 ? "panic" : "forage";
		if (homeDistance < 56 && ant.exploreTimer > 1.2 && ant.targetFoodId === null) {
			const exitTarget = pickAntExitTarget(simulation, ant);
			ant.targetPoint = exitTarget;
			steer = add(
				steer,
				scale(normalize(subtract(exitTarget, ant.pos)), 3.6),
			);
		}
		const rememberedFood = getFoodById(simulation, ant.targetFoodId);
		const visibleFood = chooseVisibleFood(simulation, ant);
		const targetFood =
			visibleFood ??
			(rememberedFood &&
			rememberedFood.amount > 0.2 &&
			distance(ant.pos, rememberedFood.pos) < ant.vision * 1.2
				? rememberedFood
				: null);

		if (targetFood) {
			ant.targetFoodId = targetFood.id;
			ant.targetPoint = targetFood.pos;
			ant.exploreTimer = randomRange(1.4, 2.8);
			steer = add(
				steer,
				scale(normalize(subtract(targetFood.pos, ant.pos)), visibleFood ? 2.15 : 1.45),
			);
			steer = add(
				steer,
				scale(pointFromAngle(ant.wander + ant.id * 0.7), 0.12),
			);
			if (distance(ant.pos, targetFood.pos) <= targetFood.radius + ant.size + 5) {
				const amount = clamp(
					Math.min(
						ant.carryCapacity,
						targetFood.amount,
						randomRange(0.95, 1.35) * ant.carryCapacity,
					),
					0,
					ant.carryCapacity,
				);
				if (amount > 0.01) {
					targetFood.amount -= amount;
					ant.carrying = amount;
					ant.state = "return";
					ant.targetPoint = simulation.antHome;
					emitBurst(
						simulation,
						targetFood.pos,
						colorInt(simulation.palette.foodB),
						7,
						20,
					);
				}
			}
		} else {
			const needsNewTarget =
				!ant.targetPoint ||
				ant.exploreTimer <= 0 ||
				distance(ant.pos, ant.targetPoint) < 38 ||
				projectOnCorridor(simulation, ant.targetPoint) > simulation.homeDistance * 0.76 ||
				isNearBounds(ant.targetPoint, 48);
			const followingPheromone = pheromoneStrength > 0.016 && !inSafeZone;

			if (needsNewTarget) {
				ant.targetPoint = pickAntExploreTarget(simulation, ant, ant.panicTimer > 0.1);
				ant.exploreTimer = randomRange(1.9, ant.role === "scout" ? 4.8 : 3.8);
			}

			if (followingPheromone) {
				steer = add(
					steer,
					scale(
						normalize(pheromoneGradient, simulation.corridor),
						ant.role === "scout" ? 1.45 : 3.35,
					),
				);
			}
			if (ant.targetPoint) {
				steer = add(
					steer,
					scale(
						normalize(subtract(ant.targetPoint, ant.pos)),
						followingPheromone ? 0.42 : ant.role === "scout" ? 1.95 : 1.75,
					),
				);
			}
			if (inSafeZone) {
				steer = add(steer, scale(normalize(simulation.corridor), 1.95));
				steer = add(
					steer,
					scale(normalize(subtract(simulation.contestedCenter, ant.pos)), 0.82),
				);
			}
			if (homeDistance < simulation.homeDistance * 0.18) {
				steer = add(
					steer,
					scale(normalize(subtract(simulation.contestedCenter, ant.pos)), 0.9),
				);
			}
		}
	}

	if (!ant.carrying && ant.targetPoint) {
		steer = add(
			steer,
			scale(normalize(subtract(ant.targetPoint, ant.pos)), 0.44),
		);
	}
	if (!ant.carrying) {
		steer = add(
			steer,
			scale(
				pointFromAngle(ant.wander + Math.sin(simulation.time * 0.6 + ant.id)),
				pheromoneStrength > 0.016 && !inSafeZone ? 0.05 : 0.18,
			),
		);
	}
	if (ant.webbedTimer > 0) {
		steer = add(
			steer,
			scale(pointFromAngle(ant.wander + ant.id * 0.3), 0.12),
		);
	}
	steer = add(
		steer,
		scale(
			steerAwayFromBounds(ant.pos, normalize(steer, travelDirection)),
			1.15 * homeApproachWallBlend,
		),
	);
	steer = add(
		steer,
		scale(
			steerOffWalls(ant.pos, normalize(steer, travelDirection)),
			1.6 * homeApproachWallBlend,
		),
	);

	const speedMultiplier =
		ant.webbedTimer > 0
			? 0.36
			: ant.state === "panic"
			? 1.28
			: ant.carrying > 0
				? ant.role === "carrier"
					? lerp(0.34, 1.02, inverseLerp(14, 140, homeDistance))
					: lerp(0.38, 1.08, inverseLerp(14, 140, homeDistance))
				: 1;
	const moved = moveAgent(
		ant.pos,
		ant.vel,
		ant.angle,
		steer,
		ant.speed * speedMultiplier,
		7.2,
		deltaSeconds,
	);
	ant.pos = moved.pos;
	ant.vel = moved.vel;
	ant.angle = moved.angle;
	ant.stridePhase +=
		deltaSeconds *
		(ant.carrying > 0 ? 10.5 : 13.2) *
		inverseLerp(3, ant.speed * 0.98, magnitude(moved.vel));
}

function updateSpider(simulation: Simulation, spider: Spider, deltaSeconds: number) {
	spider.cooldown = Math.max(0, spider.cooldown - deltaSeconds);
	spider.webCooldown = Math.max(0, spider.webCooldown - deltaSeconds);
	spider.wander += deltaSeconds * (0.38 + (spider.id % 4) * 0.08);
	spider.patrolTimer = Math.max(0, spider.patrolTimer - deltaSeconds);
	spider.huntTimer = Math.max(0, spider.huntTimer - deltaSeconds);
	const homeDistance = distance(spider.pos, simulation.spiderHome);
	const homeApproachWallBlend =
		spider.carryingVictim ? inverseLerp(20, 132, homeDistance) : 1;

	let target: Ant | null = null;
	let targetVisible = false;
	let bestScore = -Infinity;
	const rememberedTarget = getAntById(simulation, spider.targetAntId);
	for (const ant of simulation.ants) {
		if (!ant.alive) continue;
		const safePadding =
			ant.webbedTimer > 0.1 || ant.id === spider.targetAntId ? 6 : 24;
		if (isInsideAntSafeZone(simulation, ant.pos, safePadding)) continue;
		const range = distance(spider.pos, ant.pos);
		const homeRange = distance(simulation.spiderHome, ant.pos);
		if (homeRange > simulation.spiderLeashRadius * 1.02) continue;
		const canSee = range <= spider.vision * (ant.id === spider.targetAntId ? 1.18 : 1.05);
		const canPursueMemory =
			rememberedTarget?.id === ant.id &&
			spider.huntTimer > 0 &&
			range <= spider.vision * 1.55;
		if (!canSee && !canPursueMemory) continue;
		const laneDepth = projectOnCorridor(simulation, ant.pos);
		const score =
			inverseLerp(spider.vision * 1.35, 0, range) * 0.95 +
			(canSee ? 0.55 : 0.12) +
			(ant.id === spider.targetAntId ? 0.78 : 0) +
			(ant.webbedTimer > 0.1 ? 0.95 : 0) +
			(ant.carrying > 0 ? 1.25 : 0) +
			(ant.role === "carrier" ? 0.38 : 0) +
			inverseLerp(simulation.homeDistance * 0.18, simulation.homeDistance * 0.8, laneDepth) *
				0.42;
		if (score > bestScore) {
			bestScore = score;
			target = ant;
			targetVisible = canSee;
		}
	}

	const travelDirection = normalize(spider.vel, pointFromAngle(spider.angle));
	const lookAhead = add(spider.pos, scale(travelDirection, 54));
	let steer = add(
		scale(steerAwayFromBounds(spider.pos, travelDirection), 1.08 * homeApproachWallBlend),
		scale(steerAwayFromBounds(lookAhead, travelDirection), 1.22 * homeApproachWallBlend),
	);
	steer = add(
		steer,
		scale(steerOffWalls(spider.pos, travelDirection), 1.55 * homeApproachWallBlend),
	);
	steer = add(
		steer,
		scale(steerOffWalls(lookAhead, travelDirection), 1.65 * homeApproachWallBlend),
	);
	const tooDeepInSafeZone = isInsideAntSafeZone(simulation, spider.pos, 8);
	const tooFarFromWeb = distance(spider.pos, simulation.spiderHome) > simulation.spiderLeashRadius;

	if (spider.carryingVictim) {
		spider.state = "return";
		spider.targetPoint = simulation.spiderHome;
		steer = add(steer, scale(normalize(subtract(simulation.spiderHome, spider.pos)), 8.1));
		if (distance(spider.pos, simulation.spiderHome) <= spider.size + 20) {
			simulation.spiderReserve += spider.loot;
			simulation.spiderPoints += spider.loot;
			simulation.lastHarvestAt = simulation.time;
			spider.loot = 0;
			maybeQueueSpider(simulation);
			spider.carryingVictim = false;
			spider.targetAntId = null;
			spider.targetPoint = pickSpiderPatrolTarget(simulation, spider);
			spider.patrolTimer = randomRange(1.2, 2.6);
			setEvent(
				simulation,
				"Spider brood fed",
				"Predators returned home and spun fresh movement through the web.",
				2.2,
			);
		}
	} else if (
		target &&
		(!tooFarFromWeb || target.webbedTimer > 0.1) &&
		(!tooDeepInSafeZone || target.webbedTimer > 0.1)
	) {
		spider.state = "hunt";
		spider.targetAntId = target.id;
		spider.huntTimer = Math.max(
			spider.huntTimer,
			targetVisible ? randomRange(0.9, 1.45) : randomRange(0.45, 0.8),
		);
		const interceptLead = clamp(
			distance(spider.pos, target.pos) / Math.max(spider.speed * 4.2, 1),
			0.08,
			0.34,
		);
		const predicted = add(target.pos, scale(target.vel, interceptLead));
		steer = add(
			steer,
			scale(normalize(subtract(predicted, spider.pos)), targetVisible ? 3.4 : 2.5),
		);
		steer = add(steer, scale(normalize(subtract(target.pos, spider.pos)), 1.08));
		spider.targetPoint = predicted;
		if (
			targetVisible &&
			spider.webCooldown <= 0 &&
			distance(spider.pos, target.pos) < Math.min(spider.vision * 0.95, 210) &&
			Math.abs(
				angleDifference(
					spider.angle,
					Math.atan2(predicted.y - spider.pos.y, predicted.x - spider.pos.x),
				),
			) < 1.35
		) {
			simulation.webs.push(createWebShot(spider, predicted));
			spider.huntTimer = Math.max(spider.huntTimer, 2.2);
			spider.webCooldown = randomRange(1.15, 1.95);
			emitBurst(
				simulation,
				add(spider.pos, scale(pointFromAngle(spider.angle), spider.size * 0.72)),
				colorInt(simulation.palette.danger),
				5,
				18,
			);
			setEvent(
				simulation,
				"Web cast",
				"The spider fired a slowing web into the lane.",
				1.2,
			);
		}
	} else if (!tooDeepInSafeZone && !tooFarFromWeb && spider.huntTimer > 0 && spider.targetPoint) {
		spider.state = "hunt";
		steer = add(steer, scale(normalize(subtract(spider.targetPoint, spider.pos)), 2.2));
		if (distance(spider.pos, spider.targetPoint) < 30) {
			spider.huntTimer = 0;
		}
	} else {
		const shouldReturn = tooDeepInSafeZone || tooFarFromWeb;
		spider.state = shouldReturn ? "return" : "patrol";
		if (shouldReturn) {
			spider.targetAntId = null;
			spider.targetPoint = blendPoints(simulation.spiderHome, simulation.contestedCenter, 0.18);
			steer = add(
				steer,
				scale(normalize(subtract(spider.targetPoint, spider.pos)), 2.2),
			);
		} else {
			if (!spider.targetPoint || spider.patrolTimer <= 0 || distance(spider.pos, spider.targetPoint) < 36) {
				spider.targetPoint = pickSpiderPatrolTarget(simulation, spider);
				spider.patrolTimer = randomRange(0.95, 2.05);
			}
			steer = add(
				steer,
				scale(normalize(subtract(spider.targetPoint, spider.pos)), 2.05),
			);
		}
		steer = add(
			steer,
			scale(pointFromAngle(spider.wander + spider.id * 0.73), 0.08),
		);
		steer = add(
			steer,
			scale(normalize(subtract(simulation.contestedCenter, spider.pos)), 0.18),
		);
	}

	for (const other of simulation.spiders) {
		if (other.id === spider.id) continue;
		const gap = distance(spider.pos, other.pos);
		if (gap <= 0 || gap > 34) continue;
		steer = add(
			steer,
			scale(normalize(subtract(spider.pos, other.pos)), inverseLerp(34, 0, gap) * 0.55),
		);
	}
	steer = add(
		steer,
		scale(
			steerAwayFromBounds(spider.pos, normalize(steer, travelDirection)),
			1.2 * homeApproachWallBlend,
		),
	);
	steer = add(
		steer,
		scale(
			steerOffWalls(spider.pos, normalize(steer, travelDirection)),
			1.75 * homeApproachWallBlend,
		),
	);

	const moved = moveAgent(
		spider.pos,
		spider.vel,
		spider.angle,
		steer,
		spider.speed *
			(spider.carryingVictim
				? lerp(0.42, 0.92, inverseLerp(18, 150, distance(spider.pos, simulation.spiderHome)))
				: spider.state === "hunt"
					? lerp(0.48, 1.12, inverseLerp(16, 120, distance(spider.pos, spider.targetPoint ?? spider.pos)))
					: 1),
		6.1,
		deltaSeconds,
	);
	spider.pos = moved.pos;
	spider.vel = moved.vel;
	spider.angle = moved.angle;
	spider.stridePhase +=
		deltaSeconds *
		(spider.state === "hunt" ? 9.6 : 7.4) *
		inverseLerp(3, spider.speed * 0.96, magnitude(moved.vel));

	if (spider.carryingVictim || spider.cooldown > 0 || isInsideAntSafeZone(simulation, spider.pos, 18)) {
		return;
	}

	for (const ant of simulation.ants) {
		if (!ant.alive) continue;
		if (isInsideAntSafeZone(simulation, ant.pos, 20)) continue;
		const biteDistance = spider.size + ant.size + 6;
		if (distance(spider.pos, ant.pos) > biteDistance) continue;
		const stolenFood = ant.carrying;
		ant.alive = false;
		ant.carrying = 0;
		spider.carryingVictim = true;
		spider.loot += Math.max(1.2, stolenFood + 0.35);
		spider.cooldown = randomRange(1.4, 2.4);
		spider.targetAntId = null;
		spider.targetPoint = simulation.spiderHome;
		emitBurst(simulation, ant.pos, colorInt(simulation.palette.danger), 12, 42);
		setEvent(
			simulation,
			"Spider strike",
			stolenFood > 0.1
				? "A hunter stole food and is racing back to the web."
				: `${simulation.ants.filter((candidate) => candidate.alive).length} ants still moving.`,
			2.4,
		);
		break;
	}
}

function updateParticles(simulation: Simulation, deltaSeconds: number) {
	for (const particle of simulation.particles) {
		particle.life -= deltaSeconds;
		particle.pos = add(particle.pos, scale(particle.vel, deltaSeconds));
		particle.vel = scale(particle.vel, 0.98);
	}
	simulation.particles = simulation.particles.filter((particle) => particle.life > 0);
}

function respawnFoodSource(simulation: Simulation) {
	const next = createFoodSources(
		{ ...simulation.config, sourceCount: 1 },
		simulation.antHome,
		simulation.spiderHome,
	)[0];
	if (!next) return;
	next.id = simulation.nextFoodId++;
	simulation.foods = [next];
	emitBurst(simulation, next.pos, colorInt(simulation.palette.foodA), 18, 30);
	setEvent(
		simulation,
		"Bloom shifted",
		"The food source collapsed and resurfaced on the spider side.",
		2.4,
	);
}

function updateWebs(simulation: Simulation, deltaSeconds: number) {
	for (const web of simulation.webs) {
		web.age += deltaSeconds;
		web.life -= deltaSeconds;
		web.pos = add(web.pos, scale(web.vel, deltaSeconds));
	}

	const active: WebShot[] = [];
	for (const web of simulation.webs) {
		if (web.life <= 0) continue;
		if (web.age < 0.05) {
			active.push(web);
			continue;
		}
		let hit = false;
		for (const ant of simulation.ants) {
			if (!ant.alive) continue;
			if (distance(web.pos, ant.pos) > ant.size + 8) continue;
			ant.webbedTimer = Math.max(ant.webbedTimer, randomRange(1.2, 1.95));
			ant.panicTimer = Math.max(ant.panicTimer, 0.8);
			emitBurst(simulation, ant.pos, colorInt(simulation.palette.danger), 8, 18);
			hit = true;
			break;
		}
		if (!hit) {
			active.push(web);
		}
	}
	simulation.webs = active;
}

function updateFood(simulation: Simulation, deltaSeconds: number) {
	for (const food of simulation.foods) {
		food.pulse += deltaSeconds * (0.7 + food.wobble);
	}

	const current = simulation.foods[0];
	if (!current) return;
	if (current.amount <= 0.05) {
		respawnFoodSource(simulation);
	}
}

function updateCocoons(simulation: Simulation, deltaSeconds: number) {
	for (const cocoon of simulation.cocoons) {
		cocoon.timer -= deltaSeconds;
		cocoon.spin += deltaSeconds * 2.4;
	}

	const ready = simulation.cocoons.filter((cocoon) => cocoon.timer <= 0);
	if (ready.length > 0) {
		for (const cocoon of ready) {
			simulation.ants.push(
				createAnt(simulation.nextAntId++, simulation.antHome, cocoon.role),
			);
			emitBurst(
				simulation,
				simulation.antHome,
				colorInt(simulation.palette.antSecondary),
				10,
				32,
			);
		}
		setEvent(
			simulation,
			"New workers hatched",
			"The colony converted stored food into fresh foragers.",
			2.6,
		);
	}

	simulation.cocoons = simulation.cocoons.filter((cocoon) => cocoon.timer > 0);
}

function stepSimulation(simulation: Simulation, deltaSeconds: number) {
	simulation.time += deltaSeconds;
	simulation.dayPhase += deltaSeconds * 0.12;
	if (simulation.eventTimer > 0) {
		simulation.eventTimer -= deltaSeconds;
	}

	if (simulation.phase !== "running") {
		simulation.phaseTimer -= deltaSeconds;
		return;
	}

	updateSignals(simulation);
	updateFood(simulation, deltaSeconds);

	for (const ant of simulation.ants) {
		updateAnt(simulation, ant, deltaSeconds);
	}
	simulation.ants = simulation.ants.filter((ant) => ant.alive);

	for (const spider of simulation.spiders) {
		updateSpider(simulation, spider, deltaSeconds);
	}

	updateWebs(simulation, deltaSeconds);
	updateCocoons(simulation, deltaSeconds);
	updateParticles(simulation, deltaSeconds);

	if (simulation.points >= simulation.config.targetScore) {
		simulation.phase = "victory";
		simulation.phaseTimer = 3.8;
		simulation.roundsSurvived += 1;
		simulation.bestRounds = Math.max(simulation.bestRounds, simulation.roundsSurvived);
		emitBurst(
			simulation,
			scale(add(simulation.antHome, simulation.spiderHome), 0.5),
			colorInt(simulation.palette.glow),
			28,
			52,
		);
		setEvent(
			simulation,
			`Round ${simulation.config.round} cleared`,
			"The ants won the food race and secured the lane.",
			4,
		);
	} else if (simulation.spiderPoints >= simulation.config.targetScore) {
		simulation.phase = "collapse";
		simulation.phaseTimer = 4.8;
		simulation.bestRounds = Math.max(simulation.bestRounds, simulation.roundsSurvived);
		setEvent(
			simulation,
			"Spider brood dominates",
			"The spiders banked enough food first and overran the lane.",
			4.8,
		);
	} else if (simulation.ants.length === 0 && simulation.cocoons.length === 0) {
		simulation.phase = "collapse";
		simulation.phaseTimer = 4.8;
		simulation.bestRounds = Math.max(simulation.bestRounds, simulation.roundsSurvived);
		setEvent(
			simulation,
			"Colony collapse",
			"Every ant was lost to the hunt. The ecosystem will reboot.",
			4.8,
		);
	}
}

function toUiState(simulation: Simulation): UiState {
	const richestFood = simulation.foods.reduce(
		(best, food) => Math.max(best, inverseLerp(0, food.maxAmount, food.amount)),
		0,
	);
	const panelColor = hslToRgb(
		simulation.palette.panel.h,
		simulation.palette.panel.s,
		simulation.palette.panel.l,
	);

	return {
		phase: simulation.phase,
		round: simulation.config.round,
		roundsSurvived: simulation.roundsSurvived,
		bestRounds: simulation.bestRounds,
		points: Math.floor(simulation.points),
		spiderFood: Math.floor(simulation.spiderPoints),
		target: simulation.config.targetScore,
		ants: simulation.ants.length,
		antCap: simulation.config.antCap,
		spiders: simulation.spiders.length,
		spiderCap: simulation.config.spiderCap,
		storedFood: Number(simulation.colonyReserve.toFixed(1)),
		foodSources: simulation.foods.length,
		richestFood: Math.round(richestFood * 100),
		biome: simulation.palette.biome,
		paletteName: simulation.palette.name,
		eventLabel: simulation.eventLabel,
		eventDetails: simulation.eventDetails,
		progress: clamp(
			Math.max(simulation.points, simulation.spiderPoints) / simulation.config.targetScore,
			0,
			1,
		),
		bloomIn: Math.max(0, Number(simulation.nextBloomAt.toFixed(1))),
		hatchQueue: simulation.cocoons.length,
		accent: colorCss(simulation.palette.antSecondary),
		secondaryAccent: colorCss(simulation.palette.foodB),
		dangerAccent: colorCss(simulation.palette.danger),
		panelTint: `rgba(${panelColor.r}, ${panelColor.g}, ${panelColor.b}, 0.84)`,
	};
}

function createBackdropSeeds(palette: Palette): BackdropSeed[] {
	return Array.from({ length: 20 }, (_, index) => {
		const column = index % 5;
		const row = Math.floor(index / 5);
		return {
			x: ((column + 0.5 + randomRange(-0.24, 0.24)) / 5) * WORLD_WIDTH,
			y: ((row + 0.5 + randomRange(-0.24, 0.24)) / 4) * WORLD_HEIGHT,
			color:
				index % 3 === 0
					? mixHsl(palette.foodA, palette.glow, randomRange(0.2, 0.7))
					: index % 3 === 1
						? mixHsl(palette.antSecondary, palette.trail, randomRange(0.24, 0.72))
						: mixHsl(palette.foodB, palette.antPrimary, randomRange(0.2, 0.66)),
			alpha: randomRange(0.08, 0.18),
		};
	});
}

function createGuardPoints() {
	const pad = 120;
	return [
		{ x: -pad, y: -pad },
		{ x: WORLD_WIDTH + pad, y: -pad },
		{ x: WORLD_WIDTH + pad, y: WORLD_HEIGHT + pad },
		{ x: -pad, y: WORLD_HEIGHT + pad },
		{ x: WORLD_WIDTH * 0.5, y: -pad },
		{ x: WORLD_WIDTH * 0.5, y: WORLD_HEIGHT + pad },
		{ x: -pad, y: WORLD_HEIGHT * 0.5 },
		{ x: WORLD_WIDTH + pad, y: WORLD_HEIGHT * 0.5 },
	];
}

function clipPolygon(points: Point[], a: number, b: number, c: number) {
	if (points.length === 0) return points;
	const clipped: Point[] = [];
	let previous = points[points.length - 1];
	let previousInside = a * previous.x + b * previous.y <= c;

	for (const current of points) {
		const currentInside = a * current.x + b * current.y <= c;
		if (currentInside !== previousInside) {
			const previousValue = a * previous.x + b * previous.y - c;
			const currentValue = a * current.x + b * current.y - c;
			const denominator = previousValue - currentValue;
			const t = Math.abs(denominator) < 1e-6 ? 0 : previousValue / denominator;
			clipped.push({
				x: previous.x + (current.x - previous.x) * t,
				y: previous.y + (current.y - previous.y) * t,
			});
		}
		if (currentInside) clipped.push(current);
		previous = current;
		previousInside = currentInside;
	}

	return clipped;
}

function createBackdropCells(palette: Palette) {
	const seeds = createBackdropSeeds(palette);
	const guards = createGuardPoints();
	const bounds = [
		{ x: 0, y: 0 },
		{ x: WORLD_WIDTH, y: 0 },
		{ x: WORLD_WIDTH, y: WORLD_HEIGHT },
		{ x: 0, y: WORLD_HEIGHT },
	];
	const all = [...seeds, ...guards];
	const cells: BackdropCell[] = [];

	for (let index = 0; index < seeds.length; index += 1) {
		let polygon = bounds.slice();
		const seed = seeds[index];

		for (let otherIndex = 0; otherIndex < all.length; otherIndex += 1) {
			if (otherIndex === index) continue;
			const other = all[otherIndex];
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
				color: seed.color,
				alpha: seed.alpha,
			});
		}
	}

	return cells;
}

function createSurface(
	scene: PhaserScene,
	PhaserLib: PhaserModule,
	textureKeyPrefix: string,
) {
	const pixelRatio = clamp(window.devicePixelRatio || 1, 1, 2);
	const canvas = document.createElement("canvas");
	canvas.width = Math.floor(WORLD_WIDTH * pixelRatio);
	canvas.height = Math.floor(WORLD_HEIGHT * pixelRatio);

	const context = canvas.getContext("2d");
	if (!context) {
		throw new Error("Unable to create ant simulator canvas context.");
	}
	context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
	context.imageSmoothingEnabled = true;

	const textureKey = `${textureKeyPrefix}-${Math.random().toString(36).slice(2, 10)}`;
	const texture = scene.textures.addCanvas(textureKey, canvas);
	if (!texture) {
		throw new Error("Unable to create ant simulator canvas texture.");
	}
	texture.setFilter(PhaserLib.Textures.FilterMode.LINEAR);

	const image = scene.add.image(0, 0, textureKey).setOrigin(0);
	image.setDisplaySize(WORLD_WIDTH, WORLD_HEIGHT);

	return {
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

function drawBlob(
	context: CanvasRenderingContext2D,
	center: Point,
	radius: number,
	color: string,
	alpha: number,
) {
	context.save();
	context.globalAlpha = alpha;
	context.fillStyle = color;
	context.beginPath();
	for (let index = 0; index <= 10; index += 1) {
		const angle = (index / 10) * Math.PI * 2;
		const wobble = radius * (0.78 + Math.sin(angle * 3 + center.x * 0.01) * 0.12);
		const x = center.x + Math.cos(angle) * wobble;
		const y = center.y + Math.sin(angle) * wobble;
		if (index === 0) context.moveTo(x, y);
		else context.lineTo(x, y);
	}
	context.closePath();
	context.fill();
	context.restore();
}

function drawBackground(surface: Surface, simulation: Simulation) {
	const { context } = surface;
	const palette = simulation.palette;
	const skyTop = colorCss(mixHsl(palette.sky, palette.glow, 0.24));
	const skyBottom = colorCss(mixHsl(palette.ground, palette.panel, 0.4));
	const backgroundGradient = context.createLinearGradient(0, 0, 0, WORLD_HEIGHT);
	backgroundGradient.addColorStop(0, skyTop);
	backgroundGradient.addColorStop(0.5, colorCss(mixHsl(palette.sky, palette.ground, 0.56)));
	backgroundGradient.addColorStop(1, skyBottom);

	context.clearRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
	context.fillStyle = backgroundGradient;
	context.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

	const radial = context.createRadialGradient(
		WORLD_WIDTH * 0.45,
		WORLD_HEIGHT * 0.44,
		40,
		WORLD_WIDTH * 0.45,
		WORLD_HEIGHT * 0.44,
		WORLD_WIDTH * 0.6,
	);
	radial.addColorStop(0, rgbaCss(palette.glow, 0.22));
	radial.addColorStop(1, "rgba(0,0,0,0)");
	context.fillStyle = radial;
	context.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

	for (const cell of createBackdropCells(palette)) {
		context.beginPath();
		for (let index = 0; index < cell.polygon.length; index += 1) {
			const point = cell.polygon[index];
			if (index === 0) context.moveTo(point.x, point.y);
			else context.lineTo(point.x, point.y);
		}
		context.closePath();
		context.fillStyle = rgbaCss(cell.color, cell.alpha);
		context.strokeStyle = rgbaCss(palette.facetStroke, cell.alpha * 0.85);
		context.lineWidth = 1.15;
		context.fill();
		context.stroke();
	}

	const corridor = simulation.corridor;
	const perpendicular = simulation.perpendicular;
	const midpoint = simulation.contestedCenter;

	context.lineWidth = 2;
	context.strokeStyle = rgbaCss(palette.antSecondary, 0.18);
	context.beginPath();
	context.arc(
		simulation.antHome.x,
		simulation.antHome.y,
		simulation.antSafeRadius,
		0,
		Math.PI * 2,
	);
	context.stroke();

	context.lineWidth = 1.6;
	context.strokeStyle = rgbaCss(palette.danger, 0.14);
	context.beginPath();
	context.arc(
		simulation.spiderHome.x,
		simulation.spiderHome.y,
		simulation.spiderLeashRadius,
		0,
		Math.PI * 2,
	);
	context.stroke();

	for (let index = 0; index < 9; index += 1) {
		const start = clampPoint(
			add(
				midpoint,
				add(
					scale(corridor, randomRange(-260, 260)),
					scale(perpendicular, randomRange(-260, 260)),
				),
			),
			20,
		);
		drawBlob(
			context,
			start,
			randomRange(34, 92),
			index % 2 === 0 ? rgbaCss(palette.foodA, 0.2) : rgbaCss(palette.foodB, 0.16),
			randomRange(0.18, 0.26),
		);
	}

	context.lineCap = "round";
	context.lineJoin = "round";
	for (let index = -2; index <= 2; index += 1) {
		const offset = scale(perpendicular, index * 46 + randomRange(-12, 12));
		const start = add(simulation.antHome, offset);
		const end = add(simulation.spiderHome, offset);
		const controlA = add(midpoint, scale(perpendicular, randomRange(-140, 140)));
		const controlB = add(midpoint, scale(perpendicular, randomRange(-140, 140)));

		context.beginPath();
		context.moveTo(start.x, start.y);
		context.bezierCurveTo(controlA.x, controlA.y, controlB.x, controlB.y, end.x, end.y);
		context.strokeStyle =
			index === 0 ? rgbaCss(palette.trail, 0.18) : rgbaCss(palette.glow, 0.1);
		context.lineWidth = index === 0 ? 4.5 : 1.8;
		context.stroke();
	}

	for (let index = 0; index < 180; index += 1) {
		const x = randomRange(0, WORLD_WIDTH);
		const y = randomRange(0, WORLD_HEIGHT);
		const radius = randomRange(0.5, 1.8);
		context.beginPath();
		context.fillStyle =
			index % 3 === 0
				? rgbaCss(palette.foodA, 0.22)
				: index % 3 === 1
					? rgbaCss(palette.antSecondary, 0.2)
					: rgbaCss(palette.glow, 0.18);
		context.arc(x, y, radius, 0, Math.PI * 2);
		context.fill();
	}

	surface.texture.refresh();
}

function renderSignals(graphics: PhaserGraphics, simulation: Simulation) {
	graphics.clear();
	for (let cellY = 0; cellY < simulation.field.rows; cellY += 1) {
		for (let cellX = 0; cellX < simulation.field.cols; cellX += 1) {
			const index = cellY * simulation.field.cols + cellX;
			const cx = cellX * simulation.field.cellSize + simulation.field.cellSize * 0.5;
			const cy = cellY * simulation.field.cellSize + simulation.field.cellSize * 0.5;

			const forage = simulation.field.forage[index] ?? 0;
			if (forage > 0.12) {
				graphics.fillStyle(
					colorInt(simulation.palette.trail),
					clamp(forage * 0.11, 0.02, 0.24),
				);
				graphics.fillCircle(cx, cy, clamp(1.4 + forage * 3.5, 1.4, 6));
			}

			const danger = simulation.field.danger[index] ?? 0;
			if (danger > 0.08) {
				graphics.fillStyle(
					colorInt(simulation.palette.danger),
					clamp(danger * 0.1, 0.03, 0.24),
				);
				graphics.fillCircle(cx, cy, clamp(1.2 + danger * 3, 1.2, 5));
			}
		}
	}
}

function renderNest(
	graphics: PhaserGraphics,
	position: Point,
	coreColor: number,
	ringColor: number,
	count: number,
) {
	graphics.fillStyle(coreColor, 0.82);
	graphics.fillCircle(position.x, position.y, 28);
	graphics.fillStyle(ringColor, 0.22);
	graphics.fillCircle(position.x, position.y, 48);
	graphics.lineStyle(2, ringColor, 0.7);
	graphics.strokeCircle(position.x, position.y, 40);
	graphics.strokeCircle(position.x, position.y, 60);

	for (let index = 0; index < count; index += 1) {
		const angle = (index / Math.max(count, 1)) * Math.PI * 2;
		const orbit = 38 + (index % 2) * 9;
		const x = position.x + Math.cos(angle) * orbit;
		const y = position.y + Math.sin(angle) * orbit;
		graphics.fillStyle(ringColor, 0.32);
		graphics.fillCircle(x, y, 4.5);
	}
}

function renderFood(graphics: PhaserGraphics, simulation: Simulation) {
	const colorA = colorInt(simulation.palette.foodA);
	const colorB = colorInt(simulation.palette.foodB);
	for (const food of simulation.foods) {
		const fullness = inverseLerp(0, food.maxAmount, food.amount);
		const pulse = 1 + Math.sin(food.pulse * 2) * 0.06;
		const radius = food.radius * (0.62 + fullness * 0.42) * pulse;
		const levels = clamp(Math.ceil(fullness * 4), 0, 4);
		graphics.fillStyle(colorB, 0.08 + fullness * 0.12);
		graphics.fillCircle(food.pos.x, food.pos.y, radius * 1.68);
		graphics.lineStyle(1.6, colorA, 0.28 + fullness * 0.2);
		graphics.strokeCircle(food.pos.x, food.pos.y, radius * 1.04);

		for (let level = 0; level < levels; level += 1) {
			const ringRadius = radius * (0.94 - level * 0.18);
			const petals = 6 - level;
			for (let petal = 0; petal < petals; petal += 1) {
				const angle =
					(petal / petals) * Math.PI * 2 +
					food.pulse * 0.28 +
					level * 0.22;
				const petalPos = {
					x: food.pos.x + Math.cos(angle) * ringRadius * 0.7,
					y: food.pos.y + Math.sin(angle) * ringRadius * 0.7,
				};
				graphics.fillStyle(level % 2 === 0 ? colorA : colorB, 0.8 - level * 0.12);
				graphics.fillCircle(petalPos.x, petalPos.y, radius * (0.24 - level * 0.03));
			}
		}

		graphics.fillStyle(
			colorInt(mixHsl(simulation.palette.foodA, simulation.palette.glow, 0.5)),
			0.62 + fullness * 0.28,
		);
		graphics.fillCircle(food.pos.x, food.pos.y, radius * (0.22 + fullness * 0.18));
	}
}

function renderAnt(graphics: PhaserGraphics, simulation: Simulation, ant: Ant) {
	const primary =
		ant.role === "carrier"
			? colorInt(simulation.palette.antCarrier)
			: ant.role === "scout"
				? colorInt(simulation.palette.antSecondary)
				: colorInt(simulation.palette.antPrimary);
	const secondary = colorInt(mixHsl(simulation.palette.antSecondary, simulation.palette.glow, 0.18));
	const direction = pointFromAngle(ant.angle);
	const side = { x: -direction.y, y: direction.x };
	const head = add(ant.pos, scale(direction, ant.size * 0.95));
	const thorax = ant.pos;
	const abdomen = add(ant.pos, scale(direction, -ant.size * 1.05));

	const stridePhase = ant.stridePhase + ant.id * 0.85;
	const antLegs = [
		{ segment: -0.58, reach: 0.98, swing: -0.58 },
		{ segment: 0.02, reach: 0.9, swing: 0 },
		{ segment: 0.62, reach: 0.96, swing: 0.52 },
	];

	graphics.lineStyle(1.4, secondary, 0.72);
	for (let legIndex = 0; legIndex < antLegs.length; legIndex += 1) {
		const leg = antLegs[legIndex];
		for (const sideSign of [-1, 1]) {
			const gait = Math.sin(stridePhase + legIndex * 0.92) * 0.26 * sideSign;
			const anchor = add(
				thorax,
				add(
					scale(direction, ant.size * leg.segment),
					scale(side, ant.size * 0.32 * sideSign),
				),
			);
			const knee = add(
				anchor,
				add(
					scale(side, ant.size * leg.reach * sideSign),
					scale(direction, ant.size * (leg.swing + gait)),
				),
			);
			const foot = add(
				knee,
				add(
					scale(side, ant.size * 0.8 * sideSign),
					scale(direction, ant.size * (leg.swing * 0.78 + gait * 1.2)),
				),
			);
			graphics.lineBetween(anchor.x, anchor.y, knee.x, knee.y);
			graphics.lineBetween(knee.x, knee.y, foot.x, foot.y);
		}
	}

	graphics.fillStyle(primary, ant.state === "panic" ? 1 : 0.94);
	graphics.fillCircle(head.x, head.y, ant.size * 0.5);
	graphics.fillCircle(thorax.x, thorax.y, ant.size * 0.62);
	graphics.fillCircle(abdomen.x, abdomen.y, ant.size * 0.72);

	if (ant.carrying > 0) {
		const payload = add(head, scale(direction, ant.size * 0.92));
		graphics.fillStyle(colorInt(simulation.palette.foodB), 0.9);
		graphics.fillCircle(payload.x, payload.y, ant.size * 0.34 + ant.carrying * 0.18);
	}
}

function renderSpider(graphics: PhaserGraphics, simulation: Simulation, spider: Spider) {
	const bodyColor = colorInt(simulation.palette.spiderPrimary);
	const eyeColor = colorInt(simulation.palette.spiderEyes);
	const direction = pointFromAngle(spider.angle);
	const side = { x: -direction.y, y: direction.x };
	const cephalothorax = add(spider.pos, scale(direction, spider.size * 0.1));
	const head = add(cephalothorax, scale(direction, spider.size * 0.56));
	const abdomen = add(cephalothorax, scale(direction, -spider.size * 0.98));

	const stridePhase = spider.stridePhase + spider.id * 0.9;
	const spiderLegs = [
		{ segment: 0.26, spread: 0.66, reach: 0.94, swing: 0.82, tip: 0.62 },
		{ segment: 0.08, spread: 0.84, reach: 0.98, swing: 0.2, tip: 0.18 },
		{ segment: -0.12, spread: 0.9, reach: 0.94, swing: -0.22, tip: -0.16 },
		{ segment: -0.3, spread: 0.72, reach: 0.86, swing: -0.76, tip: -0.62 },
	];

	graphics.lineStyle(1.5, eyeColor, 0.54);
	for (let legIndex = 0; legIndex < spiderLegs.length; legIndex += 1) {
		const leg = spiderLegs[legIndex];
		for (const sideSign of [-1, 1]) {
			const gait = Math.sin(stridePhase + legIndex * 0.76) * 0.14 * sideSign;
			const anchor = add(
				cephalothorax,
				add(
					scale(direction, spider.size * leg.segment),
					scale(side, spider.size * 0.16 * sideSign),
				),
			);
			const knee = add(
				anchor,
				add(
					scale(side, spider.size * leg.spread * sideSign),
					scale(direction, spider.size * (leg.swing + gait) * 0.5),
				),
			);
			const foot = add(
				knee,
				add(
					scale(side, spider.size * leg.reach * sideSign),
					scale(direction, spider.size * (leg.tip + gait * 1.08)),
				),
			);
			graphics.lineBetween(anchor.x, anchor.y, knee.x, knee.y);
			graphics.lineBetween(knee.x, knee.y, foot.x, foot.y);
		}
	}

	graphics.fillStyle(bodyColor, 0.92);
	graphics.fillCircle(abdomen.x, abdomen.y, spider.size * 0.92);
	graphics.fillCircle(cephalothorax.x, cephalothorax.y, spider.size * 0.58);
	graphics.fillCircle(head.x, head.y, spider.size * 0.26);

	graphics.fillStyle(eyeColor, 0.95);
	graphics.fillCircle(head.x + side.x * 1.7, head.y + side.y * 1.7, 1.85);
	graphics.fillCircle(head.x - side.x * 1.7, head.y - side.y * 1.7, 1.85);
	graphics.lineStyle(1.05, eyeColor, 0.34);
	graphics.lineBetween(
		head.x + side.x * 0.4,
		head.y + side.y * 0.4,
		head.x + direction.x * spider.size * 0.4,
		head.y + direction.y * spider.size * 0.4,
	);
	graphics.lineBetween(
		head.x - side.x * 0.4,
		head.y - side.y * 0.4,
		head.x + direction.x * spider.size * 0.4,
		head.y + direction.y * spider.size * 0.4,
	);

	if (spider.carryingVictim) {
		const prey = add(abdomen, scale(direction, -spider.size * 0.86));
		graphics.fillStyle(colorInt(simulation.palette.danger), 0.88);
		graphics.fillCircle(prey.x, prey.y, 4.2);
	}
}

function renderParticles(graphics: PhaserGraphics, simulation: Simulation) {
	for (const particle of simulation.particles) {
		const life = clamp(particle.life / particle.maxLife, 0, 1);
		graphics.fillStyle(particle.color, particle.alpha * life);
		graphics.fillCircle(particle.pos.x, particle.pos.y, particle.size * life);
	}
}

function renderWebs(graphics: PhaserGraphics, simulation: Simulation) {
	const webColor = colorInt(mixHsl(simulation.palette.danger, simulation.palette.glow, 0.36));
	for (const web of simulation.webs) {
		const life = clamp(web.life / 1.35, 0, 1);
		const direction = normalize(web.vel);
		graphics.lineStyle(1.4, webColor, 0.7 * life);
		graphics.lineBetween(
			web.pos.x - direction.x * 7,
			web.pos.y - direction.y * 7,
			web.pos.x + direction.x * 5,
			web.pos.y + direction.y * 5,
		);
		graphics.strokeCircle(web.pos.x, web.pos.y, 4.3 + (1 - life) * 2.8);
		graphics.lineBetween(
			web.pos.x - 5,
			web.pos.y - 5,
			web.pos.x + 5,
			web.pos.y + 5,
		);
		graphics.lineBetween(
			web.pos.x - 5,
			web.pos.y + 5,
			web.pos.x + 5,
			web.pos.y - 5,
		);
	}
}

function renderSimulation(
	entityGraphics: PhaserGraphics,
	signalGraphics: PhaserGraphics,
	simulation: Simulation,
) {
	renderSignals(signalGraphics, simulation);
	entityGraphics.clear();

	const nestCore = colorInt(simulation.palette.nest);
	const nestRing = colorInt(mixHsl(simulation.palette.glow, simulation.palette.antSecondary, 0.35));
	renderNest(
		entityGraphics,
		simulation.antHome,
		nestCore,
		nestRing,
		Math.max(simulation.cocoons.length, 3),
	);
	renderNest(
		entityGraphics,
		simulation.spiderHome,
		colorInt(simulation.palette.spiderPrimary),
		colorInt(simulation.palette.danger),
		Math.max(simulation.spiders.length, 4),
	);
	renderFood(entityGraphics, simulation);

	for (const cocoon of simulation.cocoons) {
		const angle = cocoon.spin;
		const pos = add(
			simulation.antHome,
			{
				x: Math.cos(angle + cocoon.orbitAngle) * cocoon.orbitRadius,
				y: Math.sin(angle + cocoon.orbitAngle) * cocoon.orbitRadius,
			},
		);
		entityGraphics.fillStyle(colorInt(simulation.palette.antSecondary), 0.8);
		entityGraphics.fillCircle(pos.x, pos.y, 4.2 + Math.sin(cocoon.spin * 3) * 0.8);
	}

	for (const ant of simulation.ants) {
		renderAnt(entityGraphics, simulation, ant);
	}
	for (const spider of simulation.spiders) {
		renderSpider(entityGraphics, simulation, spider);
	}
	renderWebs(entityGraphics, simulation);
	renderParticles(entityGraphics, simulation);
}

function mountAntSimulator(
	host: HTMLDivElement,
	PhaserLib: PhaserModule,
	bridge: Bridge,
) {
	let game: PhaserGame | null = null;

	class AntSimulatorScene extends PhaserLib.Scene {
		private backgroundSurface: Surface | null = null;

		private standbyBackgroundSurface: Surface | null = null;

		private signalGraphics: PhaserGraphics | null = null;

		private entityGraphics: PhaserGraphics | null = null;

		private simulation: Simulation = createSimulation();

		private queuedSimulation: Simulation | null = null;

		private accumulatorMs = 0;

		private uiAccumulatorMs = 0;

		constructor() {
			super("ant-simulator-phaser");
		}

		create() {
			this.cameras.main.setBackgroundColor("#040812");
			this.backgroundSurface = createSurface(this, PhaserLib, "ant-simulator");
			this.standbyBackgroundSurface = createSurface(this, PhaserLib, "ant-simulator-standby");
			this.standbyBackgroundSurface.image.setAlpha(0);
			this.signalGraphics = this.add.graphics().setBlendMode(PhaserLib.BlendModes.ADD);
			this.entityGraphics = this.add.graphics();
			drawBackground(this.backgroundSurface, this.simulation);
			renderSimulation(this.entityGraphics, this.signalGraphics, this.simulation);
			bridge.onUiState(toUiState(this.simulation));

			this.events.once(PhaserLib.Scenes.Events.SHUTDOWN, this.cleanup, this);
			this.events.once(PhaserLib.Scenes.Events.DESTROY, this.cleanup, this);
		}

		update(_time: number, deltaMs: number) {
			const delta = Math.min(deltaMs, 100);
			this.accumulatorMs = Math.min(this.accumulatorMs + delta, SIM_STEP_MS * 5);
			this.uiAccumulatorMs += delta;

			while (this.accumulatorMs >= SIM_STEP_MS) {
				stepSimulation(this.simulation, SIM_STEP_MS / 1000);
				this.accumulatorMs -= SIM_STEP_MS;
			}

			if (
				(this.simulation.phase === "victory" || this.simulation.phase === "collapse") &&
				!this.queuedSimulation
			) {
				this.queueUpcomingSimulation();
			}

			if (this.simulation.phase === "victory" && this.simulation.phaseTimer <= 0) {
				this.activateQueuedSimulation();
			} else if (this.simulation.phase === "collapse" && this.simulation.phaseTimer <= 0) {
				this.activateQueuedSimulation();
			}

			renderSimulation(
				this.entityGraphics as PhaserGraphics,
				this.signalGraphics as PhaserGraphics,
				this.simulation,
			);

			if (this.uiAccumulatorMs >= UI_PUSH_MS) {
				this.uiAccumulatorMs = 0;
				bridge.onUiState(toUiState(this.simulation));
			}
		}

		private cleanup() {
			destroySurface(this, this.backgroundSurface);
			this.backgroundSurface = null;
			destroySurface(this, this.standbyBackgroundSurface);
			this.standbyBackgroundSurface = null;
			this.signalGraphics?.destroy();
			this.signalGraphics = null;
			this.entityGraphics?.destroy();
			this.entityGraphics = null;
		}

		private queueUpcomingSimulation() {
			if (!this.standbyBackgroundSurface) return;

			this.queuedSimulation =
				this.simulation.phase === "victory"
					? createSimulation(
							this.simulation.config.round + 1,
							this.simulation.roundsSurvived,
							this.simulation.bestRounds,
						)
					: createSimulation(1, 0, this.simulation.bestRounds);
			drawBackground(this.standbyBackgroundSurface, this.queuedSimulation);
		}

		private activateQueuedSimulation() {
			if (!this.queuedSimulation) {
				this.queueUpcomingSimulation();
			}
			if (!this.queuedSimulation) return;

			this.simulation = this.queuedSimulation;
			this.queuedSimulation = null;
			if (this.backgroundSurface && this.standbyBackgroundSurface) {
				this.backgroundSurface.image.setAlpha(0);
				this.standbyBackgroundSurface.image.setAlpha(1);
				[this.backgroundSurface, this.standbyBackgroundSurface] = [
					this.standbyBackgroundSurface,
					this.backgroundSurface,
				];
			}
			this.uiAccumulatorMs = 0;
			bridge.onUiState(toUiState(this.simulation));
		}
	}

	game = new PhaserLib.Game({
		type: PhaserLib.CANVAS,
		parent: host,
		backgroundColor: "#040812",
		width: WORLD_WIDTH,
		height: WORLD_HEIGHT,
		render: {
			antialias: true,
			pixelArt: false,
			roundPixels: false,
		},
		scale: {
			mode: PhaserLib.Scale.NONE,
			autoCenter: PhaserLib.Scale.NO_CENTER,
			width: WORLD_WIDTH,
			height: WORLD_HEIGHT,
		},
		scene: [AntSimulatorScene],
	});

	if (game.canvas) {
		game.canvas.style.display = "block";
		game.canvas.style.width = `${WORLD_WIDTH}px`;
		game.canvas.style.height = `${WORLD_HEIGHT}px`;
		game.canvas.style.imageRendering = "auto";
	}

	return () => {
		game?.destroy(true);
		game = null;
	};
}

function MetricCard({
	label,
	value,
	tone,
}: {
	label: string;
	value: string;
	tone: string;
}) {
	return (
		<div className="rounded-[18px] border border-white/10 bg-black/20 px-3 py-2.5 backdrop-blur-xl">
			<div className="font-mono text-[9px] uppercase tracking-[0.24em] text-slate-400">
				{label}
			</div>
			<div className="mt-1.5 text-lg font-semibold" style={{ color: tone }}>
				{value}
			</div>
		</div>
	);
}

export default function AntSimulator() {
	const boardRef = useRef<HTMLDivElement | null>(null);
	const hostRef = useRef<HTMLDivElement | null>(null);
	const [status, setStatus] = useState<LoadStatus>("loading");
	const [uiState, setUiState] = useState<UiState>(EMPTY_UI_STATE);
	const [boardSize, setBoardSize] = useState<BoardSize>({ width: 0, height: 0 });

	useEffect(() => {
		const node = boardRef.current;
		if (!node) return;

		const syncSize = (width: number, height: number) => {
			const next = {
				width: Math.max(0, Math.floor(width)),
				height: Math.max(0, Math.floor(height)),
			};
			setBoardSize((current) =>
				current.width === next.width && current.height === next.height
					? current
					: next,
			);
		};

		const rect = node.getBoundingClientRect();
		syncSize(rect.width, rect.height);

		const observer = new ResizeObserver((entries) => {
			const entry = entries[0];
			if (!entry) return;
			syncSize(entry.contentRect.width, entry.contentRect.height);
		});
		observer.observe(node);

		return () => {
			observer.disconnect();
		};
	}, []);

	useEffect(() => {
		let cleanup: (() => void) | null = null;
		let cancelled = false;

		if (!hostRef.current || boardSize.width < 320 || boardSize.height < 240) {
			return;
		}

		setWorldSize(boardSize.width, boardSize.height);

		(async () => {
			if (!hostRef.current) return;

			try {
				setStatus("loading");
				const phaserModule = await import("phaser");
				if (cancelled || !hostRef.current) return;

				const PhaserLib = ("default" in phaserModule
					? phaserModule.default
					: phaserModule) as PhaserModule;

				cleanup = mountAntSimulator(hostRef.current, PhaserLib, {
					onUiState: (nextState) => {
						setUiState(nextState);
					},
				});
				setStatus("ready");
			} catch (error) {
				console.error("Failed to load Ant Simulator.", error);
				if (!cancelled) {
					setStatus("error");
					setUiState((current) => ({
						...current,
						phase: "error",
						eventLabel: "Phaser failed to load",
						eventDetails: "The watch-only simulation could not boot.",
					}));
				}
			}
		})();

		return () => {
			cancelled = true;
			cleanup?.();
		};
	}, [boardSize.height, boardSize.width]);

	const headerTone =
		uiState.phase === "collapse"
			? uiState.dangerAccent
			: uiState.phase === "victory"
				? uiState.secondaryAccent
				: uiState.accent;

	return (
		<div className="relative isolate flex h-full min-h-0 w-full select-none flex-col overflow-hidden rounded-[34px] border border-[#253347] bg-[#040812] text-slate-100 shadow-[0_28px_90px_rgba(0,0,0,0.48)]">
			<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(79,255,216,0.14),transparent_36%),radial-gradient(circle_at_top_right,rgba(251,191,36,0.1),transparent_30%),radial-gradient(circle_at_bottom,rgba(251,113,133,0.14),transparent_40%),linear-gradient(180deg,#08111e_0%,#050910_100%)]" />
			<div className="pointer-events-none absolute inset-0 opacity-80 [background-image:radial-gradient(circle_at_center,rgba(255,255,255,0.08)_0_1px,transparent_1px)] [background-size:22px_22px]" />
			<div
				className="relative z-10 border-b border-white/10 backdrop-blur-xl"
				style={{ backgroundColor: uiState.panelTint }}
			>
				<div className="flex flex-col gap-3 px-4 py-3 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
					<div className="min-w-0">
						<div className="font-mono text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-300">
							Watch Only
						</div>
						<div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
							<div className="text-2xl font-semibold tracking-[0.02em] text-white">
								Ant Simulator
							</div>
							<div className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-400">
								{uiState.paletteName}
							</div>
						</div>
						<div className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-400">
							{uiState.biome} · neutral-lane food race, ants swarm and spiders intercept
						</div>
					</div>

					<div className="grid gap-2 sm:grid-cols-5">
						<MetricCard
							label="Ant Food"
							value={`${uiState.points}/${uiState.target}`}
							tone={uiState.secondaryAccent}
						/>
						<MetricCard
							label="Spider Food"
							value={`${uiState.spiderFood}/${uiState.target}`}
							tone={uiState.dangerAccent}
						/>
						<MetricCard
							label="Round"
							value={`${uiState.round}`}
							tone={uiState.accent}
						/>
						<MetricCard
							label="Run"
							value={`${uiState.roundsSurvived}`}
							tone={uiState.accent}
						/>
						<MetricCard
							label="Best"
							value={`${uiState.bestRounds}`}
							tone={uiState.dangerAccent}
						/>
					</div>
				</div>
			</div>

			<div className="relative z-10 min-h-0 flex-1 overflow-hidden">
				<div
					ref={boardRef}
					className="relative h-full min-h-0 overflow-hidden bg-[#050a12]"
				>
					<div ref={hostRef} className="absolute inset-0" />
					<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_38%,rgba(2,6,23,0.4)_100%)]" />
					<div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.12),transparent_18%,transparent_82%,rgba(2,6,23,0.18))]" />
					<div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center p-3 sm:p-4">
						<div className="w-full max-w-[460px] rounded-[20px] border border-white/10 bg-black/22 px-3 py-2.5 backdrop-blur-xl">
							<div className="flex items-center justify-between gap-3 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-300">
								<span className="truncate" style={{ color: headerTone }}>
									{uiState.eventLabel}
								</span>
								<span>{Math.round(uiState.progress * 100)}%</span>
							</div>
							<div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
								<div
									className="h-full rounded-full transition-[width] duration-300"
									style={{
										width: `${uiState.progress * 100}%`,
										backgroundImage: `linear-gradient(90deg, ${uiState.accent}, ${uiState.secondaryAccent})`,
									}}
								/>
							</div>
						</div>
					</div>

					{status === "loading" && (
						<div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-[#040812]/64 backdrop-blur-sm">
							<div
								className="rounded-[24px] border border-white/10 px-5 py-4 font-mono text-xs uppercase tracking-[0.28em] text-slate-200"
								style={{ backgroundColor: uiState.panelTint }}
							>
								Booting colony simulation
							</div>
						</div>
					)}

					{status === "error" && (
						<div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-[#040812]/70 backdrop-blur-sm">
							<div className="max-w-md rounded-[24px] border border-white/10 bg-[#09111c]/92 px-5 py-4 text-center">
								<div className="font-mono text-[10px] uppercase tracking-[0.28em] text-slate-400">
									Runtime Error
								</div>
								<div className="mt-3 text-lg font-semibold text-white">
									Ant Simulator could not initialize.
								</div>
							</div>
						</div>
					)}
				</div>
			</div>

			<style jsx>{`
				div {
					font-family: ${FONT_STACK};
				}
			`}</style>
		</div>
	);
}
