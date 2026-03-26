"use client";

import { useEffect, useRef, useState } from "react";

type PhaserModule = typeof import("phaser");
type PhaserGame = import("phaser").Game;
type PhaserScene = import("phaser").Scene;
type PhaserGraphics = import("phaser").GameObjects.Graphics;
type PhaserText = import("phaser").GameObjects.Text;
type PhaserContainer = import("phaser").GameObjects.Container;
type CursorKeys = import("phaser").Types.Input.Keyboard.CursorKeys;
type PhaserKey = import("phaser").Input.Keyboard.Key;

type SpeedMode = "Slow" | "Normal" | "Fast";
type Dir = 0 | 1 | 2 | 3;
type Grid = number[][];
type PackedBoard = bigint;

type MoveTransition = {
	fromRow: number;
	fromCol: number;
	toRow: number;
	toCol: number;
	exp: number;
	merged: boolean;
};

type SpawnTile = {
	row: number;
	col: number;
	exp: number;
};

type AnimationState = {
	startedAt: number;
	durationMs: number;
	moves: MoveTransition[];
	boardAfterSpawn: Grid;
	spawnTile: SpawnTile | null;
	mergeTargets: Array<{ row: number; col: number }>;
};

type UndoSnapshot = {
	grid: Grid;
	score: number;
	moves: number;
	won: boolean;
	over: boolean;
	bannerText: string;
	bannerUntil: number;
};

type RuntimeState = {
	grid: Grid;
	score: number;
	best: number;
	moves: number;
	won: boolean;
	over: boolean;
	autoplay: boolean;
	speed: SpeedMode;
	animation: AnimationState | null;
	undo: UndoSnapshot | null;
	mergePulse: number[][];
	bannerText: string;
	bannerUntil: number;
	nextAutoAt: number;
};

type UiState = {
	score: number;
	best: number;
	moves: number;
	maxTile: number;
	autoplay: boolean;
	speed: SpeedMode;
	status: "playing" | "won" | "over";
	canUndo: boolean;
};

type Game2048Controls = {
	newGame: () => void;
	undo: () => void;
	toggleAutoplay: () => void;
	cycleSpeed: () => void;
};

type Bridge = {
	controlsRef: React.MutableRefObject<Game2048Controls | null>;
	onReady: () => void;
	onUiState: (state: UiState) => void;
};

type TileView = {
	container: PhaserContainer;
	background: PhaserGraphics;
	label: PhaserText;
	cacheKey: string;
};

type SolverCacheEntry = {
	generation: number;
	depth: number;
	isPlayerTurn: boolean;
	value: number;
};

type SearchContext = {
	deadline: number;
	generation: number;
};

type PackedMoveResult = {
	board: PackedBoard;
	gained: number;
	moved: boolean;
};

type OrderedPackedMove = PackedMoveResult & {
	dir: Dir;
	heuristic: number;
};

type AutoplaySolver = {
	findBestMove: (grid: Grid, budgetMs: number) => Dir | null;
};

type KeyMap = {
	W: PhaserKey;
	A: PhaserKey;
	S: PhaserKey;
	D: PhaserKey;
	R: PhaserKey;
	Z: PhaserKey;
	SPACE: PhaserKey;
};

const BOARD_SIZE = 4;
const SPAWN_FOUR_CHANCE = 0.1;
const MAX_RENDER_TILES = 20;
const STORAGE_KEY = "phaser-2048-best";
const FONT_STACK = '"Azeret Mono", "JetBrains Mono", "SFMono-Regular", Consolas, monospace';
const EMPTY_UI_STATE: UiState = {
	score: 0,
	best: 0,
	moves: 0,
	maxTile: 0,
	autoplay: false,
	speed: "Normal",
	status: "playing",
	canUndo: false,
};

const SPEED_SETTINGS: Record<
	SpeedMode,
	{ animationMs: number; autoplayMs: number; searchBudgetMs: number }
> = {
	Slow: { animationMs: 220, autoplayMs: 260, searchBudgetMs: 96 },
	Normal: { animationMs: 140, autoplayMs: 125, searchBudgetMs: 44 },
	Fast: { animationMs: 90, autoplayMs: 56, searchBudgetMs: 20 },
};

const TILE_COLORS: Record<
	number,
	{ fill: number; stroke: number; sheen: number; text: string }
> = {
	2: { fill: 0x2a4365, stroke: 0x60a5fa, sheen: 0x93c5fd, text: "#eff6ff" },
	4: { fill: 0x234e52, stroke: 0x2dd4bf, sheen: 0x99f6e4, text: "#ecfeff" },
	8: { fill: 0x7c2d12, stroke: 0xfb923c, sheen: 0xfdba74, text: "#fff7ed" },
	16: { fill: 0x9a3412, stroke: 0xf97316, sheen: 0xfdba74, text: "#fff7ed" },
	32: { fill: 0x9f1239, stroke: 0xfb7185, sheen: 0xfda4af, text: "#fff1f2" },
	64: { fill: 0xbe123c, stroke: 0xfb7185, sheen: 0xfda4af, text: "#fff1f2" },
	128: { fill: 0x78350f, stroke: 0xfacc15, sheen: 0xfde68a, text: "#fefce8" },
	256: { fill: 0x854d0e, stroke: 0xfacc15, sheen: 0xfde68a, text: "#fefce8" },
	512: { fill: 0x365314, stroke: 0xa3e635, sheen: 0xd9f99d, text: "#f7fee7" },
	1024: { fill: 0x14532d, stroke: 0x4ade80, sheen: 0x86efac, text: "#f0fdf4" },
	2048: { fill: 0x4c1d95, stroke: 0xc084fc, sheen: 0xe9d5ff, text: "#faf5ff" },
};

const CELL_MASK = 0xfn;
const ROW_TABLE_SIZE = 1 << 16;
const ROW_MOVE_LEFT = new Uint16Array(ROW_TABLE_SIZE);
const ROW_MOVE_RIGHT = new Uint16Array(ROW_TABLE_SIZE);
const ROW_GAIN_LEFT = new Float64Array(ROW_TABLE_SIZE);
const ROW_GAIN_RIGHT = new Float64Array(ROW_TABLE_SIZE);
const ROW_EMPTY_COUNT = new Uint8Array(ROW_TABLE_SIZE);
const SOLVER_CACHE_LIMIT = 250_000;
const SNAKE_PATHS = [
	[0, 1, 2, 3, 7, 6, 5, 4, 8, 9, 10, 11, 15, 14, 13, 12],
	[3, 2, 1, 0, 4, 5, 6, 7, 11, 10, 9, 8, 12, 13, 14, 15],
	[12, 13, 14, 15, 11, 10, 9, 8, 4, 5, 6, 7, 3, 2, 1, 0],
	[15, 14, 13, 12, 8, 9, 10, 11, 7, 6, 5, 4, 0, 1, 2, 3],
] as const;

