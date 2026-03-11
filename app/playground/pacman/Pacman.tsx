"use client";

import { useEffect, useRef, useState } from "react";

type PhaserModule = typeof import("phaser");
type PhaserGame = import("phaser").Game;
type PhaserScene = import("phaser").Scene;
type PhaserGraphics = import("phaser").GameObjects.Graphics;
type PhaserText = import("phaser").GameObjects.Text;

type DirectionName = "left" | "right" | "up" | "down";
type GhostId = "blinky" | "pinky" | "inky" | "clyde";
type GhostMode = "house" | "scatter" | "chase" | "frightened" | "eyes";
type Phase = "ready" | "playing" | "won" | "gameOver";

type GridPoint = {
	col: number;
	row: number;
};

type DirectionVector = {
	dx: number;
	dy: number;
	angle: number;
};

type PlayerState = {
	prevCol: number;
	prevRow: number;
	col: number;
	row: number;
	dir: DirectionName | null;
	nextDir: DirectionName | null;
	lastDir: DirectionName;
	mouth: number;
	mouthVelocity: number;
};

type GhostState = {
	id: GhostId;
	prevCol: number;
	prevRow: number;
	col: number;
	row: number;
	dir: DirectionName;
	color: number;
	mode: GhostMode;
	spawn: GridPoint;
	scatterTarget: GridPoint;
	releaseAt: number;
};

type RuntimeState = {
	player: PlayerState;
	ghosts: GhostState[];
	pellets: Set<string>;
	powerPellets: Set<string>;
	pelletsRemaining: number;
	score: number;
	lives: number;
	phase: Phase;
	message: string;
	subMessage: string;
	frightenedRemaining: number;
	modeIndex: number;
	modeElapsed: number;
	roundTime: number;
	ghostCombo: number;
};

type Layout = {
	tileSize: number;
	boardX: number;
	boardY: number;
	boardWidth: number;
	boardHeight: number;
	hudTop: number;
	footerY: number;
};

const FONT_STACK =
	'"Azeret Mono", "JetBrains Mono", "SFMono-Regular", Consolas, monospace';
const MAZE = [
	"############################",
	"#............##............#",
	"#.####.#####.##.#####.####.#",
	"#o####.#####.##.#####.####o#",
	"#.####.#####.##.#####.####.#",
	"#..........................#",
	"#.####.##.########.##.####.#",
	"#.####.##.########.##.####.#",
	"#......##....##....##......#",
	"######.##### ## #####.######",
	"######.##### ## #####.######",
	"######.##          ##.######",
	"######.## ###  ### ##.######",
	"      .   #      #   .      ",
	"######.## # #### # ##.######",
	"######.## # #### # ##.######",
	"######.## #      # ##.######",
	"######.## ######## ##.######",
	"#............##............#",
	"#.####.#####.##.#####.####.#",
	"#o..##................##..o#",
	"###.##.##.########.##.##.###",
	"#......##....##....##......#",
	"#.##########.##.##########.#",
	"#..........................#",
	"############################",
] as const;
const COLS = MAZE[0].length;
const ROWS = MAZE.length;
const PLAYER_START: GridPoint = { col: 13, row: 20 };
const PLAYER_STEP_SECONDS = 0.105;
const GHOST_STEP_SECONDS = 0.125;
const FRIGHTENED_GHOST_STEP_SECONDS = 0.17;
const FRIGHTENED_DURATION = 6.5;
const MAX_DELTA_SECONDS = 0.05;
const GHOST_EAT_SCORES = [200, 400, 800, 1600] as const;
const MODE_SCHEDULE: Array<{ mode: "scatter" | "chase"; duration: number }> = [
	{ mode: "scatter", duration: 7 },
	{ mode: "chase", duration: 20 },
	{ mode: "scatter", duration: 7 },
	{ mode: "chase", duration: 20 },
	{ mode: "scatter", duration: 5 },
	{ mode: "chase", duration: Number.POSITIVE_INFINITY },
];
const FRAME_PADDING = 28;
const HUD_HEADER_HEIGHT = 58;
const HUD_FOOTER_HEIGHT = 38;
const GHOST_BLUE = 0x2563eb;
const GHOST_BLUE_FLASH = 0xf8fafc;

const DIRECTIONS: Record<DirectionName, DirectionVector> = {
	left: { dx: -1, dy: 0, angle: Math.PI },
	right: { dx: 1, dy: 0, angle: 0 },
	up: { dx: 0, dy: -1, angle: Math.PI * 1.5 },
	down: { dx: 0, dy: 1, angle: Math.PI / 2 },
};

const OPPOSITE: Record<DirectionName, DirectionName> = {
	left: "right",
	right: "left",
	up: "down",
	down: "up",
};

