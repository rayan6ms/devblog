"use client";

import { useEffect, useRef, useState } from "react";

type PhaserModule = typeof import("phaser");
type PhaserGame = import("phaser").Game;
type PhaserScene = import("phaser").Scene;
type PhaserCanvasTexture = import("phaser").Textures.CanvasTexture;
type PhaserImage = import("phaser").GameObjects.Image;

type DifficultyKey = "beginner" | "intermediate" | "expert";
type ThemeKey = "aurora" | "ember" | "glacier" | "voltage";
type PointerMode = "reveal" | "flag";
type LoadStatus = "loading" | "ready" | "error";
type GameStatus = "ready" | "playing" | "won" | "lost";

type Size = {
	width: number;
	height: number;
};

type HslColor = {
	h: number;
	s: number;
	l: number;
};

type ThemeSeed = {
	name: string;
	backgroundTop: HslColor;
	backgroundBottom: HslColor;
	panel: HslColor;
	panelEdge: HslColor;
	board: HslColor;
	boardEdge: HslColor;
	hidden: HslColor;
	hiddenDeep: HslColor;
	revealed: HslColor;
	revealedEdge: HslColor;
	accent: HslColor;
	accentAlt: HslColor;
	text: HslColor;
	muted: HslColor;
	flag: HslColor;
	mine: HslColor;
};

type ThemePalette = {
	name: string;
	backgroundTop: string;
	backgroundBottom: string;
	panel: string;
	panelEdge: string;
	board: string;
	boardEdge: string;
	hidden: string;
	hiddenDeep: string;
	hiddenStroke: string;
	revealed: string;
	revealedEdge: string;
	accent: string;
	accentAlt: string;
	accentGlow: string;
	text: string;
	muted: string;
	flag: string;
	mine: string;
	mineGlow: string;
	numberColors: Record<number, string>;
};

type LevelConfig = {
	key: DifficultyKey;
	label: string;
	cols: number;
	rows: number;
	mines: number;
};

type RuntimeCell = {
	mine: boolean;
	revealed: boolean;
	flagged: boolean;
	adjacent: number;
};

type RuntimeGame = {
	level: LevelConfig;
	cells: RuntimeCell[];
	neighbors: number[][];
	state: GameStatus;
	paused: boolean;
	safeRevealed: number;
	flagsPlaced: number;
	startedAt: number | null;
	finishedAt: number | null;
	pauseStartedAt: number | null;
	pausedTotalMs: number;
	elapsedMs: number;
	explosion: number | null;
	solverFocus: number | null;
	solverLabel: string;
	solverRisk: number | null;
};

type Constraint = {
	cells: number[];
	need: number;
};

type SolverInsight = {
	safe: number[];
	mines: number[];
	target: number | null;
	targetRisk: number | null;
	label: string;
	probabilities: Map<number, number>;
};

type LayoutMetrics = {
	frameX: number;
	frameY: number;
	frameWidth: number;
	frameHeight: number;
	headerHeight: number;
	boardX: number;
	boardY: number;
	boardWidth: number;
	boardHeight: number;
	cellSize: number;
	boardRadius: number;
	pad: number;
};

type Surface = {
	width: number;
	height: number;
	dpr: number;
	canvas: HTMLCanvasElement;
	context: CanvasRenderingContext2D;
	texture: PhaserCanvasTexture;
	image: PhaserImage;
	textureKey: string;
};

type SettingsSnapshot = {
	difficulty: DifficultyKey;
	autoplay: boolean;
	solverDelayMs: number;
	themeKey: ThemeKey;
	hueShift: number;
	glowBoost: number;
	pointerMode: PointerMode;
};

type UiState = {
	status: GameStatus;
	paused: boolean;
	minesLeft: number;
	elapsedSec: number;
	score: number;
	progress: number;
	solverLabel: string;
	solverRiskText: string;
	difficultyLabel: string;
	autoplay: boolean;
	pointerMode: PointerMode;
};

type SceneControls = {
	reset: () => void;
	solverStep: () => void;
	togglePause: () => void;
};

type CurrentRef<T> = {
	current: T;
};

type Bridge = {
	settingsRef: CurrentRef<SettingsSnapshot>;
	controlsRef: CurrentRef<SceneControls | null>;
	onUiState: (state: UiState) => void;
};

const FONT_STACK =
	'"IBM Plex Mono","Fira Code","SFMono-Regular",Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace';

const DIFFICULTIES: Record<DifficultyKey, LevelConfig> = {
	beginner: { key: "beginner", label: "Beginner", cols: 9, rows: 9, mines: 10 },
	intermediate: {
		key: "intermediate",
		label: "Intermediate",
		cols: 16,
		rows: 16,
		mines: 40,
	},
	expert: { key: "expert", label: "Expert", cols: 30, rows: 16, mines: 99 },
};

const DIFFICULTY_ORDER: DifficultyKey[] = [
	"beginner",
	"intermediate",
	"expert",
];

const SPEED_OPTIONS = [
	{ label: "Think", delayMs: 1000 },
	{ label: "Measured", delayMs: 700 },
	{ label: "Calm", delayMs: 420 },
	{ label: "Quick", delayMs: 180 },
] as const;

const THEME_ORDER: ThemeKey[] = ["aurora", "ember", "glacier", "voltage"];

const EMPTY_UI_STATE: UiState = {
	status: "ready",
	paused: false,
	minesLeft: DIFFICULTIES.intermediate.mines,
	elapsedSec: 0,
	score: 0,
	progress: 0,
	solverLabel: "Opening ready",
	solverRiskText: "0%",
	difficultyLabel: DIFFICULTIES.intermediate.label,
	autoplay: false,
	pointerMode: "reveal",
};

const THEME_SEEDS: Record<ThemeKey, ThemeSeed> = {
	aurora: {
		name: "Aurora",
		backgroundTop: { h: 0.58, s: 0.68, l: 0.14 },
		backgroundBottom: { h: 0.86, s: 0.74, l: 0.08 },
		panel: { h: 0.63, s: 0.32, l: 0.12 },
		panelEdge: { h: 0.58, s: 0.44, l: 0.26 },
		board: { h: 0.61, s: 0.28, l: 0.1 },
		boardEdge: { h: 0.58, s: 0.48, l: 0.3 },
		hidden: { h: 0.54, s: 0.78, l: 0.52 },
		hiddenDeep: { h: 0.72, s: 0.72, l: 0.36 },
		revealed: { h: 0.62, s: 0.18, l: 0.9 },
		revealedEdge: { h: 0.56, s: 0.18, l: 0.72 },
		accent: { h: 0.48, s: 0.92, l: 0.56 },
		accentAlt: { h: 0.82, s: 0.88, l: 0.62 },
		text: { h: 0.56, s: 0.2, l: 0.94 },
		muted: { h: 0.57, s: 0.18, l: 0.72 },
		flag: { h: 0.08, s: 0.92, l: 0.6 },
		mine: { h: 0.95, s: 0.86, l: 0.58 },
	},
	ember: {
		name: "Ember",
		backgroundTop: { h: 0.04, s: 0.82, l: 0.14 },
		backgroundBottom: { h: 0.94, s: 0.78, l: 0.08 },
		panel: { h: 0.03, s: 0.34, l: 0.11 },
		panelEdge: { h: 0.06, s: 0.5, l: 0.26 },
		board: { h: 0.02, s: 0.28, l: 0.09 },
		boardEdge: { h: 0.05, s: 0.56, l: 0.28 },
		hidden: { h: 0.06, s: 0.9, l: 0.52 },
		hiddenDeep: { h: 0.96, s: 0.82, l: 0.38 },
		revealed: { h: 0.09, s: 0.26, l: 0.9 },
		revealedEdge: { h: 0.08, s: 0.18, l: 0.74 },
		accent: { h: 0.11, s: 0.98, l: 0.62 },
		accentAlt: { h: 0.98, s: 0.88, l: 0.62 },
		text: { h: 0.09, s: 0.18, l: 0.95 },
		muted: { h: 0.08, s: 0.22, l: 0.72 },
		flag: { h: 0.01, s: 0.94, l: 0.58 },
		mine: { h: 0.94, s: 0.88, l: 0.58 },
	},
	glacier: {
		name: "Glacier",
		backgroundTop: { h: 0.52, s: 0.54, l: 0.16 },
		backgroundBottom: { h: 0.66, s: 0.54, l: 0.08 },
		panel: { h: 0.57, s: 0.28, l: 0.13 },
		panelEdge: { h: 0.52, s: 0.42, l: 0.28 },
		board: { h: 0.58, s: 0.24, l: 0.1 },
		boardEdge: { h: 0.53, s: 0.48, l: 0.28 },
		hidden: { h: 0.54, s: 0.74, l: 0.56 },
		hiddenDeep: { h: 0.63, s: 0.62, l: 0.4 },
		revealed: { h: 0.56, s: 0.2, l: 0.92 },
		revealedEdge: { h: 0.56, s: 0.14, l: 0.76 },
		accent: { h: 0.51, s: 0.96, l: 0.62 },
		accentAlt: { h: 0.59, s: 0.82, l: 0.64 },
		text: { h: 0.56, s: 0.22, l: 0.96 },
		muted: { h: 0.56, s: 0.18, l: 0.74 },
		flag: { h: 0.98, s: 0.88, l: 0.6 },
		mine: { h: 0.92, s: 0.74, l: 0.56 },
	},
	voltage: {
		name: "Voltage",
		backgroundTop: { h: 0.7, s: 0.7, l: 0.14 },
		backgroundBottom: { h: 0.56, s: 0.7, l: 0.08 },
		panel: { h: 0.7, s: 0.34, l: 0.12 },
		panelEdge: { h: 0.73, s: 0.48, l: 0.3 },
		board: { h: 0.72, s: 0.26, l: 0.1 },
		boardEdge: { h: 0.68, s: 0.56, l: 0.3 },
		hidden: { h: 0.76, s: 0.88, l: 0.56 },
		hiddenDeep: { h: 0.58, s: 0.84, l: 0.38 },
		revealed: { h: 0.7, s: 0.18, l: 0.9 },
		revealedEdge: { h: 0.69, s: 0.16, l: 0.74 },
		accent: { h: 0.16, s: 0.94, l: 0.6 },
		accentAlt: { h: 0.62, s: 0.98, l: 0.62 },
		text: { h: 0.7, s: 0.2, l: 0.95 },
		muted: { h: 0.68, s: 0.18, l: 0.74 },
		flag: { h: 0.03, s: 0.94, l: 0.58 },
		mine: { h: 0.92, s: 0.88, l: 0.58 },
	},
};