initializeSolverTables();

function emptyGrid(): Grid {
	return Array.from({ length: BOARD_SIZE }, () =>
		Array.from({ length: BOARD_SIZE }, () => 0),
	);
}

function cloneGrid(grid: Grid): Grid {
	return grid.map((row) => row.slice());
}

function valueFromExp(exp: number): number {
	return exp === 0 ? 0 : 2 ** exp;
}

function maxExp(grid: Grid): number {
	let best = 0;
	for (const row of grid) {
		for (const cell of row) {
			if (cell > best) best = cell;
		}
	}
	return best;
}

function maxTile(grid: Grid): number {
	return valueFromExp(maxExp(grid));
}

function getEmptyCells(grid: Grid): Array<{ row: number; col: number }> {
	const cells: Array<{ row: number; col: number }> = [];
	for (let row = 0; row < BOARD_SIZE; row += 1) {
		for (let col = 0; col < BOARD_SIZE; col += 1) {
			if (grid[row][col] === 0) cells.push({ row, col });
		}
	}
	return cells;
}

function hasMovesAvailable(grid: Grid): boolean {
	if (getEmptyCells(grid).length > 0) return true;

	for (let row = 0; row < BOARD_SIZE; row += 1) {
		for (let col = 0; col < BOARD_SIZE; col += 1) {
			const current = grid[row][col];
			if (
				(row + 1 < BOARD_SIZE && grid[row + 1][col] === current) ||
				(col + 1 < BOARD_SIZE && grid[row][col + 1] === current)
			) {
				return true;
			}
		}
	}

	return false;
}

function rotateLeft(grid: Grid): Grid {
	const rotated = emptyGrid();
	for (let row = 0; row < BOARD_SIZE; row += 1) {
		for (let col = 0; col < BOARD_SIZE; col += 1) {
			rotated[BOARD_SIZE - col - 1][row] = grid[row][col];
		}
	}
	return rotated;
}

function rotateTransition(transition: MoveTransition, turns: number): MoveTransition {
	let { fromRow, fromCol, toRow, toCol } = transition;
	for (let turn = 0; turn < turns; turn += 1) {
		const nextFromRow = BOARD_SIZE - fromCol - 1;
		const nextFromCol = fromRow;
		const nextToRow = BOARD_SIZE - toCol - 1;
		const nextToCol = toRow;
		fromRow = nextFromRow;
		fromCol = nextFromCol;
		toRow = nextToRow;
		toCol = nextToCol;
	}
	return { ...transition, fromRow, fromCol, toRow, toCol };
}

function applyMoveLeft(grid: Grid): {
	grid: Grid;
	moved: boolean;
	transitions: MoveTransition[];
	gained: number;
} {
	const nextGrid = emptyGrid();
	const transitions: MoveTransition[] = [];
	let moved = false;
	let gained = 0;

	for (let row = 0; row < BOARD_SIZE; row += 1) {
		const tiles: Array<{ exp: number; fromCol: number }> = [];
		for (let col = 0; col < BOARD_SIZE; col += 1) {
			const exp = grid[row][col];
			if (exp > 0) tiles.push({ exp, fromCol: col });
		}

		let writeCol = 0;
		for (let index = 0; index < tiles.length; index += 1) {
			const current = tiles[index];
			const next = tiles[index + 1];

			if (next && next.exp === current.exp) {
				const mergedExp = current.exp + 1;
				nextGrid[row][writeCol] = mergedExp;
				gained += valueFromExp(mergedExp);
				moved =
					moved || current.fromCol !== writeCol || next.fromCol !== writeCol;
				transitions.push({
					fromRow: row,
					fromCol: current.fromCol,
					toRow: row,
					toCol: writeCol,
					exp: current.exp,
					merged: true,
				});
				transitions.push({
					fromRow: row,
					fromCol: next.fromCol,
					toRow: row,
					toCol: writeCol,
					exp: next.exp,
					merged: true,
				});
				writeCol += 1;
				index += 1;
				continue;
			}

			nextGrid[row][writeCol] = current.exp;
			moved = moved || current.fromCol !== writeCol;
			transitions.push({
				fromRow: row,
				fromCol: current.fromCol,
				toRow: row,
				toCol: writeCol,
				exp: current.exp,
				merged: false,
			});
			writeCol += 1;
		}
	}

	return { grid: nextGrid, moved, transitions, gained };
}

function applyMove(grid: Grid, dir: Dir): {
	grid: Grid;
	moved: boolean;
	transitions: MoveTransition[];
	gained: number;
} {
	let rotated = cloneGrid(grid);
	for (let turn = 0; turn < dir; turn += 1) {
		rotated = rotateLeft(rotated);
	}

	const moved = applyMoveLeft(rotated);
	let restored = moved.grid;
	for (let turn = 0; turn < (4 - dir) % 4; turn += 1) {
		restored = rotateLeft(restored);
	}

	return {
		grid: restored,
		moved: moved.moved,
		gained: moved.gained,
		transitions: moved.transitions.map((transition) =>
			rotateTransition(transition, (4 - dir) % 4),
		),
	};
}

function addRandomTile(grid: Grid): SpawnTile | null {
	const emptyCells = getEmptyCells(grid);
	if (emptyCells.length === 0) return null;

	const cell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
	const exp = Math.random() < SPAWN_FOUR_CHANCE ? 2 : 1;
	grid[cell.row][cell.col] = exp;
	return { row: cell.row, col: cell.col, exp };
}

function legalMoves(grid: Grid): Dir[] {
	const moves: Dir[] = [];
	for (const dir of [0, 1, 2, 3] as const) {
		if (applyMove(grid, dir).moved) moves.push(dir);
	}
	return moves;
}

function reverseRow(row: number): number {
	return (
		((row & 0x000f) << 12) |
		((row & 0x00f0) << 4) |
		((row & 0x0f00) >> 4) |
		((row & 0xf000) >> 12)
	);
}