const GHOST_CONFIG = [
	{
		id: "blinky",
		col: 13,
		row: 11,
		dir: "left",
		color: 0xef4444,
		scatterTarget: { col: COLS - 2, row: 1 },
	},
	{
		id: "pinky",
		col: 14,
		row: 12,
		dir: "left",
		color: 0xf9a8d4,
		scatterTarget: { col: 1, row: 1 },
	},
	{
		id: "inky",
		col: 12,
		row: 12,
		dir: "right",
		color: 0x67e8f9,
		scatterTarget: { col: COLS - 2, row: ROWS - 2 },
	},
	{
		id: "clyde",
		col: 15,
		row: 12,
		dir: "left",
		color: 0xfb923c,
		scatterTarget: { col: 1, row: ROWS - 2 },
	},
] as const satisfies ReadonlyArray<{
	id: GhostId;
	col: number;
	row: number;
	dir: DirectionName;
	color: number;
	scatterTarget: GridPoint;
}>;

function tileKey(col: number, row: number): string {
	return `${normalizeCol(col)},${row}`;
}

function normalizeCol(col: number): number {
	if (col < 0) return COLS - 1;
	if (col >= COLS) return 0;
	return col;
}

function getMazeTile(col: number, row: number): string {
	if (row < 0 || row >= ROWS) return "#";
	return MAZE[row][normalizeCol(col)] ?? "#";
}

function isWall(col: number, row: number): boolean {
	return getMazeTile(col, row) === "#";
}

function isPassable(col: number, row: number): boolean {
	return !isWall(col, row);
}

function movePoint(point: GridPoint, direction: DirectionName): GridPoint {
	const vector = DIRECTIONS[direction];
	return {
		col: normalizeCol(point.col + vector.dx),
		row: point.row + vector.dy,
	};
}

function wrapDelta(from: number, to: number): number {
	let delta = normalizeCol(to) - normalizeCol(from);
	if (delta > COLS / 2) delta -= COLS;
	if (delta < -COLS / 2) delta += COLS;
	return delta;
}

function freezeEntity(entity: {
	prevCol: number;
	prevRow: number;
	col: number;
	row: number;
}): void {
	entity.prevCol = entity.col;
	entity.prevRow = entity.row;
}

function beginEntityStep(
	entity: { prevCol: number; prevRow: number; col: number; row: number },
	next: GridPoint,
): void {
	entity.prevCol = entity.col;
	entity.prevRow = entity.row;
	entity.col = next.col;
	entity.row = next.row;
}

function interpolatedPoint(
	entity: { prevCol: number; prevRow: number; col: number; row: number },
	progress: number,
): GridPoint {
	const clamped = Math.max(0, Math.min(1, progress));
	const deltaCol = wrapDelta(entity.prevCol, entity.col);

	return {
		col: normalizeCol(entity.prevCol + deltaCol * clamped),
		row: entity.prevRow + (entity.row - entity.prevRow) * clamped,
	};
}

function tunnelDistance(fromCol: number, toCol: number): number {
	const raw = Math.abs(normalizeCol(toCol) - normalizeCol(fromCol));
	return Math.min(raw, COLS - raw);
}

function clampDelta(deltaMs: number): number {
	return Math.min(MAX_DELTA_SECONDS, deltaMs / 1000);
}

function resolveHostSize(host: HTMLElement): { width: number; height: number } {
	return {
		width: Math.max(320, Math.floor(host.clientWidth || 800)),
		height: Math.max(420, Math.floor(host.clientHeight || 720)),
	};
}

function resolveLayout(scene: PhaserScene): Layout {
	const width = Math.max(320, scene.scale.width);
	const height = Math.max(420, scene.scale.height);
	const availableWidth = width - FRAME_PADDING * 2;
	const availableHeight =
		height - FRAME_PADDING * 2 - HUD_HEADER_HEIGHT - HUD_FOOTER_HEIGHT;
	const tileSize = Math.max(
		12,
		Math.floor(Math.min(availableWidth / COLS, availableHeight / ROWS)),
	);
	const boardWidth = tileSize * COLS;
	const boardHeight = tileSize * ROWS;
	const boardX = Math.max(FRAME_PADDING, Math.floor((width - boardWidth) / 2));
	const boardLaneTop = FRAME_PADDING + HUD_HEADER_HEIGHT;
	const boardLaneHeight = height - boardLaneTop - FRAME_PADDING - HUD_FOOTER_HEIGHT;
	const boardY =
		boardLaneTop + Math.max(0, Math.floor((boardLaneHeight - boardHeight) / 2));

	return {
		tileSize,
		boardX,
		boardY,
		boardWidth,
		boardHeight,
		hudTop: FRAME_PADDING,
		footerY: height - FRAME_PADDING - Math.floor(HUD_FOOTER_HEIGHT / 2),
	};
}

function worldPosition(layout: Layout, col: number, row: number): { x: number; y: number } {
	return {
		x: layout.boardX + col * layout.tileSize + layout.tileSize / 2,
		y: layout.boardY + row * layout.tileSize + layout.tileSize / 2,
	};
}