function clamp(value: number, min: number, max: number) {
	return Math.min(max, Math.max(min, value));
}

function wrap01(value: number) {
	const wrapped = value % 1;
	return wrapped < 0 ? wrapped + 1 : wrapped;
}

function shiftColor(color: HslColor, hueShift: number, saturation = 0, lightness = 0) {
	return {
		h: wrap01(color.h + hueShift),
		s: clamp(color.s + saturation, 0, 1),
		l: clamp(color.l + lightness, 0, 1),
	};
}

function toneColor(
	color: HslColor,
	hueShift: number,
	saturationScale = 0.62,
	lightnessShift = 0,
) {
	return {
		h: wrap01(color.h + hueShift),
		s: clamp(color.s * saturationScale, 0.05, 1),
		l: clamp(color.l + lightnessShift, 0, 1),
	};
}

function hslToCss(color: HslColor) {
	return `hsl(${Math.round(wrap01(color.h) * 360)} ${Math.round(color.s * 100)}% ${Math.round(color.l * 100)}%)`;
}

function resolveTheme(themeKey: ThemeKey, hueShift: number, glowBoost: number): ThemePalette {
	const seed = THEME_SEEDS[themeKey];
	const accent = toneColor(
		seed.accent,
		hueShift * 0.18,
		0.72 + glowBoost * 0.1,
		0.02,
	);
	const accentAlt = toneColor(
		seed.accentAlt,
		hueShift * 0.26,
		0.64 + glowBoost * 0.08,
		0.04,
	);
	const numberShift = hueShift * 0.08;

	return {
		name: seed.name,
		backgroundTop: hslToCss(toneColor(seed.backgroundTop, hueShift * 0.12, 0.34, 0.01)),
		backgroundBottom: hslToCss(toneColor(seed.backgroundBottom, hueShift * 0.12, 0.28)),
		panel: hslToCss(toneColor(seed.panel, hueShift * 0.08, 0.28, 0.01)),
		panelEdge: hslToCss(toneColor(seed.panelEdge, hueShift * 0.14, 0.36, 0.02)),
		board: hslToCss(toneColor(seed.board, hueShift * 0.06, 0.3, 0.01)),
		boardEdge: hslToCss(toneColor(seed.boardEdge, hueShift * 0.12, 0.4, 0.03)),
		hidden: hslToCss(toneColor(seed.hidden, hueShift * 0.16, 0.52, 0.01)),
		hiddenDeep: hslToCss(toneColor(seed.hiddenDeep, hueShift * 0.18, 0.48, -0.01)),
		hiddenStroke: hslToCss(toneColor(seed.hiddenDeep, hueShift * 0.18, 0.28, -0.09)),
		revealed: hslToCss(toneColor(seed.revealed, hueShift * 0.03, 0.08, -0.12)),
		revealedEdge: hslToCss(toneColor(seed.revealedEdge, hueShift * 0.03, 0.12, -0.08)),
		accent: hslToCss(accent),
		accentAlt: hslToCss(accentAlt),
		accentGlow: hslToCss(toneColor(accent, 0.02, 0.56, 0.1)),
		text: hslToCss(toneColor(seed.text, 0, 0.14)),
		muted: hslToCss(toneColor(seed.muted, 0, 0.16, -0.02)),
		flag: hslToCss(toneColor(seed.flag, hueShift * 0.04, 0.58, 0.01)),
		mine: hslToCss(toneColor(seed.mine, hueShift * 0.04, 0.52, 0.03)),
		mineGlow: hslToCss(toneColor(seed.mine, hueShift * 0.03, 0.42, 0.12)),
		numberColors: {
			1: hslToCss({ h: wrap01(0.58 + numberShift), s: 0.52, l: 0.42 }),
			2: hslToCss({ h: wrap01(0.34 + numberShift), s: 0.42, l: 0.34 }),
			3: hslToCss({ h: wrap01(0.01 + numberShift), s: 0.54, l: 0.46 }),
			4: hslToCss({ h: wrap01(0.67 + numberShift), s: 0.46, l: 0.38 }),
			5: hslToCss({ h: wrap01(0.92 + numberShift), s: 0.34, l: 0.34 }),
			6: hslToCss({ h: wrap01(0.5 + numberShift), s: 0.42, l: 0.36 }),
			7: hslToCss({ h: wrap01(0.8 + numberShift), s: 0.12, l: 0.24 }),
			8: hslToCss({ h: wrap01(0.56 + numberShift), s: 0.1, l: 0.4 }),
		},
	};
}

function resolveHostSize(host: HTMLDivElement): Size {
	const rect = host.getBoundingClientRect();
	return {
		width: Math.max(1, Math.floor(host.clientWidth || rect.width || 1)),
		height: Math.max(1, Math.floor(host.clientHeight || rect.height || 1)),
	};
}

function createNeighbors(cols: number, rows: number) {
	const neighbors: number[][] = Array.from({ length: cols * rows }, () => []);

	for (let row = 0; row < rows; row += 1) {
		for (let col = 0; col < cols; col += 1) {
			const index = row * cols + col;
			for (let dy = -1; dy <= 1; dy += 1) {
				for (let dx = -1; dx <= 1; dx += 1) {
					if (dx === 0 && dy === 0) continue;
					const nextRow = row + dy;
					const nextCol = col + dx;
					if (nextRow < 0 || nextRow >= rows || nextCol < 0 || nextCol >= cols) {
						continue;
					}
					neighbors[index].push(nextRow * cols + nextCol);
				}
			}
		}
	}

	return neighbors;
}

function createRuntime(level: LevelConfig): RuntimeGame {
	return {
		level,
		cells: Array.from({ length: level.cols * level.rows }, () => ({
			mine: false,
			revealed: false,
			flagged: false,
			adjacent: 0,
		})),
		neighbors: createNeighbors(level.cols, level.rows),
		state: "ready",
		paused: false,
		safeRevealed: 0,
		flagsPlaced: 0,
		startedAt: null,
		finishedAt: null,
		pauseStartedAt: null,
		pausedTotalMs: 0,
		elapsedMs: 0,
		explosion: null,
		solverFocus: Math.floor((level.rows / 2)) * level.cols + Math.floor(level.cols / 2),
		solverLabel: "Opening move",
		solverRisk: 0,
	};
}

function resetRuntime(runtime: RuntimeGame, level: LevelConfig) {
	const fresh = createRuntime(level);
	runtime.level = fresh.level;
	runtime.cells = fresh.cells;
	runtime.neighbors = fresh.neighbors;
	runtime.state = fresh.state;
	runtime.paused = fresh.paused;
	runtime.safeRevealed = fresh.safeRevealed;
	runtime.flagsPlaced = fresh.flagsPlaced;
	runtime.startedAt = fresh.startedAt;
	runtime.finishedAt = fresh.finishedAt;
	runtime.pauseStartedAt = fresh.pauseStartedAt;
	runtime.pausedTotalMs = fresh.pausedTotalMs;
	runtime.elapsedMs = fresh.elapsedMs;
	runtime.explosion = fresh.explosion;
	runtime.solverFocus = fresh.solverFocus;
	runtime.solverLabel = fresh.solverLabel;
	runtime.solverRisk = fresh.solverRisk;
}

function seededShuffle(values: number[]) {
	for (let index = values.length - 1; index > 0; index -= 1) {
		const swapIndex = Math.floor(Math.random() * (index + 1));
		[values[index], values[swapIndex]] = [values[swapIndex], values[index]];
	}
	return values;
}

function placeMines(runtime: RuntimeGame, startIndex: number) {
	const safeZone = new Set<number>([startIndex, ...runtime.neighbors[startIndex]]);
	const candidates = new Set<number>();

	for (let index = 0; index < runtime.cells.length; index += 1) {
		if (safeZone.has(index)) continue;
		candidates.add(index);
	}

	if (candidates.size < runtime.level.mines) {
		for (let index = 0; index < runtime.cells.length; index += 1) {
			if (index !== startIndex) candidates.add(index);
		}
	}

	const shuffled = seededShuffle(Array.from(candidates));

	for (let mine = 0; mine < runtime.level.mines; mine += 1) {
		runtime.cells[shuffled[mine]].mine = true;
	}

	for (let index = 0; index < runtime.cells.length; index += 1) {
		const cell = runtime.cells[index];
		if (cell.mine) {
			cell.adjacent = -1;
			continue;
		}
		let adjacent = 0;
		for (const neighbor of runtime.neighbors[index]) {
			if (runtime.cells[neighbor].mine) adjacent += 1;
		}
		cell.adjacent = adjacent;
	}
}

