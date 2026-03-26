"use client";

import { type MutableRefObject, useEffect, useRef, useState } from "react";

type PhaserModule = typeof import("phaser");
type PhaserGame = import("phaser").Game;
type PhaserGraphics = import("phaser").GameObjects.Graphics;
type PhaserImage = import("phaser").GameObjects.Image;
type PhaserKey = import("phaser").Input.Keyboard.Key;
type PhaserText = import("phaser").GameObjects.Text;

type Vector = {
	x: number;
	y: number;
};

type RgbColor = {
	r: number;
	g: number;
	b: number;
};

type MazeCell = {
	walls: [boolean, boolean, boolean, boolean];
};

type MazeDefinition = {
	cols: number;
	rows: number;
	cells: MazeCell[];
	mapWidth: number;
	mapHeight: number;
	wallMap: Uint8Array;
	cellDistances: Int32Array;
	goalDistances: Int32Array;
	goalCellIndex: number;
	start: Vector;
	goal: Vector;
	pathLength: number;
};

type PlayerState = {
	x: number;
	y: number;
	angle: number;
	pitch: number;
};

type RuntimeUiState = {
	phase: "intro" | "playing" | "gameover";
	endReason: "none" | "time" | "death";
	round: number;
	score: number;
	bestScore: number;
	timeLeft: number;
	timeLimit: number;
	goalDistance: number;
	lastGain: number;
	roundsCleared: number;
	mazeLabel: string;
	themeLabel: string;
	variantLabel: string;
	variantSummary: string;
	pickupsFound: number;
	pickupsTotal: number;
	ammoInMag: number;
	ammoPerMag: number;
	reloading: boolean;
	reloadProgress: number;
	playerHp: number;
	playerMaxHp: number;
	enemiesAlive: number;
	radarReady: boolean;
	radarCooldownLeft: number;
};

type RoundTheme = {
	name: string;
	skyTop: RgbColor;
	skyBottom: RgbColor;
	floorTop: RgbColor;
	floorBottom: RgbColor;
	wallNear: RgbColor;
	wallFar: RgbColor;
	wallHighlight: RgbColor;
	mapFloor: RgbColor;
	mapWall: RgbColor;
	panel: RgbColor;
	goal: RgbColor;
	pickup: RgbColor;
};

type RoundVariant = {
	name: string;
	summary: string;
	timeScale: number;
	pickupCount: number;
	pickupTimeBonus: number;
	pickupScoreBonus: number;
	clearBonus: number;
};

type PickupState = {
	x: number;
	y: number;
	collected: boolean;
};

type EnemyState = {
	cellIndex: number;
	nextCellIndex: number | null;
	progress: number;
	x: number;
	y: number;
	hp: number;
	maxHp: number;
	chasing: boolean;
	lostTimer: number;
	attackCooldown: number;
	revealedUntil: number;
};

type ImpactMark = {
	side: 0 | 1;
	hitX: number;
	hitY: number;
	heightRatio: number;
	spread: number;
	spin: number;
};

type ControlState = {
	forward: boolean;
	backward: boolean;
	turnLeft: boolean;
	turnRight: boolean;
	restart: boolean;
};

type MountOptions = {
	controlsRef: MutableRefObject<ControlState>;
	initialBestScore: number;
	onReady: () => void;
	onBestScore: (score: number) => void;
	onUiState: (state: RuntimeUiState) => void;
};

type RayHit = {
	distance: number;
	side: 0 | 1;
	cellX: number;
	cellY: number;
	hitX: number;
	hitY: number;
	texCoord: number;
	projectedTop: number;
	projectedHeight: number;
};

type KeyboardState = {
	up: PhaserKey;
	down: PhaserKey;
	left: PhaserKey;
	right: PhaserKey;
	w: PhaserKey;
	a: PhaserKey;
	s: PhaserKey;
	d: PhaserKey;
	shift: PhaserKey;
	r: PhaserKey;
	q: PhaserKey;
	space: PhaserKey;
	enter: PhaserKey;
};

const FONT_STACK =
	'"Azeret Mono", "JetBrains Mono", "SFMono-Regular", Consolas, monospace';
const STORAGE_KEY = "playground.labyrinth-explorer.best-score";
const FIELD_OF_VIEW = Math.PI / 3;
const PLAYER_RADIUS = 0.14;
const ENEMY_RADIUS = 0.13;
const PLAYER_SPEED = 2.7;
const SPRINT_MULTIPLIER = 1.18;
const GOAL_RADIUS = 0.34;
const WALL_THICKNESS = 1;
const CELL_OPEN_SIZE = 2;
const MAX_RAY_DISTANCE = 128;
const LOOK_PITCH_LIMIT = 0.42;
const MOUSE_YAW_SENSITIVITY = 0.00145;
const MOUSE_PITCH_SENSITIVITY = 0.00095;
const RADAR_ECHO_OFFSETS = [0, 1.2, 2.4] as const;
const TAU = Math.PI * 2;

const DEFAULT_UI_STATE: RuntimeUiState = {
	phase: "intro",
	endReason: "none",
	round: 1,
	score: 0,
	bestScore: 0,
	timeLeft: 0,
	timeLimit: 0,
	goalDistance: 0,
	lastGain: 0,
	roundsCleared: 0,
	mazeLabel: "8 x 8",
	themeLabel: "Abyss",
	variantLabel: "Treasure Run",
	variantSummary: "Echo shards add score and time. Greedy routes pay off.",
	pickupsFound: 0,
	pickupsTotal: 0,
	ammoInMag: 5,
	ammoPerMag: 5,
	reloading: false,
	reloadProgress: 0,
	playerHp: 6,
	playerMaxHp: 6,
	enemiesAlive: 0,
	radarReady: true,
	radarCooldownLeft: 0,
};

const DEFAULT_CONTROLS: ControlState = {
	forward: false,
	backward: false,
	turnLeft: false,
	turnRight: false,
	restart: false,
};

function clamp(value: number, min: number, max: number) {
	return Math.max(min, Math.min(max, value));
}

function lerp(a: number, b: number, t: number) {
	return a + (b - a) * t;
}

function wrapAngle(angle: number) {
	let value = angle;
	while (value <= -Math.PI) value += TAU;
	while (value > Math.PI) value -= TAU;
	return value;
}

function distance(a: Vector, b: Vector) {
	return Math.hypot(a.x - b.x, a.y - b.y);
}

function colorInt(r: number, g: number, b: number) {
	return (
		(clamp(Math.round(r), 0, 255) << 16) |
		(clamp(Math.round(g), 0, 255) << 8) |
		clamp(Math.round(b), 0, 255)
	);
}

function rgb(r: number, g: number, b: number): RgbColor {
	return { r, g, b };
}

function colorFromRgb(color: RgbColor) {
	return colorInt(color.r, color.g, color.b);
}

function cssFromRgb(color: RgbColor) {
	return `rgb(${Math.round(color.r)} ${Math.round(color.g)} ${Math.round(color.b)})`;
}

function mixRgb(a: RgbColor, b: RgbColor, t: number): RgbColor {
	return {
		r: lerp(a.r, b.r, t),
		g: lerp(a.g, b.g, t),
		b: lerp(a.b, b.b, t),
	};
}

function formatTime(seconds: number) {
	const safe = Math.max(0, seconds);
	const minutes = Math.floor(safe / 60);
	const remainder = safe - minutes * 60;
	const wholeSeconds = Math.floor(remainder);
	const tenths = Math.floor((remainder - wholeSeconds) * 10);
	return `${minutes}:${wholeSeconds.toString().padStart(2, "0")}.${tenths}`;
}

function resolveHostSize(host: HTMLDivElement) {
	const rect = host.getBoundingClientRect();
	return {
		width: Math.max(1, Math.floor(host.clientWidth || rect.width || 1)),
		height: Math.max(1, Math.floor(host.clientHeight || rect.height || 1)),
	};
}

function createRng(seed: number) {
	let state = seed >>> 0;
	return () => {
		state += 0x6d2b79f5;
		let value = state;
		value = Math.imul(value ^ (value >>> 15), value | 1);
		value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
		return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
	};
}

const ROUND_THEMES: readonly RoundTheme[] = [
	{
		name: "Abyss",
		skyTop: rgb(6, 18, 34),
		skyBottom: rgb(24, 60, 106),
		floorTop: rgb(22, 32, 44),
		floorBottom: rgb(4, 8, 14),
		wallNear: rgb(134, 176, 214),
		wallFar: rgb(37, 66, 94),
		wallHighlight: rgb(219, 238, 255),
		mapFloor: rgb(9, 27, 40),
		mapWall: rgb(212, 232, 248),
		panel: rgb(5, 17, 26),
		goal: rgb(115, 248, 255),
		pickup: rgb(255, 213, 120),
	},
	{
		name: "Ember",
		skyTop: rgb(32, 10, 6),
		skyBottom: rgb(124, 52, 21),
		floorTop: rgb(54, 24, 16),
		floorBottom: rgb(13, 7, 7),
		wallNear: rgb(222, 158, 110),
		wallFar: rgb(88, 46, 28),
		wallHighlight: rgb(255, 226, 186),
		mapFloor: rgb(34, 16, 13),
		mapWall: rgb(250, 221, 195),
		panel: rgb(21, 9, 8),
		goal: rgb(255, 170, 102),
		pickup: rgb(255, 232, 150),
	},
	{
		name: "Verdant",
		skyTop: rgb(8, 24, 18),
		skyBottom: rgb(44, 101, 78),
		floorTop: rgb(20, 38, 28),
		floorBottom: rgb(5, 12, 9),
		wallNear: rgb(157, 208, 177),
		wallFar: rgb(46, 82, 64),
		wallHighlight: rgb(228, 249, 236),
		mapFloor: rgb(12, 28, 21),
		mapWall: rgb(212, 240, 223),
		panel: rgb(7, 18, 14),
		goal: rgb(142, 255, 218),
		pickup: rgb(255, 233, 126),
	},
	{
		name: "Glacier",
		skyTop: rgb(12, 22, 38),
		skyBottom: rgb(59, 92, 130),
		floorTop: rgb(28, 36, 49),
		floorBottom: rgb(7, 12, 20),
		wallNear: rgb(185, 208, 236),
		wallFar: rgb(58, 76, 104),
		wallHighlight: rgb(242, 248, 255),
		mapFloor: rgb(14, 26, 38),
		mapWall: rgb(229, 239, 252),
		panel: rgb(8, 17, 28),
		goal: rgb(129, 231, 255),
		pickup: rgb(255, 224, 163),
	},
] as const;

const ROUND_VARIANTS: readonly RoundVariant[] = [
	{
		name: "Treasure Run",
		summary: "Echo shards add score and time. Greedy routes pay off.",
		timeScale: 1.04,
		pickupCount: 3,
		pickupTimeBonus: 5,
		pickupScoreBonus: 130,
		clearBonus: 80,
	},
	{
		name: "Rush",
		summary: "Lean timer, heavier clear bonus, only one shard on the path.",
		timeScale: 0.88,
		pickupCount: 1,
		pickupTimeBonus: 4,
		pickupScoreBonus: 180,
		clearBonus: 180,
	},
	{
		name: "Survey",
		summary: "A calmer scan. More time, fewer rewards, good for longer mazes.",
		timeScale: 1.16,
		pickupCount: 2,
		pickupTimeBonus: 4,
		pickupScoreBonus: 95,
		clearBonus: 30,
	},
	{
		name: "Relay",
		summary: "Several compact shard bonuses reward full-map sweeps.",
		timeScale: 0.98,
		pickupCount: 4,
		pickupTimeBonus: 3,
		pickupScoreBonus: 90,
		clearBonus: 110,
	},
] as const;

export type WeaponPolygon = {
	color: number;
	alpha: number;
	points: Array<{ x: number; y: number }>;
};

export const LABYRINTH_WEAPON_WIDTH = 370.26;
export const LABYRINTH_WEAPON_HEIGHT = 788.08;

