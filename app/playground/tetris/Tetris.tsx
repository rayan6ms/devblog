"use client";

import { type MutableRefObject, useEffect, useRef, useState } from "react";

type PhaserModule = typeof import("phaser");
type PhaserGame = import("phaser").Game;
type PhaserScene = import("phaser").Scene;
type PhaserGraphics = import("phaser").GameObjects.Graphics;
type PhaserText = import("phaser").GameObjects.Text;

type PieceKey = "I" | "J" | "L" | "O" | "S" | "T" | "Z";
type Rotation = 0 | 1 | 2 | 3;
type Cell = PieceKey | null;
type Board = Cell[][];

type ActivePiece = {
	key: PieceKey;
	rotation: Rotation;
	x: number;
	y: number;
};

type PlanMove = "L" | "R" | "CW" | "DROP" | "HOLD";

type UiState = {
	score: number;
	lines: number;
	level: number;
	paused: boolean;
	gameOver: boolean;
	autoplay: boolean;
};

type TetrisControls = {
	reset: () => void;
	togglePause: () => void;
	toggleAutoplay: () => void;
	hardDrop: () => void;
	holdPiece: () => void;
};

type MountBridge = {
	autoplayRef: MutableRefObject<boolean>;
	controlsRef: MutableRefObject<TetrisControls | null>;
	onReady: () => void;
	onUiState: (state: UiState) => void;
	setAutoplay: (next: boolean) => void;
};

type LayoutMetrics = {
	frameX: number;
	frameY: number;
	frameWidth: number;
	frameHeight: number;
	boardX: number;
	boardY: number;
	boardWidth: number;
	boardHeight: number;
	panelX: number;
	panelY: number;
	panelWidth: number;
	panelHeight: number;
	cell: number;
	titleSize: number;
	labelSize: number;
	valueSize: number;
	statusSize: number;
	previewCell: number;
};

const COLS = 10;
const ROWS = 20;
const PREVIEW_QUEUE = 5;
const LOCK_DELAY_MS = 450;
const AUTOPLAY_STEP_MS = 80;
const ROTATIONS: readonly Rotation[] = [0, 1, 2, 3];
const ORDER: readonly PieceKey[] = ["I", "J", "L", "O", "S", "T", "Z"];

const EMPTY_UI_STATE: UiState = {
	score: 0,
	lines: 0,
	level: 1,
	paused: false,
	gameOver: false,
	autoplay: false,
};

const COLORS: Record<PieceKey, number> = {
	I: 0x22d3ee,
	J: 0x2563eb,
	L: 0xf97316,
	O: 0xfacc15,
	S: 0x22c55e,
	T: 0xa855f7,
	Z: 0xef4444,
};

const SHAPES: Record<PieceKey, number[][]> = {
	I: [
		[0, 0, 0, 0],
		[1, 1, 1, 1],
		[0, 0, 0, 0],
		[0, 0, 0, 0],
	],
	J: [
		[1, 0, 0],
		[1, 1, 1],
		[0, 0, 0],
	],
	L: [
		[0, 0, 1],
		[1, 1, 1],
		[0, 0, 0],
	],
	O: [
		[1, 1],
		[1, 1],
	],
	S: [
		[0, 1, 1],
		[1, 1, 0],
		[0, 0, 0],
	],
	T: [
		[0, 1, 0],
		[1, 1, 1],
		[0, 0, 0],
	],
	Z: [
		[1, 1, 0],
		[0, 1, 1],
		[0, 0, 0],
	],
};

function rotateMatrix(matrix: number[][]): number[][] {
	const height = matrix.length;
	const width = matrix[0]?.length ?? 0;
	const rotated: number[][] = Array.from({ length: width }, () =>
		Array(height).fill(0),
	);

	for (let y = 0; y < height; y += 1) {
		for (let x = 0; x < width; x += 1) {
			rotated[x][height - 1 - y] = matrix[y][x];
		}
	}

	return rotated;
}

function createRotations(shape: number[][]): number[][][] {
	const first = shape.map((row) => row.slice());
	const second = rotateMatrix(first);
	const third = rotateMatrix(second);
	const fourth = rotateMatrix(third);
	return [first, second, third, fourth];
}

const SHAPE_ROTATIONS: Record<PieceKey, number[][][]> = {
	I: createRotations(SHAPES.I),
	J: createRotations(SHAPES.J),
	L: createRotations(SHAPES.L),
	O: createRotations(SHAPES.O),
	S: createRotations(SHAPES.S),
	T: createRotations(SHAPES.T),
	Z: createRotations(SHAPES.Z),
};

function normalizeRotation(value: number): Rotation {
	return ROTATIONS[((value % 4) + 4) % 4];
}

function createEmptyBoard(): Board {
	return Array.from({ length: ROWS }, () => Array<Cell>(COLS).fill(null));
}

function spawnXFor(key: PieceKey): number {
	const width = SHAPE_ROTATIONS[key][0][0]?.length ?? 0;
	return Math.floor((COLS - width) / 2);
}

function mulberry32(seed: number) {
	return () => {
		let value = (seed += 0x6d2b79f5);
		value = Math.imul(value ^ (value >>> 15), value | 1);
		value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
		return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
	};
}