function ensureStarted(runtime: RuntimeGame, index: number, now: number) {
	if (runtime.startedAt !== null) return;
	placeMines(runtime, index);
	runtime.startedAt = now;
	runtime.state = "playing";
	runtime.paused = false;
	runtime.pauseStartedAt = null;
	runtime.pausedTotalMs = 0;
}

function finalizeWin(runtime: RuntimeGame, now: number) {
	runtime.state = "won";
	runtime.paused = false;
	runtime.finishedAt = now;
	runtime.pauseStartedAt = null;
	runtime.elapsedMs =
		runtime.startedAt === null ? 0 : now - runtime.startedAt - runtime.pausedTotalMs;

	for (const cell of runtime.cells) {
		if (cell.mine && !cell.flagged) {
			cell.flagged = true;
		}
	}

	runtime.flagsPlaced = runtime.level.mines;
}

function checkWin(runtime: RuntimeGame, now: number) {
	if (runtime.state === "lost") return;
	const safeCells = runtime.cells.length - runtime.level.mines;
	if (runtime.safeRevealed >= safeCells) {
		finalizeWin(runtime, now);
	}
}

function revealIndex(runtime: RuntimeGame, index: number, now: number) {
	const startCell = runtime.cells[index];
	if (
		startCell.revealed ||
		startCell.flagged ||
		runtime.state === "won" ||
		runtime.state === "lost" ||
		runtime.paused
	) {
		return false;
	}

	ensureStarted(runtime, index, now);

	const queue = [index];
	let changed = false;

	while (queue.length > 0) {
		const current = queue.pop();
		if (current === undefined) continue;
		const cell = runtime.cells[current];

		if (cell.revealed || cell.flagged) continue;
		cell.revealed = true;
		changed = true;

		if (cell.mine) {
			runtime.state = "lost";
			runtime.paused = false;
			runtime.finishedAt = now;
			runtime.pauseStartedAt = null;
			runtime.elapsedMs =
				runtime.startedAt === null ? 0 : now - runtime.startedAt - runtime.pausedTotalMs;
			runtime.explosion = current;
			return true;
		}

		runtime.safeRevealed += 1;
		if (cell.adjacent === 0) {
			for (const neighbor of runtime.neighbors[current]) {
				const nextCell = runtime.cells[neighbor];
				if (!nextCell.revealed && !nextCell.flagged && !nextCell.mine) {
					queue.push(neighbor);
				}
			}
		}
	}

	checkWin(runtime, now);
	return changed;
}

function toggleFlag(runtime: RuntimeGame, index: number) {
	const cell = runtime.cells[index];
	if (
		cell.revealed ||
		runtime.state === "won" ||
		runtime.state === "lost" ||
		runtime.paused
	) {
		return false;
	}
	cell.flagged = !cell.flagged;
	runtime.flagsPlaced += cell.flagged ? 1 : -1;
	return true;
}

function chordIndex(runtime: RuntimeGame, index: number, now: number) {
	const cell = runtime.cells[index];
	if (
		!cell.revealed ||
		cell.adjacent <= 0 ||
		runtime.state === "won" ||
		runtime.state === "lost" ||
		runtime.paused
	) {
		return false;
	}

	let flagged = 0;
	const hidden: number[] = [];

	for (const neighbor of runtime.neighbors[index]) {
		const nextCell = runtime.cells[neighbor];
		if (nextCell.flagged) flagged += 1;
		else if (!nextCell.revealed) hidden.push(neighbor);
	}

	if (flagged !== cell.adjacent) return false;

	let changed = false;
	for (const neighbor of hidden) {
		changed = revealIndex(runtime, neighbor, now) || changed;
		if (runtime.explosion !== null) return true;
	}
	return changed;
}

function updateElapsed(runtime: RuntimeGame, now: number) {
	if (runtime.startedAt === null) {
		runtime.elapsedMs = 0;
		return false;
	}
	const nextElapsed =
		runtime.finishedAt !== null
			? runtime.finishedAt - runtime.startedAt - runtime.pausedTotalMs
			: runtime.paused && runtime.pauseStartedAt !== null
				? runtime.pauseStartedAt - runtime.startedAt - runtime.pausedTotalMs
				: now - runtime.startedAt - runtime.pausedTotalMs;
	if (nextElapsed === runtime.elapsedMs) return false;
	runtime.elapsedMs = nextElapsed;
	return true;
}

function togglePause(runtime: RuntimeGame, now: number) {
	if (runtime.startedAt === null || runtime.state === "won" || runtime.state === "lost") {
		return false;
	}

	if (runtime.paused) {
		runtime.paused = false;
		runtime.pausedTotalMs += now - (runtime.pauseStartedAt ?? now);
		runtime.pauseStartedAt = null;
		updateElapsed(runtime, now);
		return true;
	}

	runtime.paused = true;
	runtime.pauseStartedAt = now;
	updateElapsed(runtime, now);
	return true;
}

function buildConstraints(runtime: RuntimeGame) {
	const constraints: Constraint[] = [];
	const seen = new Set<string>();

	for (let index = 0; index < runtime.cells.length; index += 1) {
		const cell = runtime.cells[index];
		if (!cell.revealed || cell.adjacent <= 0) continue;

		let flagged = 0;
		const frontier: number[] = [];

		for (const neighbor of runtime.neighbors[index]) {
			const nextCell = runtime.cells[neighbor];
			if (nextCell.flagged) flagged += 1;
			else if (!nextCell.revealed) frontier.push(neighbor);
		}

		if (frontier.length === 0) continue;
		const need = cell.adjacent - flagged;
		if (need < 0 || need > frontier.length) continue;
		frontier.sort((left, right) => left - right);
		const key = `${need}|${frontier.join(",")}`;
		if (seen.has(key)) continue;
		seen.add(key);
		constraints.push({ cells: frontier, need });
	}

	return constraints;
}

function collectDeterministic(runtime: RuntimeGame) {
	const safe = new Set<number>();
	const mines = new Set<number>();

	for (let index = 0; index < runtime.cells.length; index += 1) {
		const cell = runtime.cells[index];
		if (!cell.revealed || cell.adjacent <= 0) continue;

		let flagged = 0;
		const hidden: number[] = [];

		for (const neighbor of runtime.neighbors[index]) {
			const nextCell = runtime.cells[neighbor];
			if (nextCell.flagged) flagged += 1;
			else if (!nextCell.revealed) hidden.push(neighbor);
		}

		if (hidden.length === 0) continue;
		if (flagged === cell.adjacent) {
			for (const neighbor of hidden) safe.add(neighbor);
		} else if (flagged + hidden.length === cell.adjacent) {
			for (const neighbor of hidden) mines.add(neighbor);
		}
	}

	return {
		safe: Array.from(safe),
		mines: Array.from(mines),
	};
}

function isSubset(source: number[], target: number[]) {
	let sourceIndex = 0;
	let targetIndex = 0;

	while (sourceIndex < source.length && targetIndex < target.length) {
		if (source[sourceIndex] === target[targetIndex]) {
			sourceIndex += 1;
			targetIndex += 1;
			continue;
		}
		if (source[sourceIndex] > target[targetIndex]) {
			targetIndex += 1;
			continue;
		}
		return false;
	}

	return sourceIndex === source.length;
}

function subtractSorted(from: number[], values: number[]) {
	const result: number[] = [];
	let fromIndex = 0;
	let valueIndex = 0;

	while (fromIndex < from.length) {
		if (valueIndex >= values.length || from[fromIndex] < values[valueIndex]) {
			result.push(from[fromIndex]);
			fromIndex += 1;
			continue;
		}
		if (from[fromIndex] === values[valueIndex]) {
			fromIndex += 1;
			valueIndex += 1;
			continue;
		}
		valueIndex += 1;
	}

	return result;
}

function collectSubsetInferences(constraints: Constraint[]) {
	const safe = new Set<number>();
	const mines = new Set<number>();

	for (let leftIndex = 0; leftIndex < constraints.length; leftIndex += 1) {
		const left = constraints[leftIndex];
		for (let rightIndex = 0; rightIndex < constraints.length; rightIndex += 1) {
			if (leftIndex === rightIndex) continue;
			const right = constraints[rightIndex];
			if (left.cells.length >= right.cells.length) continue;
			if (!isSubset(left.cells, right.cells)) continue;

			const delta = subtractSorted(right.cells, left.cells);
			if (delta.length === 0) continue;

			if (left.need === right.need) {
				for (const cell of delta) safe.add(cell);
			}

			if (right.need - left.need === delta.length) {
				for (const cell of delta) mines.add(cell);
			}
		}
	}

	return {
		safe: Array.from(safe),
		mines: Array.from(mines),
	};
}