export const LABYRINTH_WEAPON_SHAPES: WeaponPolygon[] = [
	{
		color: 0x080f16,
		alpha: 0.8,
		points: [
			{ x: 75.04, y: 760.6 },
			{ x: 77.98, y: 718.32 },
			{ x: 40.66, y: 691.24 },
			{ x: 55.42, y: 742.82 },
		],
	},
	{
		color: 0x172129,
		alpha: 0.8,
		points: [
			{ x: 75.04, y: 760.58 },
			{ x: 111.81, y: 788.07 },
			{ x: 114.99, y: 743.17 },
			{ x: 77.98, y: 718.32 },
		],
	},
	{
		color: 0x232e37,
		alpha: 0.8,
		points: [
			{ x: 114.99, y: 743.16 },
			{ x: 256.49, y: 743.07 },
			{ x: 259.41, y: 788.06 },
			{ x: 111.81, y: 788.08 },
		],
	},
	{
		color: 0x17212a,
		alpha: 0.8,
		points: [
			{ x: 256.49, y: 743.07 },
			{ x: 293.8, y: 718.85 },
			{ x: 296.01, y: 761.11 },
			{ x: 259.41, y: 788.07 },
		],
	},
	{
		color: 0x080f16,
		alpha: 0.8,
		points: [
			{ x: 293.8, y: 718.85 },
			{ x: 330.39, y: 691.82 },
			{ x: 316.87, y: 742.2 },
			{ x: 296.01, y: 761.12 },
		],
	},
	{
		color: 0x563a2e,
		alpha: 0.8,
		points: [
			{ x: 330.39, y: 691.82 },
			{ x: 293.8, y: 718.85 },
			{ x: 284.25, y: 551.55 },
			{ x: 317.84, y: 521.4 },
		],
	},
	{
		color: 0x3f464f,
		alpha: 0.8,
		points: [
			{ x: 114.99, y: 743.19 },
			{ x: 121.18, y: 581.24 },
			{ x: 87.38, y: 550.54 },
			{ x: 77.98, y: 718.31 },
		],
	},
	{
		color: 0x6d7887,
		alpha: 0.8,
		points: [
			{ x: 114.98, y: 743.17 },
			{ x: 121.17, y: 581.32 },
			{ x: 250.36, y: 581.86 },
			{ x: 256.51, y: 743.07 },
		],
	},
	{
		color: 0x573a2e,
		alpha: 0.8,
		points: [
			{ x: 77.98, y: 718.32 },
			{ x: 40.66, y: 691.24 },
			{ x: 54.39, y: 521.67 },
			{ x: 87.39, y: 550.54 },
		],
	},
	{
		color: 0x7a4e38,
		alpha: 0.8,
		points: [
			{ x: 87.39, y: 550.55 },
			{ x: 91.27, y: 490.93 },
			{ x: 58.58, y: 468.11 },
			{ x: 54.38, y: 521.69 },
		],
	},
	{
		color: 0x5c6771,
		alpha: 0.8,
		points: [
			{ x: 91.26, y: 490.92 },
			{ x: 100.25, y: 471.27 },
			{ x: 126.63, y: 489.29 },
			{ x: 121.24, y: 581.3 },
			{ x: 87.39, y: 550.55 },
		],
	},
	{
		color: 0x979fa8,
		alpha: 0.8,
		points: [
			{ x: 126.63, y: 489.27 },
			{ x: 243.61, y: 489.54 },
			{ x: 250.35, y: 581.86 },
			{ x: 121.24, y: 581.33 },
		],
	},
	{
		color: 0x606975,
		alpha: 0.8,
		points: [
			{ x: 250.35, y: 581.87 },
			{ x: 284.25, y: 551.56 },
			{ x: 279.79, y: 490.69 },
			{ x: 271.66, y: 471.42 },
			{ x: 243.6, y: 489.54 },
		],
	},
	{
		color: 0x434c56,
		alpha: 0.8,
		points: [
			{ x: 284.26, y: 551.55 },
			{ x: 293.8, y: 718.86 },
			{ x: 256.51, y: 743.06 },
			{ x: 250.35, y: 581.87 },
		],
	},
	{
		color: 0x7c513a,
		alpha: 0.8,
		points: [
			{ x: 284.25, y: 551.56 },
			{ x: 317.84, y: 521.41 },
			{ x: 313.42, y: 467.84 },
			{ x: 279.79, y: 490.67 },
		],
	},
	{
		color: 0x38434c,
		alpha: 0.8,
		points: [
			{ x: 279.78, y: 490.68 },
			{ x: 313.42, y: 467.84 },
			{ x: 310.77, y: 432.75 },
			{ x: 273.11, y: 432.38 },
			{ x: 271.66, y: 471.43 },
		],
	},
	{
		color: 0x353c46,
		alpha: 0.8,
		points: [
			{ x: 91.26, y: 490.93 },
			{ x: 100.25, y: 471.29 },
			{ x: 98.08, y: 434.44 },
			{ x: 60.7, y: 433.73 },
			{ x: 58.58, y: 468.11 },
		],
	},
	{
		color: 0x060a0c,
		alpha: 0.8,
		points: [
			{ x: 100.23, y: 471.27 },
			{ x: 271.68, y: 471.4 },
			{ x: 243.6, y: 489.55 },
			{ x: 126.62, y: 489.28 },
		],
	},
	{
		color: 0x0e171f,
		alpha: 0.8,
		points: [
			{ x: 100.24, y: 471.27 },
			{ x: 271.66, y: 471.41 },
			{ x: 273.11, y: 432.4 },
			{ x: 283.36, y: 415.42 },
			{ x: 87.73, y: 415.64 },
			{ x: 98.08, y: 434.45 },
		],
	},
	{
		color: 0x0d151c,
		alpha: 0.8,
		points: [
			{ x: 98.08, y: 434.44 },
			{ x: 42.51, y: 433.41 },
			{ x: 3.93, y: 383.47 },
			{ x: 57.67, y: 383.83 },
			{ x: 82.42, y: 415.65 },
			{ x: 87.73, y: 415.64 },
		],
	},
	{
		color: 0x0c151c,
		alpha: 0.8,
		points: [
			{ x: 273.11, y: 432.39 },
			{ x: 329.14, y: 432.92 },
			{ x: 366.67, y: 383.92 },
			{ x: 314.67, y: 384.29 },
			{ x: 290.79, y: 415.42 },
			{ x: 283.36, y: 415.42 },
		],
	},
	{
		color: 0x3c454f,
		alpha: 0.8,
		points: [
			{ x: 34.53, y: 383.68 },
			{ x: 34.47, y: 215.93 },
			{ x: 0, y: 232.37 },
			{ x: 3.93, y: 383.48 },
		],
	},
	{
		color: 0x606973,
		alpha: 0.8,
		points: [
			{ x: 0, y: 232.38 },
			{ x: 16.97, y: 201.35 },
			{ x: 44.9, y: 201.17 },
			{ x: 34.47, y: 215.94 },
		],
	},
	{
		color: 0x12468d,
		alpha: 0.8,
		points: [
			{ x: 16.97, y: 201.35 },
			{ x: 30.58, y: 162.81 },
			{ x: 99.7, y: 147.43 },
			{ x: 101.11, y: 201.14 },
		],
	},
	{
		color: 0x06131d,
		alpha: 0.8,
		points: [
			{ x: 101.11, y: 201.19 },
			{ x: 114.9, y: 176.25 },
			{ x: 102.71, y: 135.24 },
			{ x: 99.7, y: 147.42 },
		],
	},
	{
		color: 0x2f6ec7,
		alpha: 0.8,
		points: [
			{ x: 30.58, y: 162.81 },
			{ x: 34.47, y: 151.14 },
			{ x: 96.16, y: 135.23 },
			{ x: 102.71, y: 135.23 },
			{ x: 99.7, y: 147.43 },
		],
	},
	{
		color: 0x0e171f,
		alpha: 0.8,
		points: [
			{ x: 72.54, y: 141.33 },
			{ x: 73.36, y: 111.37 },
			{ x: 95.81, y: 101.82 },
			{ x: 96.17, y: 135.23 },
		],
	},
	{
		color: 0x3a434d,
		alpha: 0.8,
		points: [
			{ x: 96.17, y: 135.24 },
			{ x: 125.16, y: 135.59 },
			{ x: 131.17, y: 110.49 },
			{ x: 241.12, y: 110.67 },
			{ x: 247.31, y: 135.94 },
			{ x: 271.44, y: 136.65 },
			{ x: 275.42, y: 102.35 },
			{ x: 95.81, y: 101.83 },
		],
	},
	{
		color: 0x939ea7,
		alpha: 0.8,
		points: [
			{ x: 102.7, y: 135.23 },
			{ x: 114.91, y: 176.24 },
			{ x: 101.14, y: 201.15 },
			{ x: 268.38, y: 201.16 },
			{ x: 256.32, y: 176.6 },
			{ x: 266.63, y: 136.52 },
			{ x: 247.31, y: 135.94 },
			{ x: 241.12, y: 110.66 },
			{ x: 131.17, y: 110.49 },
			{ x: 125.16, y: 135.59 },
		],
	},
	{
		color: 0x061320,
		alpha: 0.8,
		points: [
			{ x: 256.33, y: 176.61 },
			{ x: 266.64, y: 136.5 },
			{ x: 270.64, y: 146.72 },
			{ x: 268.38, y: 201.18 },
		],
	},
	{
		color: 0x235eaa,
		alpha: 0.8,
		points: [
			{ x: 266.63, y: 136.51 },
			{ x: 271.43, y: 136.64 },
			{ x: 338, y: 151.14 },
			{ x: 341.01, y: 163.17 },
			{ x: 270.64, y: 146.73 },
		],
	},
	{
		color: 0x12468d,
		alpha: 0.8,
		points: [
			{ x: 270.64, y: 146.72 },
			{ x: 268.38, y: 201.17 },
			{ x: 353.36, y: 201.23 },
			{ x: 341, y: 163.16 },
		],
	},
	{
		color: 0x0f181f,
		alpha: 0.8,
		points: [
			{ x: 271.42, y: 136.63 },
			{ x: 275.41, y: 102.36 },
			{ x: 298.57, y: 112.08 },
			{ x: 297.83, y: 142.49 },
		],
	},
	{
		color: 0x414a55,
		alpha: 0.8,
		points: [
			{ x: 275.42, y: 102.37 },
			{ x: 298.57, y: 112.08 },
			{ x: 265.16, y: 28.45 },
			{ x: 275.37, y: 102.02 },
		],
	},
	{
		color: 0x404a55,
		alpha: 0.8,
		points: [
			{ x: 95.82, y: 101.83 },
			{ x: 73.35, y: 111.37 },
			{ x: 106.06, y: 28.46 },
		],
	},
	{
		color: 0x96a1aa,
		alpha: 0.8,
		points: [
			{ x: 106.07, y: 28.46 },
			{ x: 159.63, y: 28.46 },
			{ x: 159.63, y: 51.62 },
			{ x: 211.95, y: 51.62 },
			{ x: 212.31, y: 27.93 },
			{ x: 265.16, y: 28.46 },
			{ x: 275.42, y: 102.35 },
			{ x: 95.82, y: 101.83 },
		],
	},
	{
		color: 0x3a444f,
		alpha: 0.8,
		points: [
			{ x: 159.63, y: 51.62 },
			{ x: 159.67, y: 0.27 },
			{ x: 212.48, y: 0 },
			{ x: 212.13, y: 51.62 },
		],
	},
	{
		color: 0x646c76,
		alpha: 0.8,
		points: [
			{ x: 326.92, y: 201.23 },
			{ x: 337.55, y: 215.99 },
			{ x: 370.26, y: 232.2 },
			{ x: 353.36, y: 201.23 },
		],
	},
	{
		color: 0x3e4651,
		alpha: 0.8,
		points: [
			{ x: 337.54, y: 215.98 },
			{ x: 337.17, y: 384.14 },
			{ x: 366.68, y: 383.92 },
			{ x: 370.26, y: 232.2 },
		],
	},
	{
		color: 0x727c87,
		alpha: 0.8,
		points: [
			{ x: 34.52, y: 383.68 },
			{ x: 34.47, y: 215.93 },
			{ x: 337.55, y: 215.98 },
			{ x: 337.17, y: 384.13 },
			{ x: 314.67, y: 384.3 },
			{ x: 290.8, y: 415.41 },
			{ x: 82.43, y: 415.65 },
			{ x: 57.66, y: 383.82 },
		],
	},
	{
		color: 0xc1cad3,
		alpha: 0.8,
		points: [
			{ x: 34.47, y: 215.93 },
			{ x: 44.9, y: 201.16 },
			{ x: 326.91, y: 201.17 },
			{ x: 337.54, y: 215.97 },
		],
	},
];

function cellIndex(x: number, y: number, cols: number, rows: number) {
	if (x < 0 || y < 0 || x >= cols || y >= rows) return -1;
	return y * cols + x;
}

function logicalCellOrigin(cell: number) {
	return WALL_THICKNESS + cell * (CELL_OPEN_SIZE + WALL_THICKNESS);
}

function logicalCellCenter(cell: number) {
	return logicalCellOrigin(cell) + CELL_OPEN_SIZE * 0.5;
}

function carveRect(
	wallMap: Uint8Array,
	mapWidth: number,
	x: number,
	y: number,
	width: number,
	height: number,
) {
	for (let row = 0; row < height; row++) {
		for (let col = 0; col < width; col++) {
			wallMap[(y + row) * mapWidth + x + col] = 0;
		}
	}
}

function computeCellDistances(
	cells: readonly MazeCell[],
	cols: number,
	rows: number,
	startIndex: number,
) {
	const distances = new Int32Array(cols * rows).fill(-1);
	const queue = new Int32Array(cols * rows);
	let head = 0;
	let tail = 0;
	distances[startIndex] = 0;
	queue[tail++] = startIndex;

	while (head < tail) {
		const current = queue[head++];
		const x = current % cols;
		const y = Math.floor(current / cols);
		const cell = cells[current];
		const neighbors: Array<{ x: number; y: number; open: boolean }> = [
			{ x, y: y - 1, open: !cell.walls[0] },
			{ x: x + 1, y, open: !cell.walls[1] },
			{ x, y: y + 1, open: !cell.walls[2] },
			{ x: x - 1, y, open: !cell.walls[3] },
		];

		for (const neighbor of neighbors) {
			if (!neighbor.open) continue;
			const nextIndex = cellIndex(neighbor.x, neighbor.y, cols, rows);
			if (nextIndex < 0 || distances[nextIndex] !== -1) continue;
			distances[nextIndex] = distances[current] + 1;
			queue[tail++] = nextIndex;
		}
	}

	return distances;
}