function availableDirections(col: number, row: number): DirectionName[] {
	const options: DirectionName[] = [];

	for (const direction of Object.keys(DIRECTIONS) as DirectionName[]) {
		const next = movePoint({ col, row }, direction);
		if (isPassable(next.col, next.row)) {
			options.push(direction);
		}
	}

	return options;
}

function isEditableTarget(target: EventTarget | null): boolean {
	if (!(target instanceof HTMLElement)) return false;

	return (
		target.tagName === "INPUT" ||
		target.tagName === "TEXTAREA" ||
		target.tagName === "SELECT" ||
		target.isContentEditable
	);
}

function getDirectionFromKeyboardEvent(event: KeyboardEvent): DirectionName | null {
	const key = event.key.toLowerCase();

	if (key === "arrowleft" || key === "a" || event.code === "KeyA") return "left";
	if (key === "arrowright" || key === "d" || event.code === "KeyD") return "right";
	if (key === "arrowup" || key === "w" || event.code === "KeyW") return "up";
	if (key === "arrowdown" || key === "s" || event.code === "KeyS") return "down";

	return null;
}

function isRestartKeyboardEvent(event: KeyboardEvent): boolean {
	return event.key === "Enter" || event.key === " " || event.code === "Space";
}

function initialPellets(): {
	pellets: Set<string>;
	powerPellets: Set<string>;
	pelletsRemaining: number;
} {
	const pellets = new Set<string>();
	const powerPellets = new Set<string>();

	for (let row = 0; row < ROWS; row += 1) {
		for (let col = 0; col < COLS; col += 1) {
			const tile = MAZE[row][col];
			if (tile === ".") {
				pellets.add(tileKey(col, row));
			} else if (tile === "o") {
				powerPellets.add(tileKey(col, row));
			}
		}
	}

	pellets.delete(tileKey(PLAYER_START.col, PLAYER_START.row));
	for (const ghost of GHOST_CONFIG) {
		pellets.delete(tileKey(ghost.col, ghost.row));
		powerPellets.delete(tileKey(ghost.col, ghost.row));
	}

	return {
		pellets,
		powerPellets,
		pelletsRemaining: pellets.size + powerPellets.size,
	};
}

function createPlayer(): PlayerState {
	return {
		prevCol: PLAYER_START.col,
		prevRow: PLAYER_START.row,
		col: PLAYER_START.col,
		row: PLAYER_START.row,
		dir: null,
		nextDir: null,
		lastDir: "left",
		mouth: 0.22,
		mouthVelocity: 3.4,
	};
}

function createGhosts(mode: GhostMode): GhostState[] {
	return GHOST_CONFIG.map((ghost, index) => ({
		id: ghost.id,
		prevCol: ghost.col,
		prevRow: ghost.row,
		col: ghost.col,
		row: ghost.row,
		dir: ghost.dir,
		color: ghost.color,
		mode: index === 0 ? mode : "house",
		spawn: { col: ghost.col, row: ghost.row },
		scatterTarget: ghost.scatterTarget,
		releaseAt: index === 0 ? 0 : index * 3,
	}));
}

function createRuntimeState(): RuntimeState {
	const { pellets, powerPellets, pelletsRemaining } = initialPellets();

	return {
		player: createPlayer(),
		ghosts: createGhosts("scatter"),
		pellets,
		powerPellets,
		pelletsRemaining,
		score: 0,
		lives: 3,
		phase: "ready",
		message: "READY",
		subMessage: "Use arrow keys or WASD to start",
		frightenedRemaining: 0,
		modeIndex: 0,
		modeElapsed: 0,
		roundTime: 0,
		ghostCombo: 0,
	};
}

function globalMode(state: RuntimeState): GhostMode {
	const step = MODE_SCHEDULE[Math.min(state.modeIndex, MODE_SCHEDULE.length - 1)];
	return step.mode;
}

function resetRound(state: RuntimeState): void {
	state.player = createPlayer();
	state.ghosts = createGhosts(globalMode(state));
	state.phase = "ready";
	state.message = "READY";
	state.subMessage = "Use arrow keys or WASD to resume";
	state.frightenedRemaining = 0;
	state.modeIndex = 0;
	state.modeElapsed = 0;
	state.roundTime = 0;
	state.ghostCombo = 0;
}

function activateRound(state: RuntimeState): void {
	if (state.phase !== "ready") return;
	state.phase = "playing";
	state.message = "";
	state.subMessage = "";
}

function canMove(col: number, row: number, direction: DirectionName): boolean {
	const next = movePoint({ col, row }, direction);
	return isPassable(next.col, next.row);
}

function setPlayerDirection(state: RuntimeState, direction: DirectionName): void {
	if (state.phase === "won" || state.phase === "gameOver") return;
	state.player.nextDir = direction;
}