function enumerateComponent(variables: number[], constraints: Constraint[]) {
	const probabilities = new Map<number, number>();
	const variableToLocal = new Map<number, number>();
	const variableDegrees = new Array<number>(variables.length).fill(0);
	variables.forEach((variable, index) => variableToLocal.set(variable, index));

	const localConstraints = constraints.map((constraint) => ({
		cells: constraint.cells
			.map((cell) => variableToLocal.get(cell))
			.filter((value): value is number => value !== undefined),
		need: constraint.need,
	}));

	for (const constraint of localConstraints) {
		for (const cell of constraint.cells) {
			variableDegrees[cell] += 1;
		}
	}

	const order = variables
		.map((_, index) => index)
		.sort((left, right) => variableDegrees[right] - variableDegrees[left]);

	const constraintRefsByVariable: number[][] = Array.from(
		{ length: variables.length },
		() => [],
	);

	localConstraints.forEach((constraint, constraintIndex) => {
		for (const cell of constraint.cells) {
			constraintRefsByVariable[cell].push(constraintIndex);
		}
	});

	const needLeft = localConstraints.map((constraint) => constraint.need);
	const remaining = localConstraints.map((constraint) => constraint.cells.length);
	const assignment = new Int8Array(variables.length).fill(-1);
	const tally = new Float64Array(variables.length);
	let worlds = 0;

	function recurse(position: number) {
		if (position >= order.length) {
			for (const need of needLeft) {
				if (need !== 0) return;
			}
			worlds += 1;
			for (let index = 0; index < assignment.length; index += 1) {
				if (assignment[index] === 1) tally[index] += 1;
			}
			return;
		}

		const variable = order[position];
		const relatedConstraints = constraintRefsByVariable[variable];

		for (const value of [0, 1]) {
			let valid = true;
			for (const constraintIndex of relatedConstraints) {
				remaining[constraintIndex] -= 1;
				if (value === 1) needLeft[constraintIndex] -= 1;
				if (
					needLeft[constraintIndex] < 0 ||
					needLeft[constraintIndex] > remaining[constraintIndex]
				) {
					valid = false;
				}
			}

			assignment[variable] = value;
			if (valid) recurse(position + 1);

			for (const constraintIndex of relatedConstraints) {
				if (value === 1) needLeft[constraintIndex] += 1;
				remaining[constraintIndex] += 1;
			}
			assignment[variable] = -1;
		}
	}

	recurse(0);

	if (worlds === 0) {
		return {
			worlds,
			probabilities,
		};
	}

	for (let index = 0; index < variables.length; index += 1) {
		probabilities.set(variables[index], tally[index] / worlds);
	}

	return {
		worlds,
		probabilities,
	};
}

function solveProbabilities(constraints: Constraint[]) {
	const frontier = new Set<number>();
	for (const constraint of constraints) {
		for (const cell of constraint.cells) frontier.add(cell);
	}

	const frontierList = Array.from(frontier);
	const constraintRefsByCell = new Map<number, number[]>();
	constraints.forEach((constraint, constraintIndex) => {
		for (const cell of constraint.cells) {
			const existing = constraintRefsByCell.get(cell);
			if (existing) existing.push(constraintIndex);
			else constraintRefsByCell.set(cell, [constraintIndex]);
		}
	});

	const probabilities = new Map<number, number>();
	const solved = new Set<number>();
	const visitedCells = new Set<number>();
	const visitedConstraints = new Set<number>();
	const maxExactVariables = 18;

	for (const root of frontierList) {
		if (visitedCells.has(root)) continue;

		const variableQueue = [root];
		const componentVariables: number[] = [];
		const componentConstraintIndices = new Set<number>();
		visitedCells.add(root);

		while (variableQueue.length > 0) {
			const cell = variableQueue.pop();
			if (cell === undefined) continue;
			componentVariables.push(cell);

			for (const constraintIndex of constraintRefsByCell.get(cell) ?? []) {
				if (!visitedConstraints.has(constraintIndex)) {
					visitedConstraints.add(constraintIndex);
				}
				componentConstraintIndices.add(constraintIndex);
				for (const relatedCell of constraints[constraintIndex].cells) {
					if (visitedCells.has(relatedCell)) continue;
					visitedCells.add(relatedCell);
					variableQueue.push(relatedCell);
				}
			}
		}

		if (componentVariables.length > maxExactVariables) {
			continue;
		}

		const componentConstraints = Array.from(componentConstraintIndices).map(
			(index) => constraints[index],
		);
		const result = enumerateComponent(componentVariables, componentConstraints);
		if (result.worlds === 0) continue;

		for (const [cell, probability] of result.probabilities) {
			probabilities.set(cell, probability);
			solved.add(cell);
		}
	}

	return {
		frontier: frontierList,
		probabilities,
		solved,
	};
}

function heuristicProbabilityMap(
	runtime: RuntimeGame,
	constraints: Constraint[],
	probabilities: Map<number, number>,
) {
	const frontierSet = new Set<number>();
	const mineBudget = runtime.level.mines - runtime.flagsPlaced;

	for (const constraint of constraints) {
		for (const cell of constraint.cells) frontierSet.add(cell);
	}

	for (const cell of frontierSet) {
		if (probabilities.has(cell)) continue;

		let weightedTotal = 0;
		let weightSum = 0;

		for (const constraint of constraints) {
			if (!constraint.cells.includes(cell)) continue;
			const density = constraint.need / constraint.cells.length;
			const weight = 1 + Math.max(0, 6 - constraint.cells.length) * 0.18;
			weightedTotal += density * weight;
			weightSum += weight;
		}

		if (weightSum > 0) {
			probabilities.set(cell, clamp(weightedTotal / weightSum, 0, 1));
		}
	}

	let expectedFrontierMines = 0;
	for (const cell of frontierSet) {
		expectedFrontierMines += probabilities.get(cell) ?? 0;
	}

	const hiddenOutside = runtime.cells.reduce((count, cell, index) => {
		if (cell.revealed || cell.flagged || frontierSet.has(index)) return count;
		return count + 1;
	}, 0);

	const outsideRisk =
		hiddenOutside > 0
			? clamp((mineBudget - expectedFrontierMines) / hiddenOutside, 0, 1)
			: 1;

	return {
		probabilities,
		frontier: frontierSet,
		outsideRisk,
	};
}

function chooseBestTarget(
	runtime: RuntimeGame,
	probabilities: Map<number, number>,
	frontier: Set<number>,
	outsideRisk: number,
) {
	const centerColumn = (runtime.level.cols - 1) / 2;
	const centerRow = (runtime.level.rows - 1) / 2;
	let bestIndex: number | null = null;
	let bestRisk = Number.POSITIVE_INFINITY;
	let bestScore = Number.NEGATIVE_INFINITY;

	for (let index = 0; index < runtime.cells.length; index += 1) {
		const cell = runtime.cells[index];
		if (cell.revealed || cell.flagged) continue;

		const row = Math.floor(index / runtime.level.cols);
		const col = index % runtime.level.cols;
		const probability = frontier.has(index)
			? probabilities.get(index) ?? outsideRisk
			: outsideRisk;
		let pressure = 0;
		let frontierDegree = 0;

		for (const neighbor of runtime.neighbors[index]) {
			const neighborCell = runtime.cells[neighbor];
			if (neighborCell.revealed && neighborCell.adjacent > 0) frontierDegree += 1;
			if (!neighborCell.revealed && !neighborCell.flagged) pressure += 1;
		}

		const centrality =
			1 -
			(Math.abs(col - centerColumn) / Math.max(1, centerColumn + 0.5) +
				Math.abs(row - centerRow) / Math.max(1, centerRow + 0.5)) /
				2;
		const score = frontierDegree * 1.5 + pressure * 0.18 + centrality * 0.9;

		if (
			probability < bestRisk - 0.0001 ||
			(Math.abs(probability - bestRisk) < 0.0001 && score > bestScore)
		) {
			bestIndex = index;
			bestRisk = probability;
			bestScore = score;
		}
	}

	return {
		index: bestIndex,
		risk: Number.isFinite(bestRisk) ? bestRisk : null,
	};
}

function analyzeRuntime(runtime: RuntimeGame): SolverInsight {
	if (runtime.state === "won") {
		return {
			safe: [],
			mines: [],
			target: null,
			targetRisk: null,
			label: "Board cleared",
			probabilities: new Map(),
		};
	}

	if (runtime.state === "lost") {
		return {
			safe: [],
			mines: [],
			target: null,
			targetRisk: null,
			label: "Board exploded",
			probabilities: new Map(),
		};
	}

	if (runtime.startedAt === null) {
		const opening =
			Math.floor(runtime.level.rows / 2) * runtime.level.cols +
			Math.floor(runtime.level.cols / 2);
		return {
			safe: [],
			mines: [],
			target: opening,
			targetRisk: 0,
			label: "Center opening",
			probabilities: new Map([[opening, 0]]),
		};
	}

	const deterministic = collectDeterministic(runtime);
	if (deterministic.safe.length > 0 || deterministic.mines.length > 0) {
		return {
			safe: deterministic.safe,
			mines: deterministic.mines,
			target: deterministic.safe[0] ?? deterministic.mines[0] ?? null,
			targetRisk: deterministic.safe.length > 0 ? 0 : 1,
			label: "Deterministic sweep",
			probabilities: new Map(),
		};
	}

	const constraints = buildConstraints(runtime);
	const subset = collectSubsetInferences(constraints);
	if (subset.safe.length > 0 || subset.mines.length > 0) {
		return {
			safe: subset.safe,
			mines: subset.mines,
			target: subset.safe[0] ?? subset.mines[0] ?? null,
			targetRisk: subset.safe.length > 0 ? 0 : 1,
			label: "Subset inference",
			probabilities: new Map(),
		};
	}

	if (constraints.length === 0) {
		const hidden = runtime.cells.findIndex((cell) => !cell.revealed && !cell.flagged);
		return {
			safe: [],
			mines: [],
			target: hidden >= 0 ? hidden : null,
			targetRisk:
				hidden >= 0
					? clamp(
							(runtime.level.mines - runtime.flagsPlaced) /
								Math.max(1, runtime.cells.filter((cell) => !cell.revealed && !cell.flagged).length),
							0,
							1,
						)
					: null,
			label: "Open field search",
			probabilities: new Map(),
		};
	}

	const exact = solveProbabilities(constraints);
	const exactSafe: number[] = [];
	const exactMines: number[] = [];

	for (const [cell, probability] of exact.probabilities) {
		if (probability <= 0) exactSafe.push(cell);
		else if (probability >= 1) exactMines.push(cell);
	}

	if (exactSafe.length > 0 || exactMines.length > 0) {
		return {
			safe: exactSafe,
			mines: exactMines,
			target: exactSafe[0] ?? exactMines[0] ?? null,
			targetRisk: exactSafe.length > 0 ? 0 : 1,
			label: "Exact frontier search",
			probabilities: exact.probabilities,
		};
	}

	const heuristic = heuristicProbabilityMap(runtime, constraints, exact.probabilities);
	const best = chooseBestTarget(
		runtime,
		heuristic.probabilities,
		heuristic.frontier,
		heuristic.outsideRisk,
	);

	return {
		safe: [],
		mines: [],
		target: best.index,
		targetRisk: best.risk,
		label:
			exact.solved.size > 0
				? "Exact risk model"
				: heuristic.frontier.size > 0
					? "Probability-guided guess"
					: "Density guess",
		probabilities: heuristic.probabilities,
	};
}