function generateMaze(round: number, seed: number): MazeDefinition {
	const cols = clamp(8 + Math.floor(round * 1.45), 8, 20);
	const rows = clamp(7 + Math.floor(round * 1.2), 7, 18);
	const rng = createRng(seed);
	const cells: MazeCell[] = Array.from({ length: cols * rows }, () => ({
		walls: [true, true, true, true],
	}));
	const visited = new Uint8Array(cols * rows);
	const stack: number[] = [0];
	visited[0] = 1;

	while (stack.length > 0) {
		const current = stack[stack.length - 1];
		const x = current % cols;
		const y = Math.floor(current / cols);
		const neighbors: Array<{ index: number; direction: 0 | 1 | 2 | 3 }> = [];

		const top = cellIndex(x, y - 1, cols, rows);
		const right = cellIndex(x + 1, y, cols, rows);
		const bottom = cellIndex(x, y + 1, cols, rows);
		const left = cellIndex(x - 1, y, cols, rows);

		if (top >= 0 && visited[top] === 0) neighbors.push({ index: top, direction: 0 });
		if (right >= 0 && visited[right] === 0)
			neighbors.push({ index: right, direction: 1 });
		if (bottom >= 0 && visited[bottom] === 0)
			neighbors.push({ index: bottom, direction: 2 });
		if (left >= 0 && visited[left] === 0) neighbors.push({ index: left, direction: 3 });

		if (neighbors.length === 0) {
			stack.pop();
			continue;
		}

		const next = neighbors[Math.floor(rng() * neighbors.length)];
		if (!next) continue;
		const opposite = ((next.direction + 2) % 4) as 0 | 1 | 2 | 3;
		cells[current].walls[next.direction] = false;
		cells[next.index].walls[opposite] = false;
		visited[next.index] = 1;
		stack.push(next.index);
	}

	const distances = computeCellDistances(cells, cols, rows, 0);
	let farthestCell = 0;

	for (let index = 1; index < distances.length; index++) {
		if (distances[index] > distances[farthestCell]) {
			farthestCell = index;
		}
	}

	const goalDistances = computeCellDistances(cells, cols, rows, farthestCell);

	const mapWidth = cols * CELL_OPEN_SIZE + (cols + 1) * WALL_THICKNESS;
	const mapHeight = rows * CELL_OPEN_SIZE + (rows + 1) * WALL_THICKNESS;
	const wallMap = new Uint8Array(mapWidth * mapHeight).fill(1);

	for (let y = 0; y < rows; y++) {
		for (let x = 0; x < cols; x++) {
			const index = cellIndex(x, y, cols, rows);
			const cell = cells[index];
			const mapX = logicalCellOrigin(x);
			const mapY = logicalCellOrigin(y);

			carveRect(wallMap, mapWidth, mapX, mapY, CELL_OPEN_SIZE, CELL_OPEN_SIZE);

			if (!cell.walls[0]) {
				carveRect(
					wallMap,
					mapWidth,
					mapX,
					mapY - WALL_THICKNESS,
					CELL_OPEN_SIZE,
					WALL_THICKNESS,
				);
			}

			if (!cell.walls[1]) {
				carveRect(
					wallMap,
					mapWidth,
					mapX + CELL_OPEN_SIZE,
					mapY,
					WALL_THICKNESS,
					CELL_OPEN_SIZE,
				);
			}

			if (!cell.walls[2]) {
				carveRect(
					wallMap,
					mapWidth,
					mapX,
					mapY + CELL_OPEN_SIZE,
					CELL_OPEN_SIZE,
					WALL_THICKNESS,
				);
			}

			if (!cell.walls[3]) {
				carveRect(
					wallMap,
					mapWidth,
					mapX - WALL_THICKNESS,
					mapY,
					WALL_THICKNESS,
					CELL_OPEN_SIZE,
				);
			}
		}
	}

	const goalCellX = farthestCell % cols;
	const goalCellY = Math.floor(farthestCell / cols);

	return {
		cols,
		rows,
		cells,
		mapWidth,
		mapHeight,
		wallMap,
		cellDistances: distances,
		goalDistances,
		goalCellIndex: farthestCell,
		start: { x: logicalCellCenter(0), y: logicalCellCenter(0) },
		goal: { x: logicalCellCenter(goalCellX), y: logicalCellCenter(goalCellY) },
		pathLength: distances[farthestCell],
	};
}

function readWall(map: MazeDefinition, x: number, y: number) {
	if (x < 0 || y < 0 || x >= map.mapWidth || y >= map.mapHeight) return 1;
	return map.wallMap[y * map.mapWidth + x];
}

function isBlocked(map: MazeDefinition, x: number, y: number, radius: number) {
	const sampleRadius = radius * Math.SQRT1_2;
	const samples = [
		[x, y],
		[x + radius, y],
		[x - radius, y],
		[x, y + radius],
		[x, y - radius],
		[x + sampleRadius, y + sampleRadius],
		[x + sampleRadius, y - sampleRadius],
		[x - sampleRadius, y + sampleRadius],
		[x - sampleRadius, y - sampleRadius],
	] as const;

	for (const [sampleX, sampleY] of samples) {
		if (readWall(map, Math.floor(sampleX), Math.floor(sampleY)) !== 0) return true;
	}

	return false;
}

function castRay(map: MazeDefinition, origin: Vector, angle: number): RayHit {
	const dirX = Math.cos(angle);
	const dirY = Math.sin(angle);
	let cellX = Math.floor(origin.x);
	let cellY = Math.floor(origin.y);
	const deltaDistX = dirX === 0 ? Number.POSITIVE_INFINITY : Math.abs(1 / dirX);
	const deltaDistY = dirY === 0 ? Number.POSITIVE_INFINITY : Math.abs(1 / dirY);
	const stepX = dirX < 0 ? -1 : 1;
	const stepY = dirY < 0 ? -1 : 1;

	let sideDistX =
		dirX < 0 ? (origin.x - cellX) * deltaDistX : (cellX + 1 - origin.x) * deltaDistX;
	let sideDistY =
		dirY < 0 ? (origin.y - cellY) * deltaDistY : (cellY + 1 - origin.y) * deltaDistY;

	let side: 0 | 1 = 0;
	let travelled = 0;

	while (travelled < MAX_RAY_DISTANCE) {
		if (sideDistX < sideDistY) {
			cellX += stepX;
			travelled = sideDistX;
			sideDistX += deltaDistX;
			side = 0;
		} else {
			cellY += stepY;
			travelled = sideDistY;
			sideDistY += deltaDistY;
			side = 1;
		}

		if (readWall(map, cellX, cellY) !== 0) {
			const distanceToWall =
				side === 0
					? (cellX - origin.x + (1 - stepX) * 0.5) / dirX
					: (cellY - origin.y + (1 - stepY) * 0.5) / dirY;
			const safeDistance = Math.max(0.0001, distanceToWall);
			const hitX = origin.x + dirX * safeDistance;
			const hitY = origin.y + dirY * safeDistance;
			const texCoord =
				side === 0 ? hitY - Math.floor(hitY) : hitX - Math.floor(hitX);

			return {
				distance: safeDistance,
				side,
				cellX,
				cellY,
				hitX,
				hitY,
				texCoord,
				projectedTop: 0,
				projectedHeight: 0,
			};
		}
	}

	return {
		distance: MAX_RAY_DISTANCE,
		side: 0,
		cellX,
		cellY,
		hitX: origin.x + dirX * MAX_RAY_DISTANCE,
		hitY: origin.y + dirY * MAX_RAY_DISTANCE,
		texCoord: 0,
		projectedTop: 0,
		projectedHeight: 0,
	};
}

function roundTimeLimit(maze: MazeDefinition, round: number) {
	const base = 20 + maze.pathLength * 1.28;
	return clamp(base - round * 0.35, 22, 80);
}

function roundScoreGain(
	round: number,
	maze: MazeDefinition,
	timeLeft: number,
	variant: RoundVariant,
) {
	return (
		180 +
		round * 90 +
		Math.round(timeLeft * 30) +
		maze.pathLength * 10 +
		variant.clearBonus
	);
}

function nextSeed(seed: number) {
	return (Math.imul(seed, 1664525) + 1013904223) >>> 0;
}

function pickTheme(round: number, seed: number) {
	return ROUND_THEMES[(seed + round * 13) % ROUND_THEMES.length]!;
}

function pickVariant(round: number, seed: number) {
	return ROUND_VARIANTS[(Math.floor(seed / 17) + round * 5) % ROUND_VARIANTS.length]!;
}

function buildPickups(
	maze: MazeDefinition,
	variant: RoundVariant,
	seed: number,
): PickupState[] {
	if (variant.pickupCount <= 0) return [];

	const rng = createRng(seed ^ 0x85ebca6b);
	const candidates = Array.from({ length: maze.cellDistances.length }, (_, index) => index)
		.filter((index) => {
			if (index === 0 || index === maze.goalCellIndex) return false;
			const startDistance = maze.cellDistances[index];
			const goalDistance = maze.goalDistances[index];
			if (startDistance < 2 || goalDistance < 3) return false;
			const detourCost = startDistance + goalDistance - maze.pathLength;
			return detourCost >= 2;
		})
		.sort((a, b) => {
			const detourA =
				maze.cellDistances[a]! + maze.goalDistances[a]! - maze.pathLength;
			const detourB =
				maze.cellDistances[b]! + maze.goalDistances[b]! - maze.pathLength;

			if (detourA !== detourB) return detourB - detourA;
			if (maze.goalDistances[b] !== maze.goalDistances[a]) {
				return maze.goalDistances[b]! - maze.goalDistances[a]!;
			}

			return maze.cellDistances[b]! - maze.cellDistances[a]!;
		});

	const pickups: PickupState[] = [];
	const minSpacing = (CELL_OPEN_SIZE + WALL_THICKNESS) * 2.2;

	for (const cell of candidates) {
		const cellX = cell % maze.cols;
		const cellY = Math.floor(cell / maze.cols);
		const position = {
			x: logicalCellCenter(cellX),
			y: logicalCellCenter(cellY),
		};

		const tooCloseToGoal = distance(position, maze.goal) < CELL_OPEN_SIZE * 3.4;
		if (tooCloseToGoal) continue;

		if (
			pickups.some((pickup) => distance(pickup, position) < minSpacing) &&
			rng() > 0.12
		) {
			continue;
		}

		pickups.push({
			x: position.x,
			y: position.y,
			collected: false,
		});

		if (pickups.length >= variant.pickupCount) break;
	}

	return pickups;
}

function ammoPerMagForShards(shards: number) {
	return Math.min(9, 5 + Math.floor(shards / 2));
}

function moveSpeedForShards(shards: number) {
	return PLAYER_SPEED + shards * 0.08;
}

function maxHpForShards(shards: number) {
	return 6 + shards;
}

function reloadDurationForShards(shards: number) {
	return clamp(1.65 - shards * 0.12, 0.75, 1.65);
}

function radarCooldownForShards(shards: number) {
	return clamp(15 - shards * 1.1, 5, 15);
}

function radarRangeForShards(shards: number) {
	return clamp(5.2 + shards * 0.45, 5.2, 8.8);
}

function enemyCountForRound(round: number) {
	return clamp(2 + Math.floor(round / 2), 2, 7);
}

function worldToCellAxis(value: number, cells: number) {
	const firstCenter = logicalCellCenter(0);
	const stride = CELL_OPEN_SIZE + WALL_THICKNESS;
	return clamp(Math.round((value - firstCenter) / stride), 0, cells - 1);
}

function worldToCellIndex(maze: MazeDefinition, position: Vector) {
	const x = worldToCellAxis(position.x, maze.cols);
	const y = worldToCellAxis(position.y, maze.rows);
	return cellIndex(x, y, maze.cols, maze.rows);
}

function buildEnemySpawns(
	maze: MazeDefinition,
	pickups: readonly PickupState[],
	round: number,
	seed: number,
): EnemyState[] {
	const rng = createRng(seed ^ 0xc2b2ae35);
	const candidates = Array.from({ length: maze.cellDistances.length }, (_, index) => index)
		.filter((index) => {
			if (index === 0 || index === maze.goalCellIndex) return false;
			if (maze.cellDistances[index] < 4) return false;
			const x = index % maze.cols;
			const y = Math.floor(index / maze.cols);
			const position = { x: logicalCellCenter(x), y: logicalCellCenter(y) };
			return !pickups.some((pickup) => distance(pickup, position) < CELL_OPEN_SIZE * 2.4);
		})
		.sort((a, b) => {
			const weightA = maze.goalDistances[a]! + maze.cellDistances[a]! * 0.7 + rng();
			const weightB = maze.goalDistances[b]! + maze.cellDistances[b]! * 0.7 + rng();
			return weightB - weightA;
		});

	const enemies: EnemyState[] = [];
	const desiredCount = enemyCountForRound(round);

	for (const cell of candidates) {
		const x = cell % maze.cols;
		const y = Math.floor(cell / maze.cols);
		const position = {
			x: logicalCellCenter(x),
			y: logicalCellCenter(y),
		};

		if (enemies.some((enemy) => distance(enemy, position) < CELL_OPEN_SIZE * 3.2)) {
			continue;
		}

		const maxHp = 2 + ((round + cell) % 2);
		enemies.push({
			cellIndex: cell,
			nextCellIndex: null,
			progress: 0,
			x: position.x,
			y: position.y,
			hp: maxHp,
			maxHp,
			chasing: false,
			lostTimer: 0,
			attackCooldown: 0,
			revealedUntil: 0,
		});

		if (enemies.length >= desiredCount) break;
	}

	return enemies;
}

function pushRestart(controlsRef: MutableRefObject<ControlState>) {
	controlsRef.current.restart = true;
}

