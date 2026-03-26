"use client";

import { useEffect, useRef, useState } from "react";

type PhaserModule = typeof import("phaser");
type PhaserGame = import("phaser").Game;
type PhaserScene = import("phaser").Scene;
type PhaserCanvasTexture = import("phaser").Textures.CanvasTexture;
type PhaserImage = import("phaser").GameObjects.Image;
type PhaserGraphics = import("phaser").GameObjects.Graphics;
type PhaserGeometryMask = import("phaser").Display.Masks.GeometryMask;

type TeamId = 0 | 1;
type LoadStatus = "loading" | "ready" | "error";

type CurrentRef<T> = {
	current: T;
};

type SettingsSnapshot = {
	paused: boolean;
	speed: number;
};

type ColorValue = {
	r: number;
	g: number;
	b: number;
	css: string;
	int: number;
};

type TeamPalette = {
	name: string;
	fill: ColorValue;
	glow: ColorValue;
	trail: ColorValue;
};

type Palette = {
	background: ColorValue;
	surface: ColorValue;
	frame: ColorValue;
	text: ColorValue;
	muted: ColorValue;
	accent: ColorValue;
	teams: [TeamPalette, TeamPalette];
};

type PaletteView = {
	background: string;
	surface: string;
	frame: string;
	text: string;
	muted: string;
	accent: string;
	teams: [
		{ name: string; fill: string; glow: string; trail: string },
		{ name: string; fill: string; glow: string; trail: string },
	];
};

type UiState = {
	cycle: number;
	territory: [number, number];
	winner: TeamId | null;
	palette: PaletteView;
};

type Bridge = {
	settingsRef: CurrentRef<SettingsSnapshot>;
	restartRef: CurrentRef<(() => void) | undefined>;
	remixRef: CurrentRef<(() => void) | undefined>;
	onUiState: (state: UiState) => void;
};

type BoardState = {
	cols: number;
	rows: number;
	cells: Uint8Array;
	counts: [number, number];
	dirtyFlags: Uint8Array;
	dirtyList: number[];
};

type Layout = {
	width: number;
	height: number;
	boardSize: number;
	boardX: number;
	boardY: number;
	scale: number;
};

type BoardSurface = {
	width: number;
	height: number;
	canvas: HTMLCanvasElement;
	context: CanvasRenderingContext2D;
	textureKey: string;
	texture: PhaserCanvasTexture;
	image: PhaserImage;
};

type BallState = {
	x: number;
	y: number;
	vx: number;
	vy: number;
	radius: number;
	team: TeamId;
	lastHitIndex: number;
	speedGain: number;
	impactPower: number;
	swing: number;
	phase: number;
	turnBias: number;
};

type TrailNode = {
	x: number;
	y: number;
	team: TeamId;
	life: number;
};

type PulseNode = {
	x: number;
	y: number;
	team: TeamId;
	radius: number;
	life: number;
	maxLife: number;
};

type CollisionResult = {
	hitIndex: number;
	reflectX: boolean;
	reflectY: boolean;
};

const BOARD_COLS = 40;
const BOARD_ROWS = 40;
const SURFACE_CELL_PX = 16;
const FIXED_STEP_MS = 1000 / 120;
const MAX_FRAME_DELTA_MS = 48;
const BALL_RADIUS = 0.48;
const BASE_BALL_SPEED = 8.4;
const MAX_BALL_SPEED = 16.8;
const ROUND_HOLD_MS = 2300;
const BOARD_CORNER_RADIUS = 24;
const TEAM_LABELS: [string, string] = ["Zero", "One"];
const DEFAULT_SETTINGS: SettingsSnapshot = {
	paused: false,
	speed: 1,
};

const FALLBACK_PALETTE_VIEW: PaletteView = {
	background: "rgb(7 13 22)",
	surface: "rgb(10 19 31)",
	frame: "rgb(34 52 78)",
	text: "rgb(231 238 247)",
	muted: "rgb(133 149 171)",
	accent: "rgb(138 223 255)",
	teams: [
		{
			name: TEAM_LABELS[0],
			fill: "rgb(213 244 237)",
			glow: "rgb(237 255 252)",
			trail: "rgb(246 255 252)",
		},
		{
			name: TEAM_LABELS[1],
			fill: "rgb(14 76 90)",
			glow: "rgb(58 145 162)",
			trail: "rgb(112 207 220)",
		},
	],
};

const EMPTY_UI_STATE: UiState = {
	cycle: 1,
	territory: [BOARD_COLS * BOARD_ROWS * 0.5, BOARD_COLS * BOARD_ROWS * 0.5],
	winner: null,
	palette: FALLBACK_PALETTE_VIEW,
};

function clamp(value: number, min: number, max: number) {
	if (max < min) return min;
	return Math.min(max, Math.max(min, value));
}

function randomRange(min: number, max: number) {
	return min + Math.random() * (max - min);
}

function wrap01(value: number) {
	const wrapped = value % 1;
	return wrapped < 0 ? wrapped + 1 : wrapped;
}