function refreshSolverPreview(runtime: RuntimeGame) {
	const insight = analyzeRuntime(runtime);
	runtime.solverFocus = insight.target;
	runtime.solverLabel = insight.label;
	runtime.solverRisk = insight.targetRisk;
	return insight;
}

function applySolverMove(runtime: RuntimeGame, now: number, singleStep = false) {
	if (runtime.state === "won" || runtime.state === "lost" || runtime.paused) return false;

	let insight = refreshSolverPreview(runtime);
	let changed = false;
	const batchLimit = singleStep ? 1 : 16;
	let applied = 0;

	if (insight.mines.length > 0 || insight.safe.length > 0) {
		for (const mine of insight.mines) {
			if (applied >= batchLimit) break;
			changed = toggleFlag(runtime, mine) || changed;
			applied += 1;
		}

		for (const safe of insight.safe) {
			if (applied >= batchLimit) break;
			changed = revealIndex(runtime, safe, now) || changed;
			applied += 1;
			if (runtime.explosion !== null) break;
		}

		refreshSolverPreview(runtime);
		return changed;
	}

	if (insight.target !== null) {
		changed = revealIndex(runtime, insight.target, now) || changed;
		insight = refreshSolverPreview(runtime);
		return changed || insight.target !== null;
	}

	return changed;
}

function toUiState(runtime: RuntimeGame, settings: SettingsSnapshot): UiState {
	const progress =
		(runtime.safeRevealed /
			Math.max(1, runtime.cells.length - runtime.level.mines)) *
		100;
	const score =
		runtime.safeRevealed * 10 +
		(runtime.flagsPlaced * 2) +
		(runtime.state === "won" ? 250 : 0);

	return {
		status: runtime.state,
		paused: runtime.paused,
		minesLeft: runtime.level.mines - runtime.flagsPlaced,
		elapsedSec: Math.floor(runtime.elapsedMs / 1000),
		score,
		progress,
		solverLabel: runtime.solverLabel,
		solverRiskText:
			runtime.solverRisk === null ? "n/a" : `${Math.round(runtime.solverRisk * 100)}%`,
		difficultyLabel: runtime.level.label,
		autoplay: settings.autoplay,
		pointerMode: settings.pointerMode,
	};
}

function createSurface(
	size: Size,
	scene: PhaserScene,
	textureKey: string,
) {
	const dpr =
		typeof window === "undefined"
			? 1
			: Math.max(1, Math.min(3, window.devicePixelRatio || 1));
	const canvas = document.createElement("canvas");
	canvas.width = Math.max(1, Math.floor(size.width * dpr));
	canvas.height = Math.max(1, Math.floor(size.height * dpr));
	const context = canvas.getContext("2d");
	if (!context) {
		throw new Error("Unable to create 2D canvas context");
	}
	context.setTransform(dpr, 0, 0, dpr, 0, 0);
	context.imageSmoothingEnabled = true;

	const existingTexture = scene.textures.exists(textureKey)
		? scene.textures.get(textureKey)
		: null;

	if (existingTexture) {
		scene.textures.remove(textureKey);
	}

	const texture = scene.textures.addCanvas(textureKey, canvas);
	if (!texture) {
		throw new Error("Unable to create Phaser canvas texture");
	}
	const image = scene.add.image(0, 0, textureKey).setOrigin(0, 0);
	image.setDisplaySize(size.width, size.height);

	return {
		width: size.width,
		height: size.height,
		dpr,
		canvas,
		context,
		texture,
		image,
		textureKey,
	};
}

function destroySurface(scene: PhaserScene, surface: Surface | null) {
	if (!surface) return;
	surface.image.destroy();
	if (scene.textures.exists(surface.textureKey)) {
		scene.textures.remove(surface.textureKey);
	}
}

function roundedPath(
	context: CanvasRenderingContext2D,
	x: number,
	y: number,
	width: number,
	height: number,
	radius: number,
) {
	const safeRadius = Math.max(0, Math.min(radius, width / 2, height / 2));
	context.beginPath();
	context.moveTo(x + safeRadius, y);
	context.lineTo(x + width - safeRadius, y);
	context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
	context.lineTo(x + width, y + height - safeRadius);
	context.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
	context.lineTo(x + safeRadius, y + height);
	context.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
	context.lineTo(x, y + safeRadius);
	context.quadraticCurveTo(x, y, x + safeRadius, y);
	context.closePath();
}

function fillRoundedRect(
	context: CanvasRenderingContext2D,
	x: number,
	y: number,
	width: number,
	height: number,
	radius: number,
	fillStyle: string | CanvasGradient,
) {
	roundedPath(context, x, y, width, height, radius);
	context.fillStyle = fillStyle;
	context.fill();
}

function strokeRoundedRect(
	context: CanvasRenderingContext2D,
	x: number,
	y: number,
	width: number,
	height: number,
	radius: number,
	strokeStyle: string | CanvasGradient,
	lineWidth: number,
) {
	roundedPath(context, x, y, width, height, radius);
	context.strokeStyle = strokeStyle;
	context.lineWidth = lineWidth;
	context.stroke();
}

function drawPill(
	context: CanvasRenderingContext2D,
	x: number,
	y: number,
	text: string,
	theme: ThemePalette,
	fontSize: number,
) {
	context.font = `600 ${fontSize}px ${FONT_STACK}`;
	const width = context.measureText(text).width + fontSize * 1.8;
	const height = fontSize * 1.95;
	const gradient = context.createLinearGradient(x, y, x + width, y + height);
	gradient.addColorStop(0, "rgba(255,255,255,0.12)");
	gradient.addColorStop(1, "rgba(255,255,255,0.05)");
	fillRoundedRect(context, x, y, width, height, height / 2, gradient);
	strokeRoundedRect(context, x, y, width, height, height / 2, theme.panelEdge, 1);
	context.fillStyle = theme.text;
	context.textBaseline = "middle";
	context.fillText(text, x + fontSize * 0.9, y + height / 2);
	return width;
}

function resolveLayout(size: Size, runtime: RuntimeGame): LayoutMetrics {
	const pad = clamp(Math.min(size.width, size.height) * 0.028, 16, 28);
	const frameX = pad;
	const frameY = pad;
	const frameWidth = size.width - pad * 2;
	const frameHeight = size.height - pad * 2;
	const headerHeight = 0;
	const boardPad = clamp(frameWidth * 0.04, 14, 24);
	const boardAreaWidth = frameWidth - boardPad * 2;
	const boardAreaHeight = frameHeight - boardPad * 2;
	const cellSize = Math.max(
		8,
		Math.floor(
			Math.min(
				boardAreaWidth / runtime.level.cols,
				boardAreaHeight / runtime.level.rows,
			),
		),
	);
	const boardWidth = cellSize * runtime.level.cols;
	const boardHeight = cellSize * runtime.level.rows;
	const boardX = frameX + (frameWidth - boardWidth) / 2;
	const boardY = frameY + (frameHeight - boardHeight) / 2;
	return {
		frameX,
		frameY,
		frameWidth,
		frameHeight,
		headerHeight,
		boardX,
		boardY,
		boardWidth,
		boardHeight,
		cellSize,
		boardRadius: Math.max(14, cellSize * 0.42),
		pad,
	};
}

function formatStatus(status: GameStatus) {
	if (status === "won") return "Board cleared";
	if (status === "lost") return "Mine hit";
	if (status === "playing") return "Sweep in progress";
	return "Ready to open";
}

function drawFlagIcon(
	context: CanvasRenderingContext2D,
	x: number,
	y: number,
	size: number,
	theme: ThemePalette,
) {
	context.save();
	context.translate(x, y);
	context.strokeStyle = theme.text;
	context.lineWidth = Math.max(1.5, size * 0.08);
	context.lineCap = "round";
	context.beginPath();
	context.moveTo(size * 0.38, size * 0.78);
	context.lineTo(size * 0.38, size * 0.2);
	context.stroke();

	context.fillStyle = theme.flag;
	context.beginPath();
	context.moveTo(size * 0.42, size * 0.22);
	context.lineTo(size * 0.78, size * 0.34);
	context.lineTo(size * 0.42, size * 0.5);
	context.closePath();
	context.fill();

	context.strokeStyle = "rgba(255,255,255,0.15)";
	context.beginPath();
	context.moveTo(size * 0.4, size * 0.78);
	context.lineTo(size * 0.7, size * 0.78);
	context.stroke();
	context.restore();
}