function mountLabyrinthExplorer(
	host: HTMLDivElement,
	PhaserLib: PhaserModule,
	options: MountOptions,
) {
	const { width, height } = resolveHostSize(host);
	let game: PhaserGame | null = null;
	let resizeObserver: ResizeObserver | null = null;

	class LabyrinthScene extends PhaserLib.Scene {
		private worldGraphics!: PhaserGraphics;
		private overlayGraphics!: PhaserGraphics;
		private minimapImage: PhaserImage | null = null;
		private minimapTextureKey: string | null = null;
		private minimapInfoText: PhaserText | null = null;
		private keyboard!: KeyboardState;
		private viewportWidth = width;
		private viewportHeight = height;
		private maze!: MazeDefinition;
		private player!: PlayerState;
		private theme: RoundTheme = ROUND_THEMES[0];
		private variant: RoundVariant = ROUND_VARIANTS[0];
		private pickups: PickupState[] = [];
		private enemies: EnemyState[] = [];
		private impacts: ImpactMark[] = [];
		private round = 1;
		private score = 0;
		private bestScore = options.initialBestScore;
		private timeLimit = 0;
		private timeLeft = 0;
		private lastGain = 0;
		private phase: RuntimeUiState["phase"] = "intro";
		private endReason: RuntimeUiState["endReason"] = "none";
		private ammoInMag = 5;
		private ammoPerMag = 5;
		private reloadTimer = 0;
		private playerHp = 6;
		private playerMaxHp = 6;
		private radarCooldown = 0;
		private radarPulse = 0;
		private radarPulseActive = false;
		private shootRequested = false;
		private weaponFlashTimer = 0;
		private weaponRecoil = 0;
		private lookDeltaX = 0;
		private lookDeltaY = 0;
		private seed = 0x9e3779b9;
		private lastUiAt = 0;
		private ready = false;

		create() {
			this.worldGraphics = this.add.graphics();
			this.overlayGraphics = this.add.graphics();
			this.worldGraphics.setDepth(0);
			this.overlayGraphics.setDepth(20);
			this.keyboard = this.createKeyboard();
			this.minimapInfoText = this.add
				.text(0, 0, "", {
					fontFamily: FONT_STACK,
					fontSize: "11px",
					color: "#d8e3ec",
				})
				.setDepth(21);
			this.input.mouse?.disableContextMenu();
			this.input.on("pointermove", (pointer: { event?: MouseEvent }) => {
				if (!this.input.mouse?.locked) return;
				this.lookDeltaX += pointer.event?.movementX ?? 0;
				this.lookDeltaY += pointer.event?.movementY ?? 0;
			});
			this.input.on("pointerdown", () => {
				if (this.phase !== "playing") return;
				if (!this.input.mouse?.locked) {
					this.input.mouse?.requestPointerLock();
					return;
				}
				this.shootRequested = true;
			});
			this.scale.on("resize", this.handleResize, this);
			this.startFreshGame();
			this.ready = true;
			options.onReady();
			this.pushUiState(true);
		}

		update(_: number, deltaMs: number) {
			if (!this.ready) return;

			const delta = Math.min(0.05, deltaMs / 1000);
			this.weaponRecoil = Math.max(0, this.weaponRecoil - delta * 11);
			this.weaponFlashTimer = Math.max(0, this.weaponFlashTimer - delta);
			const restartPressed =
				options.controlsRef.current.restart ||
				PhaserLib.Input.Keyboard.JustDown(this.keyboard.space) ||
				PhaserLib.Input.Keyboard.JustDown(this.keyboard.enter);

			if (restartPressed) {
				options.controlsRef.current.restart = false;
				if (this.phase === "intro") {
					this.beginRun();
				} else if (this.phase === "gameover") {
					this.startFreshGame();
					this.beginRun();
				} else {
					this.startFreshGame();
				}
				this.renderFrame();
				this.pushUiState(true);
				return;
			}

			if (this.phase === "playing") {
				this.updateCombatState(delta);
				this.updatePlayer(delta);
				this.updateEnemies(delta);
				this.timeLeft = Math.max(0, this.timeLeft - delta);

				if (this.playerHp <= 0) {
					this.triggerGameOver("death");
				} else if (distance(this.player, this.maze.goal) <= GOAL_RADIUS) {
					this.completeRound();
				} else if (this.timeLeft <= 0) {
					this.triggerGameOver("time");
				}
			}

			this.renderFrame();
			this.pushUiState(false);
		}

		private createKeyboard(): KeyboardState {
			const keyboard = this.input.keyboard;
			if (!keyboard) {
				throw new Error("Keyboard input is unavailable.");
			}

			return {
				up: keyboard.addKey(PhaserLib.Input.Keyboard.KeyCodes.UP),
				down: keyboard.addKey(PhaserLib.Input.Keyboard.KeyCodes.DOWN),
				left: keyboard.addKey(PhaserLib.Input.Keyboard.KeyCodes.LEFT),
				right: keyboard.addKey(PhaserLib.Input.Keyboard.KeyCodes.RIGHT),
				w: keyboard.addKey(PhaserLib.Input.Keyboard.KeyCodes.W),
				a: keyboard.addKey(PhaserLib.Input.Keyboard.KeyCodes.A),
				s: keyboard.addKey(PhaserLib.Input.Keyboard.KeyCodes.S),
				d: keyboard.addKey(PhaserLib.Input.Keyboard.KeyCodes.D),
				shift: keyboard.addKey(PhaserLib.Input.Keyboard.KeyCodes.SHIFT),
				r: keyboard.addKey(PhaserLib.Input.Keyboard.KeyCodes.R),
				q: keyboard.addKey(PhaserLib.Input.Keyboard.KeyCodes.Q),
				space: keyboard.addKey(PhaserLib.Input.Keyboard.KeyCodes.SPACE),
				enter: keyboard.addKey(PhaserLib.Input.Keyboard.KeyCodes.ENTER),
			};
		}

		private startFreshGame() {
			this.round = 1;
			this.score = 0;
			this.lastGain = 0;
			this.phase = "intro";
			this.endReason = "none";
			this.input.mouse?.releasePointerLock();
			this.seed = 0x9e3779b9;
			this.startRound();
			this.pushUiState(true);
		}

		private startRound() {
			this.seed = nextSeed(this.seed + this.round * 101);
			this.theme = pickTheme(this.round, this.seed);
			this.variant = pickVariant(this.round, this.seed);
			this.maze = generateMaze(this.round, this.seed);
			this.pickups = buildPickups(this.maze, this.variant, this.seed);
			this.enemies = buildEnemySpawns(this.maze, this.pickups, this.round, this.seed);
			this.impacts = [];
			this.player = {
				x: this.maze.start.x,
				y: this.maze.start.y,
				angle: this.spawnAngle(),
				pitch: 0,
			};
			this.timeLimit = clamp(
				roundTimeLimit(this.maze, this.round) * this.variant.timeScale,
				20,
				95,
			);
			this.timeLeft = this.timeLimit;
			this.phase = "intro";
			const shardCount = 0;
			this.ammoPerMag = ammoPerMagForShards(shardCount);
			this.ammoInMag = this.ammoPerMag;
			this.reloadTimer = 0;
			this.playerMaxHp = maxHpForShards(shardCount);
			this.playerHp = this.playerMaxHp;
			this.radarCooldown = 0;
			this.radarPulse = 0;
			this.radarPulseActive = false;
			this.shootRequested = false;
			this.weaponFlashTimer = 0;
			this.weaponRecoil = 0;
			this.lookDeltaX = 0;
			this.lookDeltaY = 0;
			this.rebuildMinimapTexture();
		}

		private beginRun() {
			this.phase = "playing";
		}

		private spawnAngle() {
			const optionsToFace = [
				{ x: this.maze.start.x + 1, y: this.maze.start.y, angle: 0 },
				{ x: this.maze.start.x, y: this.maze.start.y + 1, angle: Math.PI / 2 },
				{ x: this.maze.start.x - 1, y: this.maze.start.y, angle: Math.PI },
				{ x: this.maze.start.x, y: this.maze.start.y - 1, angle: -Math.PI / 2 },
			];

			for (const candidate of optionsToFace) {
				if (readWall(this.maze, Math.floor(candidate.x), Math.floor(candidate.y)) === 0) {
					return candidate.angle;
				}
			}

			return 0;
		}

		private updatePlayer(delta: number) {
			const controls = options.controlsRef.current;
			const moveForward =
				controls.forward || this.keyboard.up.isDown || this.keyboard.w.isDown;
			const moveBackward =
				controls.backward || this.keyboard.down.isDown || this.keyboard.s.isDown;
			const strafeLeft =
				controls.turnLeft || this.keyboard.left.isDown || this.keyboard.a.isDown;
			const strafeRight =
				controls.turnRight || this.keyboard.right.isDown || this.keyboard.d.isDown;
			const sprint = this.keyboard.shift.isDown;
			const moveInput = Number(moveForward) - Number(moveBackward);
			const strafeInput = Number(strafeRight) - Number(strafeLeft);
			const speed =
				moveSpeedForShards(this.collectedShardCount()) * (sprint ? SPRINT_MULTIPLIER : 1);

			if (this.lookDeltaX !== 0 || this.lookDeltaY !== 0) {
				this.player.angle = wrapAngle(
					this.player.angle + this.lookDeltaX * MOUSE_YAW_SENSITIVITY,
				);
				this.player.pitch = clamp(
					this.player.pitch - this.lookDeltaY * MOUSE_PITCH_SENSITIVITY,
					-LOOK_PITCH_LIMIT,
					LOOK_PITCH_LIMIT,
				);
				this.lookDeltaX = 0;
				this.lookDeltaY = 0;
			}

			if (moveInput === 0 && strafeInput === 0) {
				this.collectNearbyPickups();
				return;
			}

			const forwardStep = moveInput * speed * delta;
			const strafeStep = strafeInput * speed * delta * 0.92;
			const dx =
				Math.cos(this.player.angle) * forwardStep +
				Math.cos(this.player.angle + Math.PI / 2) * strafeStep;
			const dy =
				Math.sin(this.player.angle) * forwardStep +
				Math.sin(this.player.angle + Math.PI / 2) * strafeStep;
			const nextX = this.player.x + dx;
			const nextY = this.player.y + dy;

			if (!isBlocked(this.maze, nextX, this.player.y, PLAYER_RADIUS)) {
				this.player.x = nextX;
			}

			if (!isBlocked(this.maze, this.player.x, nextY, PLAYER_RADIUS)) {
				this.player.y = nextY;
			}

			this.collectNearbyPickups();
		}

		private completeRound() {
			const gain = roundScoreGain(this.round, this.maze, this.timeLeft, this.variant);
			this.score += gain;
			this.lastGain = gain;
			if (this.score > this.bestScore) {
				this.bestScore = this.score;
				options.onBestScore(this.bestScore);
			}
			this.round += 1;
			this.startRound();
			this.phase = "playing";
			this.pushUiState(true);
		}

		private triggerGameOver(reason: RuntimeUiState["endReason"]) {
			this.phase = "gameover";
			this.endReason = reason;
			this.input.mouse?.releasePointerLock();
			if (this.score > this.bestScore) {
				this.bestScore = this.score;
				options.onBestScore(this.bestScore);
			}
			this.pushUiState(true);
		}

		private pushUiState(force: boolean) {
			const now = this.time.now;
			if (!force && now - this.lastUiAt < 80) return;
			this.lastUiAt = now;

			options.onUiState({
				phase: this.phase,
				endReason: this.endReason,
				round: this.round,
				score: this.score,
				bestScore: this.bestScore,
				timeLeft: this.timeLeft,
				timeLimit: this.timeLimit,
				goalDistance: distance(this.player, this.maze.goal),
				lastGain: this.lastGain,
				roundsCleared: Math.max(0, this.round - 1),
				mazeLabel: `${this.maze.cols} x ${this.maze.rows}`,
				themeLabel: this.theme.name,
				variantLabel: this.variant.name,
				variantSummary: this.variant.summary,
				pickupsFound: this.pickups.filter((pickup) => pickup.collected).length,
				pickupsTotal: this.pickups.length,
				ammoInMag: this.ammoInMag,
				ammoPerMag: this.ammoPerMag,
				reloading: this.reloadTimer > 0,
				reloadProgress:
					this.reloadTimer > 0
						? 1 - this.reloadTimer / reloadDurationForShards(this.collectedShardCount())
						: 0,
				playerHp: this.playerHp,
				playerMaxHp: this.playerMaxHp,
				enemiesAlive: this.enemies.filter((enemy) => enemy.hp > 0).length,
				radarReady: this.radarCooldown <= 0,
				radarCooldownLeft: Math.max(0, this.radarCooldown),
			});
		}

		private handleResize(gameSize: { width: number; height: number }) {
			this.viewportWidth = Math.max(1, Math.floor(gameSize.width));
			this.viewportHeight = Math.max(1, Math.floor(gameSize.height));
			this.renderFrame();
			this.pushUiState(true);
		}

		private collectedShardCount() {
			return this.pickups.filter((pickup) => pickup.collected).length;
		}

		private getHorizonY() {
			return clamp(
				this.viewportHeight * 0.5 + this.player.pitch * this.viewportHeight * 0.33,
				this.viewportHeight * 0.2,
				this.viewportHeight * 0.8,
			);
		}

		private updateCombatState(delta: number) {
			const shards = this.collectedShardCount();
			this.ammoPerMag = ammoPerMagForShards(shards);
			this.playerMaxHp = maxHpForShards(shards);
			this.playerHp = Math.min(this.playerHp, this.playerMaxHp);

			if (this.reloadTimer > 0) {
				this.reloadTimer = Math.max(0, this.reloadTimer - delta);
				if (this.reloadTimer === 0) {
					this.ammoInMag = this.ammoPerMag;
				}
			}

			if (this.radarCooldown > 0) {
				this.radarCooldown = Math.max(0, this.radarCooldown - delta);
			}

			if (this.radarPulseActive) {
				const radarRange = radarRangeForShards(shards);
				this.radarPulse += delta * 6.8;

				for (const enemy of this.enemies) {
					if (enemy.hp <= 0) continue;
					const enemyDistance = distance(this.player, enemy);
					for (const offset of RADAR_ECHO_OFFSETS) {
						const ringRadius = this.radarPulse - offset;
						if (ringRadius <= 0 || ringRadius > radarRange) continue;
						if (Math.abs(enemyDistance - ringRadius) <= 0.34) {
							enemy.revealedUntil = this.time.now + 4200;
							break;
						}
					}
				}

				if (this.radarPulse > radarRange + RADAR_ECHO_OFFSETS[RADAR_ECHO_OFFSETS.length - 1]) {
					this.radarPulseActive = false;
					this.radarPulse = 0;
				}
			}

			if (PhaserLib.Input.Keyboard.JustDown(this.keyboard.r)) {
				this.tryStartReload();
			}

			if (PhaserLib.Input.Keyboard.JustDown(this.keyboard.q)) {
				this.tryUseRadar();
			}

			if (this.shootRequested) {
				this.shootRequested = false;
				this.tryShoot();
			}
		}

		private tryStartReload() {
			if (this.reloadTimer > 0 || this.ammoInMag >= this.ammoPerMag) return;
			this.reloadTimer = reloadDurationForShards(this.collectedShardCount());
		}

		private tryUseRadar() {
			if (this.radarCooldown > 0) return;
			this.radarCooldown = radarCooldownForShards(this.collectedShardCount());
			this.radarPulse = 0;
			this.radarPulseActive = true;
		}

		private tryShoot() {
			if (this.reloadTimer > 0) return;
			if (this.ammoInMag <= 0) {
				this.tryStartReload();
				return;
			}

			this.ammoInMag -= 1;
			this.weaponRecoil = 1;
			this.weaponFlashTimer = 0.06;
			const wallHit = castRay(this.maze, this.player, this.player.angle);
			const hitEnemy = this.findShotEnemy(wallHit.distance);

			if (hitEnemy) {
				const critChance = clamp(0.16 + this.collectedShardCount() * 0.08, 0.16, 0.72);
				const crit =
					createRng((this.seed ^ hitEnemy.cellIndex ^ Math.floor(this.time.now)) >>> 0)() <
					critChance;
				const damage = crit ? 2 + Math.floor(this.collectedShardCount() / 4) : 1;
				hitEnemy.hp = Math.max(0, hitEnemy.hp - damage);
				hitEnemy.chasing = true;
				hitEnemy.lostTimer = 3.8;
				hitEnemy.revealedUntil = this.time.now + 2500;
				if (hitEnemy.hp <= 0) {
					this.score += 90 + this.round * 12;
					this.lastGain = 90 + this.round * 12;
				}
			} else {
				const impactSeed =
					(this.seed ^
						wallHit.cellX * 92821 ^
						wallHit.cellY * 68917 ^
						Math.floor(this.time.now)) >>>
					0;
				const impactRng = createRng(impactSeed);
				const nextImpact: ImpactMark = {
					side: wallHit.side,
					hitX: wallHit.hitX,
					hitY: wallHit.hitY,
					heightRatio: 0.42 + impactRng() * 0.22,
					spread: 0.035 + impactRng() * 0.014,
					spin: impactRng() * TAU,
				};
				const existingImpactIndex = this.impacts.findIndex(
					(impact) =>
						impact.side === nextImpact.side &&
						Math.abs(
							impact.side === 0
								? impact.hitX - nextImpact.hitX
								: impact.hitY - nextImpact.hitY,
						) < 0.08 &&
						Math.abs(
							impact.side === 0
								? impact.hitY - nextImpact.hitY
								: impact.hitX - nextImpact.hitX,
						) < Math.max(impact.spread, nextImpact.spread) * 1.15 &&
						Math.abs(impact.heightRatio - nextImpact.heightRatio) < 0.14,
				);

				if (existingImpactIndex >= 0) {
					this.impacts[existingImpactIndex] = nextImpact;
				} else {
					this.impacts.push(nextImpact);
				}

				if (this.impacts.length > 36) {
					this.impacts.shift();
				}
			}

			if (this.ammoInMag <= 0) {
				this.tryStartReload();
			}
		}

		private findShotEnemy(maxDistance: number) {
			let closestEnemy: EnemyState | null = null;
			let closestDistance = maxDistance;

			for (const enemy of this.enemies) {
				if (enemy.hp <= 0) continue;
				const toEnemy = {
					x: enemy.x - this.player.x,
					y: enemy.y - this.player.y,
				};
				const along = toEnemy.x * Math.cos(this.player.angle) + toEnemy.y * Math.sin(this.player.angle);
				if (along <= 0 || along >= closestDistance) continue;
				const perp = Math.abs(
					toEnemy.x * Math.sin(this.player.angle) - toEnemy.y * Math.cos(this.player.angle),
				);
				if (perp > 0.32) continue;
				closestDistance = along;
				closestEnemy = enemy;
			}

			return closestEnemy;
		}

		private moveEnemyToward(enemy: EnemyState, target: Vector, distanceStep: number) {
			const dx = target.x - enemy.x;
			const dy = target.y - enemy.y;
			const totalDistance = Math.hypot(dx, dy);
			if (totalDistance <= 0.0001) return false;

			const step = Math.min(distanceStep, totalDistance);
			const moveX = (dx / totalDistance) * step;
			const moveY = (dy / totalDistance) * step;
			const nextX = enemy.x + moveX;
			const nextY = enemy.y + moveY;
			let moved = false;

			if (!isBlocked(this.maze, nextX, enemy.y, ENEMY_RADIUS)) {
				enemy.x = nextX;
				moved = true;
			}

			if (!isBlocked(this.maze, enemy.x, nextY, ENEMY_RADIUS)) {
				enemy.y = nextY;
				moved = true;
			}

			if (moved) {
				enemy.cellIndex = worldToCellIndex(this.maze, enemy);
			}

			return moved;
		}

		private updateEnemies(delta: number) {
			const playerCell = worldToCellIndex(this.maze, this.player);
			const chaseDistances = computeCellDistances(
				this.maze.cells,
				this.maze.cols,
				this.maze.rows,
				playerCell,
			);

			for (const enemy of this.enemies) {
				if (enemy.hp <= 0) continue;

				enemy.attackCooldown = Math.max(0, enemy.attackCooldown - delta);
				const enemyToPlayer = distance(enemy, this.player);
				const angleToPlayer = Math.atan2(this.player.y - enemy.y, this.player.x - enemy.x);
				const losRay = castRay(this.maze, enemy, angleToPlayer);
				const seesPlayer = losRay.distance + 0.08 >= enemyToPlayer && enemyToPlayer <= 10;

				if (seesPlayer) {
					enemy.chasing = true;
					enemy.lostTimer = 4.5;
					enemy.revealedUntil = this.time.now + 1200;
				} else if (enemy.chasing) {
					enemy.lostTimer = Math.max(0, enemy.lostTimer - delta);
					if (enemy.lostTimer === 0 || enemyToPlayer > 16) {
						enemy.chasing = false;
						enemy.nextCellIndex = null;
						enemy.progress = 0;
					}
				}

				if (!enemy.chasing) continue;

				if (enemyToPlayer < 0.72) {
					if (enemy.attackCooldown === 0) {
						this.playerHp = Math.max(0, this.playerHp - 1);
						enemy.attackCooldown = 1.15;
					}
					continue;
				}

				const currentCell = worldToCellIndex(this.maze, enemy);
				enemy.cellIndex = currentCell;
				const directPursuit =
					seesPlayer ||
					currentCell === playerCell ||
					(chaseDistances[currentCell] >= 0 && chaseDistances[currentCell] <= 1);

				if (directPursuit) {
					enemy.nextCellIndex = null;
					enemy.progress = 0;
					const movedDirectly = this.moveEnemyToward(
						enemy,
						this.player,
						(1.42 + this.round * 0.035) * delta,
					);
					if (movedDirectly) {
						continue;
					}
				}

				if (enemy.nextCellIndex === null || enemy.progress >= 1) {
					let bestCell = currentCell;
					let bestDistance = chaseDistances[currentCell];
					const cell = this.maze.cells[currentCell];
					const neighbors: Array<{ index: number; open: boolean }> = [
						{ index: cellIndex(currentCell % this.maze.cols, Math.floor(currentCell / this.maze.cols) - 1, this.maze.cols, this.maze.rows), open: !cell.walls[0] },
						{ index: cellIndex((currentCell % this.maze.cols) + 1, Math.floor(currentCell / this.maze.cols), this.maze.cols, this.maze.rows), open: !cell.walls[1] },
						{ index: cellIndex(currentCell % this.maze.cols, Math.floor(currentCell / this.maze.cols) + 1, this.maze.cols, this.maze.rows), open: !cell.walls[2] },
						{ index: cellIndex((currentCell % this.maze.cols) - 1, Math.floor(currentCell / this.maze.cols), this.maze.cols, this.maze.rows), open: !cell.walls[3] },
					];

					for (const neighbor of neighbors) {
						if (!neighbor.open || neighbor.index < 0) continue;
						const candidateDistance = chaseDistances[neighbor.index];
						if (candidateDistance >= 0 && candidateDistance < bestDistance) {
							bestDistance = candidateDistance;
							bestCell = neighbor.index;
						}
					}

					if (bestCell !== currentCell) {
						enemy.nextCellIndex = bestCell;
						enemy.progress = 0;
					} else {
						enemy.nextCellIndex = null;
					}
				}

				if (enemy.nextCellIndex !== null) {
					const nextX = logicalCellCenter(enemy.nextCellIndex % this.maze.cols);
					const nextY = logicalCellCenter(Math.floor(enemy.nextCellIndex / this.maze.cols));
					const currentX = logicalCellCenter(enemy.cellIndex % this.maze.cols);
					const currentY = logicalCellCenter(Math.floor(enemy.cellIndex / this.maze.cols));
					const travelSpeed = 1.2 + this.round * 0.03;
					const segmentLength = Math.hypot(nextX - currentX, nextY - currentY) || 1;
					enemy.progress = Math.min(1, enemy.progress + (travelSpeed * delta) / segmentLength);
					enemy.x = lerp(currentX, nextX, enemy.progress);
					enemy.y = lerp(currentY, nextY, enemy.progress);

					if (enemy.progress >= 1) {
						enemy.cellIndex = enemy.nextCellIndex;
						enemy.nextCellIndex = null;
						enemy.progress = 0;
					}
				}
			}
		}

		private renderFrame() {
			this.worldGraphics.clear();
			this.overlayGraphics.clear();
			this.drawBackdrop();
			const rays = this.drawWorld();
			this.drawEnemies(rays);
			this.drawPickups(rays);
			this.drawGoalBeacon(rays);
			this.drawMinimap(rays);
			this.drawWeaponModel();

			if (this.phase !== "playing") {
				this.drawOverlayShade();
			}
		}

		private drawBackdrop() {
			const bands = 18;
			const horizon = this.getHorizonY();
			const skyHeight = Math.max(1, horizon);
			const floorHeight = Math.max(1, this.viewportHeight - horizon);
			for (let index = 0; index < bands; index++) {
				const t = index / (bands - 1);
				const topColor = colorFromRgb(mixRgb(this.theme.skyTop, this.theme.skyBottom, t));
				const bottomColor = colorFromRgb(
					mixRgb(this.theme.floorTop, this.theme.floorBottom, t),
				);
				const topY = (skyHeight / bands) * index;
				const bottomY = horizon + (floorHeight / bands) * index;

				this.worldGraphics.fillStyle(topColor, 1);
				this.worldGraphics.fillRect(
					0,
					topY,
					this.viewportWidth,
					Math.ceil(skyHeight / bands) + 1,
				);
				this.worldGraphics.fillStyle(bottomColor, 1);
				this.worldGraphics.fillRect(
					0,
					bottomY,
					this.viewportWidth,
					Math.ceil(floorHeight / bands) + 1,
				);
			}

			this.worldGraphics.fillStyle(colorFromRgb(this.theme.wallHighlight), 0.028);
			for (let line = 0; line < 14; line++) {
				const y = horizon + line * 18;
				this.worldGraphics.fillRect(0, y, this.viewportWidth, 1);
			}
		}

		private drawWorld() {
			const sliceWidth = this.viewportWidth < 520 ? 3 : 2;
			const rayCount = Math.max(120, Math.ceil(this.viewportWidth / sliceWidth));
			const rays: RayHit[] = [];

			for (let index = 0; index < rayCount; index++) {
				const t = index / Math.max(1, rayCount - 1);
				const rayAngle = this.player.angle - FIELD_OF_VIEW * 0.5 + t * FIELD_OF_VIEW;
				const hit = castRay(this.maze, this.player, rayAngle);
				rays.push(hit);

				const correctedDistance =
					hit.distance * Math.cos(rayAngle - this.player.angle);
				const safeDistance = Math.max(0.0001, correctedDistance);
				const wallHeight = Math.min(
					this.viewportHeight * 1.25,
					(this.viewportHeight / safeDistance) * 0.8,
				);
				const top = this.getHorizonY() - wallHeight * 0.5;
				hit.projectedTop = top;
				hit.projectedHeight = wallHeight;
				const fogT = clamp(safeDistance / 28, 0, 1);
				const horizontalTone =
					0.975 +
					Math.sin(hit.texCoord * Math.PI * 2) * 0.018 +
					Math.sin(hit.texCoord * Math.PI * 6 + 0.8) * 0.01;
				const sideShade = hit.side === 0 ? 1 : 0.8;
				const baseR = lerp(this.theme.wallNear.r, this.theme.wallFar.r, fogT);
				const baseG = lerp(this.theme.wallNear.g, this.theme.wallFar.g, fogT);
				const baseB = lerp(this.theme.wallNear.b, this.theme.wallFar.b, fogT);
				const litR =
					lerp(baseR, this.theme.wallHighlight.r, 0.05) * horizontalTone * sideShade;
				const litG =
					lerp(baseG, this.theme.wallHighlight.g, 0.05) * horizontalTone * sideShade;
				const litB =
					lerp(baseB, this.theme.wallHighlight.b, 0.05) * horizontalTone * sideShade;
				const wallColor = colorInt(litR, litG, litB);
				const x = index * sliceWidth;
				const sliceVisualWidth = Math.ceil(sliceWidth) + 1;

				this.worldGraphics.fillStyle(wallColor, 1);
				this.worldGraphics.fillRect(x, top, sliceVisualWidth, Math.ceil(wallHeight));

				const capAlpha = clamp((1 - fogT) * 0.16, 0.015, 0.12);
				this.worldGraphics.fillStyle(colorFromRgb(this.theme.wallHighlight), capAlpha);
				this.worldGraphics.fillRect(x, top, sliceVisualWidth, 1);

				for (let impactIndex = this.impacts.length - 1; impactIndex >= 0; impactIndex -= 1) {
					const impact = this.impacts[impactIndex];
					if (impact.side !== hit.side) continue;

					const planeDelta = Math.abs(
						hit.side === 0 ? hit.hitX - impact.hitX : hit.hitY - impact.hitY,
					);
					if (planeDelta > 0.08) continue;

					const alongDelta =
						hit.side === 0 ? hit.hitY - impact.hitY : hit.hitX - impact.hitX;
					if (Math.abs(alongDelta) > impact.spread) continue;

					const localX = alongDelta / impact.spread;
					const starProfile = 0.74 + Math.sin((localX + impact.spin) * 8.4) * 0.1;
					const edgeFade = Math.pow(1 - clamp(Math.abs(localX), 0, 1), 0.42);
					const holeHalfHeight =
						wallHeight * 0.046 * edgeFade * clamp(starProfile, 0.58, 1.04);
					const markY = top + wallHeight * impact.heightRatio;
					const markTop = markY - holeHalfHeight;
					const markHeight = holeHalfHeight * 2;
					const centerX = x + sliceVisualWidth * 0.5;

					this.worldGraphics.fillStyle(0x020202, 0.94);
					this.worldGraphics.fillRect(
						centerX - sliceVisualWidth * 0.55,
						markTop,
						sliceVisualWidth * 1.1,
						markHeight,
					);
					this.worldGraphics.fillStyle(0x0d0d0d, 0.38);
					this.worldGraphics.fillRect(
						centerX - sliceVisualWidth * 0.55,
						markTop - wallHeight * 0.012,
						sliceVisualWidth * 1.1,
						Math.max(1, wallHeight * 0.012),
					);
					this.worldGraphics.fillStyle(0x1c1c1c, 0.18);
					this.worldGraphics.fillRect(
						centerX - sliceVisualWidth * 0.32,
						markY + holeHalfHeight * 0.16,
						sliceVisualWidth * 0.64,
						Math.max(1, holeHalfHeight * 0.38),
					);
					break;
				}
			}

			return rays;
		}

		private drawEnemies(rays: RayHit[]) {
			for (const enemy of this.enemies) {
				if (enemy.hp <= 0) continue;

				const toEnemy = {
					x: enemy.x - this.player.x,
					y: enemy.y - this.player.y,
				};
				const enemyDistance = Math.hypot(toEnemy.x, toEnemy.y);
				const enemyAngle = Math.atan2(toEnemy.y, toEnemy.x);
				const angleDelta = wrapAngle(enemyAngle - this.player.angle);
				if (Math.abs(angleDelta) > FIELD_OF_VIEW * 0.62) continue;

				const visibilityRay = castRay(this.maze, this.player, enemyAngle);
				if (visibilityRay.distance + 0.12 < enemyDistance) continue;

				const projectedX = (0.5 + angleDelta / FIELD_OF_VIEW) * this.viewportWidth;
				const correctedDistance = Math.max(
					0.36,
					enemyDistance * Math.cos(angleDelta),
				);
				const unitHeight = clamp(
					(this.viewportHeight / correctedDistance) * 0.8,
					28,
					this.viewportHeight * 1.08,
				);
				const baseY = this.getHorizonY() + unitHeight * 0.5;
				const enemyHeight = unitHeight * 0.86;
				const enemyWidth = enemyHeight * 0.44;
				const topY = baseY - enemyHeight;
				const stride = Math.sin((this.time.now * 0.007 + enemy.progress * 4.2) % TAU);
				const sliceIndex = clamp(
					Math.floor((projectedX / this.viewportWidth) * rays.length),
					0,
					rays.length - 1,
				);
				const halfSpan = Math.max(
					1,
					Math.ceil((enemyWidth / this.viewportWidth) * rays.length * 0.75),
				);
				let wallDepth = MAX_RAY_DISTANCE;
				for (let offset = -halfSpan; offset <= halfSpan; offset += halfSpan) {
					const sample = rays[clamp(sliceIndex + offset, 0, rays.length - 1)];
					wallDepth = Math.min(wallDepth, sample?.distance ?? MAX_RAY_DISTANCE);
				}
				if (enemyDistance > wallDepth + 0.08) continue;

				this.worldGraphics.fillStyle(0x180808, 0.26);
				this.worldGraphics.fillEllipse(
					projectedX,
					baseY + enemyHeight * 0.08,
					enemyWidth * 1.5,
					enemyHeight * 0.22,
				);
				this.worldGraphics.fillStyle(enemy.chasing ? 0x7b1717 : 0x5d2323, 0.98);
				this.worldGraphics.fillRect(
					projectedX - enemyWidth * 0.18,
					topY + enemyHeight * 0.22,
					enemyWidth * 0.36,
					enemyHeight * 0.4,
				);
				this.worldGraphics.fillStyle(0x892222, 0.96);
				this.worldGraphics.fillRect(
					projectedX - enemyWidth * 0.34,
					topY + enemyHeight * 0.28,
					enemyWidth * 0.68,
					enemyHeight * 0.1,
				);
				this.worldGraphics.fillStyle(0x551111, 1);
				this.worldGraphics.fillRect(
					projectedX - enemyWidth * 0.24,
					topY + enemyHeight * 0.64,
					enemyWidth * 0.14,
					enemyHeight * 0.3 + stride * enemyHeight * 0.04,
				);
				this.worldGraphics.fillRect(
					projectedX + enemyWidth * 0.1,
					topY + enemyHeight * 0.64,
					enemyWidth * 0.14,
					enemyHeight * 0.3 - stride * enemyHeight * 0.04,
				);
				this.worldGraphics.fillStyle(0x4b0d0d, 1);
				this.worldGraphics.fillRect(
					projectedX - enemyWidth * 0.48,
					topY + enemyHeight * 0.32,
					enemyWidth * 0.16,
					enemyHeight * 0.24,
				);
				this.worldGraphics.fillRect(
					projectedX + enemyWidth * 0.32,
					topY + enemyHeight * 0.32,
					enemyWidth * 0.16,
					enemyHeight * 0.24,
				);
				this.worldGraphics.fillStyle(0x230606, 1);
				this.worldGraphics.fillCircle(
					projectedX,
					topY + enemyHeight * 0.16,
					enemyWidth * 0.2,
				);
				this.worldGraphics.fillStyle(0xff7b7b, enemy.chasing ? 0.92 : 0.5);
				this.worldGraphics.fillRect(
					projectedX - enemyWidth * 0.16,
					topY + enemyHeight * 0.14,
					enemyWidth * 0.09,
					enemyHeight * 0.024,
				);
				this.worldGraphics.fillRect(
					projectedX + enemyWidth * 0.07,
					topY + enemyHeight * 0.14,
					enemyWidth * 0.09,
					enemyHeight * 0.024,
				);
				const hpRatio = enemy.hp / enemy.maxHp;
				this.worldGraphics.fillStyle(0x2d1111, 0.9);
				this.worldGraphics.fillRect(
					projectedX - enemyWidth * 0.34,
					topY - 8,
					enemyWidth * 0.68,
					4,
				);
				this.worldGraphics.fillStyle(0xff5e5e, 0.95);
				this.worldGraphics.fillRect(
					projectedX - enemyWidth * 0.34,
					topY - 8,
					enemyWidth * 0.68 * hpRatio,
					4,
				);
			}
		}

		private drawPickups(rays: RayHit[]) {
			for (const pickup of this.pickups) {
				if (pickup.collected) continue;

				const toPickup = {
					x: pickup.x - this.player.x,
					y: pickup.y - this.player.y,
				};
				const pickupDistance = Math.hypot(toPickup.x, toPickup.y);
				const pickupAngle = Math.atan2(toPickup.y, toPickup.x);
				const angleDelta = wrapAngle(pickupAngle - this.player.angle);
				if (Math.abs(angleDelta) > FIELD_OF_VIEW * 0.58) continue;

				const visibilityRay = castRay(this.maze, this.player, pickupAngle);
				if (visibilityRay.distance + 0.1 < pickupDistance) continue;

				const projectedX = (0.5 + angleDelta / FIELD_OF_VIEW) * this.viewportWidth;
				const correctedDistance = Math.max(
					0.45,
					pickupDistance * Math.cos(angleDelta),
				);
				const unitHeight = clamp(
					(this.viewportHeight / correctedDistance) * 0.8,
					18,
					this.viewportHeight * 0.56,
				);
				const crystalHeight = unitHeight * 0.42;
				const baseY = this.getHorizonY() + unitHeight * 0.5;
				const hover =
					Math.sin(this.time.now * 0.005 + pickup.x * 0.7 + pickup.y * 0.5) *
					crystalHeight *
					0.08;
				const centerY = baseY - crystalHeight * 0.65 + hover;
				const sliceIndex = clamp(
					Math.floor((projectedX / this.viewportWidth) * rays.length),
					0,
					rays.length - 1,
				);
				const wallDepth = rays[sliceIndex]?.distance ?? MAX_RAY_DISTANCE;
				if (pickupDistance > wallDepth + 0.1) continue;

				this.worldGraphics.fillStyle(colorFromRgb(this.theme.pickup), 0.12);
				this.worldGraphics.fillEllipse(
					projectedX,
					baseY + crystalHeight * 0.16,
					crystalHeight * 1.55,
					crystalHeight * 0.34,
				);
				this.worldGraphics.fillStyle(colorFromRgb(this.theme.pickup), 0.14);
				this.worldGraphics.fillEllipse(
					projectedX,
					centerY,
					crystalHeight * 1.3,
					crystalHeight * 0.84,
				);
				this.worldGraphics.fillStyle(colorFromRgb(this.theme.pickup), 0.95);
				this.worldGraphics.beginPath();
				this.worldGraphics.moveTo(projectedX, centerY - crystalHeight * 0.52);
				this.worldGraphics.lineTo(projectedX + crystalHeight * 0.24, centerY);
				this.worldGraphics.lineTo(projectedX, centerY + crystalHeight * 0.52);
				this.worldGraphics.lineTo(projectedX - crystalHeight * 0.24, centerY);
				this.worldGraphics.closePath();
				this.worldGraphics.fillPath();
				this.worldGraphics.fillStyle(colorFromRgb(this.theme.wallHighlight), 0.45);
				this.worldGraphics.fillRect(
					projectedX - crystalHeight * 0.04,
					centerY - crystalHeight * 0.36,
					crystalHeight * 0.08,
					crystalHeight * 0.32,
				);
			}
		}

		private drawGoalBeacon(rays: RayHit[]) {
			const toGoal = {
				x: this.maze.goal.x - this.player.x,
				y: this.maze.goal.y - this.player.y,
			};
			const goalDistance = Math.hypot(toGoal.x, toGoal.y);
			const goalAngle = Math.atan2(toGoal.y, toGoal.x);
			const angleDelta = wrapAngle(goalAngle - this.player.angle);
			if (Math.abs(angleDelta) > FIELD_OF_VIEW * 0.62) return;
			const projectedX = (0.5 + angleDelta / FIELD_OF_VIEW) * this.viewportWidth;
			const correctedDistance = Math.max(0.4, goalDistance * Math.cos(angleDelta));
			const unitHeight = clamp(
				(this.viewportHeight / correctedDistance) * 0.8,
				24,
				this.viewportHeight * 1.2,
			);
			const crystalHeight = unitHeight * 0.7;
			const baseY = this.getHorizonY() + unitHeight * 0.5;
			const centerY = baseY - crystalHeight * 0.72;
			const sliceIndex = clamp(
				Math.floor((projectedX / this.viewportWidth) * rays.length),
				0,
				rays.length - 1,
			);
			const wallTop = rays[sliceIndex]?.projectedTop ?? this.viewportHeight;
			const visibilityRay = castRay(this.maze, this.player, goalAngle);
			const hasLineOfSight = visibilityRay.distance + 0.12 >= goalDistance;
			const beamWidth = Math.max(7, crystalHeight * 0.16);
			const beamTop = centerY - crystalHeight * 11.5;
			const beamBottom = hasLineOfSight
				? baseY + crystalHeight * 0.12
				: Math.min(baseY + crystalHeight * 0.12, wallTop - 2);

			if (beamBottom > beamTop) {
				this.worldGraphics.fillStyle(colorFromRgb(this.theme.goal), 0.08);
				this.worldGraphics.fillRect(
					projectedX - beamWidth * 1.9,
					beamTop,
					beamWidth * 3.8,
					beamBottom - beamTop,
				);
				this.worldGraphics.fillStyle(colorFromRgb(this.theme.goal), 0.28);
				this.worldGraphics.fillRect(
					projectedX - beamWidth * 0.55,
					beamTop,
					beamWidth * 1.1,
					beamBottom - beamTop,
				);
				this.worldGraphics.fillStyle(colorFromRgb(this.theme.goal), 0.16);
				this.worldGraphics.fillEllipse(
					projectedX,
					beamTop + crystalHeight * 0.14,
					crystalHeight * 1.1,
					crystalHeight * 0.44,
				);
				this.worldGraphics.fillStyle(colorFromRgb(this.theme.wallHighlight), 0.2);
				this.worldGraphics.fillEllipse(
					projectedX,
					beamTop + crystalHeight * 0.22,
					crystalHeight * 0.52,
					crystalHeight * 0.16,
				);
			}

			if (!hasLineOfSight) return;

			this.worldGraphics.fillStyle(colorFromRgb(this.theme.goal), 0.16);
			this.worldGraphics.fillEllipse(
				projectedX,
				baseY + crystalHeight * 0.08,
				crystalHeight * 2.2,
				crystalHeight * 0.56,
			);
			this.worldGraphics.fillStyle(colorFromRgb(this.theme.goal), 0.22);
			this.worldGraphics.fillEllipse(
				projectedX,
				baseY + crystalHeight * 0.02,
				crystalHeight * 1.4,
				crystalHeight * 0.34,
			);
			this.worldGraphics.fillStyle(colorFromRgb(this.theme.goal), 0.96);
			this.worldGraphics.beginPath();
			this.worldGraphics.moveTo(projectedX, centerY - crystalHeight * 0.62);
			this.worldGraphics.lineTo(projectedX + crystalHeight * 0.24, centerY);
			this.worldGraphics.lineTo(projectedX, centerY + crystalHeight * 0.62);
			this.worldGraphics.lineTo(projectedX - crystalHeight * 0.24, centerY);
			this.worldGraphics.closePath();
			this.worldGraphics.fillPath();
			this.worldGraphics.fillStyle(colorFromRgb(this.theme.wallHighlight), 0.4);
			this.worldGraphics.fillRect(
				projectedX - crystalHeight * 0.04,
				centerY - crystalHeight * 0.34,
				crystalHeight * 0.08,
				crystalHeight * 0.3,
			);
		}

		private drawMinimap(rays: RayHit[]) {
			const mapMargin = 18;
			const maxPanelWidth = Math.min(220, this.viewportWidth * 0.28);
			const maxPanelHeight = Math.min(220, this.viewportHeight * 0.32);
			const tileScale = clamp(
				Math.floor(
					Math.min(maxPanelWidth / this.maze.mapWidth, maxPanelHeight / this.maze.mapHeight),
				),
				4,
				12,
			);
			const mapPixelWidth = this.maze.mapWidth * tileScale;
			const mapPixelHeight = this.maze.mapHeight * tileScale;
			const panelWidth = mapPixelWidth + 24;
			const panelHeight = mapPixelHeight + 24;
			const panelX = this.viewportWidth - panelWidth - mapMargin;
			const panelY = mapMargin;
			const mapX = panelX + 12;
			const mapY = panelY + 12;

			if (this.minimapImage) {
				this.minimapImage.setPosition(mapX, mapY);
				this.minimapImage.setDisplaySize(mapPixelWidth, mapPixelHeight);
				this.minimapImage.setVisible(true);
			}

			this.overlayGraphics.fillStyle(colorFromRgb(this.theme.panel), 0.22);
			this.overlayGraphics.fillRect(panelX, panelY, panelWidth, panelHeight);
			this.overlayGraphics.lineStyle(2, colorFromRgb(this.theme.wallFar), 0.85);
			this.overlayGraphics.strokeRect(panelX, panelY, panelWidth, panelHeight);
			this.overlayGraphics.fillStyle(colorFromRgb(this.theme.goal), 0.95);
			this.overlayGraphics.fillEllipse(
				mapX + this.maze.goal.x * tileScale,
				mapY + this.maze.goal.y * tileScale,
				tileScale * 1.2,
				tileScale * 1.2,
			);

			for (const pickup of this.pickups) {
				if (pickup.collected) continue;
				this.overlayGraphics.fillStyle(colorFromRgb(this.theme.pickup), 0.95);
				this.overlayGraphics.fillCircle(
					mapX + pickup.x * tileScale,
					mapY + pickup.y * tileScale,
					Math.max(2, tileScale * 0.22),
				);
			}

			if (this.radarPulseActive) {
				for (const offset of RADAR_ECHO_OFFSETS) {
					const ringRadius = this.radarPulse - offset;
					if (
						ringRadius <= 0 ||
						ringRadius > radarRangeForShards(this.collectedShardCount())
					) {
						continue;
					}
					this.overlayGraphics.lineStyle(2, 0xff6b6b, 0.34 - offset * 0.06);
					this.overlayGraphics.strokeCircle(
						mapX + this.player.x * tileScale,
						mapY + this.player.y * tileScale,
						ringRadius * tileScale,
					);
				}
			}

			for (const enemy of this.enemies) {
				if (enemy.hp <= 0 || enemy.revealedUntil < this.time.now) continue;
				this.overlayGraphics.fillStyle(0xff4f4f, 0.95);
				this.overlayGraphics.fillCircle(
					mapX + enemy.x * tileScale,
					mapY + enemy.y * tileScale,
					Math.max(2, tileScale * 0.24),
				);
			}

			this.overlayGraphics.lineStyle(1, colorFromRgb(this.theme.goal), 0.28);
			const rayStep = Math.max(1, Math.floor(rays.length / 18));
			for (let index = 0; index < rays.length; index += rayStep) {
				const hit = rays[index];
				this.overlayGraphics.beginPath();
				this.overlayGraphics.moveTo(
					mapX + this.player.x * tileScale,
					mapY + this.player.y * tileScale,
				);
				this.overlayGraphics.lineTo(
					mapX + hit.hitX * tileScale,
					mapY + hit.hitY * tileScale,
				);
				this.overlayGraphics.strokePath();
			}

			const playerMapX = mapX + this.player.x * tileScale;
			const playerMapY = mapY + this.player.y * tileScale;
			this.overlayGraphics.fillStyle(0xffcc6b, 1);
			this.overlayGraphics.fillCircle(playerMapX, playerMapY, Math.max(3, tileScale * 0.32));
			this.overlayGraphics.lineStyle(2, 0xffcc6b, 1);
			this.overlayGraphics.beginPath();
			this.overlayGraphics.moveTo(playerMapX, playerMapY);
			this.overlayGraphics.lineTo(
				playerMapX + Math.cos(this.player.angle) * tileScale * 1.7,
				playerMapY + Math.sin(this.player.angle) * tileScale * 1.7,
			);
			this.overlayGraphics.strokePath();

			this.minimapInfoText
				?.setPosition(panelX + 2, panelY + panelHeight + 6)
				.setText(
					`Enemies ${this.enemies.filter((enemy) => enemy.hp > 0).length}/${this.enemies.length}`,
				)
				.setVisible(this.phase === "playing");
		}

		private drawOverlayShade() {
			this.overlayGraphics.fillStyle(0x02070c, 0.78);
			this.overlayGraphics.fillRect(0, 0, this.viewportWidth, this.viewportHeight);
			this.overlayGraphics.fillStyle(0x0f2431, 0.18);
			this.overlayGraphics.fillRect(
				this.viewportWidth * 0.15,
				this.viewportHeight * 0.36,
				this.viewportWidth * 0.7,
				this.viewportHeight * 0.28,
			);
		}

		private drawWeaponModel() {
			const weaponHeight = clamp(this.viewportHeight * 0.56, 220, 420);
			const recoilLift = weaponHeight * 0.055 * this.weaponRecoil;
			const recoilScale = 1 - this.weaponRecoil * 0.028;
			const scale = (weaponHeight / LABYRINTH_WEAPON_HEIGHT) * recoilScale;
			const bobX = Math.sin(this.time.now * 0.0035) * 4;
			const bobY = Math.cos(this.time.now * 0.0026) * 3;
			const originX = this.viewportWidth * 0.5 + bobX;
			const originY = this.viewportHeight + weaponHeight * 0.06 + bobY - recoilLift;
			const weaponWidth = LABYRINTH_WEAPON_WIDTH * scale;
			const weaponTop = originY - LABYRINTH_WEAPON_HEIGHT * scale;
			const overallAlpha = this.phase === "playing" ? 1 : 0.42;

			this.overlayGraphics.fillStyle(0x000000, 0.22 * overallAlpha);
			this.overlayGraphics.fillEllipse(
				originX,
				originY - weaponHeight * 0.04,
				weaponWidth * 1.45,
				weaponHeight * 0.16,
			);

			for (const shape of LABYRINTH_WEAPON_SHAPES) {
				const [firstPoint, ...restPoints] = shape.points;
				if (!firstPoint) continue;

				this.overlayGraphics.fillStyle(shape.color, shape.alpha * overallAlpha);
				this.overlayGraphics.beginPath();
				this.overlayGraphics.moveTo(
					originX + (firstPoint.x - LABYRINTH_WEAPON_WIDTH * 0.5) * scale,
					originY + (firstPoint.y - LABYRINTH_WEAPON_HEIGHT) * scale,
				);

				for (const point of restPoints) {
					this.overlayGraphics.lineTo(
						originX + (point.x - LABYRINTH_WEAPON_WIDTH * 0.5) * scale,
						originY + (point.y - LABYRINTH_WEAPON_HEIGHT) * scale,
					);
				}

				this.overlayGraphics.closePath();
				this.overlayGraphics.fillPath();
			}

			this.overlayGraphics.fillStyle(0xffffff, 0.08 * overallAlpha);
			this.overlayGraphics.fillRect(
				originX - weaponWidth * 0.06,
				weaponTop + weaponHeight * 0.17,
				weaponWidth * 0.12,
				weaponHeight * 0.18,
			);

			if (this.weaponFlashTimer > 0) {
				const flashAlpha = clamp(this.weaponFlashTimer / 0.06, 0, 1) * 0.95;
				const flashX = originX;
				const flashY = weaponTop + weaponHeight * 0.015;
				const flashWidth = weaponWidth * 0.12;
				const flashHeight = weaponHeight * 0.12;

				this.overlayGraphics.fillStyle(0xffefb0, flashAlpha);
				this.overlayGraphics.fillEllipse(flashX, flashY + flashHeight * 0.32, flashWidth, flashHeight);
				this.overlayGraphics.fillStyle(0xffc55c, flashAlpha * 0.82);
				this.overlayGraphics.beginPath();
				this.overlayGraphics.moveTo(flashX, flashY - flashHeight * 0.58);
				this.overlayGraphics.lineTo(flashX + flashWidth * 0.58, flashY + flashHeight * 0.12);
				this.overlayGraphics.lineTo(flashX, flashY + flashHeight * 0.74);
				this.overlayGraphics.lineTo(flashX - flashWidth * 0.58, flashY + flashHeight * 0.12);
				this.overlayGraphics.closePath();
				this.overlayGraphics.fillPath();
			}
		}

		private collectNearbyPickups() {
			for (const pickup of this.pickups) {
				if (pickup.collected || distance(this.player, pickup) > 0.42) continue;

				pickup.collected = true;
				this.score += this.variant.pickupScoreBonus;
				this.timeLeft = Math.min(120, this.timeLeft + this.variant.pickupTimeBonus);
				this.playerMaxHp = maxHpForShards(this.collectedShardCount());
				this.playerHp = Math.min(this.playerMaxHp, this.playerHp + 1);
				this.lastGain = this.variant.pickupScoreBonus;

				if (this.score > this.bestScore) {
					this.bestScore = this.score;
					options.onBestScore(this.bestScore);
				}
			}
		}

		private rebuildMinimapTexture() {
			const canvas = document.createElement("canvas");
			canvas.width = this.maze.mapWidth;
			canvas.height = this.maze.mapHeight;
			const context = canvas.getContext("2d");

			if (!context) {
				throw new Error("Unable to create minimap canvas.");
			}

			context.imageSmoothingEnabled = false;
			context.fillStyle = cssFromRgb(this.theme.mapWall);
			context.fillRect(0, 0, canvas.width, canvas.height);
			context.fillStyle = cssFromRgb(this.theme.mapFloor);

			for (let y = 0; y < this.maze.mapHeight; y++) {
				for (let x = 0; x < this.maze.mapWidth; x++) {
					if (readWall(this.maze, x, y) === 0) {
						context.fillRect(x, y, 1, 1);
					}
				}
			}

			if (this.minimapTextureKey) {
				this.textures.remove(this.minimapTextureKey);
			}

			this.minimapTextureKey = `labyrinth-minimap-${this.seed}-${this.round}`;
			this.textures.addCanvas(this.minimapTextureKey, canvas);
			this.textures
				.get(this.minimapTextureKey)
				?.setFilter(PhaserLib.Textures.FilterMode.NEAREST);

			if (!this.minimapImage) {
				this.minimapImage = this.add
					.image(0, 0, this.minimapTextureKey)
					.setOrigin(0)
					.setDepth(10);
			} else {
				this.minimapImage.setTexture(this.minimapTextureKey);
			}

			this.minimapImage?.setScale(1);
		}
	}

	game = new PhaserLib.Game({
		type: PhaserLib.CANVAS,
		parent: host,
		backgroundColor: "#04060b",
		width,
		height,
		render: {
			antialias: true,
			pixelArt: false,
			roundPixels: false,
		},
		scale: {
			mode: PhaserLib.Scale.NONE,
			autoCenter: PhaserLib.Scale.CENTER_BOTH,
			width,
			height,
		},
		scene: [LabyrinthScene],
	});

	resizeObserver = new ResizeObserver(() => {
		if (!game) return;
		const nextSize = resolveHostSize(host);
		game.scale.resize(nextSize.width, nextSize.height);
	});
	resizeObserver.observe(host);

	return () => {
		resizeObserver?.disconnect();
		resizeObserver = null;
		game?.destroy(true);
		game = null;
	};
}