function collectPellet(state: RuntimeState): void {
	const key = tileKey(state.player.col, state.player.row);

	if (state.pellets.delete(key)) {
		state.score += 10;
		state.pelletsRemaining -= 1;
	} else if (state.powerPellets.delete(key)) {
		state.score += 50;
		state.pelletsRemaining -= 1;
		state.frightenedRemaining = FRIGHTENED_DURATION;
		state.ghostCombo = 0;

		for (const ghost of state.ghosts) {
			if (ghost.mode === "house" || ghost.mode === "eyes") continue;
			ghost.mode = "frightened";
			ghost.dir = OPPOSITE[ghost.dir];
		}
	}

	if (state.pelletsRemaining <= 0) {
		state.phase = "won";
		state.player.dir = null;
		state.player.nextDir = null;
		state.message = "MAZE CLEARED";
		state.subMessage = "Press space or enter to play again";
	}
}

function resolveCollision(state: RuntimeState): boolean {
	for (const ghost of state.ghosts) {
		if (ghost.mode === "house" || ghost.mode === "eyes") continue;
		if (ghost.col !== state.player.col || ghost.row !== state.player.row) continue;

		if (ghost.mode === "frightened") {
			const comboIndex = Math.min(state.ghostCombo, GHOST_EAT_SCORES.length - 1);
			state.score += GHOST_EAT_SCORES[comboIndex];
			state.ghostCombo += 1;
			ghost.prevCol = ghost.col;
			ghost.prevRow = ghost.row;
			ghost.col = ghost.spawn.col;
			ghost.row = ghost.spawn.row;
			ghost.dir = "up";
			ghost.mode = "eyes";
			continue;
		}

		state.lives -= 1;
		if (state.lives <= 0) {
			state.phase = "gameOver";
			state.player.dir = null;
			state.player.nextDir = null;
			state.message = "GAME OVER";
			state.subMessage = "Press space or enter to restart";
		} else {
			resetRound(state);
		}

		return true;
	}

	return false;
}

function stepPlayer(state: RuntimeState): void {
	const { player } = state;

	if (player.nextDir && canMove(player.col, player.row, player.nextDir)) {
		player.dir = player.nextDir;
		player.lastDir = player.nextDir;
		activateRound(state);
	} else if (player.dir && !canMove(player.col, player.row, player.dir)) {
		player.dir = null;
	}

	if (!player.dir) {
		freezeEntity(player);
		return;
	}

	const next = movePoint({ col: player.col, row: player.row }, player.dir);
	beginEntityStep(player, next);
	player.lastDir = player.dir;

	activateRound(state);
	collectPellet(state);
	resolveCollision(state);
}

function updateModes(state: RuntimeState, deltaSeconds: number): void {
	if (state.phase !== "playing") return;

	state.roundTime += deltaSeconds;
	state.modeElapsed += deltaSeconds;

	if (state.frightenedRemaining > 0) {
		state.frightenedRemaining = Math.max(0, state.frightenedRemaining - deltaSeconds);
		if (state.frightenedRemaining === 0) {
			state.ghostCombo = 0;
			const mode = globalMode(state);
			for (const ghost of state.ghosts) {
				if (ghost.mode === "frightened") {
					ghost.mode = mode;
				}
			}
		}
	}

	const scheduleStep = MODE_SCHEDULE[Math.min(state.modeIndex, MODE_SCHEDULE.length - 1)];
	if (state.modeElapsed < scheduleStep.duration) return;

	state.modeElapsed = 0;
	state.modeIndex = Math.min(state.modeIndex + 1, MODE_SCHEDULE.length - 1);
	const nextMode = globalMode(state);

	if (state.frightenedRemaining > 0) return;
	for (const ghost of state.ghosts) {
		if (ghost.mode === "scatter" || ghost.mode === "chase") {
			ghost.mode = nextMode;
		}
	}
}

function getGhostTarget(ghost: GhostState, state: RuntimeState): GridPoint {
	if (ghost.mode === "eyes") return ghost.spawn;
	if (ghost.mode === "scatter") return ghost.scatterTarget;

	const player = state.player;
	switch (ghost.id) {
		case "blinky":
			return { col: player.col, row: player.row };
		case "pinky": {
			const facing = DIRECTIONS[player.dir ?? player.lastDir];
			return {
				col: player.col + facing.dx * 4,
				row: player.row + facing.dy * 4,
			};
		}
		case "inky": {
			const facing = DIRECTIONS[player.dir ?? player.lastDir];
			return {
				col: player.col + facing.dx * 2,
				row: player.row + facing.dy * 2,
			};
		}
		case "clyde": {
			const distance =
				tunnelDistance(ghost.col, player.col) + Math.abs(ghost.row - player.row);
			return distance > 8 ? { col: player.col, row: player.row } : ghost.scatterTarget;
		}
	}
}