function drawMineIcon(
	context: CanvasRenderingContext2D,
	x: number,
	y: number,
	size: number,
	theme: ThemePalette,
) {
	context.save();
	context.translate(x + size / 2, y + size / 2);
	context.fillStyle = theme.mineGlow;
	context.beginPath();
	context.arc(0, 0, size * 0.4, 0, Math.PI * 2);
	context.fill();

	context.strokeStyle = theme.mine;
	context.lineWidth = Math.max(1.2, size * 0.07);
	for (let spoke = 0; spoke < 8; spoke += 1) {
		const angle = (Math.PI * 2 * spoke) / 8;
		context.beginPath();
		context.moveTo(Math.cos(angle) * size * 0.18, Math.sin(angle) * size * 0.18);
		context.lineTo(Math.cos(angle) * size * 0.42, Math.sin(angle) * size * 0.42);
		context.stroke();
	}

	context.fillStyle = theme.mine;
	context.beginPath();
	context.arc(0, 0, size * 0.24, 0, Math.PI * 2);
	context.fill();
	context.restore();
}

function drawBoard(
	surface: Surface,
	runtime: RuntimeGame,
	settings: SettingsSnapshot,
	hoveredCell: number | null,
	pulseTimeMs: number,
) {
	const theme = resolveTheme(settings.themeKey, settings.hueShift, settings.glowBoost);
	const context = surface.context;
	const size = { width: surface.width, height: surface.height };
	const layout = resolveLayout(size, runtime);
	const pulse = 0.5 + Math.sin(pulseTimeMs / 420) * 0.5;

	context.clearRect(0, 0, surface.width, surface.height);

	const background = context.createLinearGradient(0, 0, 0, surface.height);
	background.addColorStop(0, theme.backgroundTop);
	background.addColorStop(1, theme.backgroundBottom);
	context.fillStyle = background;
	context.fillRect(0, 0, surface.width, surface.height);

	context.beginPath();
	context.fillStyle = theme.accentGlow;
	context.globalAlpha = 0.035;
	context.arc(surface.width * 0.84, surface.height * 0.14, Math.max(surface.width, surface.height) * 0.2, 0, Math.PI * 2);
	context.fill();
	context.globalAlpha = 1;

	fillRoundedRect(
		context,
		layout.frameX,
		layout.frameY,
		layout.frameWidth,
		layout.frameHeight,
		28,
		theme.panel,
	);
	strokeRoundedRect(
		context,
		layout.frameX,
		layout.frameY,
		layout.frameWidth,
		layout.frameHeight,
		28,
		theme.panelEdge,
		1.5,
	);

	const boardGradient = context.createLinearGradient(
		layout.boardX,
		layout.boardY,
		layout.boardX + layout.boardWidth,
		layout.boardY + layout.boardHeight,
	);
	boardGradient.addColorStop(0, theme.board);
	boardGradient.addColorStop(1, "rgba(0,0,0,0.12)");
	fillRoundedRect(
		context,
		layout.boardX - layout.cellSize * 0.22,
		layout.boardY - layout.cellSize * 0.22,
		layout.boardWidth + layout.cellSize * 0.44,
		layout.boardHeight + layout.cellSize * 0.44,
		layout.boardRadius,
		boardGradient,
	);
	strokeRoundedRect(
		context,
		layout.boardX - layout.cellSize * 0.22,
		layout.boardY - layout.cellSize * 0.22,
		layout.boardWidth + layout.cellSize * 0.44,
		layout.boardHeight + layout.cellSize * 0.44,
		layout.boardRadius,
		theme.boardEdge,
		1.5,
	);

	for (let index = 0; index < runtime.cells.length; index += 1) {
		const row = Math.floor(index / runtime.level.cols);
		const col = index % runtime.level.cols;
		const x = layout.boardX + col * layout.cellSize;
		const y = layout.boardY + row * layout.cellSize;
		const sizePx = layout.cellSize;
		const cell = runtime.cells[index];
		const radius = Math.max(4, sizePx * 0.18);
		const isFocus = runtime.solverFocus === index && runtime.state !== "lost" && runtime.state !== "won";
		const isHover = hoveredCell === index;

		if (cell.revealed) {
			fillRoundedRect(context, x, y, sizePx, sizePx, radius, theme.revealed);
			strokeRoundedRect(context, x, y, sizePx, sizePx, radius, theme.revealedEdge, 1);
		} else {
			fillRoundedRect(context, x, y, sizePx, sizePx, radius, theme.hidden);
			strokeRoundedRect(context, x, y, sizePx, sizePx, radius, theme.hiddenStroke, 1);
			context.strokeStyle = "rgba(255,255,255,0.05)";
			context.lineWidth = 1;
			context.beginPath();
			context.moveTo(x + sizePx * 0.2, y + sizePx * 0.18);
			context.lineTo(x + sizePx * 0.8, y + sizePx * 0.18);
			context.stroke();
		}

		if (!cell.revealed && (isHover || isFocus)) {
			context.save();
			context.globalAlpha = isFocus ? 0.08 + pulse * 0.08 : 0.05;
			fillRoundedRect(context, x, y, sizePx, sizePx, radius, theme.accentGlow);
			context.restore();
			strokeRoundedRect(
				context,
				x + 1,
				y + 1,
				sizePx - 2,
				sizePx - 2,
				radius,
				isFocus ? theme.accent : theme.accentAlt,
				isFocus ? 2 : 1.4,
			);
		}

		if (cell.flagged && !cell.revealed) {
			drawFlagIcon(context, x, y, sizePx, theme);
		}

		const showMine =
			cell.mine &&
			(cell.revealed || runtime.state === "lost" || runtime.state === "won");

		if (showMine) {
			if (runtime.explosion === index) {
				fillRoundedRect(context, x, y, sizePx, sizePx, radius, "rgba(239,68,68,0.24)");
			}
			drawMineIcon(context, x, y, sizePx, theme);
			continue;
		}

		if (cell.revealed && cell.adjacent > 0) {
			context.fillStyle = theme.numberColors[cell.adjacent] ?? theme.text;
			context.font = `800 ${Math.max(12, sizePx * 0.58)}px ${FONT_STACK}`;
			context.textAlign = "center";
			context.textBaseline = "middle";
			context.fillText(`${cell.adjacent}`, x + sizePx / 2, y + sizePx / 2 + 1);
			context.textAlign = "left";
			context.textBaseline = "alphabetic";
		}
	}

	surface.texture.refresh();
}