function initializeSolverTables(): void {
	for (let row = 0; row < ROW_TABLE_SIZE; row += 1) {
		const cells = [
			row & 0x000f,
			(row >> 4) & 0x000f,
			(row >> 8) & 0x000f,
			(row >> 12) & 0x000f,
		];
		ROW_EMPTY_COUNT[row] = cells.reduce(
			(total, cell) => total + (cell === 0 ? 1 : 0),
			0,
		);

		const compacted = cells.filter((cell) => cell !== 0);
		const nextRow = [0, 0, 0, 0];
		let gained = 0;
		let writeIndex = 0;

		for (let index = 0; index < compacted.length; index += 1) {
			const current = compacted[index];
			const next = compacted[index + 1];
			if (next !== undefined && next === current) {
				const merged = current + 1;
				nextRow[writeIndex] = merged;
				gained += valueFromExp(merged);
				writeIndex += 1;
				index += 1;
				continue;
			}
			nextRow[writeIndex] = current;
			writeIndex += 1;
		}

		const packedLeft =
			nextRow[0] |
			(nextRow[1] << 4) |
			(nextRow[2] << 8) |
			(nextRow[3] << 12);
		ROW_MOVE_LEFT[row] = packedLeft;
		ROW_GAIN_LEFT[row] = gained;

		const reversed = reverseRow(row);
		const reversedCompacted = [
			reversed & 0x000f,
			(reversed >> 4) & 0x000f,
			(reversed >> 8) & 0x000f,
			(reversed >> 12) & 0x000f,
		].filter((cell) => cell !== 0);
		const nextRight = [0, 0, 0, 0];
		let rightGain = 0;
		let rightIndex = 0;
		for (let index = 0; index < reversedCompacted.length; index += 1) {
			const current = reversedCompacted[index];
			const next = reversedCompacted[index + 1];
			if (next !== undefined && next === current) {
				const merged = current + 1;
				nextRight[rightIndex] = merged;
				rightGain += valueFromExp(merged);
				rightIndex += 1;
				index += 1;
				continue;
			}
			nextRight[rightIndex] = current;
			rightIndex += 1;
		}
		const packedRight = reverseRow(
			nextRight[0] |
				(nextRight[1] << 4) |
				(nextRight[2] << 8) |
				(nextRight[3] << 12),
		);
		ROW_MOVE_RIGHT[row] = packedRight;
		ROW_GAIN_RIGHT[row] = rightGain;
	}
}

function packGrid(grid: Grid): PackedBoard {
	let board = 0n;
	for (let row = 0; row < BOARD_SIZE; row += 1) {
		for (let col = 0; col < BOARD_SIZE; col += 1) {
			const shift = BigInt((row * BOARD_SIZE + col) * 4);
			board |= BigInt(grid[row][col]) << shift;
		}
	}
	return board;
}

function extractPackedRow(board: PackedBoard, rowIndex: number): number {
	return Number((board >> BigInt(rowIndex * 16)) & 0xffffn);
}

function transposePackedBoard(board: PackedBoard): PackedBoard {
	let transposed = 0n;
	for (let row = 0; row < BOARD_SIZE; row += 1) {
		for (let col = 0; col < BOARD_SIZE; col += 1) {
			const sourceShift = BigInt((row * BOARD_SIZE + col) * 4);
			const targetShift = BigInt((col * BOARD_SIZE + row) * 4);
			transposed |= ((board >> sourceShift) & CELL_MASK) << targetShift;
		}
	}
	return transposed;
}

function movePackedLeft(board: PackedBoard): PackedMoveResult {
	let nextBoard = 0n;
	let gained = 0;
	for (let row = 0; row < BOARD_SIZE; row += 1) {
		const sourceRow = extractPackedRow(board, row);
		nextBoard |= BigInt(ROW_MOVE_LEFT[sourceRow]) << BigInt(row * 16);
		gained += ROW_GAIN_LEFT[sourceRow];
	}
	return { board: nextBoard, gained, moved: nextBoard !== board };
}

function movePackedRight(board: PackedBoard): PackedMoveResult {
	let nextBoard = 0n;
	let gained = 0;
	for (let row = 0; row < BOARD_SIZE; row += 1) {
		const sourceRow = extractPackedRow(board, row);
		nextBoard |= BigInt(ROW_MOVE_RIGHT[sourceRow]) << BigInt(row * 16);
		gained += ROW_GAIN_RIGHT[sourceRow];
	}
	return { board: nextBoard, gained, moved: nextBoard !== board };
}

function movePacked(board: PackedBoard, dir: Dir): PackedMoveResult {
	if (dir === 0) return movePackedLeft(board);
	if (dir === 2) return movePackedRight(board);

	const transposed = transposePackedBoard(board);
	const shifted = dir === 1 ? movePackedLeft(transposed) : movePackedRight(transposed);
	return {
		board: transposePackedBoard(shifted.board),
		gained: shifted.gained,
		moved: shifted.moved,
	};
}

function countPackedEmpties(board: PackedBoard): number {
	return (
		ROW_EMPTY_COUNT[extractPackedRow(board, 0)] +
		ROW_EMPTY_COUNT[extractPackedRow(board, 1)] +
		ROW_EMPTY_COUNT[extractPackedRow(board, 2)] +
		ROW_EMPTY_COUNT[extractPackedRow(board, 3)]
	);
}

function hasPackedMoves(board: PackedBoard): boolean {
	if (countPackedEmpties(board) > 0) return true;
	return (
		movePackedLeft(board).moved ||
		movePackedRight(board).moved ||
		movePacked(board, 1).moved ||
		movePacked(board, 3).moved
	);
}