function chooseGhostDirection(
	ghost: GhostState,
	state: RuntimeState,
	reservedTiles: Set<string>,
): DirectionName {
	const options = availableDirections(ghost.col, ghost.row);
	if (options.length === 0) return ghost.dir;

	const candidates =
		options.length > 1
			? options.filter((direction) => direction !== OPPOSITE[ghost.dir])
			: options;

	if (ghost.mode === "frightened") {
		return candidates[Math.floor(Math.random() * candidates.length)] ?? candidates[0];
	}

	const target = getGhostTarget(ghost, state);
	let bestDirection = candidates[0];
	let bestDistance = Number.POSITIVE_INFINITY;

	for (const direction of candidates) {
		const next = movePoint({ col: ghost.col, row: ghost.row }, direction);
		const nextKey = tileKey(next.col, next.row);
		if (reservedTiles.has(nextKey) && candidates.length > 1) {
			continue;
		}
		const distance =
			tunnelDistance(next.col, target.col) ** 2 + (next.row - target.row) ** 2;
		const tieBreaker = direction === ghost.dir ? -0.01 : 0;

		if (distance + tieBreaker < bestDistance) {
			bestDistance = distance + tieBreaker;
			bestDirection = direction;
		}
	}

	return bestDirection;
}

function stepGhosts(state: RuntimeState): void {
	const reservedTiles = new Set<string>();

	for (const ghost of state.ghosts) {
		if (ghost.mode === "house") {
			freezeEntity(ghost);
			if (state.roundTime >= ghost.releaseAt) {
				ghost.mode =
					state.frightenedRemaining > 0 ? "frightened" : globalMode(state);
			}
			continue;
		}

		if (ghost.mode === "eyes" && ghost.col === ghost.spawn.col && ghost.row === ghost.spawn.row) {
			freezeEntity(ghost);
			ghost.mode = "house";
			ghost.releaseAt = state.roundTime + 1.5;
			continue;
		}

		ghost.dir = chooseGhostDirection(ghost, state, reservedTiles);
		const next = movePoint({ col: ghost.col, row: ghost.row }, ghost.dir);
		beginEntityStep(ghost, next);
		reservedTiles.add(tileKey(next.col, next.row));
	}

	resolveCollision(state);
}

function updatePlayerAnimation(state: RuntimeState, deltaSeconds: number): void {
	const player = state.player;
	player.mouth += player.mouthVelocity * deltaSeconds;
	if (player.mouth > 0.92) {
		player.mouth = 0.92;
		player.mouthVelocity *= -1;
	} else if (player.mouth < 0.16) {
		player.mouth = 0.16;
		player.mouthVelocity *= -1;
	}
}

function drawWallCell(
	graphics: PhaserGraphics,
	layout: Layout,
	col: number,
	row: number,
): void {
	const x = layout.boardX + col * layout.tileSize;
	const y = layout.boardY + row * layout.tileSize;
	const inset = layout.tileSize * 0.14;
	const size = layout.tileSize - inset * 2;
	const radius = layout.tileSize * 0.22;

	graphics.fillStyle(0x0f172a, 1);
	graphics.fillRoundedRect(x + inset, y + inset, size, size, radius);
	graphics.lineStyle(Math.max(1, layout.tileSize * 0.08), 0x38bdf8, 0.9);
	graphics.strokeRoundedRect(x + inset, y + inset, size, size, radius);
}

function drawMaze(
	graphics: PhaserGraphics,
	layout: Layout,
	state: RuntimeState,
	pulse: number,
): void {
	graphics.fillStyle(0x020617, 1);
	graphics.fillRoundedRect(
		layout.boardX - 12,
		layout.boardY - 12,
		layout.boardWidth + 24,
		layout.boardHeight + 24,
		18,
	);
	graphics.lineStyle(2, 0x0f172a, 1);
	graphics.strokeRoundedRect(
		layout.boardX - 12,
		layout.boardY - 12,
		layout.boardWidth + 24,
		layout.boardHeight + 24,
		18,
	);

	for (let row = 0; row < ROWS; row += 1) {
		for (let col = 0; col < COLS; col += 1) {
			if (isWall(col, row)) {
				drawWallCell(graphics, layout, col, row);
			}
		}
	}

	const powerSize = layout.tileSize * (0.3 + pulse * 0.08);
	graphics.fillStyle(0xf8fafc, 1);

	for (let row = 0; row < ROWS; row += 1) {
		for (let col = 0; col < COLS; col += 1) {
			if (isWall(col, row)) continue;

			const key = tileKey(col, row);
			const position = worldPosition(layout, col, row);

			if (state.powerPellets.has(key)) {
				graphics.fillStyle(0xfde68a, 1);
				graphics.fillCircle(position.x, position.y, powerSize);
				graphics.fillStyle(0xf8fafc, 1);
			} else if (state.pellets.has(key)) {
				graphics.fillCircle(position.x, position.y, layout.tileSize * 0.1);
			}
		}
	}
}