function mountMinesweeper(
	host: HTMLDivElement,
	PhaserLib: PhaserModule,
	bridge: Bridge,
) {
	let game: PhaserGame | null = null;
	let observer: ResizeObserver | null = null;
	let currentSize = resolveHostSize(host);
	const resolution =
		typeof window === "undefined"
			? 1
			: Math.max(1, Math.min(3, window.devicePixelRatio || 1));

	class MinesweeperScene extends PhaserLib.Scene {
		private runtime = createRuntime(DIFFICULTIES[bridge.settingsRef.current.difficulty]);

		private surface: Surface | null = null;

		private hoveredCell: number | null = null;

		private pulseTimeMs = 0;

		private solverAccumulator = 0;

		private cleanupInput: (() => void) | null = null;

		private themeFingerprint = "";

		private difficultyKey = bridge.settingsRef.current.difficulty;

		constructor() {
			super("minesweeper-phaser");
		}

		create() {
				this.surface = createSurface(
					currentSize,
					this,
					`minesweeper-surface-${Math.random().toString(36).slice(2)}`,
				);
			this.cameras.main.setBackgroundColor("#04060c");
			this.input.mouse?.disableContextMenu();
			this.cleanupInput = this.bindInput();
			refreshSolverPreview(this.runtime);
			this.syncUi();
			this.renderBoard();
				bridge.controlsRef.current = {
					reset: () => {
						this.resetBoard();
					},
					solverStep: () => {
						this.runSolver(true);
					},
					togglePause: () => {
						if (togglePause(this.runtime, performance.now())) {
							this.syncUi();
							this.renderBoard();
						}
					},
				};
			this.events.once(PhaserLib.Scenes.Events.SHUTDOWN, this.cleanup, this);
			this.events.once(PhaserLib.Scenes.Events.DESTROY, this.cleanup, this);
		}

		update(_time: number, delta: number) {
			let needsRender = updateElapsed(this.runtime, performance.now());
			this.pulseTimeMs += delta;

			if (this.difficultyKey !== bridge.settingsRef.current.difficulty) {
				this.difficultyKey = bridge.settingsRef.current.difficulty;
				this.resetBoard();
				needsRender = true;
			}

			const fingerprint = `${bridge.settingsRef.current.themeKey}:${bridge.settingsRef.current.hueShift.toFixed(3)}:${bridge.settingsRef.current.glowBoost.toFixed(3)}`;
			if (fingerprint !== this.themeFingerprint) {
				this.themeFingerprint = fingerprint;
				needsRender = true;
			}

				if (
					bridge.settingsRef.current.autoplay &&
					!this.runtime.paused &&
					this.runtime.state !== "won" &&
					this.runtime.state !== "lost"
				) {
				this.solverAccumulator += delta;
				const delay = bridge.settingsRef.current.solverDelayMs;
				while (this.solverAccumulator >= delay) {
					this.solverAccumulator -= delay;
					if (!this.runSolver(false)) break;
					needsRender = true;
					if (bridge.settingsRef.current.solverDelayMs > 100) break;
				}
			} else {
				this.solverAccumulator = 0;
			}

			if (needsRender) {
				this.syncUi();
				this.renderBoard();
			}
		}

		handleResize(nextSize: Size) {
			currentSize = nextSize;
			if (!this.surface) return;
			destroySurface(this, this.surface);
				this.surface = createSurface(
					nextSize,
					this,
					`minesweeper-surface-${Math.random().toString(36).slice(2)}`,
				);
			this.scale.resize(nextSize.width, nextSize.height);
			this.renderBoard();
		}

		private bindInput() {
			const canvas = this.game.canvas;
			if (!canvas) return null;

			const toLogicalPoint = (event: PointerEvent) => {
				const rect = canvas.getBoundingClientRect();
				const x = ((event.clientX - rect.left) / Math.max(1, rect.width)) * this.scale.width;
				const y = ((event.clientY - rect.top) / Math.max(1, rect.height)) * this.scale.height;
				return { x, y };
			};

			const onPointerMove = (event: PointerEvent) => {
				const point = toLogicalPoint(event);
				const hovered = this.cellAtPoint(point.x, point.y);
				if (hovered !== this.hoveredCell) {
					this.hoveredCell = hovered;
					this.renderBoard();
				}
			};

			const onPointerLeave = () => {
				if (this.hoveredCell === null) return;
				this.hoveredCell = null;
				this.renderBoard();
			};

			const onPointerUp = (event: PointerEvent) => {
				const point = toLogicalPoint(event);
				const cell = this.cellAtPoint(point.x, point.y);
				if (cell === null) return;
				const alternate =
					event.button === 2 ||
					(event.pointerType !== "mouse" &&
						bridge.settingsRef.current.pointerMode === "flag");
				if (this.handleInputAction(cell, alternate)) {
					this.syncUi();
					this.renderBoard();
				}
			};

			const onContextMenu = (event: MouseEvent) => {
				event.preventDefault();
			};

			canvas.addEventListener("pointermove", onPointerMove);
			canvas.addEventListener("pointerleave", onPointerLeave);
			canvas.addEventListener("pointerup", onPointerUp);
			canvas.addEventListener("contextmenu", onContextMenu);

			return () => {
				canvas.removeEventListener("pointermove", onPointerMove);
				canvas.removeEventListener("pointerleave", onPointerLeave);
				canvas.removeEventListener("pointerup", onPointerUp);
				canvas.removeEventListener("contextmenu", onContextMenu);
			};
		}

		private cellAtPoint(x: number, y: number) {
			const layout = resolveLayout(currentSize, this.runtime);
			if (
				x < layout.boardX ||
				y < layout.boardY ||
				x >= layout.boardX + layout.boardWidth ||
				y >= layout.boardY + layout.boardHeight
			) {
				return null;
			}

			const col = Math.floor((x - layout.boardX) / layout.cellSize);
			const row = Math.floor((y - layout.boardY) / layout.cellSize);
			if (
				row < 0 ||
				row >= this.runtime.level.rows ||
				col < 0 ||
				col >= this.runtime.level.cols
			) {
				return null;
			}

			return row * this.runtime.level.cols + col;
		}

		private handleInputAction(index: number, alternate: boolean) {
			const now = performance.now();
			let changed = false;

			if (alternate) {
				changed = toggleFlag(this.runtime, index);
			} else {
				const cell = this.runtime.cells[index];
				changed = cell.revealed
					? chordIndex(this.runtime, index, now)
					: revealIndex(this.runtime, index, now);
			}

			if (changed) {
				refreshSolverPreview(this.runtime);
			}

			return changed;
		}

		private runSolver(singleStep: boolean) {
			const changed = applySolverMove(this.runtime, performance.now(), singleStep);
			if (changed) {
				this.syncUi();
				this.renderBoard();
			}
			return changed;
		}

		private resetBoard() {
			resetRuntime(this.runtime, DIFFICULTIES[bridge.settingsRef.current.difficulty]);
			this.hoveredCell = null;
			this.solverAccumulator = 0;
			refreshSolverPreview(this.runtime);
			this.syncUi();
			this.renderBoard();
		}

		private syncUi() {
			bridge.onUiState(toUiState(this.runtime, bridge.settingsRef.current));
		}

		private renderBoard() {
			if (!this.surface) return;
			drawBoard(
				this.surface,
				this.runtime,
				bridge.settingsRef.current,
				this.hoveredCell,
				this.pulseTimeMs,
			);
		}

		private cleanup() {
			this.cleanupInput?.();
			this.cleanupInput = null;
			destroySurface(this, this.surface);
			this.surface = null;
			bridge.controlsRef.current = null;
		}
	}

	const gameConfig = {
		type: PhaserLib.CANVAS,
		parent: host,
		backgroundColor: "#04060c",
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
		scene: [MinesweeperScene],
	} as any;
	gameConfig.resolution = resolution;

	game = new PhaserLib.Game(gameConfig);

	if (game.canvas) {
		game.canvas.style.display = "block";
		game.canvas.style.width = "100%";
		game.canvas.style.height = "100%";
		game.canvas.style.touchAction = "manipulation";
	}

	observer = new ResizeObserver(() => {
		currentSize = resolveHostSize(host);
		if (!game || currentSize.width <= 0 || currentSize.height <= 0) return;
		const scene = game.scene.keys["minesweeper-phaser"] as
			| MinesweeperScene
			| undefined;
		if (!scene) return;
		scene.handleResize(currentSize);
	});
	observer.observe(host);

	return () => {
		observer?.disconnect();
		observer = null;
		bridge.controlsRef.current = null;
		game?.destroy(true);
		game = null;
	};
}