function shuffleBag<T>(items: readonly T[], random: () => number): T[] {
	const copy = items.slice();

	for (let index = copy.length - 1; index > 0; index -= 1) {
		const swapIndex = Math.floor(random() * (index + 1));
		[copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
	}

	return copy;
}

function dropIntervalForLevel(level: number): number {
	const gravity = (0.8 - (level - 1) * 0.007) ** level;
	return Math.max(70, gravity * 1000);
}

function clampByte(value: number): number {
	return Math.max(0, Math.min(255, Math.round(value)));
}

function adjustColor(color: number, delta: number): number {
	const r = clampByte(((color >> 16) & 0xff) + delta);
	const g = clampByte(((color >> 8) & 0xff) + delta);
	const b = clampByte((color & 0xff) + delta);
	return (r << 16) | (g << 8) | b;
}

function collides(board: Board, piece: ActivePiece): boolean {
	const shape = SHAPE_ROTATIONS[piece.key][piece.rotation];

	for (let y = 0; y < shape.length; y += 1) {
		for (let x = 0; x < shape[0].length; x += 1) {
			if (!shape[y][x]) continue;

			const gridX = piece.x + x;
			const gridY = piece.y + y;

			if (gridX < 0 || gridX >= COLS || gridY >= ROWS) {
				return true;
			}

			if (gridY >= 0 && board[gridY][gridX]) {
				return true;
			}
		}
	}

	return false;
}

function placePiece(board: Board, piece: ActivePiece): Board {
	const nextBoard = board.map((row) => row.slice());
	const shape = SHAPE_ROTATIONS[piece.key][piece.rotation];

	for (let y = 0; y < shape.length; y += 1) {
		for (let x = 0; x < shape[0].length; x += 1) {
			if (!shape[y][x]) continue;

			const gridX = piece.x + x;
			const gridY = piece.y + y;

			if (gridY >= 0 && gridY < ROWS && gridX >= 0 && gridX < COLS) {
				nextBoard[gridY][gridX] = piece.key;
			}
		}
	}

	return nextBoard;
}

function clearCompletedLines(board: Board): { board: Board; cleared: number } {
	const remaining = board.filter((row) => row.some((cell) => !cell));
	const cleared = ROWS - remaining.length;

	while (remaining.length < ROWS) {
		remaining.unshift(Array<Cell>(COLS).fill(null));
	}

	return {
		board: remaining,
		cleared,
	};
}

function simulatePlacement(
	board: Board,
	piece: ActivePiece,
): { board: Board; cleared: number } {
	const placed = placePiece(board, piece);
	return clearCompletedLines(placed);
}

function boardHeuristics(board: Board, linesCleared: number): number {
	const heights = Array<number>(COLS).fill(0);
	let holes = 0;

	for (let column = 0; column < COLS; column += 1) {
		let seenBlock = false;

		for (let row = 0; row < ROWS; row += 1) {
			if (board[row][column]) {
				if (!seenBlock) {
					heights[column] = ROWS - row;
					seenBlock = true;
				}
			} else if (seenBlock) {
				holes += 1;
			}
		}
	}

	let bumpiness = 0;
	for (let column = 0; column < COLS - 1; column += 1) {
		bumpiness += Math.abs(heights[column] - heights[column + 1]);
	}

	let wells = 0;
	for (let column = 0; column < COLS; column += 1) {
		const left = column === 0 ? Number.MAX_SAFE_INTEGER : heights[column - 1];
		const right =
			column === COLS - 1 ? Number.MAX_SAFE_INTEGER : heights[column + 1];

		if (heights[column] < left && heights[column] < right) {
			wells += Math.min(left, right) - heights[column];
		}
	}

	const aggregateHeight = heights.reduce((total, value) => total + value, 0);

	return (
		linesCleared * 0.760666 +
		aggregateHeight * -0.510066 +
		holes * -0.35663 +
		bumpiness * -0.184483 +
		wells * -0.1
	);
}

function resolveHostSize(host: HTMLDivElement) {
	const width = Math.max(1, host.clientWidth || Math.floor(host.getBoundingClientRect().width));
	const height = Math.max(
		1,
		host.clientHeight || Math.floor(host.getBoundingClientRect().height),
	);

	return { width, height };
}

function resolveLayout(width: number, height: number): LayoutMetrics {
	const outerPad = Math.max(8, Math.floor(Math.min(width, height) * 0.02));
	const frameWidth = Math.max(320, width - outerPad * 2);
	const frameHeight = Math.max(360, height - outerPad * 2);
	const innerPad = Math.max(10, Math.floor(Math.min(frameWidth, frameHeight) * 0.025));
	const usableWidth = frameWidth - innerPad * 3;
	const usableHeight = frameHeight - innerPad * 2;
	const minPanelWidth = Math.min(170, Math.max(132, Math.floor(frameWidth * 0.22)));
	const cell = Math.max(
		12,
		Math.floor(
			Math.min(
				usableHeight / ROWS,
				(usableWidth - minPanelWidth) / COLS,
			),
		),
	);
	const boardWidth = cell * COLS;
	const boardHeight = cell * ROWS;
	const panelWidth = Math.max(
		minPanelWidth,
		Math.min(
			Math.floor(frameWidth * 0.26),
			frameWidth - boardWidth - innerPad * 3,
		),
	);
	const contentWidth = boardWidth + panelWidth + innerPad;
	const frameX = Math.floor((width - frameWidth) / 2);
	const frameY = Math.floor((height - frameHeight) / 2);
	const boardX = frameX + Math.max(innerPad, Math.floor((frameWidth - contentWidth) / 2));
	const boardY = frameY + Math.max(innerPad, Math.floor((frameHeight - boardHeight) / 2));
	const panelX = boardX + boardWidth + innerPad;
	const panelY = boardY;

	return {
		frameX,
		frameY,
		frameWidth,
		frameHeight,
		boardX,
		boardY,
		boardWidth,
		boardHeight,
		panelX,
		panelY,
		panelWidth,
		panelHeight: boardHeight,
		cell,
		titleSize: Math.max(16, Math.floor(cell * 0.82)),
		labelSize: Math.max(12, Math.floor(cell * 0.68)),
		valueSize: Math.max(12, Math.floor(cell * 0.72)),
		statusSize: Math.max(10, Math.floor(cell * 0.5)),
		previewCell: Math.max(10, Math.floor(cell * 0.58)),
	};
}

function mountTetris(
	host: HTMLDivElement,
	PhaserLib: PhaserModule,
	bridge: MountBridge,
) {
	let game: PhaserGame | null = null;
	let observer: ResizeObserver | null = null;
	let removeInputListeners: (() => void) | null = null;

	const publishUiState = (() => {
		let lastState = "";

		return (next: UiState, force = false) => {
			const signature = JSON.stringify(next);
			if (!force && signature === lastState) return;
			lastState = signature;
			bridge.onUiState(next);
		};
	})();

	class TetrisScene extends PhaserLib.Scene {
		private graphics: PhaserGraphics | null = null;

		private titleText: PhaserText | null = null;

		private nextText: PhaserText | null = null;

		private holdText: PhaserText | null = null;

		private statsText: PhaserText | null = null;

		private statusText: PhaserText | null = null;

		private overlayText: PhaserText | null = null;

		private board = createEmptyBoard();

		private active: ActivePiece | null = null;

		private hold: PieceKey | null = null;

		private canHold = true;

		private nextQueue: PieceKey[] = [];

		private bag: PieceKey[] = [];

		private plannedMoves: PlanMove[] = [];

		private random = mulberry32(Math.floor(Math.random() * 1_000_000_000));

		private score = 0;

		private lines = 0;

		private level = 1;

		private dropAccumulator = 0;

		private lockAccumulator = 0;

		private autoplayAccumulator = 0;

		private dropInterval = dropIntervalForLevel(1);

		private softDrop = false;

		private paused = false;

		private gameOver = false;

		constructor() {
			super("tetris-phaser");
		}

		create() {
			this.graphics = this.add.graphics();
			this.titleText = this.add.text(0, 0, "NEXT");
			this.nextText = this.add.text(0, 0, "HOLD");
			this.holdText = this.add.text(0, 0, "STATUS");
			this.statsText = this.add.text(0, 0, "");
			this.statusText = this.add.text(0, 0, "");
			this.overlayText = this.add.text(0, 0, "", { align: "center" });

			this.cameras.main.setBackgroundColor("#05070d");
			this.bindInput();
			this.installControls();
			this.resetGame();
			bridge.onReady();
		}

		update(_time: number, delta: number) {
			if (bridge.autoplayRef.current && !this.gameOver && !this.paused && this.active) {
				this.autoplayAccumulator += delta;

				if (this.plannedMoves.length === 0) {
					this.planAutoplay();
				}

				while (this.autoplayAccumulator >= AUTOPLAY_STEP_MS) {
					this.autoplayAccumulator -= AUTOPLAY_STEP_MS;
					if (!this.runAutoplayStep()) break;
				}
			} else {
				this.autoplayAccumulator = 0;
			}

			if (!this.paused && !this.gameOver && this.active) {
				this.dropAccumulator += delta;
				const stepInterval = this.softDrop
					? Math.max(28, this.dropInterval / 18)
					: this.dropInterval;

				while (this.dropAccumulator >= stepInterval) {
					this.dropAccumulator -= stepInterval;
					this.tryMove(0, 1, false);
				}

				if (this.isGrounded()) {
					this.lockAccumulator += delta;
					if (this.lockAccumulator >= LOCK_DELAY_MS) {
						this.lockActivePiece();
					}
				} else {
					this.lockAccumulator = 0;
				}
			}

			this.drawFrame();
		}

		private bindInput() {
			const shouldIgnoreEvent = (event: KeyboardEvent) => {
				const target = event.target as HTMLElement | null;
				if (!target) return false;
				const tagName = target.tagName;
				return (
					tagName === "INPUT" ||
					tagName === "TEXTAREA" ||
					tagName === "SELECT" ||
					target.isContentEditable
				);
			};

			const handleKeyDown = (event: KeyboardEvent) => {
				if (shouldIgnoreEvent(event)) return;

				const code = event.code;
				const isMovementKey =
					code === "ArrowLeft" ||
					code === "ArrowRight" ||
					code === "ArrowDown" ||
					code === "ArrowUp" ||
					code === "Space" ||
					code === "KeyA" ||
					code === "KeyD" ||
					code === "KeyS" ||
					code === "KeyW";

				if (isMovementKey) {
					event.preventDefault();
				}

				if (this.paused || this.gameOver || !this.active) {
					return;
				}

				if (code === "ArrowLeft" || code === "KeyA") {
					this.tryMove(-1, 0, true);
				} else if (code === "ArrowRight" || code === "KeyD") {
					this.tryMove(1, 0, true);
				} else if (code === "ArrowDown" || code === "KeyS") {
					this.softDrop = true;
				} else if (code === "Space" && !event.repeat) {
					this.hardDrop();
				} else if ((code === "ArrowUp" || code === "KeyW") && !event.repeat) {
					this.tryRotate(1);
				}
			};

			const handleKeyUp = (event: KeyboardEvent) => {
				if (shouldIgnoreEvent(event)) return;
				if (event.code === "ArrowDown" || event.code === "KeyS") {
					this.softDrop = false;
				}
			};

			window.addEventListener("keydown", handleKeyDown, { passive: false });
			window.addEventListener("keyup", handleKeyUp);

			removeInputListeners = () => {
				window.removeEventListener("keydown", handleKeyDown);
				window.removeEventListener("keyup", handleKeyUp);
			};

			this.events.once("shutdown", () => {
				removeInputListeners?.();
				removeInputListeners = null;
				this.softDrop = false;
			});
		}

		private installControls() {
			bridge.controlsRef.current = {
				reset: () => this.resetGame(),
				togglePause: () => this.togglePause(),
				toggleAutoplay: () => this.toggleAutoplay(),
				hardDrop: () => this.hardDrop(),
				holdPiece: () => this.holdPiece(),
			};
		}

		private syncUi(force = false) {
			publishUiState(
				{
					score: this.score,
					lines: this.lines,
					level: this.level,
					paused: this.paused,
					gameOver: this.gameOver,
					autoplay: bridge.autoplayRef.current,
				},
				force,
			);
		}

		private resetGame() {
			this.board = createEmptyBoard();
			this.active = null;
			this.hold = null;
			this.canHold = true;
			this.nextQueue = [];
			this.bag = [];
			this.plannedMoves = [];
			this.random = mulberry32(Math.floor(Math.random() * 1_000_000_000));
			this.score = 0;
			this.lines = 0;
			this.level = 1;
			this.dropAccumulator = 0;
			this.lockAccumulator = 0;
			this.autoplayAccumulator = 0;
			this.dropInterval = dropIntervalForLevel(this.level);
			this.softDrop = false;
			this.paused = false;
			this.gameOver = false;
			this.refillQueue();
			this.spawnNextPiece();
			this.syncUi(true);
		}

		private togglePause() {
			if (this.gameOver) return;
			this.paused = !this.paused;
			this.syncUi();
		}

		private toggleAutoplay() {
			const next = !bridge.autoplayRef.current;
			bridge.setAutoplay(next);
			this.plannedMoves = [];

			if (next && this.active && !this.gameOver) {
				this.planAutoplay();
			}

			this.syncUi();
		}

		private refillQueue() {
			while (this.nextQueue.length < PREVIEW_QUEUE) {
				if (this.bag.length === 0) {
					this.bag = shuffleBag(ORDER, this.random);
				}

				const piece = this.bag.pop();
				if (piece) this.nextQueue.push(piece);
			}
		}

		private spawnNextPiece() {
			this.canHold = true;
			const key = this.nextQueue.shift();
			if (!key) return;

			this.refillQueue();
			this.active = {
				key,
				rotation: 0,
				x: spawnXFor(key),
				y: -2,
			};
			this.plannedMoves = [];
			this.dropAccumulator = 0;
			this.lockAccumulator = 0;

			if (collides(this.board, this.active)) {
				this.gameOver = true;
				this.active = null;
			} else if (bridge.autoplayRef.current) {
				this.planAutoplay();
			}

			this.syncUi();
		}

		private tryMove(dx: number, dy: number, manual: boolean): boolean {
			if (!this.active) return false;

			const candidate: ActivePiece = {
				...this.active,
				x: this.active.x + dx,
				y: this.active.y + dy,
			};

			if (collides(this.board, candidate)) {
				return false;
			}

			this.active = candidate;

			if (manual && dy > 0) {
				this.score += 1;
			}

			this.lockAccumulator = 0;

			if (manual) {
				this.onManualAction();
				this.syncUi();
			}

			return true;
		}

		private tryRotate(direction: 1 | -1): boolean {
			if (!this.active) return false;

			const candidateRotation = normalizeRotation(
				this.active.rotation + direction,
			);
			const baseCandidate: ActivePiece = {
				...this.active,
				rotation: candidateRotation,
			};
			const kicks =
				this.active.key === "I"
					? [
							{ x: 0, y: 0 },
							{ x: -2, y: 0 },
							{ x: 2, y: 0 },
							{ x: -1, y: 0 },
							{ x: 1, y: 0 },
							{ x: 0, y: -1 },
							{ x: 0, y: 1 },
							{ x: 0, y: -2 },
						]
					: [
							{ x: 0, y: 0 },
							{ x: -1, y: 0 },
							{ x: 1, y: 0 },
							{ x: -2, y: 0 },
							{ x: 2, y: 0 },
							{ x: 0, y: -1 },
							{ x: 0, y: -2 },
							{ x: 0, y: 1 },
						];

			for (const kick of kicks) {
				const candidate: ActivePiece = {
					...baseCandidate,
					x: baseCandidate.x + kick.x,
					y: baseCandidate.y + kick.y,
				};

				if (collides(this.board, candidate)) continue;

				this.active = candidate;
				this.lockAccumulator = 0;
				this.onManualAction();
				this.syncUi();
				return true;
			}

			return false;
		}

		private hardDrop() {
			if (!this.active || this.paused || this.gameOver) return;

			let traveled = 0;
			while (this.tryMove(0, 1, false)) {
				traveled += 1;
			}

			if (traveled > 0) {
				this.score += traveled * 2;
			}

			this.lockActivePiece();
			this.syncUi();
		}

		private holdPiece() {
			if (!this.active || !this.canHold || this.paused || this.gameOver) return;

			const currentKey = this.active.key;
			const swapKey = this.hold;
			this.hold = currentKey;
			this.canHold = false;
			this.plannedMoves = [];
			this.dropAccumulator = 0;
			this.lockAccumulator = 0;

			if (swapKey) {
				this.active = {
					key: swapKey,
					rotation: 0,
					x: spawnXFor(swapKey),
					y: -2,
				};

				if (collides(this.board, this.active)) {
					this.gameOver = true;
					this.active = null;
				}
			} else {
				this.active = null;
				this.spawnNextPiece();
				return;
			}

			if (bridge.autoplayRef.current && this.active && !this.gameOver) {
				this.planAutoplay();
			}

			this.syncUi();
		}

		private isGrounded(): boolean {
			if (!this.active) return false;
			return collides(this.board, { ...this.active, y: this.active.y + 1 });
		}

		private ghostY(piece: ActivePiece): number {
			let y = piece.y;

			while (!collides(this.board, { ...piece, y: y + 1 })) {
				y += 1;
			}

			return y;
		}

		private lockActivePiece() {
			if (!this.active) return;

			let placedAboveBoard = false;
			const shape = SHAPE_ROTATIONS[this.active.key][this.active.rotation];

			for (let y = 0; y < shape.length; y += 1) {
				for (let x = 0; x < shape[0].length; x += 1) {
					if (!shape[y][x]) continue;
					if (this.active.y + y < 0) {
						placedAboveBoard = true;
					}
				}
			}

			this.board = placePiece(this.board, this.active);
			const clearedState = clearCompletedLines(this.board);
			this.board = clearedState.board;

			if (clearedState.cleared > 0) {
				const points = [0, 100, 300, 500, 800][clearedState.cleared] ?? 0;
				this.score += points * this.level;
				this.lines += clearedState.cleared;
				this.level = 1 + Math.floor(this.lines / 10);
				this.dropInterval = dropIntervalForLevel(this.level);
			}

			this.active = null;
			this.lockAccumulator = 0;
			this.dropAccumulator = 0;

			if (placedAboveBoard) {
				this.gameOver = true;
				this.syncUi();
				return;
			}

			this.spawnNextPiece();
		}

		private onManualAction() {
			this.plannedMoves = [];
			if (bridge.autoplayRef.current && this.active && !this.gameOver) {
				this.planAutoplay();
			}
		}

		private runAutoplayStep(): boolean {
			if (!bridge.autoplayRef.current || !this.active || this.paused || this.gameOver) {
				return false;
			}

			if (this.plannedMoves.length === 0) {
				this.planAutoplay();
				return this.plannedMoves.length > 0;
			}

			const step = this.plannedMoves.shift();
			if (!step) return false;

			if (step === "HOLD") {
				this.holdPiece();
			} else if (step === "L") {
				this.tryMove(-1, 0, false);
			} else if (step === "R") {
				this.tryMove(1, 0, false);
			} else if (step === "CW") {
				this.tryRotate(1);
			} else if (step === "DROP") {
				this.hardDrop();
			}

			return true;
		}

		private planAutoplay() {
			if (!this.active || this.gameOver) return;

			type Eval = {
				score: number;
				x: number;
				rotation: Rotation;
				useHold: boolean;
			};

			const evaluations: Eval[] = [];
			const options: Array<{ key: PieceKey; useHold: boolean }> = [
				{ key: this.active.key, useHold: false },
			];

			if (this.canHold) {
				options.push({
					key: this.hold ?? this.nextQueue[0] ?? this.active.key,
					useHold: true,
				});
			}

			for (const option of options) {
				for (const rotation of ROTATIONS) {
					const shape = SHAPE_ROTATIONS[option.key][rotation];
					const minX = -shape[0].length + 1;
					const maxX = COLS - 1;

					for (let x = minX; x <= maxX; x += 1) {
						const candidate: ActivePiece = {
							key: option.key,
							rotation,
							x,
							y: -2,
						};

						if (collides(this.board, candidate)) continue;

						while (
							!collides(this.board, { ...candidate, y: candidate.y + 1 })
						) {
							candidate.y += 1;
						}

						if (candidate.y < -1) continue;

						const simulation = simulatePlacement(this.board, candidate);
						const score = boardHeuristics(
							simulation.board,
							simulation.cleared,
						);

						evaluations.push({
							score,
							x,
							rotation,
							useHold: option.useHold,
						});
					}
				}
			}

			if (evaluations.length === 0) {
				this.plannedMoves = ["DROP"];
				return;
			}

			evaluations.sort((left, right) => right.score - left.score);
			const best = evaluations[0];
			const moves: PlanMove[] = [];

			if (best.useHold) {
				moves.push("HOLD");
			}

			const startKey = best.useHold
				? this.hold ?? this.nextQueue[0] ?? this.active.key
				: this.active.key;
			const startRotation: Rotation = best.useHold ? 0 : this.active.rotation;
			const startX = best.useHold ? spawnXFor(startKey) : this.active.x;
			const rotationDelta = normalizeRotation(best.rotation - startRotation);

			for (let index = 0; index < rotationDelta; index += 1) {
				moves.push("CW");
			}

			const dx = best.x - startX;
			const horizontalMove = dx < 0 ? "L" : "R";

			for (let index = 0; index < Math.abs(dx); index += 1) {
				moves.push(horizontalMove);
			}

			moves.push("DROP");
			this.plannedMoves = moves;
		}

		private drawFrame() {
			if (
				!this.graphics ||
				!this.titleText ||
				!this.nextText ||
				!this.holdText ||
				!this.statsText ||
				!this.statusText ||
				!this.overlayText
			) {
				return;
			}

			const graphics = this.graphics;
			const layout = resolveLayout(this.scale.width, this.scale.height);

			graphics.clear();
			graphics.fillGradientStyle(0x07111f, 0x0b1626, 0x040712, 0x09111e, 1);
			graphics.fillRect(0, 0, this.scale.width, this.scale.height);

			graphics.fillStyle(0x0b1220, 0.95);
			graphics.fillRoundedRect(
				layout.frameX,
				layout.frameY,
				layout.frameWidth,
				layout.frameHeight,
				Math.max(20, layout.cell * 0.58),
			);
			graphics.lineStyle(2, 0x243349, 1);
			graphics.strokeRoundedRect(
				layout.frameX,
				layout.frameY,
				layout.frameWidth,
				layout.frameHeight,
				Math.max(20, layout.cell * 0.58),
			);

			graphics.fillStyle(0x101827, 1);
			graphics.fillRoundedRect(
				layout.boardX,
				layout.boardY,
				layout.boardWidth,
				layout.boardHeight,
				Math.max(12, layout.cell * 0.4),
			);
			graphics.lineStyle(Math.max(2, layout.cell * 0.05), 0x24344a, 1);
			graphics.strokeRoundedRect(
				layout.boardX,
				layout.boardY,
				layout.boardWidth,
				layout.boardHeight,
				Math.max(12, layout.cell * 0.4),
			);

			graphics.lineStyle(1, 0x263447, 0.7);
			for (let column = 1; column < COLS; column += 1) {
				const x = layout.boardX + column * layout.cell;
				graphics.lineBetween(x, layout.boardY, x, layout.boardY + layout.boardHeight);
			}
			for (let row = 1; row < ROWS; row += 1) {
				const y = layout.boardY + row * layout.cell;
				graphics.lineBetween(
					layout.boardX,
					y,
					layout.boardX + layout.boardWidth,
					y,
				);
			}

			for (let row = 0; row < ROWS; row += 1) {
				for (let column = 0; column < COLS; column += 1) {
					const piece = this.board[row][column];
					if (!piece) continue;

					this.drawBlock(
						graphics,
						layout.boardX + column * layout.cell,
						layout.boardY + row * layout.cell,
						layout.cell,
						COLORS[piece],
						1,
					);
				}
			}

			if (this.active) {
				const ghostY = this.ghostY(this.active);
				const shape = SHAPE_ROTATIONS[this.active.key][this.active.rotation];

				for (let y = 0; y < shape.length; y += 1) {
					for (let x = 0; x < shape[0].length; x += 1) {
						if (!shape[y][x]) continue;

						const drawX = this.active.x + x;
						const drawGhostY = ghostY + y;
						const drawY = this.active.y + y;

						if (drawGhostY >= 0) {
							this.drawBlock(
								graphics,
								layout.boardX + drawX * layout.cell,
								layout.boardY + drawGhostY * layout.cell,
								layout.cell,
								COLORS[this.active.key],
								0.2,
							);
						}

						if (drawY >= 0) {
							this.drawBlock(
								graphics,
								layout.boardX + drawX * layout.cell,
								layout.boardY + drawY * layout.cell,
								layout.cell,
								COLORS[this.active.key],
								1,
							);
						}
					}
				}
			}

			const panelInset = Math.floor(layout.cell * 0.55);
			const queueTitleY = layout.panelY + Math.floor(layout.cell * 0.52);
			const queueItemsY = layout.panelY + Math.floor(layout.cell * 1.55);
			const holdTitleY = layout.panelY + Math.floor(layout.panelHeight * 0.58);
			const holdItemY = holdTitleY + Math.floor(layout.cell * 1.05);
			const statsTitleY = layout.panelY + Math.floor(layout.panelHeight * 0.73);
			const statsBodyY = statsTitleY + Math.floor(layout.cell * 1.0);
			const statusY = layout.panelY + Math.floor(layout.panelHeight * 0.91);

			this.drawPanelCard(
				graphics,
				layout.panelX,
				layout.panelY,
				layout.panelWidth,
				layout.panelHeight,
			);
			graphics.lineStyle(1, 0x24374f, 0.9);
			graphics.lineBetween(
				layout.panelX + panelInset,
				holdTitleY - Math.floor(layout.cell * 0.42),
				layout.panelX + layout.panelWidth - panelInset,
				holdTitleY - Math.floor(layout.cell * 0.42),
			);
			graphics.lineBetween(
				layout.panelX + panelInset,
				statsTitleY - Math.floor(layout.cell * 0.42),
				layout.panelX + layout.panelWidth - panelInset,
				statsTitleY - Math.floor(layout.cell * 0.42),
			);

			this.drawQueuePreview(
				graphics,
				layout.panelX + panelInset,
				queueItemsY,
				layout.previewCell,
			);
			this.drawHoldPreview(
				graphics,
				layout.panelX + panelInset,
				holdItemY,
				layout.previewCell,
			);

			const textStyle = {
				fontFamily: "ui-monospace, SFMono-Regular, monospace",
			};

			this.titleText
				.setPosition(
					layout.panelX + panelInset,
					queueTitleY,
				)
				.setText("NEXT")
				.setStyle({
					...textStyle,
					fontSize: `${layout.titleSize}px`,
					fontStyle: "bold",
					color: "#f8fafc",
				});

			this.nextText
				.setPosition(
					layout.panelX + panelInset,
					holdTitleY,
				)
				.setText("HOLD")
				.setStyle({
					...textStyle,
					fontSize: `${layout.labelSize}px`,
					color: "#cbd5e1",
				});

			this.holdText
				.setPosition(
					layout.panelX + panelInset,
					statsTitleY,
				)
				.setText("STATS")
				.setStyle({
					...textStyle,
					fontSize: `${layout.labelSize}px`,
					color: "#cbd5e1",
				});

			this.statsText
				.setPosition(
					layout.panelX + panelInset,
					statsBodyY,
				)
				.setText(
					`Score  ${this.score}\nLines  ${this.lines}\nLevel  ${this.level}`,
				)
				.setStyle({
					...textStyle,
					fontSize: `${layout.valueSize}px`,
					color: "#e2e8f0",
					lineSpacing: 8,
				});

			const statusLines = [
				bridge.autoplayRef.current ? "Autoplay" : "Manual",
				this.paused ? "Paused" : null,
				this.gameOver ? "Game Over" : null,
			].filter(Boolean);

			this.statusText
				.setPosition(
					layout.panelX + panelInset,
					statusY,
				)
				.setText(statusLines.join(" • "))
				.setStyle({
					...textStyle,
					fontSize: `${layout.statusSize}px`,
					color: bridge.autoplayRef.current ? "#86efac" : "#94a3b8",
				});

			if (this.gameOver || this.paused) {
				graphics.fillStyle(0x020617, 0.74);
				graphics.fillRoundedRect(
					layout.boardX,
					layout.boardY,
					layout.boardWidth,
					layout.boardHeight,
					Math.max(12, layout.cell * 0.4),
				);

				this.overlayText
					.setVisible(true)
					.setOrigin(0.5, 0.5)
					.setPosition(
						layout.boardX + layout.boardWidth / 2,
						layout.boardY + layout.boardHeight / 2,
					)
					.setText(
						this.gameOver
							? "GAME OVER\nUse Reset to start again"
							: "PAUSED\nUse the button above",
					)
					.setWordWrapWidth(layout.boardWidth - layout.cell * 2, true)
					.setStyle({
						...textStyle,
						fontSize: `${Math.max(16, Math.floor(layout.cell * 0.72))}px`,
						fontStyle: "bold",
						color: "#f8fafc",
						align: "center",
						lineSpacing: 12,
					});
			} else {
				this.overlayText.setVisible(false);
			}
		}

		private drawPanelCard(
			graphics: PhaserGraphics,
			x: number,
			y: number,
			width: number,
			height: number,
		) {
			graphics.fillStyle(0x121d2c, 0.98);
			graphics.fillRoundedRect(x, y, width, height, 14);
			graphics.lineStyle(2, 0x24374f, 1);
			graphics.strokeRoundedRect(x, y, width, height, 14);
		}

		private drawQueuePreview(
			graphics: PhaserGraphics,
			x: number,
			y: number,
			cell: number,
		) {
			let currentY = y;

			for (const key of this.nextQueue.slice(0, PREVIEW_QUEUE)) {
				this.drawMiniPiece(graphics, x, currentY, cell, key);
				currentY += Math.floor(cell * 2.3);
			}
		}

		private drawHoldPreview(
			graphics: PhaserGraphics,
			x: number,
			y: number,
			cell: number,
		) {
			if (!this.hold) return;
			this.drawMiniPiece(graphics, x, y, cell, this.hold);
		}

		private drawMiniPiece(
			graphics: PhaserGraphics,
			x: number,
			y: number,
			cell: number,
			key: PieceKey,
		) {
			const shape = SHAPE_ROTATIONS[key][0];
			const width = shape[0].length * cell;
			const height = shape.length * cell;
			const originX = x + Math.floor((Math.max(width, cell * 4) - width) / 2);
			const originY = y;

			for (let row = 0; row < shape.length; row += 1) {
				for (let column = 0; column < shape[0].length; column += 1) {
					if (!shape[row][column]) continue;

					this.drawBlock(
						graphics,
						originX + column * cell,
						originY + row * cell,
						cell,
						COLORS[key],
						1,
					);
				}
			}
		}

		private drawBlock(
			graphics: PhaserGraphics,
			x: number,
			y: number,
			size: number,
			color: number,
			alpha: number,
		) {
			const inset = Math.max(1, Math.floor(size * 0.08));
			const radius = Math.max(4, Math.floor(size * 0.18));

			graphics.fillStyle(color, alpha);
			graphics.fillRoundedRect(
				x + inset,
				y + inset,
				size - inset * 2,
				size - inset * 2,
				radius,
			);
			graphics.lineStyle(Math.max(1, size * 0.08), adjustColor(color, 52), alpha);
			graphics.lineBetween(x + inset, y + inset, x + size - inset, y + inset);
			graphics.lineBetween(x + inset, y + inset, x + inset, y + size - inset);
			graphics.lineStyle(Math.max(1, size * 0.08), adjustColor(color, -76), alpha);
			graphics.lineBetween(
				x + inset,
				y + size - inset,
				x + size - inset,
				y + size - inset,
			);
			graphics.lineBetween(
				x + size - inset,
				y + inset,
				x + size - inset,
				y + size - inset,
			);
		}
	}

	host.innerHTML = "";
	const initialSize = resolveHostSize(host);

	game = new PhaserLib.Game({
		type: PhaserLib.CANVAS,
		parent: host,
		width: initialSize.width,
		height: initialSize.height,
		scene: new TetrisScene() as PhaserScene,
		banner: false,
		disableContextMenu: true,
		audio: { noAudio: true },
		transparent: false,
		antialias: true,
		pixelArt: false,
		backgroundColor: "#05070d",
	});

	observer = new ResizeObserver(() => {
		if (!game) return;
		const size = resolveHostSize(host);
		game.scale.resize(size.width, size.height);
	});
	observer.observe(host);

	return () => {
		bridge.controlsRef.current = null;
		removeInputListeners?.();
		removeInputListeners = null;
		observer?.disconnect();
		observer = null;

		if (game) {
			game.destroy(true);
			game = null;
		}
	};
}

export default function Tetris() {
	const hostRef = useRef<HTMLDivElement | null>(null);
	const controlsRef = useRef<TetrisControls | null>(null);
	const autoplayRef = useRef(false);
	const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
	const [autoplay, setAutoplay] = useState(false);
	const [uiState, setUiState] = useState<UiState>(EMPTY_UI_STATE);

	const applyAutoplay = (next: boolean) => {
		autoplayRef.current = next;
		setAutoplay(next);
		setUiState((current) => ({ ...current, autoplay: next }));
	};

	useEffect(() => {
		autoplayRef.current = autoplay;
	}, [autoplay]);

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

				cleanup = mountTetris(hostRef.current, PhaserLib, {
					autoplayRef,
					controlsRef,
					onReady: () => {
						if (!cancelled) setStatus("ready");
					},
					onUiState: (next) => {
						if (!cancelled) setUiState(next);
					},
					setAutoplay: (next) => {
						if (!cancelled) applyAutoplay(next);
					},
				});
			} catch (error) {
				console.error("Unable to initialize Tetris:", error);
				if (!cancelled) setStatus("error");
			}
		})();

		return () => {
			cancelled = true;
			cleanup?.();
		};
	}, []);

	return (
		<div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-[radial-gradient(circle_at_top,#15304f_0%,#09111d_38%,#05070d_100%)] text-slate-100">
			<div className="border-b border-[#263244] bg-[#07101b]/90 backdrop-blur">
				<div className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
					<div className="mr-auto font-mono text-xs text-slate-400">
						WASD or arrow keys for play. Buttons handle the rest.
					</div>
					<div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] uppercase tracking-[0.2em] text-slate-400">
						<span>Score <span className="text-slate-100">{uiState.score}</span></span>
						<span>Lines <span className="text-slate-100">{uiState.lines}</span></span>
						<span>Level <span className="text-slate-100">{uiState.level}</span></span>
						<span className="text-slate-200">
							{status === "loading"
								? "Loading"
								: status === "error"
									? "Error"
									: uiState.gameOver
										? "Game Over"
										: uiState.paused
											? "Paused"
											: "Ready"}
						</span>
						<button
							type="button"
							onClick={() => controlsRef.current?.toggleAutoplay()}
							className={`rounded-md border px-3 py-1.5 font-mono text-xs font-semibold uppercase tracking-[0.16em] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition ${
								autoplay
									? "border-lime-200 bg-lime-300 text-slate-950"
									: "border-[#324765] bg-[#162336] text-slate-100 hover:bg-[#1d3047]"
							}`}
						>
							{autoplay ? "Autoplay On" : "Autoplay Off"}
						</button>
						<button
							type="button"
							onClick={() => controlsRef.current?.togglePause()}
							className="rounded-md border border-[#324765] bg-[#162336] px-3 py-1.5 font-mono text-xs font-semibold uppercase tracking-[0.16em] text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:bg-[#1d3047]"
						>
							{uiState.paused ? "Resume" : "Pause"}
						</button>
						<button
							type="button"
							onClick={() => controlsRef.current?.reset()}
							className="rounded-md border border-[#324765] bg-[#162336] px-3 py-1.5 font-mono text-xs font-semibold uppercase tracking-[0.16em] text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:bg-[#1d3047]"
						>
							Reset
						</button>
						<button
							type="button"
							onClick={() => controlsRef.current?.hardDrop()}
							className="rounded-md border border-[#324765] bg-[#162336] px-3 py-1.5 font-mono text-xs font-semibold uppercase tracking-[0.16em] text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:bg-[#1d3047]"
						>
							Hard Drop
						</button>
						<button
							type="button"
							onClick={() => controlsRef.current?.holdPiece()}
							className="rounded-md border border-[#324765] bg-[#162336] px-3 py-1.5 font-mono text-xs font-semibold uppercase tracking-[0.16em] text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:bg-[#1d3047]"
						>
							Hold
						</button>
					</div>
				</div>
				<div className="border-t border-[#1a2434] px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-slate-400 sm:px-5">
					Move with A / D or Left / Right. Rotate with W or Up. Soft drop with S or Down. Space hard drops.
				</div>
			</div>

			<div className="relative h-[82vh] min-h-[600px] flex-1 bg-transparent p-2 sm:p-3">
				<div
					ref={hostRef}
					className="absolute inset-2 overflow-hidden rounded-[24px] sm:inset-3"
				/>

				{status === "loading" ? (
					<div className="pointer-events-none absolute inset-x-0 bottom-6 mx-auto w-fit rounded-full border border-[#2b3b56] bg-[#08111d]/90 px-4 py-2 font-mono text-xs uppercase tracking-[0.24em] text-slate-300 backdrop-blur">
						Loading Tetris
					</div>
				) : null}

				{status === "error" ? (
					<div className="absolute inset-0 flex items-center justify-center bg-slate-950/90 px-6 text-center font-mono text-sm text-rose-300">
						Unable to initialize Phaser for Tetris.
					</div>
				) : null}
			</div>
		</div>
	);
}