function drawPlayer(
	graphics: PhaserGraphics,
	layout: Layout,
	player: PlayerState,
	progress: number,
): void {
	const renderPoint = interpolatedPoint(player, progress);
	const position = worldPosition(layout, renderPoint.col, renderPoint.row);
	const radius = layout.tileSize * 0.42;
	const facing = DIRECTIONS[player.dir ?? player.lastDir];
	const mouthOpen = player.dir ? player.mouth * 0.9 : 0.14;
	const mouthAngle = mouthOpen * 0.45;
	const tipDistance = radius * 1.3;

	graphics.fillStyle(0xfacc15, 1);
	graphics.fillCircle(position.x, position.y, radius);

	const centerAngle = facing.angle;
	const pointOne = {
		x: position.x + Math.cos(centerAngle + mouthAngle) * tipDistance,
		y: position.y + Math.sin(centerAngle + mouthAngle) * tipDistance,
	};
	const pointTwo = {
		x: position.x + Math.cos(centerAngle - mouthAngle) * tipDistance,
		y: position.y + Math.sin(centerAngle - mouthAngle) * tipDistance,
	};

	graphics.fillStyle(0x020617, 1);
	graphics.fillTriangle(
		position.x,
		position.y,
		pointOne.x,
		pointOne.y,
		pointTwo.x,
		pointTwo.y,
	);
}

function ghostColor(ghost: GhostState, frightenedRemaining: number): number {
	if (ghost.mode !== "frightened") return ghost.color;
	if (frightenedRemaining < 2 && Math.floor(frightenedRemaining * 10) % 2 === 0) {
		return GHOST_BLUE_FLASH;
	}
	return GHOST_BLUE;
}

function drawGhost(
	graphics: PhaserGraphics,
	layout: Layout,
	ghost: GhostState,
	frightenedRemaining: number,
	progress: number,
): void {
	const renderPoint = interpolatedPoint(ghost, progress);
	const position = worldPosition(layout, renderPoint.col, renderPoint.row);
	const width = layout.tileSize * 0.9;
	const height = layout.tileSize * 0.88;
	const left = position.x - width / 2;
	const top = position.y - height / 2;
	const bodyColor = ghost.mode === "eyes" ? 0x111827 : ghostColor(ghost, frightenedRemaining);

	graphics.fillStyle(bodyColor, 1);
	graphics.fillCircle(position.x, top + height * 0.38, width / 2);
	graphics.fillRect(left, top + height * 0.38, width, height * 0.42);

	for (let index = 0; index < 4; index += 1) {
		const bumpX = left + width * (0.125 + index * 0.25);
		graphics.fillCircle(bumpX, top + height * 0.8, width * 0.12);
	}

	const eyeOffsetX = width * 0.18;
	const eyeY = top + height * 0.42;
	const pupilShift = DIRECTIONS[ghost.dir];
	const pupilOffsetX = ghost.mode === "frightened" ? 0 : pupilShift.dx * width * 0.04;
	const pupilOffsetY = ghost.mode === "frightened" ? 0 : pupilShift.dy * width * 0.04;

	graphics.fillStyle(0xffffff, 1);
	graphics.fillEllipse(position.x - eyeOffsetX, eyeY, width * 0.22, height * 0.24);
	graphics.fillEllipse(position.x + eyeOffsetX, eyeY, width * 0.22, height * 0.24);

	if (ghost.mode === "frightened") {
		graphics.fillStyle(0xf8fafc, 1);
		graphics.fillCircle(position.x - width * 0.14, top + height * 0.46, width * 0.05);
		graphics.fillCircle(position.x + width * 0.14, top + height * 0.46, width * 0.05);

		graphics.lineStyle(Math.max(1, layout.tileSize * 0.06), 0xf8fafc, 1);
		graphics.beginPath();
		graphics.moveTo(position.x - width * 0.18, top + height * 0.68);
		graphics.lineTo(position.x - width * 0.08, top + height * 0.74);
		graphics.lineTo(position.x + width * 0.02, top + height * 0.68);
		graphics.lineTo(position.x + width * 0.12, top + height * 0.74);
		graphics.lineTo(position.x + width * 0.22, top + height * 0.68);
		graphics.strokePath();
		return;
	}

	if (ghost.mode === "eyes") {
		graphics.fillStyle(0xf8fafc, 1);
		graphics.fillCircle(position.x - width * 0.14, top + height * 0.46, width * 0.05);
		graphics.fillCircle(position.x + width * 0.14, top + height * 0.46, width * 0.05);
		return;
	}

	graphics.fillStyle(0x1d4ed8, 1);
	graphics.fillCircle(
		position.x - eyeOffsetX + pupilOffsetX,
		eyeY + pupilOffsetY,
		width * 0.06,
	);
	graphics.fillCircle(
		position.x + eyeOffsetX + pupilOffsetX,
		eyeY + pupilOffsetY,
		width * 0.06,
	);
}