export default function MineSweeper() {
	const hostRef = useRef<HTMLDivElement | null>(null);
	const controlsRef = useRef<SceneControls | null>(null);
	const settingsRef = useRef<SettingsSnapshot>({
		difficulty: "intermediate",
		autoplay: false,
		solverDelayMs: SPEED_OPTIONS[1].delayMs,
		themeKey: "glacier",
		hueShift: 0,
		glowBoost: 0.12,
		pointerMode: "reveal",
	});
	const [status, setStatus] = useState<LoadStatus>("loading");
	const [errorMessage, setErrorMessage] = useState("");
	const [uiState, setUiState] = useState<UiState>(EMPTY_UI_STATE);
	const [difficulty, setDifficulty] = useState<DifficultyKey>("intermediate");
	const [autoplay, setAutoplay] = useState(false);
	const [speedIndex, setSpeedIndex] = useState(1);
	const [themeKey, setThemeKey] = useState<ThemeKey>("glacier");
	const [hueShift, setHueShift] = useState(0);
	const [glowBoost, setGlowBoost] = useState(0.12);
	const [pointerMode, setPointerMode] = useState<PointerMode>("reveal");

	useEffect(() => {
		settingsRef.current.difficulty = difficulty;
	}, [difficulty]);

	useEffect(() => {
		settingsRef.current.autoplay = autoplay;
	}, [autoplay]);

	useEffect(() => {
		settingsRef.current.solverDelayMs = SPEED_OPTIONS[speedIndex]?.delayMs ?? SPEED_OPTIONS[0].delayMs;
	}, [speedIndex]);

	useEffect(() => {
		settingsRef.current.themeKey = themeKey;
	}, [themeKey]);

	useEffect(() => {
		settingsRef.current.hueShift = hueShift;
	}, [hueShift]);

	useEffect(() => {
		settingsRef.current.glowBoost = glowBoost;
	}, [glowBoost]);

	useEffect(() => {
		settingsRef.current.pointerMode = pointerMode;
	}, [pointerMode]);

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

				cleanup = mountMinesweeper(hostRef.current, PhaserLib, {
					settingsRef,
					controlsRef,
					onUiState: setUiState,
				});
				setErrorMessage("");
				setStatus("ready");
			} catch (error) {
				console.error("Minesweeper failed to initialize", error);
				if (!cancelled) {
					setErrorMessage(
						error instanceof Error ? error.message : "Unknown initialization error",
					);
					setStatus("error");
				}
			}
		})();

		return () => {
			cancelled = true;
			cleanup?.();
		};
	}, []);

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			const target = event.target;
			if (
				target instanceof HTMLElement &&
				(target.isContentEditable || target.closest("input, textarea, select"))
			) {
				return;
			}

			if (event.key.toLowerCase() === "p") {
				event.preventDefault();
				controlsRef.current?.togglePause();
			}
		};

		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, []);

	const theme = resolveTheme(themeKey, hueShift, glowBoost);
	const speed = SPEED_OPTIONS[speedIndex] ?? SPEED_OPTIONS[0];
	const statusLabel = uiState.paused ? "Paused" : formatStatus(uiState.status);

	return (
		<div
			className="flex h-full min-h-0 w-full flex-col overflow-hidden lg:min-h-0"
			style={{
				backgroundImage: `linear-gradient(180deg, ${theme.backgroundTop} 0%, ${theme.backgroundBottom} 100%)`,
				color: theme.text,
			}}
		>
			<div
				className="border-b px-4 py-4 sm:px-5"
				style={{ borderColor: theme.panelEdge, backgroundColor: "rgba(10,12,18,0.22)" }}
			>
				<div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
					<div className="min-w-0 text-sm leading-6" style={{ color: theme.muted }}>
						{statusLabel} • {uiState.solverLabel} • risk {uiState.solverRiskText}
					</div>

					<div
						className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] uppercase tracking-[0.18em]"
						style={{ color: theme.muted }}
					>
						<span>Mines <span style={{ color: theme.text }}>{uiState.minesLeft}</span></span>
						<span>Time <span style={{ color: theme.text }}>{uiState.elapsedSec}s</span></span>
						<span>Points <span style={{ color: theme.text }}>{uiState.score}</span></span>
						<span>Clear <span style={{ color: theme.text }}>{uiState.progress.toFixed(0)}%</span></span>
					</div>
				</div>
			</div>

			<div className="flex min-h-0 flex-1 flex-col lg:flex-row">
				<div
					className="w-full border-b px-4 py-5 sm:px-5 lg:w-[320px] lg:border-b-0 lg:border-r"
					style={{ borderColor: theme.panelEdge, backgroundColor: "rgba(10,12,18,0.2)" }}
				>
					<div className="grid gap-4">
						<div>
							<div
								className="text-xs font-semibold uppercase tracking-[0.24em]"
								style={{ color: theme.muted }}
							>
								Run
							</div>
							<div className="mt-3 flex flex-wrap gap-2">
								<button
									type="button"
									onClick={() => controlsRef.current?.reset()}
									className="rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition"
									style={{ backgroundColor: theme.text, color: theme.backgroundBottom }}
								>
									New board
								</button>
								<button
									type="button"
									onClick={() => controlsRef.current?.togglePause()}
									className="rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition"
									style={{
										borderColor: theme.panelEdge,
										backgroundColor: "rgba(8,10,16,0.2)",
									}}
								>
									{uiState.paused ? "Resume" : "Pause"}
								</button>
								<button
									type="button"
									onClick={() => setAutoplay((value) => !value)}
									className="rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition"
									style={{
										borderColor: theme.panelEdge,
										backgroundColor: "rgba(8,10,16,0.2)",
									}}
								>
									Autoplay {autoplay ? "On" : "Off"}
								</button>
								<button
									type="button"
									onClick={() => controlsRef.current?.solverStep()}
									className="rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition"
									style={{
										borderColor: theme.panelEdge,
										backgroundColor: "rgba(8,10,16,0.2)",
									}}
								>
									Solver step
								</button>
							</div>
						</div>

						<div>
							<div
								className="text-xs font-semibold uppercase tracking-[0.24em]"
								style={{ color: theme.muted }}
							>
								Difficulty
							</div>
							<div className="mt-3 flex flex-wrap gap-2">
								{DIFFICULTY_ORDER.map((key) => {
									const active = difficulty === key;
									return (
										<button
											key={key}
											type="button"
											onClick={() => setDifficulty(key)}
											className="rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition"
											style={{
												borderColor: active ? theme.accent : theme.panelEdge,
												backgroundColor: active
													? "rgba(255,255,255,0.08)"
													: "rgba(8,10,16,0.16)",
												color: active ? theme.text : theme.muted,
											}}
										>
											{DIFFICULTIES[key].label}
										</button>
									);
								})}
							</div>
						</div>

						<div>
							<div
								className="text-xs font-semibold uppercase tracking-[0.24em]"
								style={{ color: theme.muted }}
							>
								Color system
							</div>
							<div className="mt-3 flex flex-wrap gap-2">
								{THEME_ORDER.map((key) => {
									const swatch = resolveTheme(key, 0, 0.2);
									const active = themeKey === key;
									return (
										<button
											key={key}
											type="button"
											onClick={() => setThemeKey(key)}
											className="rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition"
											style={{
												borderColor: active ? theme.accent : theme.panelEdge,
												backgroundColor: active
													? "rgba(255,255,255,0.08)"
													: "rgba(8,10,16,0.16)",
												color: active ? theme.text : swatch.muted,
											}}
										>
											{swatch.name}
										</button>
									);
								})}
							</div>
							<div className="mt-3 flex flex-wrap gap-2">
								<button
									type="button"
									onClick={() => setHueShift(Math.random())}
									className="rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition"
									style={{
										borderColor: theme.panelEdge,
										backgroundColor: "rgba(8,10,16,0.16)",
									}}
								>
									Remix tone
								</button>
								<button
									type="button"
									onClick={() =>
										setGlowBoost((value) =>
											value > 0.28 ? 0.04 : Number((value + 0.06).toFixed(2)),
										)
									}
									className="rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition"
									style={{
										borderColor: theme.panelEdge,
										backgroundColor: "rgba(8,10,16,0.16)",
									}}
								>
									Accent {glowBoost.toFixed(2)}
								</button>
							</div>
						</div>

						<div>
							<div
								className="text-xs font-semibold uppercase tracking-[0.24em]"
								style={{ color: theme.muted }}
							>
								Input + solver
							</div>
							<div className="mt-3 flex flex-wrap gap-2">
								<button
									type="button"
									onClick={() =>
										setSpeedIndex((value) => (value + 1) % SPEED_OPTIONS.length)
									}
									className="rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition"
									style={{
										borderColor: theme.panelEdge,
										backgroundColor: "rgba(8,10,16,0.16)",
									}}
								>
									Speed {speed.label}
								</button>
								<button
									type="button"
									onClick={() =>
										setPointerMode((value) => (value === "reveal" ? "flag" : "reveal"))
									}
									className="rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition"
									style={{
										borderColor: theme.panelEdge,
										backgroundColor: "rgba(8,10,16,0.16)",
									}}
								>
									Touch {pointerMode}
								</button>
							</div>
						</div>
					</div>
				</div>

				<div className="relative min-h-[440px] flex-1 lg:min-h-0">
					<div ref={hostRef} className="absolute inset-0" />

					{status === "loading" && (
						<div className="absolute inset-0 grid place-items-center bg-black/10 px-6 text-center font-mono text-sm" style={{ color: theme.text }}>
							Booting Phaser scene...
						</div>
					)}

					{status === "error" && (
						<div className="absolute inset-0 grid place-items-center bg-black/20 px-6 text-center font-mono text-sm" style={{ color: theme.flag }}>
							<div>
								<div>Unable to load the Minesweeper scene.</div>
								{errorMessage ? (
									<div className="mt-2 text-xs uppercase tracking-[0.16em]">
										{errorMessage}
									</div>
								) : null}
							</div>
						</div>
					)}

					{status === "ready" && uiState.paused && (
						<div className="absolute inset-0 grid place-items-center bg-black/26 px-6 text-center">
							<div
								className="rounded-[26px] border px-8 py-7 shadow-[0_16px_44px_rgba(0,0,0,0.22)]"
								style={{ borderColor: theme.panelEdge, backgroundColor: "rgba(11,13,19,0.76)" }}
							>
								<div className="font-mono text-3xl font-semibold uppercase tracking-[0.14em]">
									Paused
								</div>
								<div className="mt-3 text-sm leading-6" style={{ color: theme.muted }}>
									Press <span style={{ color: theme.text }}>P</span> or use resume to continue.
								</div>
								<div className="mt-5 flex justify-center gap-2">
									<button
										type="button"
										onClick={() => controlsRef.current?.togglePause()}
										className="rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em]"
										style={{ backgroundColor: theme.text, color: theme.backgroundBottom }}
									>
										Resume
									</button>
									<button
										type="button"
										onClick={() => controlsRef.current?.reset()}
										className="rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em]"
										style={{ borderColor: theme.panelEdge, backgroundColor: "rgba(255,255,255,0.05)" }}
									>
										New board
									</button>
								</div>
							</div>
						</div>
					)}

					{status === "ready" && uiState.status === "won" && (
						<div className="absolute inset-0 grid place-items-center bg-black/24 px-6 text-center">
							<div
								className="rounded-[26px] border px-8 py-7 shadow-[0_16px_44px_rgba(0,0,0,0.22)]"
								style={{ borderColor: theme.panelEdge, backgroundColor: "rgba(11,13,19,0.76)" }}
							>
								<div className="font-mono text-3xl font-semibold uppercase tracking-[0.14em]">
									Field cleared
								</div>
								<div className="mt-3 text-sm leading-6" style={{ color: theme.muted }}>
									{uiState.score} points in {uiState.elapsedSec}s.
								</div>
								<div className="mt-5 flex justify-center gap-2">
									<button
										type="button"
										onClick={() => controlsRef.current?.reset()}
										className="rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em]"
										style={{ backgroundColor: theme.text, color: theme.backgroundBottom }}
									>
										Play again
									</button>
								</div>
							</div>
						</div>
					)}

					{status === "ready" && uiState.status === "lost" && (
						<div className="absolute inset-0 grid place-items-center bg-black/24 px-6 text-center">
							<div
								className="rounded-[26px] border px-8 py-7 shadow-[0_16px_44px_rgba(0,0,0,0.22)]"
								style={{ borderColor: theme.panelEdge, backgroundColor: "rgba(11,13,19,0.76)" }}
							>
								<div className="font-mono text-3xl font-semibold uppercase tracking-[0.14em]">
									Mine hit
								</div>
								<div className="mt-3 text-sm leading-6" style={{ color: theme.muted }}>
									{uiState.score} points before the explosion.
								</div>
								<div className="mt-5 flex justify-center gap-2">
									<button
										type="button"
										onClick={() => controlsRef.current?.reset()}
										className="rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em]"
										style={{ backgroundColor: theme.text, color: theme.backgroundBottom }}
									>
										Try again
									</button>
								</div>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