function hslToColor(h: number, s: number, l: number): ColorValue {
	const hue = wrap01(h);
	const saturation = clamp(s, 0, 1);
	const lightness = clamp(l, 0, 1);

	if (saturation <= 0) {
		const channel = Math.round(lightness * 255);
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

	const red = Math.round(channel(1 / 3) * 255);
	const green = Math.round(channel(0) * 255);
	const blue = Math.round(channel(-1 / 3) * 255);

	return {
		r: red,
		g: green,
		b: blue,
		css: `rgb(${red} ${green} ${blue})`,
		int: (red << 16) | (green << 8) | blue,
	};
}

function cssWithAlpha(color: string, alpha: number) {
	const match = color.match(/rgb\((\d+)\s+(\d+)\s+(\d+)\)/);
	if (!match) return color;
	return `rgba(${match[1]}, ${match[2]}, ${match[3]}, ${clamp(alpha, 0, 1)})`;
}

function mixColor(a: ColorValue, b: ColorValue, amount: number): ColorValue {
	const t = clamp(amount, 0, 1);
	const red = Math.round(a.r + (b.r - a.r) * t);
	const green = Math.round(a.g + (b.g - a.g) * t);
	const blue = Math.round(a.b + (b.b - a.b) * t);
	return {
		r: red,
		g: green,
		b: blue,
		css: `rgb(${red} ${green} ${blue})`,
		int: (red << 16) | (green << 8) | blue,
	};
}

function oppositeTeam(team: TeamId): TeamId {
	return team === 0 ? 1 : 0;
}

function resolveHostSize(host: HTMLDivElement) {
	const rect = host.getBoundingClientRect();
	return {
		width: Math.max(1, Math.floor(host.clientWidth || rect.width || 1)),
		height: Math.max(1, Math.floor(host.clientHeight || rect.height || 1)),
	};
}

function createPalette(): Palette {
	const baseHue = Math.random();
	const zeroHue = wrap01(baseHue + randomRange(-0.03, 0.03));
	const oneHue = wrap01(baseHue + 0.52 + randomRange(-0.03, 0.03));
	const backgroundHue = wrap01(baseHue + 0.62);

	return {
		background: hslToColor(backgroundHue, randomRange(0.36, 0.52), randomRange(0.06, 0.09)),
		surface: hslToColor(backgroundHue, randomRange(0.28, 0.4), randomRange(0.08, 0.12)),
		frame: hslToColor(wrap01(baseHue + 0.08), randomRange(0.22, 0.34), randomRange(0.22, 0.3)),
		text: hslToColor(wrap01(baseHue + 0.56), randomRange(0.14, 0.22), randomRange(0.9, 0.95)),
		muted: hslToColor(wrap01(baseHue + 0.54), randomRange(0.08, 0.16), randomRange(0.56, 0.64)),
		accent: hslToColor(wrap01(baseHue + 0.13), randomRange(0.72, 0.9), randomRange(0.6, 0.7)),
		teams: [
			{
				name: TEAM_LABELS[0],
				fill: hslToColor(zeroHue, randomRange(0.28, 0.42), randomRange(0.8, 0.87)),
				glow: hslToColor(wrap01(zeroHue + 0.03), randomRange(0.24, 0.36), randomRange(0.9, 0.96)),
				trail: hslToColor(wrap01(zeroHue + 0.02), randomRange(0.26, 0.38), randomRange(0.94, 0.98)),
			},
			{
				name: TEAM_LABELS[1],
				fill: hslToColor(oneHue, randomRange(0.62, 0.82), randomRange(0.22, 0.32)),
				glow: hslToColor(wrap01(oneHue + 0.02), randomRange(0.56, 0.74), randomRange(0.48, 0.58)),
				trail: hslToColor(wrap01(oneHue + 0.04), randomRange(0.58, 0.76), randomRange(0.68, 0.78)),
			},
		],
	};
}

function paletteToView(palette: Palette): PaletteView {
	return {
		background: palette.background.css,
		surface: palette.surface.css,
		frame: palette.frame.css,
		text: palette.text.css,
		muted: palette.muted.css,
		accent: palette.accent.css,
		teams: [
			{
				name: palette.teams[0].name,
				fill: palette.teams[0].fill.css,
				glow: palette.teams[0].glow.css,
				trail: palette.teams[0].trail.css,
			},
			{
				name: palette.teams[1].name,
				fill: palette.teams[1].fill.css,
				glow: palette.teams[1].glow.css,
				trail: palette.teams[1].trail.css,
			},
		],
	};
}

function computeLayout(width: number, height: number): Layout {
	const padding = clamp(Math.floor(Math.min(width, height) * 0.02), 8, 18);
	const boardSize = Math.max(260, Math.floor(Math.min(width, height) - padding * 2));
	return {
		width,
		height,
		boardSize,
		boardX: Math.floor((width - boardSize) * 0.5),
		boardY: Math.floor((height - boardSize) * 0.5),
		scale: boardSize / BOARD_COLS,
	};
}

function createBoard(cols: number, rows: number): BoardState {
	return {
		cols,
		rows,
		cells: new Uint8Array(cols * rows),
		counts: [0, 0],
		dirtyFlags: new Uint8Array(cols * rows),
		dirtyList: [],
	};
}

function resetDirtyBoard(board: BoardState) {
	board.dirtyFlags.fill(0);
	board.dirtyList.length = 0;
}

function markDirty(board: BoardState, index: number) {
	if (board.dirtyFlags[index] === 1) return;
	board.dirtyFlags[index] = 1;
	board.dirtyList.push(index);
}

function setBoardCell(board: BoardState, index: number, team: TeamId) {
	const previous = board.cells[index] as TeamId;
	if (previous === team) return false;
	board.cells[index] = team;
	board.counts[previous] -= 1;
	board.counts[team] += 1;
	markDirty(board, index);
	return true;
}

function seedSplitBoard(board: BoardState) {
	resetDirtyBoard(board);
	board.counts = [0, 0];

	for (let y = 0; y < board.rows; y += 1) {
		for (let x = 0; x < board.cols; x += 1) {
			const index = y * board.cols + x;
			const team = x < board.cols * 0.5 ? 0 : 1;
			board.cells[index] = team;
			board.counts[team] += 1;
			board.dirtyFlags[index] = 1;
			board.dirtyList.push(index);
		}
	}
}

function createSurface(scene: PhaserScene, textureKey: string): BoardSurface {
	const canvas = document.createElement("canvas");
	canvas.width = BOARD_COLS * SURFACE_CELL_PX;
	canvas.height = BOARD_ROWS * SURFACE_CELL_PX;

	const context = canvas.getContext("2d");
	if (!context) {
		throw new Error("Unable to create Binary Pong board surface.");
	}

	context.imageSmoothingEnabled = false;
	const texture = scene.textures.addCanvas(textureKey, canvas);
	if (!texture) {
		throw new Error("Unable to register Binary Pong board texture.");
	}

	const image = scene.add.image(0, 0, textureKey).setOrigin(0).setDepth(1);
	return {
		width: canvas.width,
		height: canvas.height,
		canvas,
		context,
		textureKey,
		texture,
		image,
	};
}

function destroySurface(scene: PhaserScene, surface: BoardSurface | null) {
	if (!surface) return;
	surface.image.destroy();
	scene.textures.remove(surface.textureKey);
}

function drawBoardCell(
	surface: BoardSurface,
	board: BoardState,
	index: number,
	palette: Palette,
) {
	const cellX = index % board.cols;
	const cellY = Math.floor(index / board.cols);
	const left = cellX * SURFACE_CELL_PX;
	const top = cellY * SURFACE_CELL_PX;
	const team = board.cells[index] as TeamId;
	const teamPalette = palette.teams[team];
	const nx = cellX / Math.max(1, board.cols - 1);
	const ny = cellY / Math.max(1, board.rows - 1);
	const wave = 0.5 + 0.5 * Math.sin(nx * 4.2 + ny * 5.3 + team * 1.7);
	const cross = 0.5 + 0.5 * Math.cos(nx * 2.4 - ny * 3.1 + team * 1.1);
	const shaded = mixColor(teamPalette.fill, teamPalette.glow, 0.06 + wave * 0.08 + cross * 0.03);

	surface.context.fillStyle = shaded.css;
	surface.context.fillRect(left, top, SURFACE_CELL_PX, SURFACE_CELL_PX);
}

function refreshBoardTexture(
	surface: BoardSurface,
	board: BoardState,
	palette: Palette,
	forceFullRedraw: boolean,
) {
	if (forceFullRedraw) {
		surface.context.fillStyle = palette.surface.css;
		surface.context.fillRect(0, 0, surface.width, surface.height);
		for (let index = 0; index < board.cells.length; index += 1) {
			drawBoardCell(surface, board, index, palette);
			board.dirtyFlags[index] = 0;
		}
		board.dirtyList.length = 0;
		surface.texture.refresh();
		return;
	}

	if (board.dirtyList.length === 0) return;

	for (const index of board.dirtyList) {
		drawBoardCell(surface, board, index, palette);
		board.dirtyFlags[index] = 0;
	}
	board.dirtyList.length = 0;
	surface.texture.refresh();
}

function createBall(team: TeamId): BallState {
	const speed = randomRange(BASE_BALL_SPEED * 0.94, BASE_BALL_SPEED * 1.08);
	let angle = randomRange(0, Math.PI * 2);
	while (Math.abs(Math.cos(angle)) < 0.18 && Math.abs(Math.sin(angle)) < 0.45) {
		angle = randomRange(0, Math.PI * 2);
	}

	return {
		x: team === 0 ? randomRange(BOARD_COLS * 0.18, BOARD_COLS * 0.32) : randomRange(BOARD_COLS * 0.68, BOARD_COLS * 0.82),
		y: randomRange(BOARD_ROWS * 0.3, BOARD_ROWS * 0.7),
		vx: Math.cos(angle) * speed,
		vy: Math.sin(angle) * speed,
		radius: BALL_RADIUS,
		team,
		lastHitIndex: -1,
		speedGain: randomRange(0.9, 1.2),
		impactPower: randomRange(1.05, 1.85),
		swing: randomRange(0.45, 1.25),
		phase: randomRange(0, Math.PI * 2),
		turnBias: randomRange(-0.16, 0.16),
	};
}

function clampSpeed(ball: BallState) {
	const speed = Math.hypot(ball.vx, ball.vy);
	if (speed <= 1e-6) {
		ball.vx = BASE_BALL_SPEED * randomRange(-1, 1);
		ball.vy = randomRange(-1.2, 1.2);
		return;
	}

	const nextSpeed = clamp(speed, BASE_BALL_SPEED * 0.84, MAX_BALL_SPEED);
	const scale = nextSpeed / speed;
	ball.vx *= scale;
	ball.vy *= scale;
}

function jitterBall(ball: BallState) {
	ball.vx += randomRange(-0.16, 0.16);
	ball.vy += randomRange(-0.16, 0.16);
	clampSpeed(ball);
}

function accelerateBall(ball: BallState, amount: number) {
	const speed = Math.hypot(ball.vx, ball.vy);
	if (speed <= 1e-6) return;
	const targetSpeed = clamp(speed + amount * ball.speedGain, BASE_BALL_SPEED * 0.84, MAX_BALL_SPEED);
	const scale = targetSpeed / speed;
	ball.vx *= scale;
	ball.vy *= scale;
}

function maybeConvertNeighbors(
	board: BoardState,
	index: number,
	team: TeamId,
	power: number,
) {
	const centerCol = index % board.cols;
	const centerRow = Math.floor(index / board.cols);
	const radius = clamp(power, 1, 2.6);
	const radiusSq = radius * radius;

	for (let row = Math.max(0, centerRow - 2); row <= Math.min(board.rows - 1, centerRow + 2); row += 1) {
		for (let col = Math.max(0, centerCol - 2); col <= Math.min(board.cols - 1, centerCol + 2); col += 1) {
			const diffX = col - centerCol;
			const diffY = row - centerRow;
			if (diffX * diffX + diffY * diffY > radiusSq) continue;
			if (Math.random() > 0.18 + power * 0.22) continue;
			setBoardCell(board, row * board.cols + col, team);
		}
	}
}

function bounceAgainstBounds(ball: BallState, stepX: number, stepY: number) {
	const nextX = ball.x + stepX;
	const nextY = ball.y + stepY;
	let blockX = false;
	let blockY = false;

	if (nextX - ball.radius <= 0) {
		ball.x = ball.radius;
		ball.vx = Math.abs(ball.vx);
		blockX = true;
	} else if (nextX + ball.radius >= BOARD_COLS) {
		ball.x = BOARD_COLS - ball.radius;
		ball.vx = -Math.abs(ball.vx);
		blockX = true;
	}

	if (nextY - ball.radius <= 0) {
		ball.y = ball.radius;
		ball.vy = Math.abs(ball.vy);
		blockY = true;
	} else if (nextY + ball.radius >= BOARD_ROWS) {
		ball.y = BOARD_ROWS - ball.radius;
		ball.vy = -Math.abs(ball.vy);
		blockY = true;
	}

	return { blockX, blockY };
}

function collideWithOpposition(
	board: BoardState,
	ball: BallState,
	stepX: number,
	stepY: number,
): CollisionResult {
	const nextX = ball.x + stepX;
	const nextY = ball.y + stepY;
	const radius = ball.radius;
	const minC = Math.max(0, Math.floor(nextX - radius));
	const maxC = Math.min(board.cols - 1, Math.floor(nextX + radius));
	const minR = Math.max(0, Math.floor(nextY - radius));
	const maxR = Math.min(board.rows - 1, Math.floor(nextY + radius));
	const radiusSq = radius * radius;

	let hitIndex = -1;
	let reflectX = false;
	let reflectY = false;
	let bestDistance = Number.POSITIVE_INFINITY;

	for (let row = minR; row <= maxR; row += 1) {
		for (let col = minC; col <= maxC; col += 1) {
			const index = row * board.cols + col;
			if (board.cells[index] === ball.team) continue;
			if (index === ball.lastHitIndex) continue;

			const nearestX = Math.max(col, Math.min(nextX, col + 1));
			const nearestY = Math.max(row, Math.min(nextY, row + 1));
			const diffX = nearestX - nextX;
			const diffY = nearestY - nextY;
			const distanceSq = diffX * diffX + diffY * diffY;

			if (distanceSq > radiusSq || distanceSq > bestDistance) continue;

			bestDistance = distanceSq;
			hitIndex = index;

			if (Math.abs(diffX) > Math.abs(diffY)) {
				reflectX = true;
				reflectY = false;
			} else if (Math.abs(diffY) > Math.abs(diffX)) {
				reflectX = false;
				reflectY = true;
			} else {
				reflectX = Math.abs(stepX) >= Math.abs(stepY);
				reflectY = !reflectX;
			}
		}
	}

	return { hitIndex, reflectX, reflectY };
}

function mountBinaryPong(
	host: HTMLDivElement,
	PhaserLib: PhaserModule,
	bridge: Bridge,
) {
	let game: PhaserGame | null = null;
	let observer: ResizeObserver | null = null;
	const initialSize = resolveHostSize(host);

	class BinaryPongScene extends PhaserLib.Scene {
		private board = createBoard(BOARD_COLS, BOARD_ROWS);

		private palette = createPalette();

		private cycle = 1;

		private winner: TeamId | null = null;

		private holdTimerMs = 0;

		private accumulatorMs = 0;

		private elapsedSeconds = 0;

		private chaosTimerSeconds = randomRange(1.6, 3.1);

		private layout = computeLayout(initialSize.width, initialSize.height);

		private surface: BoardSurface | null = null;

		private boardMaskGraphics: PhaserGraphics | null = null;

		private boardMask: PhaserGeometryMask | null = null;

		private graphics: PhaserGraphics | null = null;

		private balls: [BallState, BallState] = [createBall(0), createBall(1)];

		private trail: TrailNode[] = [];

		private pulses: PulseNode[] = [];

		private uiSyncCooldownMs = 0;

		private forceFullRedraw = true;

		create() {
			this.surface = createSurface(this, "binary-pong-board");
			this.boardMaskGraphics = this.add.graphics().setDepth(2).setVisible(false);
			this.boardMask = this.boardMaskGraphics.createGeometryMask();
			this.surface.image.setMask(this.boardMask);
			this.graphics = this.add.graphics().setDepth(3);
			this.applyLayout(this.scale.width, this.scale.height);
			this.startCycle(true);
			this.scale.on("resize", this.handleResize, this);
			this.events.once(PhaserLib.Scenes.Events.SHUTDOWN, this.shutdown, this);

			bridge.restartRef.current = () => {
				this.cycle += 1;
				this.startCycle(false);
			};
			bridge.remixRef.current = () => {
				this.remixPaletteOnly();
			};
		}

		private shutdown() {
			this.scale.off("resize", this.handleResize, this);
			destroySurface(this, this.surface);
			this.surface = null;
			this.boardMaskGraphics?.destroy();
			this.boardMaskGraphics = null;
			this.boardMask = null;
			this.graphics?.destroy();
			this.graphics = null;
		}

		private handleResize(gameSize: { width: number; height: number }) {
			this.applyLayout(gameSize.width, gameSize.height);
		}

		private applyLayout(width: number, height: number) {
			this.layout = computeLayout(width, height);
			if (!this.surface) return;
			this.surface.image.setPosition(this.layout.boardX, this.layout.boardY);
			this.surface.image.setDisplaySize(this.layout.boardSize, this.layout.boardSize);
			this.updateBoardMask();
		}

		private updateBoardMask() {
			if (!this.boardMaskGraphics) return;
			this.boardMaskGraphics.clear();
			this.boardMaskGraphics.fillStyle(0xffffff, 1);
			this.boardMaskGraphics.fillRoundedRect(
				this.layout.boardX,
				this.layout.boardY,
				this.layout.boardSize,
				this.layout.boardSize,
				BOARD_CORNER_RADIUS,
			);
		}

		private startCycle(remixPalette: boolean) {
			if (remixPalette) {
				this.palette = createPalette();
			}

			seedSplitBoard(this.board);
			this.balls = [createBall(0), createBall(1)];
			this.winner = null;
			this.holdTimerMs = 0;
			this.accumulatorMs = 0;
			this.elapsedSeconds = 0;
			this.chaosTimerSeconds = randomRange(1.2, 2.6);
			this.trail.length = 0;
			this.pulses.length = 0;
			this.forceFullRedraw = true;
			this.emitPulse(this.balls[0].x, this.balls[0].y, 0, 1.8, 0.24);
			this.emitPulse(this.balls[1].x, this.balls[1].y, 1, 1.8, 0.24);
			this.syncUi(true);
		}

		private remixPaletteOnly() {
			this.palette = createPalette();
			this.forceFullRedraw = true;
			this.syncUi(true);
		}

		update(_: number, deltaMs: number) {
			const settings = bridge.settingsRef.current;
			const clampedDeltaMs = Math.min(deltaMs, MAX_FRAME_DELTA_MS);
			this.updateEffects(clampedDeltaMs / 1000);

			if (!settings.paused) {
				this.accumulatorMs += clampedDeltaMs * settings.speed;
				let stepCount = 0;
				while (this.accumulatorMs >= FIXED_STEP_MS && stepCount < 24) {
					this.simulate(FIXED_STEP_MS / 1000);
					this.accumulatorMs -= FIXED_STEP_MS;
					stepCount += 1;
				}
				if (stepCount === 24) {
					this.accumulatorMs = Math.min(this.accumulatorMs, FIXED_STEP_MS * 4);
				}
			}

			if (this.surface) {
				refreshBoardTexture(this.surface, this.board, this.palette, this.forceFullRedraw);
				this.forceFullRedraw = false;
			}

			this.renderOverlay();
			this.syncUi(false);
		}

		private simulate(stepSeconds: number) {
			this.elapsedSeconds += stepSeconds;

			if (this.winner !== null) {
				this.holdTimerMs -= stepSeconds * 1000;
				if (this.holdTimerMs <= 0) {
					this.cycle += 1;
					this.startCycle(true);
				}
				return;
			}

			for (const ball of this.balls) {
				this.advanceBall(ball, stepSeconds);
			}

			this.chaosTimerSeconds -= stepSeconds;
			if (this.chaosTimerSeconds <= 0) {
				this.applyChaosEvent();
				this.chaosTimerSeconds = randomRange(1.4, 3);
			}

			if (this.board.counts[0] === this.board.cells.length) {
				this.winner = 0;
				this.holdTimerMs = ROUND_HOLD_MS;
			} else if (this.board.counts[1] === this.board.cells.length) {
				this.winner = 1;
				this.holdTimerMs = ROUND_HOLD_MS;
			}
		}

		private advanceBall(ball: BallState, stepSeconds: number) {
			ball.vx +=
				Math.cos(this.elapsedSeconds * (0.62 + ball.swing * 0.24) + ball.phase) *
				ball.turnBias *
				stepSeconds *
				4.2;
			ball.vy +=
				Math.sin(this.elapsedSeconds * (0.9 + ball.swing * 0.38) + ball.phase) *
				ball.swing *
				stepSeconds *
				4.8;
			clampSpeed(ball);

			const totalStepX = ball.vx * stepSeconds;
			const totalStepY = ball.vy * stepSeconds;
			const travel = Math.hypot(totalStepX, totalStepY);
			const subSteps = Math.max(1, Math.ceil(travel / 0.18));

			for (let step = 0; step < subSteps; step += 1) {
				const stepX = totalStepX / subSteps;
				const stepY = totalStepY / subSteps;
				const { blockX, blockY } = bounceAgainstBounds(ball, stepX, stepY);

				if (blockX || blockY) {
					this.emitPulse(ball.x, ball.y, ball.team, 0.92, 0.16);
					accelerateBall(ball, 0.12 + Math.random() * 0.06);
					ball.turnBias = clamp(ball.turnBias + randomRange(-0.045, 0.045), -0.26, 0.26);
					jitterBall(ball);
				}

				const collision = collideWithOpposition(
					this.board,
					ball,
					blockX ? 0 : stepX,
					blockY ? 0 : stepY,
				);

				if (collision.hitIndex !== -1) {
					setBoardCell(this.board, collision.hitIndex, ball.team);
					maybeConvertNeighbors(
						this.board,
						collision.hitIndex,
						ball.team,
						ball.impactPower + randomRange(-0.1, 0.35),
					);
					ball.lastHitIndex = collision.hitIndex;
					if (collision.reflectX) ball.vx = -ball.vx;
					if (collision.reflectY) ball.vy = -ball.vy;
					accelerateBall(ball, 0.28 + Math.random() * 0.18);
					jitterBall(ball);
					ball.impactPower = clamp(
						ball.impactPower + randomRange(-0.12, 0.22),
						0.95,
						2.2,
					);
					ball.swing = clamp(ball.swing + randomRange(-0.08, 0.12), 0.35, 1.55);
					ball.turnBias = clamp(ball.turnBias + randomRange(-0.065, 0.065), -0.3, 0.3);

					if (Math.random() < 0.16) {
						accelerateBall(ball, -0.1);
					}
					if (Math.random() < 0.22) {
						maybeConvertNeighbors(
							this.board,
							collision.hitIndex,
							ball.team,
							ball.impactPower + 0.4,
						);
					}

					const hitCol = collision.hitIndex % this.board.cols;
					const hitRow = Math.floor(collision.hitIndex / this.board.cols);
					this.emitPulse(hitCol + 0.5, hitRow + 0.5, ball.team, 0.98, 0.18);

					this.trail.unshift({
						x: ball.x,
						y: ball.y,
						team: ball.team,
						life: 1,
					});
					if (this.trail.length > 64) this.trail.length = 64;
					break;
				}

				ball.x += blockX ? 0 : stepX;
				ball.y += blockY ? 0 : stepY;
				ball.lastHitIndex = -1;
			}

			this.trail.unshift({
				x: ball.x,
				y: ball.y,
				team: ball.team,
				life: 1,
			});
			if (this.trail.length > 64) this.trail.length = 64;
		}

		private updateEffects(stepSeconds: number) {
			for (let index = this.trail.length - 1; index >= 0; index -= 1) {
				this.trail[index].life -= stepSeconds * 1.2;
				if (this.trail[index].life <= 0) {
					this.trail.splice(index, 1);
				}
			}

			for (let index = this.pulses.length - 1; index >= 0; index -= 1) {
				this.pulses[index].life -= stepSeconds;
				if (this.pulses[index].life <= 0) {
					this.pulses.splice(index, 1);
				}
			}
		}

		private applyChaosEvent() {
			const index = Math.random() < 0.5 ? 0 : 1;
			const ball = this.balls[index];
			const reward = Math.random() < 0.62;

			if (reward) {
				ball.impactPower = clamp(ball.impactPower + randomRange(0.18, 0.42), 0.95, 2.3);
				ball.speedGain = clamp(ball.speedGain + randomRange(0.08, 0.2), 0.85, 1.45);
				accelerateBall(ball, randomRange(0.18, 0.34));
				this.emitPulse(ball.x, ball.y, ball.team, 1.4, 0.22);
				return;
			}

			ball.impactPower = clamp(ball.impactPower - randomRange(0.08, 0.2), 0.95, 2.3);
			ball.turnBias = clamp(ball.turnBias + randomRange(-0.12, 0.12), -0.36, 0.36);
			accelerateBall(ball, -randomRange(0.08, 0.18));
			this.emitPulse(ball.x, ball.y, oppositeTeam(ball.team), 1.1, 0.16);
		}

		private emitPulse(
			x: number,
			y: number,
			team: TeamId,
			radius: number,
			maxLife: number,
		) {
			this.pulses.push({
				x,
				y,
				team,
				radius,
				life: maxLife,
				maxLife,
			});

			if (this.pulses.length > 12) {
				this.pulses.shift();
			}
		}

		private renderOverlay() {
			if (!this.graphics) return;

			this.graphics.clear();
			this.graphics.fillStyle(this.palette.surface.int, 0.02);
			this.graphics.fillRoundedRect(
				this.layout.boardX,
				this.layout.boardY,
				this.layout.boardSize,
				this.layout.boardSize,
				BOARD_CORNER_RADIUS,
			);
			this.graphics.lineStyle(2, this.palette.frame.int, 0.82);
			this.graphics.strokeRoundedRect(
				this.layout.boardX,
				this.layout.boardY,
				this.layout.boardSize,
				this.layout.boardSize,
				BOARD_CORNER_RADIUS,
			);

			for (const pulse of this.pulses) {
				const progress = 1 - pulse.life / pulse.maxLife;
				const alpha = (1 - progress) * 0.32;
				const radius = (pulse.radius + progress * 1.8) * this.layout.scale;
				const color = this.palette.teams[oppositeTeam(pulse.team)].glow;

				this.graphics.lineStyle(Math.max(1.5, this.layout.scale * 0.14), color.int, alpha);
				this.graphics.strokeCircle(
					this.layout.boardX + pulse.x * this.layout.scale,
					this.layout.boardY + pulse.y * this.layout.scale,
					radius,
				);
			}

			for (const trail of this.trail) {
				const color = this.palette.teams[oppositeTeam(trail.team)].trail;
				this.graphics.fillStyle(color.int, trail.life * 0.18);
				this.graphics.fillCircle(
					this.layout.boardX + trail.x * this.layout.scale,
					this.layout.boardY + trail.y * this.layout.scale,
					Math.max(this.layout.scale * BALL_RADIUS * 0.52, 2.8),
				);
			}

			for (const ball of this.balls) {
				const palette = this.palette.teams[oppositeTeam(ball.team)];
				const screenX = this.layout.boardX + ball.x * this.layout.scale;
				const screenY = this.layout.boardY + ball.y * this.layout.scale;
				const radius = Math.max(ball.radius * this.layout.scale * 1.22, 8);

				this.graphics.fillStyle(palette.glow.int, 0.16);
				this.graphics.fillCircle(screenX, screenY, radius * 1.85);
				this.graphics.lineStyle(Math.max(1.8, this.layout.scale * 0.18), palette.glow.int, 0.96);
				this.graphics.strokeCircle(screenX, screenY, radius * 1.02);
				this.graphics.fillStyle(palette.fill.int, 1);
				this.graphics.fillCircle(screenX, screenY, radius);
				this.graphics.fillStyle(palette.glow.int, 0.95);
				this.graphics.fillCircle(screenX - radius * 0.18, screenY - radius * 0.18, radius * 0.18);
			}
		}

		private syncUi(force: boolean) {
			this.uiSyncCooldownMs -= force ? 0 : FIXED_STEP_MS;
			if (!force && this.uiSyncCooldownMs > 0) return;
			this.uiSyncCooldownMs = 120;

			bridge.onUiState({
				cycle: this.cycle,
				territory: [this.board.counts[0], this.board.counts[1]],
				winner: this.winner,
				palette: paletteToView(this.palette),
			});
		}
	}

	game = new PhaserLib.Game({
		type: PhaserLib.CANVAS,
		parent: host,
		backgroundColor: "#050810",
		transparent: false,
		render: {
			antialias: true,
			pixelArt: false,
		},
		scale: {
			mode: PhaserLib.Scale.RESIZE,
			autoCenter: PhaserLib.Scale.NO_CENTER,
			width: initialSize.width,
			height: initialSize.height,
		},
		scene: [BinaryPongScene],
	});

	if (game.canvas) {
		game.canvas.style.display = "block";
		game.canvas.style.width = "100%";
		game.canvas.style.height = "100%";
	}

	observer = new ResizeObserver(() => {
		if (!game) return;
		const nextSize = resolveHostSize(host);
		game.scale.resize(nextSize.width, nextSize.height);
	});
	observer.observe(host);

	return () => {
		bridge.restartRef.current = undefined;
		bridge.remixRef.current = undefined;
		observer?.disconnect();
		observer = null;
		game?.destroy(true);
		game = null;
	};
}

export default function BinaryPong() {
	const hostRef = useRef<HTMLDivElement | null>(null);
	const settingsRef = useRef<SettingsSnapshot>({ ...DEFAULT_SETTINGS });
	const restartRef = useRef<(() => void) | undefined>(undefined);
	const remixRef = useRef<(() => void) | undefined>(undefined);
	const [status, setStatus] = useState<LoadStatus>("loading");
	const [paused, setPaused] = useState(false);
	const [speed, setSpeed] = useState(DEFAULT_SETTINGS.speed);
	const [uiState, setUiState] = useState<UiState>(EMPTY_UI_STATE);

	useEffect(() => {
		settingsRef.current.paused = paused;
	}, [paused]);

	useEffect(() => {
		settingsRef.current.speed = speed;
	}, [speed]);

	useEffect(() => {
		const host = hostRef.current;
		if (!host) return;

		let cancelled = false;
		let cleanup: (() => void) | undefined;

		void (async () => {
			try {
				const phaserModule = await import("phaser");
				if (cancelled || !hostRef.current) return;

				const PhaserLib = ("default" in phaserModule
					? phaserModule.default
					: phaserModule) as PhaserModule;

				cleanup = mountBinaryPong(hostRef.current, PhaserLib, {
					settingsRef,
					restartRef,
					remixRef,
					onUiState: (nextUiState) => {
						if (!cancelled) setUiState(nextUiState);
					},
				});

				if (!cancelled) setStatus("ready");
			} catch {
				if (!cancelled) setStatus("error");
			}
		})();

		return () => {
			cancelled = true;
			cleanup?.();
		};
	}, []);

	const totalCells = uiState.territory[0] + uiState.territory[1];
	const zeroShare = totalCells > 0 ? (uiState.territory[0] / totalCells) * 100 : 50;
	const oneShare = 100 - zeroShare;
	const leaderTeam =
		uiState.territory[0] === uiState.territory[1]
			? null
			: uiState.territory[0] > uiState.territory[1]
				? 0
				: 1;
	const dominance = Math.abs(zeroShare - oneShare) / 100;
	const winnerLabel =
		uiState.winner === null ? null : uiState.palette.teams[uiState.winner].name;

	return (
		<div
			className="flex h-full min-h-0 w-full select-none flex-col overflow-hidden"
			style={{
				background: `radial-gradient(circle at top, ${cssWithAlpha(
					uiState.palette.teams[1].glow,
					0.12,
				)} 0%, ${cssWithAlpha(uiState.palette.background, 0.94)} 36%, rgb(4 8 15) 100%)`,
			}}
		>
			<div className="border-b border-[#233247] bg-[#07111d]/92 backdrop-blur">
				<div className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
					<div className="mr-auto font-mono text-xs text-slate-400">
						Two autonomous balls rebound off opposing territory until one color owns the board.
					</div>

					<div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] uppercase tracking-[0.2em] text-slate-400">
						<span>Cycle <span className="text-slate-100">{uiState.cycle}</span></span>
						<span>Balls <span className="text-slate-100">2</span></span>
						<span>Grid <span className="text-slate-100">Hidden</span></span>
						<span className="text-slate-200">
							{status === "loading"
								? "Loading"
								: status === "error"
									? "Error"
									: paused
										? "Paused"
										: "Autopilot"}
						</span>
					</div>
				</div>

				<div className="flex flex-wrap items-center gap-2 px-4 pb-3 sm:px-5">
					<button
						type="button"
						onClick={() => setPaused((value) => !value)}
						className="select-none rounded-full bg-slate-100 px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-950 transition hover:bg-white"
					>
						{paused ? "Resume" : "Pause"}
					</button>
					<button
						type="button"
						onClick={() => {
							setPaused(false);
							restartRef.current?.();
						}}
						className="select-none rounded-full border border-[#223048] bg-[#0b1320] px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-100 transition hover:border-[#2d4262] hover:bg-[#10192a]"
					>
						New Game
					</button>
					<button
						type="button"
						onClick={() => {
							setPaused(false);
							remixRef.current?.();
						}}
						className="select-none rounded-full border border-[#223048] bg-[#0b1320] px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-100 transition hover:border-[#2d4262] hover:bg-[#10192a]"
					>
						Remix Colors
					</button>

					<div className="ml-auto flex items-center gap-3 border border-[#223048] bg-[#0b1320] px-3 py-1.5 font-mono text-[11px] text-slate-200">
						<label htmlFor="binary-pong-speed" className="uppercase tracking-[0.2em] text-slate-400">
							Speed
						</label>
						<input
							id="binary-pong-speed"
							type="range"
							min={0.55}
							max={12}
							step={0.05}
							value={speed}
							onChange={(event) => setSpeed(Number(event.target.value))}
							className="w-36 accent-sky-300"
						/>
						<span className="w-10 text-right text-slate-100">{speed.toFixed(2)}x</span>
					</div>
				</div>
			</div>

			<div className="px-4 py-3 sm:px-5">
				<div className="grid gap-2 md:grid-cols-[1fr_auto_1fr] md:items-center">
					<div
						className="px-1 py-1"
						style={{
							borderTop: `1px solid ${cssWithAlpha(uiState.palette.teams[0].fill, 0.48)}`,
						}}
					>
						<div className="font-mono text-[11px] uppercase tracking-[0.28em] text-slate-300">
							{uiState.palette.teams[0].name}
						</div>
						<div
							className="mt-1 font-mono text-2xl font-semibold"
							style={{ color: uiState.palette.teams[0].fill }}
						>
							{uiState.territory[0]}
						</div>
						<div className="font-mono text-xs text-slate-400">cells held</div>
					</div>

					<div className="border-y border-[#1b2535] px-4 py-1.5 text-center font-mono text-[11px] uppercase tracking-[0.28em] text-slate-300">
						{leaderTeam === null ? "Dead even" : `${uiState.palette.teams[leaderTeam].name} leaning`}
					</div>

					<div
						className="px-1 py-1 md:text-right"
						style={{
							borderTop: `1px solid ${cssWithAlpha(uiState.palette.teams[1].fill, 0.48)}`,
						}}
					>
						<div className="font-mono text-[11px] uppercase tracking-[0.28em] text-slate-300">
							{uiState.palette.teams[1].name}
						</div>
						<div
							className="mt-1 font-mono text-2xl font-semibold"
							style={{ color: uiState.palette.teams[1].fill }}
						>
							{uiState.territory[1]}
						</div>
						<div className="font-mono text-xs text-slate-400">cells held</div>
					</div>
				</div>

				<div className="mt-3 overflow-hidden border border-[#162131] bg-[#09111c]">
					<div className="flex h-4 w-full">
						<div
							style={{
								width: `${zeroShare}%`,
								background: `linear-gradient(90deg, ${uiState.palette.teams[0].trail}, ${uiState.palette.teams[0].glow} 38%, ${uiState.palette.teams[0].fill})`,
							}}
						/>
						<div
							style={{
								width: `${oneShare}%`,
								background: `linear-gradient(90deg, ${uiState.palette.teams[1].fill}, ${uiState.palette.teams[1].glow} 62%, ${uiState.palette.teams[1].trail})`,
							}}
						/>
					</div>
				</div>
			</div>

			<div className="flex-1">
				<div
					className="relative h-full min-h-[440px] overflow-hidden bg-[#050910]"
					style={{
						boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
					}}
				>
					<div
						className="pointer-events-none absolute inset-0"
						style={{
							background: `radial-gradient(circle at ${leaderTeam === 1 ? "74%" : "26%"} 26%, ${cssWithAlpha(
								leaderTeam === 1
									? uiState.palette.teams[1].glow
									: uiState.palette.teams[0].glow,
								0.16 + dominance * 0.22,
							)} 0%, transparent 28%), linear-gradient(90deg, ${cssWithAlpha(
								uiState.palette.teams[0].trail,
								0.08 + zeroShare / 420,
							)} 0%, transparent 24%, transparent 76%, ${cssWithAlpha(
								uiState.palette.teams[1].trail,
								0.08 + oneShare / 420,
							)} 100%), linear-gradient(180deg, rgba(255,255,255,0.04), transparent 18%, transparent 82%, rgba(255,255,255,0.03))`,
						}}
					/>
					<div ref={hostRef} className="absolute inset-0" aria-label="Binary Pong simulation" />

					{status !== "ready" && (
						<div className="absolute inset-0 flex items-center justify-center bg-[#050910]/85">
							<div className="border border-[#203048] bg-[#09111c]/90 px-5 py-3 font-mono text-xs uppercase tracking-[0.28em] text-slate-300">
								{status === "loading" ? "Loading Phaser Scene" : "Unable To Load Binary Pong"}
							</div>
						</div>
					)}

					{winnerLabel && status === "ready" && (
						<div className="pointer-events-none absolute inset-x-0 top-5 flex justify-center px-4">
							<div className="border border-white/10 bg-[#09111c]/88 px-5 py-2 font-mono text-xs uppercase tracking-[0.28em] text-slate-100 backdrop-blur">
								{winnerLabel} claimed the board
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