function evaluatePackedBoard(board: PackedBoard): number {
	const cells = new Array<number>(16);
	const values = new Array<number>(16);
	let emptyCount = 0;
	let highestExp = 0;

	for (let index = 0; index < 16; index += 1) {
		const exp = Number((board >> BigInt(index * 4)) & CELL_MASK);
		cells[index] = exp;
		values[index] = valueFromExp(exp);
		if (exp === 0) emptyCount += 1;
		if (exp > highestExp) highestExp = exp;
	}

	let smoothness = 0;
	for (let row = 0; row < BOARD_SIZE; row += 1) {
		for (let col = 0; col < BOARD_SIZE; col += 1) {
			const index = row * BOARD_SIZE + col;
			const value = cells[index];
			if (value === 0) continue;

			for (let nextCol = col + 1; nextCol < BOARD_SIZE; nextCol += 1) {
				const rightValue = cells[row * BOARD_SIZE + nextCol];
				if (rightValue !== 0) {
					smoothness -= Math.abs(value - rightValue);
					break;
				}
			}

			for (let nextRow = row + 1; nextRow < BOARD_SIZE; nextRow += 1) {
				const belowValue = cells[nextRow * BOARD_SIZE + col];
				if (belowValue !== 0) {
					smoothness -= Math.abs(value - belowValue);
					break;
				}
			}
		}
	}

	let monotonicity = 0;
	for (let row = 0; row < BOARD_SIZE; row += 1) {
		let descending = 0;
		let ascending = 0;
		for (let col = 0; col < BOARD_SIZE - 1; col += 1) {
			const current = cells[row * BOARD_SIZE + col];
			const next = cells[row * BOARD_SIZE + col + 1];
			if (current > next) descending += current - next;
			else if (next > current) ascending += next - current;
		}
		monotonicity += Math.max(descending, ascending);
	}

	for (let col = 0; col < BOARD_SIZE; col += 1) {
		let descending = 0;
		let ascending = 0;
		for (let row = 0; row < BOARD_SIZE - 1; row += 1) {
			const current = cells[row * BOARD_SIZE + col];
			const next = cells[(row + 1) * BOARD_SIZE + col];
			if (current > next) descending += current - next;
			else if (next > current) ascending += next - current;
		}
		monotonicity += Math.max(descending, ascending);
	}

	const cornerValues = [values[0], values[3], values[12], values[15]];
	let anchorIndex = 0;
	for (let index = 1; index < cornerValues.length; index += 1) {
		if (cornerValues[index] > cornerValues[anchorIndex]) {
			anchorIndex = index;
		}
	}
	const highestCornerValue = Math.max(...cornerValues);
	const highestInCorner = highestCornerValue === valueFromExp(highestExp);
	const snakePath = SNAKE_PATHS[anchorIndex];

	let gradientScore = 0;
	let snakeMonotonicity = 0;
	for (let index = 0; index < snakePath.length; index += 1) {
		const currentIndex = snakePath[index];
		gradientScore += values[currentIndex] * (snakePath.length - index);
		if (index + 1 < snakePath.length) {
			const nextIndex = snakePath[index + 1];
			if (cells[currentIndex] < cells[nextIndex]) {
				snakeMonotonicity -= cells[nextIndex] - cells[currentIndex];
			}
		}
	}

	return (
		smoothness * 0.45 +
		monotonicity * 5.4 +
		Math.log(emptyCount + 1) * 18 +
		highestExp * 3 +
		snakeMonotonicity * 16 +
		gradientScore * 0.0042 +
		(highestInCorner ? highestCornerValue * 0.55 : -valueFromExp(highestExp) * 0.45)
	);
}

function orderPackedMoves(board: PackedBoard): OrderedPackedMove[] {
	const moves: OrderedPackedMove[] = [];
	for (const dir of [0, 1, 2, 3] as const) {
		const result = movePacked(board, dir);
		if (!result.moved) continue;
		moves.push({
			...result,
			dir,
			heuristic:
				evaluatePackedBoard(result.board) +
				result.gained * 0.08 +
				countPackedEmpties(result.board) * 7,
		});
	}
	return moves.sort((left, right) => right.heuristic - left.heuristic);
}

function createAutoplaySolver(): AutoplaySolver {
	const cache = new Map<bigint, SolverCacheEntry>();
	let generation = 0;

	const makeCacheKey = (board: PackedBoard, isPlayerTurn: boolean) =>
		(board << 1n) | (isPlayerTurn ? 1n : 0n);

	const expectimax = (
		board: PackedBoard,
		depth: number,
		isPlayerTurn: boolean,
		probability: number,
		context: SearchContext,
	): number => {
		if (
			depth <= 0 ||
			probability < 0.00004 ||
			!hasPackedMoves(board) ||
			performance.now() >= context.deadline
		) {
			return evaluatePackedBoard(board);
		}

		const cacheKey = makeCacheKey(board, isPlayerTurn);
		const cached = cache.get(cacheKey);
		if (
			cached &&
			cached.generation === context.generation &&
			cached.isPlayerTurn === isPlayerTurn &&
			cached.depth >= depth
		) {
			return cached.value;
		}

		let resolved = evaluatePackedBoard(board);

		if (isPlayerTurn) {
			let best = -Infinity;
			const moves = orderPackedMoves(board);
			for (const move of moves) {
				if (performance.now() >= context.deadline) break;
				const value = expectimax(
					move.board,
					depth - 1,
					false,
					probability,
					context,
				);
				if (value > best) best = value;
			}
			if (best !== -Infinity) resolved = best;
		} else {
			const emptyIndices: number[] = [];
			for (let index = 0; index < 16; index += 1) {
				if (((board >> BigInt(index * 4)) & CELL_MASK) === 0n) {
					emptyIndices.push(index);
				}
			}

			if (emptyIndices.length > 0) {
				let total = 0;
				let completed = 0;
				const cellWeight = 1 / emptyIndices.length;
				for (const index of emptyIndices) {
					if (performance.now() >= context.deadline) break;
					const shift = BigInt(index * 4);
					const boardWithTwo = board | (1n << shift);
					const boardWithFour = board | (2n << shift);
					total +=
						cellWeight *
						(0.9 *
							expectimax(
								boardWithTwo,
								depth - 1,
								true,
								probability * 0.9 * cellWeight,
								context,
							) +
							0.1 *
								expectimax(
									boardWithFour,
									depth - 1,
									true,
									probability * 0.1 * cellWeight,
									context,
								));
					completed += 1;
				}
				if (completed === emptyIndices.length) resolved = total;
			}
		}

		cache.set(cacheKey, {
			generation: context.generation,
			depth,
			isPlayerTurn,
			value: resolved,
		});
		return resolved;
	};

	const startingDepthForBoard = (board: PackedBoard): number => {
		const emptyCount = countPackedEmpties(board);
		if (emptyCount >= 8) return 4;
		if (emptyCount >= 6) return 5;
		if (emptyCount >= 4) return 6;
		if (emptyCount >= 2) return 7;
		return 8;
	};

	return {
		findBestMove(grid: Grid, budgetMs: number): Dir | null {
			const board = packGrid(grid);
			const orderedMoves = orderPackedMoves(board);
			if (orderedMoves.length === 0) return null;

			generation += 1;
			if (cache.size > SOLVER_CACHE_LIMIT) cache.clear();

			const context: SearchContext = {
				deadline: performance.now() + budgetMs,
				generation,
			};

			let bestMove = orderedMoves[0]?.dir ?? null;
			let principalVariation = orderedMoves;
			let depth = startingDepthForBoard(board);

			while (performance.now() < context.deadline - 1 && depth <= 10) {
				let completedDepth = true;
				let depthBestMove = bestMove;
				let depthBestScore = -Infinity;
				const depthScores = new Map<Dir, number>();

				for (const move of principalVariation) {
					if (performance.now() >= context.deadline) {
						completedDepth = false;
						break;
					}
					const score =
						expectimax(move.board, depth - 1, false, 1, context) +
						move.gained * 0.04;
					depthScores.set(move.dir, score);
					if (score > depthBestScore) {
						depthBestScore = score;
						depthBestMove = move.dir;
					}
				}

				if (completedDepth && depthBestMove !== null) {
					bestMove = depthBestMove;
					principalVariation = [...principalVariation].sort(
						(left, right) =>
							(depthScores.get(right.dir) ?? right.heuristic) -
							(depthScores.get(left.dir) ?? left.heuristic),
					);
				}

				depth += 1;
			}

			return bestMove;
		},
	};
}