function loadStoredBestScore() {
	if (typeof window === "undefined") return 0;
	const raw = window.localStorage.getItem(STORAGE_KEY);
	if (!raw) return 0;
	const parsed = Number.parseInt(raw, 10);
	return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function saveBestScore(score: number) {
	if (typeof window === "undefined") return;
	window.localStorage.setItem(STORAGE_KEY, String(Math.max(0, Math.floor(score))));
}

function RunOverlay({
	title,
	description,
	buttonLabel,
	uiState,
	onAction,
}: {
	title: string;
	description: string;
	buttonLabel: string;
	uiState: RuntimeUiState;
	onAction: () => void;
}) {
	return (
		<div className="pointer-events-none absolute inset-0 flex items-center justify-center px-4">
			<div className="pointer-events-auto w-full max-w-[30rem] rounded-[28px] border border-[#33576e] bg-[#05111a]/92 p-5 text-center shadow-[0_24px_60px_rgba(0,0,0,0.38)] backdrop-blur-md sm:p-6">
				<div className="text-3xl text-slate-50">{title}</div>
				<div className="mt-3 text-sm leading-6 text-slate-300">{description}</div>
				<div className="mt-4 grid grid-cols-2 gap-2 text-left sm:grid-cols-4">
					{[
						{ label: "Round", value: uiState.round },
						{ label: "Theme", value: uiState.themeLabel },
						{ label: "Mode", value: uiState.variantLabel },
						{ label: "Best", value: uiState.bestScore },
						{ label: "Time", value: formatTime(uiState.timeLimit || uiState.timeLeft) },
					].map((item) => (
						<div
							key={item.label}
							className="rounded-2xl border border-[#204051] bg-[#08131b]/84 px-3 py-2"
						>
							<div
								className="text-[10px] uppercase tracking-[0.22em] text-slate-500"
								style={{ fontFamily: FONT_STACK }}
							>
								{item.label}
							</div>
							<div className="mt-1 text-sm text-slate-100">{item.value}</div>
						</div>
					))}
				</div>
				<div className="mt-4 rounded-[22px] border border-[#1f3b4d] bg-[#07131d]/84 px-4 py-3 text-left text-sm text-slate-200">
					<div
						className="text-[10px] uppercase tracking-[0.24em] text-slate-500"
						style={{ fontFamily: FONT_STACK }}
					>
						Controls
					</div>
					<div className="mt-2">
						Move with <span className="text-[#f8e39e]">W A S D</span>, use the{" "}
						<span className="text-[#8fe9ff]">mouse</span> to look, click the arena to
						lock aim, click to fire, <span className="text-[#8fe9ff]">R</span> to
						reload, <span className="text-[#ff9c9c]">Q</span> for radar, hold Shift
						to sprint, collect shards for upgrades, and use the minimap to track the
						exit crystal.
					</div>
				</div>
				<button
					type="button"
					onClick={onAction}
					className="mt-5 rounded-full border border-[#42728d] bg-[#0d2231] px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-100 transition hover:border-[#5b95b6] hover:bg-[#123047]"
					style={{ fontFamily: FONT_STACK }}
				>
					{buttonLabel}
				</button>
			</div>
		</div>
	);
}

function WeaponHud({ uiState }: { uiState: RuntimeUiState }) {
	const reloadPercent = Math.round(uiState.reloadProgress * 100);

	return (
		<div className="pointer-events-none absolute bottom-3 right-3 rounded-[24px] border border-[#2a4658] bg-[#05111a]/88 px-3 py-2.5 text-right backdrop-blur-md sm:bottom-4 sm:right-4">
			<div
				className="text-[10px] uppercase tracking-[0.24em] text-slate-500"
				style={{ fontFamily: FONT_STACK }}
			>
				Sidearm
			</div>
			<div className="mt-1 text-2xl text-slate-50">
				{uiState.ammoInMag}
				<span className="text-base text-slate-400">/{uiState.ammoPerMag}</span>
			</div>
			<div className="mt-2 text-[10px] uppercase tracking-[0.2em] text-slate-400">
				{uiState.reloading ? `Reloading ${reloadPercent}%` : "Click to fire"}
			</div>
		</div>
	);
}

function DamageOverlay({ uiState }: { uiState: RuntimeUiState }) {
	const previousHpRef = useRef(uiState.playerHp);
	const [flash, setFlash] = useState(0);

	useEffect(() => {
		const previousHp = previousHpRef.current;
		previousHpRef.current = uiState.playerHp;

		if (uiState.playerHp >= previousHp) return;

		setFlash(1);
		const timer = window.setTimeout(() => {
			setFlash(0);
		}, 180);

		return () => window.clearTimeout(timer);
	}, [uiState.playerHp]);

	return (
		<div
			className="pointer-events-none absolute inset-0 transition-opacity duration-150"
			style={{
				opacity: flash,
				background:
					"radial-gradient(circle at center, rgba(255,80,80,0) 42%, rgba(255,64,64,0.18) 68%, rgba(120,0,0,0.42) 100%)",
			}}
		/>
	);
}

function PlayerHealthHud({ uiState }: { uiState: RuntimeUiState }) {
	return (
		<div className="pointer-events-none absolute bottom-20 left-1/2 -translate-x-1/2 sm:bottom-5">
			<div className="rounded-full border border-[#3a4953] bg-[#06111a]/84 px-4 py-2 backdrop-blur-md">
				<div
					className="text-center text-[10px] uppercase tracking-[0.24em] text-slate-500"
					style={{ fontFamily: FONT_STACK }}
				>
					Health
				</div>
				<div className="mt-2 flex items-center justify-center gap-1.5">
					{Array.from({ length: uiState.playerMaxHp }, (_, index) => (
						<div
							key={index}
							className={`h-2.5 w-6 rounded-full border ${index < uiState.playerHp
								? "border-[#e57474] bg-[linear-gradient(180deg,#ff8d8d_0%,#b13636_100%)]"
								: "border-[#4b2a2a] bg-[#170909]"
								}`}
						/>
					))}
				</div>
			</div>
		</div>
	);
}

function ControlHints({ uiState }: { uiState: RuntimeUiState }) {
	return (
		<div className="pointer-events-none absolute bottom-4 left-4 hidden sm:flex">
			<div
				className="rounded-[20px] border border-[#2b4555] bg-[#04101a]/84 px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-slate-300 backdrop-blur-md"
				style={{ fontFamily: FONT_STACK }}
			>
				<div className="flex items-center gap-2">
					<span className="text-[#ff9898]">Q Radar</span>
					<span className="text-[#8fe9ff]">
						{uiState.radarReady ? "Ready" : `${Math.ceil(uiState.radarCooldownLeft)}s`}
					</span>
				</div>
				<div className="mt-1 flex items-center gap-2">
					<span className="text-[#f0d395]">R Reload</span>
					<span className="text-slate-500">Mouse Look</span>
				</div>
			</div>
		</div>
	);
}

export default function LabyrinthExplorer() {
	const hostRef = useRef<HTMLDivElement>(null);
	const controlsRef = useRef<ControlState>({ ...DEFAULT_CONTROLS });
	const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
	const [uiState, setUiState] = useState<RuntimeUiState>(DEFAULT_UI_STATE);

	const showOverlay = status === "ready" && uiState.phase !== "playing";

	useEffect(() => {
		let cleanup: (() => void) | undefined;
		let cancelled = false;
		const initialBestScore = loadStoredBestScore();

		setUiState((current) => ({
			...current,
			bestScore: initialBestScore,
		}));
		setStatus("loading");

		void (async () => {
			try {
				const phaserModule = await import("phaser");
				const PhaserLib = ("default" in phaserModule
					? phaserModule.default
					: phaserModule) as PhaserModule;

				if (cancelled || !hostRef.current) return;

				cleanup = mountLabyrinthExplorer(hostRef.current, PhaserLib, {
					controlsRef,
					initialBestScore,
					onReady: () => {
						if (!cancelled) setStatus("ready");
					},
					onBestScore: (score) => {
						saveBestScore(score);
						if (!cancelled) {
							setUiState((current) => ({
								...current,
								bestScore: score,
							}));
						}
					},
					onUiState: (nextState) => {
						if (!cancelled) setUiState(nextState);
					},
				});
			} catch (error) {
				console.error("Unable to initialize labyrinth explorer.", error);
				if (!cancelled) setStatus("error");
			}
		})();

		return () => {
			cancelled = true;
			controlsRef.current = { ...DEFAULT_CONTROLS };
			cleanup?.();
		};
	}, []);

	return (
		<div className="relative h-full min-h-0 w-full overflow-hidden bg-[radial-gradient(circle_at_top,#173e55_0%,#07111d_44%,#02050c_100%)] text-slate-100">
			<div ref={hostRef} className="absolute inset-0" />

			<div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-2.5 sm:p-3">
				<div className="flex flex-col gap-2">
					<div className="pointer-events-auto w-full max-w-[28rem] border-b border-[#2b5568] bg-[#06121c]/60 px-3 py-2.5 backdrop-blur-md">
						<div
							className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] uppercase tracking-[0.22em] text-slate-400"
							style={{ fontFamily: FONT_STACK }}
						>
							<span>Score <span className="text-[#f8e39e]">{uiState.score}</span></span>
							<span>Time <span className="text-[#ffe3a0]">{formatTime(uiState.timeLeft)}</span></span>
							<span>Mode <span className="text-[#f3f6fc]">{uiState.variantLabel}</span></span>
							<span>Shards <span className="text-[#8fe9ff]">{uiState.pickupsFound}/{uiState.pickupsTotal}</span></span>
						</div>
						<div className="mt-2 flex flex-wrap items-center gap-1.5">
							<div
								className="border border-[#274859] bg-[#08131b]/84 px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-300"
								style={{ fontFamily: FONT_STACK }}
							>
								{uiState.themeLabel}
							</div>
							<div
								className="border border-[#274859] bg-[#08131b]/84 px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-300"
								style={{ fontFamily: FONT_STACK }}
							>
								Exit {uiState.goalDistance.toFixed(1)}m
							</div>
							{uiState.lastGain > 0 ? (
								<div
									className="border border-[#3f7050] bg-[#0d2018]/84 px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-[#88f2b3]"
									style={{ fontFamily: FONT_STACK }}
								>
									+{uiState.lastGain}
								</div>
							) : null}
						</div>
					</div>

					{uiState.phase === "playing" ? (
						<div className="pointer-events-auto">
							<button
								type="button"
								onClick={() => pushRestart(controlsRef)}
								className="rounded-full border border-[#365970] bg-[#081723]/82 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-100 transition hover:border-[#4b7b97] hover:bg-[#102436]"
								style={{ fontFamily: FONT_STACK }}
							>
								New Run
							</button>
						</div>
					) : null}
				</div>
			</div>

			{status === "ready" && uiState.phase === "playing" ? (
				<>
					<DamageOverlay uiState={uiState} />
					<WeaponHud uiState={uiState} />
					<PlayerHealthHud uiState={uiState} />
					<ControlHints uiState={uiState} />
				</>
			) : null}

			{status === "loading" ? (
				<div
					className="pointer-events-none absolute inset-0 flex items-center justify-center bg-[#02050c]/64 text-sm font-semibold uppercase tracking-[0.32em] text-slate-200"
					style={{ fontFamily: FONT_STACK }}
				>
					Loading labyrinth...
				</div>
			) : null}

			{status === "error" ? (
				<div className="absolute inset-0 flex items-center justify-center bg-[#02050c]/86 px-6 text-center text-sm font-medium text-rose-200">
					Unable to load the labyrinth explorer right now.
				</div>
			) : null}

			{showOverlay ? (
				<RunOverlay
					title={
						uiState.phase === "intro"
							? "Start Run"
							: uiState.endReason === "death"
								? "You were overwhelmed"
								: "Time ran out"
					}
					description={
						uiState.phase === "intro"
							? `A fresh labyrinth is ready. ${uiState.variantSummary}`
							: `Current score ${uiState.score}. Best score ${uiState.bestScore}. You cleared ${uiState.roundsCleared} round${uiState.roundsCleared === 1 ? "" : "s"} with ${uiState.pickupsFound} shard${uiState.pickupsFound === 1 ? "" : "s"} and ${uiState.enemiesAlive} enemies still alive. ${uiState.variantSummary}`
					}
					buttonLabel={uiState.phase === "intro" ? "Enter Labyrinth" : "Start New Run"}
					uiState={uiState}
					onAction={() => pushRestart(controlsRef)}
				/>
			) : null}
		</div>
	);
}