function mountPacman(
	host: HTMLDivElement,
	PhaserLib: PhaserModule,
	onReady: () => void,
): () => void {
	let game: PhaserGame | null = null;
	let graphics: PhaserGraphics | null = null;
	let titleText: PhaserText | null = null;
	let scoreText: PhaserText | null = null;
	let livesText: PhaserText | null = null;
	let hintText: PhaserText | null = null;
	let bannerText: PhaserText | null = null;
	let subBannerText: PhaserText | null = null;
	let observer: ResizeObserver | null = null;
	let state = createRuntimeState();
	let playerStepAccumulator = 0;
	let ghostStepAccumulator = 0;

	const restartGame = () => {
		state = createRuntimeState();
		playerStepAccumulator = 0;
		ghostStepAccumulator = 0;
	};

	const handleKeyDown = (event: KeyboardEvent) => {
		if (isEditableTarget(event.target)) return;

		const direction = getDirectionFromKeyboardEvent(event);
		const restart = isRestartKeyboardEvent(event);
		if (!direction && !restart) return;

		event.preventDefault();

		if (direction) {
			if (event.repeat) return;
			setPlayerDirection(state, direction);
			return;
		}

		if (!event.repeat && (state.phase === "won" || state.phase === "gameOver")) {
			restartGame();
		}
	};

	const drawScene = (scene: PhaserScene) => {
		if (
			!graphics ||
			!titleText ||
			!scoreText ||
			!livesText ||
			!hintText ||
			!bannerText ||
			!subBannerText
		) {
			return;
		}

		const layout = resolveLayout(scene);
		const pulse = 0.6 + Math.sin(scene.time.now / 140) * 0.4;
		const playerProgress =
			state.phase === "ready" || state.phase === "playing"
				? playerStepAccumulator / PLAYER_STEP_SECONDS
				: 1;
		const ghostStepSeconds =
			state.frightenedRemaining > 0
				? FRIGHTENED_GHOST_STEP_SECONDS
				: GHOST_STEP_SECONDS;
		const ghostProgress = state.phase === "playing"
			? ghostStepAccumulator / ghostStepSeconds
			: 1;

		graphics.clear();
		graphics.fillGradientStyle(0x020617, 0x020617, 0x04111f, 0x04111f, 1);
		graphics.fillRect(0, 0, scene.scale.width, scene.scale.height);
		graphics.fillStyle(0x08111e, 0.9);
		graphics.fillRoundedRect(
			layout.boardX - 24,
			layout.boardY - 24,
			layout.boardWidth + 48,
			layout.boardHeight + 48,
			24,
		);
		drawMaze(graphics, layout, state, pulse);
		drawPlayer(graphics, layout, state.player, playerProgress);
		for (const ghost of state.ghosts) {
			drawGhost(
				graphics,
				layout,
				ghost,
				state.frightenedRemaining,
				ghostProgress,
			);
		}

		titleText
			.setText("PACMAN")
			.setPosition(scene.scale.width / 2, layout.hudTop)
			.setFontSize(Math.max(18, Math.floor(layout.tileSize * 0.9)));

		scoreText
			.setText(`SCORE ${state.score.toString().padStart(4, "0")}`)
			.setPosition(layout.boardX, layout.hudTop + 26)
			.setFontSize(Math.max(12, Math.floor(layout.tileSize * 0.42)));

		livesText
			.setText(`LIVES ${Math.max(0, state.lives)}`)
			.setPosition(layout.boardX + layout.boardWidth, layout.hudTop + 26)
			.setOrigin(1, 0)
			.setFontSize(Math.max(12, Math.floor(layout.tileSize * 0.42)));

		hintText
			.setText(
				state.phase === "won" || state.phase === "gameOver"
					? "Press space or enter to restart"
					: "Arrow keys or WASD",
			)
			.setPosition(scene.scale.width / 2, layout.footerY + 6)
			.setFontSize(Math.max(11, Math.floor(layout.tileSize * 0.34)));

		if (state.message) {
			bannerText
				.setText(state.message)
				.setVisible(true)
				.setPosition(
					scene.scale.width / 2,
					layout.boardY + layout.boardHeight / 2 - layout.tileSize,
				)
				.setFontSize(Math.max(20, Math.floor(layout.tileSize * 1.05)));

			subBannerText
				.setText(state.subMessage)
				.setVisible(Boolean(state.subMessage))
				.setPosition(
					scene.scale.width / 2,
					layout.boardY + layout.boardHeight / 2 + layout.tileSize * 0.4,
				)
				.setFontSize(Math.max(11, Math.floor(layout.tileSize * 0.34)));
		} else {
			bannerText.setVisible(false);
			subBannerText.setVisible(false);
		}
	};

	class PacmanScene extends PhaserLib.Scene {
		constructor() {
			super("pacman-phaser");
		}

		create() {
			graphics = this.add.graphics().setDepth(0);

			titleText = this.add.text(0, 0, "", {
				fontFamily: FONT_STACK,
				fontStyle: "700",
				color: "#fde68a",
				align: "center",
			});
			titleText.setOrigin(0.5, 0).setStroke("#020617", 6).setDepth(5);

			scoreText = this.add.text(0, 0, "", {
				fontFamily: FONT_STACK,
				fontStyle: "700",
				color: "#e2e8f0",
			});
			scoreText.setOrigin(0, 0).setDepth(5);

			livesText = this.add.text(0, 0, "", {
				fontFamily: FONT_STACK,
				fontStyle: "700",
				color: "#f8fafc",
			});
			livesText.setOrigin(1, 0).setDepth(5);

			hintText = this.add.text(0, 0, "", {
				fontFamily: FONT_STACK,
				color: "#94a3b8",
				align: "center",
			});
			hintText.setOrigin(0.5, 0.5).setDepth(5);

			bannerText = this.add.text(0, 0, "", {
				fontFamily: FONT_STACK,
				fontStyle: "700",
				color: "#f8fafc",
				align: "center",
			});
			bannerText.setOrigin(0.5).setDepth(5).setStroke("#020617", 8);

			subBannerText = this.add.text(0, 0, "", {
				fontFamily: FONT_STACK,
				color: "#cbd5e1",
				align: "center",
			});
			subBannerText.setOrigin(0.5).setDepth(5).setStroke("#020617", 5);

			this.scale.on("resize", () => {
				drawScene(this);
			});

			drawScene(this);
			onReady();
		}

		update(_time: number, deltaMs: number) {
			const deltaSeconds = clampDelta(deltaMs);
			updatePlayerAnimation(state, deltaSeconds);
			updateModes(state, deltaSeconds);

			if (state.phase === "ready" || state.phase === "playing") {
				playerStepAccumulator += deltaSeconds;
				while (playerStepAccumulator >= PLAYER_STEP_SECONDS) {
					stepPlayer(state);
					playerStepAccumulator -= PLAYER_STEP_SECONDS;
					if (state.phase !== "ready" && state.phase !== "playing") {
						break;
					}
				}
			}

			if (state.phase === "playing") {
				ghostStepAccumulator += deltaSeconds;
				const ghostStepSeconds =
					state.frightenedRemaining > 0
						? FRIGHTENED_GHOST_STEP_SECONDS
						: GHOST_STEP_SECONDS;

				while (ghostStepAccumulator >= ghostStepSeconds) {
					stepGhosts(state);
					ghostStepAccumulator -= ghostStepSeconds;
					if (state.phase !== "playing") {
						break;
					}
				}
			}

			drawScene(this);
		}
	}

	host.innerHTML = "";
	window.addEventListener("keydown", handleKeyDown, { passive: false });
	const initialSize = resolveHostSize(host);

	game = new PhaserLib.Game({
		type: PhaserLib.CANVAS,
		parent: host,
		width: initialSize.width,
		height: initialSize.height,
		scene: new PacmanScene() as PhaserScene,
		banner: false,
		disableContextMenu: true,
		audio: { noAudio: true },
		backgroundColor: "#020617",
		transparent: false,
		antialias: true,
		pixelArt: false,
	});

	observer = new ResizeObserver(() => {
		if (!game) return;
		const nextSize = resolveHostSize(host);
		game.scale.resize(nextSize.width, nextSize.height);
	});
	observer.observe(host);

	return () => {
		observer?.disconnect();
		window.removeEventListener("keydown", handleKeyDown);
		graphics = null;
		titleText = null;
		scoreText = null;
		livesText = null;
		hintText = null;
		bannerText = null;
		subBannerText = null;
		if (game) {
			game.destroy(true);
			game = null;
		}
	};
}