function readBestScore(): number {
	try {
		const raw = window.localStorage.getItem(STORAGE_KEY);
		if (!raw) return 0;
		const parsed = Number.parseInt(raw, 10);
		return Number.isFinite(parsed) ? parsed : 0;
	} catch {
		return 0;
	}
}

function persistBestScore(best: number): void {
	try {
		window.localStorage.setItem(STORAGE_KEY, String(best));
	} catch {}
}

function resolveHostSize(host: HTMLDivElement): { width: number; height: number } {
	const bounds = host.getBoundingClientRect();
	return {
		width: Math.max(320, Math.floor(bounds.width)),
		height: Math.max(420, Math.floor(bounds.height)),
	};
}

function easeOutCubic(value: number): number {
	return 1 - (1 - value) ** 3;
}

function easeOutBack(value: number): number {
	const c1 = 1.70158;
	const c3 = c1 + 1;
	return 1 + c3 * (value - 1) ** 3 + c1 * (value - 1) ** 2;
}

function mount2048(host: HTMLDivElement, PhaserLib: PhaserModule, bridge: Bridge) {
	let game: PhaserGame | null = null;
	let observer: ResizeObserver | null = null;
	let resizeRaf = 0;
	let graphics: PhaserGraphics | null = null;
	let statusText: PhaserText | null = null;
	let hintText: PhaserText | null = null;
	let bannerText: PhaserText | null = null;
	let tileViews: TileView[] = [];
	let sceneRef: PhaserScene | null = null;
	let cursors: CursorKeys | null = null;
	let keys: KeyMap | null = null;
	let pointerStart: { x: number; y: number } | null = null;
	const solver = createAutoplaySolver();

	const state: RuntimeState = {
		grid: emptyGrid(),
		score: 0,
		best: 0,
		moves: 0,
		won: false,
		over: false,
		autoplay: false,
		speed: "Normal",
		animation: null,
		undo: null,
		mergePulse: Array.from({ length: BOARD_SIZE }, () =>
			Array.from({ length: BOARD_SIZE }, () => 0),
		),
		bannerText: "",
		bannerUntil: 0,
		nextAutoAt: 0,
	};

	const syncUi = () => {
		const displayGrid = state.animation?.boardAfterSpawn ?? state.grid;
		bridge.onUiState({
			score: state.score,
			best: state.best,
			moves: state.moves,
			maxTile: maxTile(displayGrid),
			autoplay: state.autoplay,
			speed: state.speed,
			status: state.over ? "over" : state.won ? "won" : "playing",
			canUndo: Boolean(state.undo) && state.animation === null,
		});
	};

	const updateBest = () => {
		if (state.score <= state.best) return;
		state.best = state.score;
		persistBestScore(state.best);
	};

	const resetMergePulse = () => {
		for (let row = 0; row < BOARD_SIZE; row += 1) {
			for (let col = 0; col < BOARD_SIZE; col += 1) {
				state.mergePulse[row][col] = 0;
			}
		}
	};

	const beginNewGame = () => {
		state.grid = emptyGrid();
		state.score = 0;
		state.moves = 0;
		state.won = false;
		state.over = false;
		state.animation = null;
		state.undo = null;
		state.bannerText = "";
		state.bannerUntil = 0;
		state.nextAutoAt = performance.now();
		resetMergePulse();
		addRandomTile(state.grid);
		addRandomTile(state.grid);
		syncUi();
	};

	const cycleSpeed = () => {
		state.speed =
			state.speed === "Slow"
				? "Normal"
				: state.speed === "Normal"
					? "Fast"
					: "Slow";
		syncUi();
	};

	const toggleAutoplay = () => {
		state.autoplay = !state.autoplay;
		state.nextAutoAt = performance.now();
		syncUi();
	};

	const undo = () => {
		if (!state.undo || state.animation) return;
		state.grid = cloneGrid(state.undo.grid);
		state.score = state.undo.score;
		state.moves = state.undo.moves;
		state.won = state.undo.won;
		state.over = state.undo.over;
		state.bannerText = state.undo.bannerText;
		state.bannerUntil = state.undo.bannerUntil;
		state.undo = null;
		resetMergePulse();
		syncUi();
	};

	const finalizeAnimation = () => {
		if (!state.animation) return;
		for (const mergeTarget of state.animation.mergeTargets) {
			state.mergePulse[mergeTarget.row][mergeTarget.col] = 1;
		}
		state.grid = cloneGrid(state.animation.boardAfterSpawn);
		state.animation = null;
		syncUi();
	};

	const performMove = (dir: Dir) => {
		if (state.animation || state.over) return false;

		const before = cloneGrid(state.grid);
		const result = applyMove(state.grid, dir);
		if (!result.moved) return false;

		state.undo = {
			grid: before,
			score: state.score,
			moves: state.moves,
			won: state.won,
			over: state.over,
			bannerText: state.bannerText,
			bannerUntil: state.bannerUntil,
		};

		const boardAfterSpawn = cloneGrid(result.grid);
		const spawnTile = addRandomTile(boardAfterSpawn);

		state.score += result.gained;
		state.moves += 1;
		updateBest();

		if (!state.won && maxExp(boardAfterSpawn) >= 11) {
			state.won = true;
			state.bannerText = "2048 reached";
			state.bannerUntil = performance.now() + 2200;
		}

		state.over = !hasMovesAvailable(boardAfterSpawn);
		if (state.over) {
			state.bannerText = "No more moves";
			state.bannerUntil = performance.now() + 2400;
		}

		state.animation = {
			startedAt: performance.now(),
			durationMs: SPEED_SETTINGS[state.speed].animationMs,
			moves: result.transitions,
			boardAfterSpawn,
			spawnTile,
			mergeTargets: result.transitions
				.filter((transition) => transition.merged)
				.map((transition) => ({
					row: transition.toRow,
					col: transition.toCol,
				})),
		};

		syncUi();
		return true;
	};

	const createTileView = (scene: PhaserScene): TileView => {
		const background = scene.add.graphics();
		const label = scene.add.text(0, 0, "", {
			fontFamily: FONT_STACK,
			fontStyle: "700",
			color: "#f8fafc",
			align: "center",
		});
		label.setOrigin(0.5);
		const container = scene.add.container(0, 0, [background, label]);
		container.setDepth(20);
		container.setVisible(false);
		return { container, background, label, cacheKey: "" };
	};

	const updateTileView = (
		view: TileView,
		payload: {
			x: number;
			y: number;
			size: number;
			exp: number;
			scale: number;
			alpha: number;
		},
	) => {
		const value = valueFromExp(payload.exp);
		const colors =
			TILE_COLORS[value] ??
			({
				fill: 0x111827,
				stroke: 0xeab308,
				sheen: 0xfef08a,
				text: "#f8fafc",
			} as const);
		const digits = String(value).length;
		const fontSize =
			digits <= 2
				? payload.size * 0.36
				: digits === 3
					? payload.size * 0.3
					: digits === 4
						? payload.size * 0.25
						: payload.size * 0.21;
		const cacheKey = `${payload.size}:${payload.exp}`;

		if (view.cacheKey !== cacheKey) {
			const radius = Math.max(14, Math.floor(payload.size * 0.18));
			const splitY = payload.size * 0.5;
			const capHeight = splitY + radius * 0.7;
			view.background.clear();
			view.background.fillStyle(colors.fill, 1);
			view.background.fillRoundedRect(0, 0, payload.size, payload.size, radius);
			view.background.fillStyle(colors.sheen, 0.18);
			view.background.fillRoundedRect(0, 0, payload.size, capHeight, radius);
			view.background.fillStyle(colors.fill, 1);
			view.background.fillRect(0, splitY, payload.size, payload.size - splitY);
			view.background.lineStyle(
				Math.max(2, payload.size * 0.04),
				colors.stroke,
				0.95,
			);
			view.background.strokeRoundedRect(
				0,
				0,
				payload.size,
				payload.size,
				radius,
			);
			view.label.setPosition(payload.size / 2, payload.size / 2);
			view.cacheKey = cacheKey;
		}

		view.label.setText(String(value));
		view.label.setFontSize(`${fontSize}px`);
		view.label.setColor(colors.text);
		view.container.setPosition(payload.x, payload.y);
		view.container.setScale(payload.scale);
		view.container.setAlpha(payload.alpha);
		view.container.setVisible(true);
	};

	const renderScene = () => {
		if (!sceneRef || !graphics || !statusText || !hintText || !bannerText) return;

		const width = sceneRef.scale.width;
		const height = sceneRef.scale.height;
		const outerPad = Math.max(18, Math.floor(Math.min(width, height) * 0.045));
		const boardSize = Math.min(width - outerPad * 2, height - outerPad * 2);
		const boardX = Math.floor((width - boardSize) / 2);
		const boardY = Math.floor((height - boardSize) / 2);
		const gap = Math.max(8, Math.floor(boardSize * 0.022));
		const tileSize = Math.floor((boardSize - gap * (BOARD_SIZE + 1)) / BOARD_SIZE);
		const tileRadius = Math.max(14, Math.floor(tileSize * 0.18));

		graphics.clear();
		graphics.fillStyle(0x08101b, 1);
		graphics.fillRect(0, 0, width, height);
		graphics.fillStyle(0x0e1726, 1);
		graphics.fillRoundedRect(
			boardX - gap * 1.25,
			boardY - gap * 1.25,
			boardSize + gap * 2.5,
			boardSize + gap * 2.5,
			tileRadius,
		);
		graphics.lineStyle(2, 0x26364f, 0.95);
		graphics.strokeRoundedRect(
			boardX - gap * 1.25,
			boardY - gap * 1.25,
			boardSize + gap * 2.5,
			boardSize + gap * 2.5,
			tileRadius,
		);

		for (let row = 0; row < BOARD_SIZE; row += 1) {
			for (let col = 0; col < BOARD_SIZE; col += 1) {
				const cellX = boardX + gap + col * (tileSize + gap);
				const cellY = boardY + gap + row * (tileSize + gap);
				graphics.fillStyle(0x111b2d, 1);
				graphics.fillRoundedRect(cellX, cellY, tileSize, tileSize, tileRadius);
				graphics.lineStyle(2, 0x1e2a40, 1);
				graphics.strokeRoundedRect(cellX, cellY, tileSize, tileSize, tileRadius);
			}
		}

		const renders: Array<{
			x: number;
			y: number;
			exp: number;
			scale: number;
			alpha: number;
		}> = [];

		const animation = state.animation;
		if (animation) {
			const rawProgress = Math.min(
				1,
				(performance.now() - animation.startedAt) / animation.durationMs,
			);
			const progress = easeOutCubic(rawProgress);
			for (const move of animation.moves) {
				const startX = boardX + gap + move.fromCol * (tileSize + gap);
				const startY = boardY + gap + move.fromRow * (tileSize + gap);
				const endX = boardX + gap + move.toCol * (tileSize + gap);
				const endY = boardY + gap + move.toRow * (tileSize + gap);
				renders.push({
					x: startX + (endX - startX) * progress,
					y: startY + (endY - startY) * progress,
					exp: move.exp,
					scale: 1,
					alpha: 1,
				});
			}

			if (animation.spawnTile && rawProgress > 0.62) {
				const spawnProgress = Math.min(1, (rawProgress - 0.62) / 0.38);
				renders.push({
					x: boardX + gap + animation.spawnTile.col * (tileSize + gap),
					y: boardY + gap + animation.spawnTile.row * (tileSize + gap),
					exp: animation.spawnTile.exp,
					scale: 0.52 + 0.48 * easeOutBack(spawnProgress),
					alpha: 0.55 + 0.45 * spawnProgress,
				});
			}
		} else {
			for (let row = 0; row < BOARD_SIZE; row += 1) {
				for (let col = 0; col < BOARD_SIZE; col += 1) {
					const exp = state.grid[row][col];
					if (exp === 0) continue;
					const pulse = state.mergePulse[row][col];
					renders.push({
						x: boardX + gap + col * (tileSize + gap),
						y: boardY + gap + row * (tileSize + gap),
						exp,
						scale: pulse > 0 ? 1 + 0.1 * easeOutBack(pulse) : 1,
						alpha: 1,
					});
				}
			}
		}

		for (let index = 0; index < tileViews.length; index += 1) {
			const render = renders[index];
			const tileView = tileViews[index];
			if (!render) {
				tileView.container.setVisible(false);
				continue;
			}
			updateTileView(tileView, {
				x: render.x,
				y: render.y,
				size: tileSize,
				exp: render.exp,
				scale: render.scale,
				alpha: render.alpha,
			});
		}

		statusText.setVisible(false);
		hintText.setVisible(false);
		bannerText.setVisible(false);

		if (state.over && !state.animation) {
			graphics.fillStyle(0x020617, 0.66);
			graphics.fillRoundedRect(boardX, boardY, boardSize, boardSize, 24);
			statusText
				.setText("Game Over")
				.setFontSize(`${Math.max(28, boardSize * 0.085)}px`)
				.setPosition(width / 2, height / 2 - 12)
				.setVisible(true);
			hintText
				.setText("Press R or use New Game to restart")
				.setFontSize(`${Math.max(14, boardSize * 0.032)}px`)
				.setPosition(width / 2, height / 2 + 30)
				.setVisible(true);
		} else if (state.won && !state.over && !state.animation && state.bannerUntil > performance.now()) {
			statusText
				.setText("2048 reached")
				.setFontSize(`${Math.max(20, boardSize * 0.05)}px`)
				.setPosition(width / 2, boardY - gap * 1.8)
				.setVisible(true);
		}

		if (state.bannerUntil > performance.now()) {
			const alpha = Math.min(1, (state.bannerUntil - performance.now()) / 400);
			bannerText
				.setText(state.bannerText)
				.setAlpha(alpha)
				.setPosition(width / 2, height - Math.max(18, outerPad * 0.9))
				.setVisible(Boolean(state.bannerText));
		}
	};

	const handleDirectionalInput = () => {
		if (!sceneRef || !cursors || !keys) return;
		if (state.animation) return;

		if (
			PhaserLib.Input.Keyboard.JustDown(cursors.left) ||
			PhaserLib.Input.Keyboard.JustDown(keys.A)
		) {
			performMove(0);
		} else if (
			PhaserLib.Input.Keyboard.JustDown(cursors.up) ||
			PhaserLib.Input.Keyboard.JustDown(keys.W)
		) {
			performMove(1);
		} else if (
			PhaserLib.Input.Keyboard.JustDown(cursors.right) ||
			PhaserLib.Input.Keyboard.JustDown(keys.D)
		) {
			performMove(2);
		} else if (
			PhaserLib.Input.Keyboard.JustDown(cursors.down) ||
			PhaserLib.Input.Keyboard.JustDown(keys.S)
		) {
			performMove(3);
		}

		if (PhaserLib.Input.Keyboard.JustDown(keys.R)) {
			beginNewGame();
		}
		if (PhaserLib.Input.Keyboard.JustDown(keys.Z)) {
			undo();
		}
		if (PhaserLib.Input.Keyboard.JustDown(keys.SPACE)) {
			toggleAutoplay();
		}
	};

	const updateScene = () => {
		handleDirectionalInput();

		if (state.animation) {
			if (
				performance.now() - state.animation.startedAt >=
				state.animation.durationMs
			) {
				finalizeAnimation();
			}
		} else if (state.autoplay && !state.over && performance.now() >= state.nextAutoAt) {
			const emptyCount = getEmptyCells(state.grid).length;
			const pressureBudget = Math.max(0, 7 - emptyCount) * 8;
			const dir = solver.findBestMove(
				state.grid,
				SPEED_SETTINGS[state.speed].searchBudgetMs + pressureBudget,
			);
			if (dir !== null) performMove(dir);
			state.nextAutoAt = performance.now() + SPEED_SETTINGS[state.speed].autoplayMs;
		}

		for (let row = 0; row < BOARD_SIZE; row += 1) {
			for (let col = 0; col < BOARD_SIZE; col += 1) {
				if (state.mergePulse[row][col] > 0) {
					state.mergePulse[row][col] = Math.max(0, state.mergePulse[row][col] - 0.08);
				}
			}
		}

		renderScene();
	};

	bridge.controlsRef.current = {
		newGame: beginNewGame,
		undo,
		toggleAutoplay,
		cycleSpeed,
	};

	class Game2048Scene extends PhaserLib.Scene {
		constructor() {
			super("game-2048-phaser");
		}

		create() {
			sceneRef = this;
			graphics = this.add.graphics();
			graphics.setDepth(0);

			statusText = this.add.text(0, 0, "", {
				fontFamily: FONT_STACK,
				fontStyle: "700",
				color: "#f8fafc",
				align: "center",
			});
			statusText.setOrigin(0.5).setDepth(30).setStroke("#020617", 6);

			hintText = this.add.text(0, 0, "", {
				fontFamily: FONT_STACK,
				color: "#cbd5e1",
				align: "center",
			});
			hintText.setOrigin(0.5).setDepth(30).setStroke("#020617", 4);

			bannerText = this.add.text(0, 0, "", {
				fontFamily: FONT_STACK,
				fontStyle: "700",
				color: "#fde68a",
				align: "center",
			});
			bannerText.setOrigin(0.5).setDepth(30).setStroke("#020617", 4);

			tileViews = Array.from({ length: MAX_RENDER_TILES }, () => createTileView(this));

			const keyboard = this.input.keyboard;
			if (keyboard) {
				cursors = keyboard.createCursorKeys();
				keys = keyboard.addKeys("W,A,S,D,R,Z,SPACE") as KeyMap;
			}

			this.input.on(
				"pointerdown",
				(pointer: { x: number; y: number }) => {
					pointerStart = { x: pointer.x, y: pointer.y };
				},
				this,
			);

			this.input.on(
				"pointerup",
				(pointer: { x: number; y: number }) => {
					if (!pointerStart || state.animation) return;
					const deltaX = pointer.x - pointerStart.x;
					const deltaY = pointer.y - pointerStart.y;
					const absX = Math.abs(deltaX);
					const absY = Math.abs(deltaY);
					pointerStart = null;

					if (Math.max(absX, absY) < 22) return;
					if (absX > absY) {
						performMove(deltaX < 0 ? 0 : 2);
					} else {
						performMove(deltaY < 0 ? 1 : 3);
					}
				},
				this,
			);

			this.scale.on("resize", () => {
				renderScene();
			});

			state.best = readBestScore();
			beginNewGame();
			renderScene();
			bridge.onReady();
		}

		update() {
			updateScene();
		}
	}

	host.innerHTML = "";
	const initialSize = resolveHostSize(host);
	const resizeGame = () => {
		if (!game) return;
		const size = resolveHostSize(host);
		game.scale.resize(size.width, size.height);
	};
	const stabilizeResize = (remaining = 6) => {
		resizeGame();
		if (remaining <= 1) return;
		resizeRaf = window.requestAnimationFrame(() => {
			stabilizeResize(remaining - 1);
		});
	};

	game = new PhaserLib.Game({
		type: PhaserLib.CANVAS,
		parent: host,
		width: initialSize.width,
		height: initialSize.height,
		scene: new Game2048Scene() as PhaserScene,
		banner: false,
		disableContextMenu: true,
		audio: { noAudio: true },
		transparent: false,
		antialias: true,
		pixelArt: false,
		backgroundColor: "#08101b",
	});

	observer = new ResizeObserver(() => {
		resizeGame();
	});
	observer.observe(host);
	stabilizeResize();

	return () => {
		bridge.controlsRef.current = null;
		observer?.disconnect();
		observer = null;
		window.cancelAnimationFrame(resizeRaf);
		if (game) {
			game.destroy(true);
			game = null;
		}
		graphics = null;
		statusText = null;
		hintText = null;
		bannerText = null;
		tileViews = [];
		sceneRef = null;
		cursors = null;
		keys = null;
		pointerStart = null;
	};
}

export default function Game2048({ className = "" }: { className?: string }) {
	const hostRef = useRef<HTMLDivElement | null>(null);
	const controlsRef = useRef<Game2048Controls | null>(null);
	const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
	const [uiState, setUiState] = useState<UiState>(EMPTY_UI_STATE);

	useEffect(() => {
		const host = hostRef.current;
		if (!host) return;

		let cancelled = false;
		let cleanup: (() => void) | undefined;
		const waitForLayout = () =>
			new Promise<void>((resolve) => {
				let frames = 0;
				const tick = () => {
					frames += 1;
					if (frames >= 4) {
						resolve();
						return;
					}
					requestAnimationFrame(tick);
				};
				requestAnimationFrame(tick);
			});

		setStatus("loading");

		void (async () => {
			try {
				const phaserModule = await import("phaser");
				const PhaserLib = ("default" in phaserModule
					? phaserModule.default
					: phaserModule) as PhaserModule;
				await waitForLayout();

				if (cancelled || !hostRef.current) return;

				cleanup = mount2048(hostRef.current, PhaserLib, {
					controlsRef,
					onReady: () => {
						if (!cancelled) setStatus("ready");
					},
					onUiState: (nextState) => {
						if (!cancelled) setUiState(nextState);
					},
				});
			} catch (error) {
				console.error("Unable to initialize 2048:", error);
				if (!cancelled) setStatus("error");
			}
		})();

		return () => {
			cancelled = true;
			cleanup?.();
		};
	}, []);

	return (
		<div
			className={`flex h-full min-h-0 w-full flex-col overflow-hidden bg-[radial-gradient(circle_at_top,#173150_0%,#0b1422_35%,#050810_100%)] text-slate-100 ${className}`}
		>
			<div className="border-b border-[#233247] bg-[#07111d]/92 backdrop-blur">
				<div className="flex flex-wrap items-center gap-3 px-4 py-4 sm:px-5">
					<div className="mr-auto font-mono text-xs text-slate-400">
						Arrow keys or swipe to play. Space toggles autoplay, Z undoes.
					</div>
					<div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] uppercase tracking-[0.2em] text-slate-400">
						<span>Score <span className="text-slate-100">{uiState.score}</span></span>
						<span>Best <span className="text-slate-100">{uiState.best}</span></span>
						<span>Moves <span className="text-slate-100">{uiState.moves}</span></span>
						<span>Max <span className="text-slate-100">{uiState.maxTile || 2}</span></span>
						<span className="text-slate-200">
							{status === "loading"
								? "Loading"
								: status === "error"
									? "Error"
									: uiState.status === "over"
										? "Game Over"
										: uiState.status === "won"
											? "Won"
											: "Ready"}
						</span>
					</div>
				</div>

				<div className="flex flex-wrap gap-2 px-4 pb-4 sm:px-5">
					<button
						type="button"
						onClick={() => controlsRef.current?.newGame()}
						className="rounded-full bg-slate-100 px-4 py-2 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-slate-950 transition hover:bg-white"
					>
						New Game
					</button>
					<button
						type="button"
						onClick={() => controlsRef.current?.undo()}
						disabled={!uiState.canUndo}
						className="rounded-full border border-[#223048] bg-[#0b1320] px-4 py-2 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-slate-100 transition hover:border-[#2d4262] hover:bg-[#10192a] disabled:cursor-not-allowed disabled:opacity-45"
					>
						Undo
					</button>
					<button
						type="button"
						onClick={() => controlsRef.current?.toggleAutoplay()}
						className="rounded-full border border-[#223048] bg-[#0b1320] px-4 py-2 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-slate-100 transition hover:border-[#2d4262] hover:bg-[#10192a]"
					>
						Autoplay {uiState.autoplay ? "On" : "Off"}
					</button>
					<button
						type="button"
						onClick={() => controlsRef.current?.cycleSpeed()}
						className="rounded-full border border-[#223048] bg-[#0b1320] px-4 py-2 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-slate-100 transition hover:border-[#2d4262] hover:bg-[#10192a]"
					>
						Speed {uiState.speed}
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
						Unable to load the 2048 scene.
					</div>
				)}
			</div>
		</div>
	);
}