export default function Pacman(): React.JSX.Element {
	const hostRef = useRef<HTMLDivElement | null>(null);
	const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

	useEffect(() => {
		const host = hostRef.current;
		if (!host) return;

		let cancelled = false;
		let cleanup: (() => void) | undefined;

		setStatus("loading");

		void (async () => {
			try {
				const phaserModule = await import("phaser");
				const PhaserLib = ("default" in phaserModule
					? phaserModule.default
					: phaserModule) as PhaserModule;

				if (cancelled || !hostRef.current) return;

				cleanup = mountPacman(hostRef.current, PhaserLib, () => {
					if (!cancelled) setStatus("ready");
				});
			} catch (error) {
				console.error("Failed to initialize Pacman.", error);
				if (!cancelled) setStatus("error");
			}
		})();

		return () => {
			cancelled = true;
			cleanup?.();
		};
	}, []);

	return (
		<div className="relative h-full w-full overflow-hidden rounded-[1.5rem] bg-slate-950 p-6">
			<div ref={hostRef} className="h-full w-full rounded-[1rem]" />

			{status === "loading" ? (
				<div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-950/70 text-sm font-semibold tracking-[0.3em] text-slate-300">
					Loading Phaser...
				</div>
			) : null}

			{status === "error" ? (
				<div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-950/80 px-6 text-center text-sm font-medium text-rose-200">
					Unable to load Pacman right now.
				</div>
			) : null}
		</div>
	);
}
