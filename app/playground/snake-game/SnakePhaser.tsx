"use client";

import { useEffect, useRef, useState } from "react";

type Point = { x: number; y: number };
type Dir = { x: number; y: number };

type PhaserModule = typeof import("phaser");
type PhaserGame = import("phaser").Game;
type PhaserScene = import("phaser").Scene;
type PhaserCanvasRenderer = import("phaser").Renderer.Canvas.CanvasRenderer;

type MountOptions = {
	boardSize: number;
	cellPx: number;
	speedRef: React.MutableRefObject<number>;
	pausedRef: React.MutableRefObject<boolean>;
	autoRef: React.MutableRefObject<boolean>;
	arrowsRef: React.MutableRefObject<boolean>;
	overRef: React.MutableRefObject<boolean>;
	winRef: React.MutableRefObject<boolean>;
	resetBus: React.MutableRefObject<boolean>;
	justReset: React.MutableRefObject<boolean>;
	scoreR: React.MutableRefObject<number>;
	stepsR: React.MutableRefObject<number>;
	lastUiSync: React.MutableRefObject<number>;
	setPaused: React.Dispatch<React.SetStateAction<boolean>>;
	setScore: React.Dispatch<React.SetStateAction<number>>;
	setSteps: React.Dispatch<React.SetStateAction<number>>;
	setGameOver: React.Dispatch<React.SetStateAction<boolean>>;
	setWin: React.Dispatch<React.SetStateAction<boolean>>;
};

const DIRS = {
	UP: { x: 0, y: -1 },
	DOWN: { x: 0, y: 1 },
	LEFT: { x: -1, y: 0 },
	RIGHT: { x: 1, y: 0 },
} as const;

function equal(a: Point, b: Point) {
	return a.x === b.x && a.y === b.y;
}

function isOpposite(a: Dir, b: Dir) {
	return a.x === -b.x && a.y === -b.y;
}

function buildDirectionMatrix(n: number): Dir[][][] {
	const matrix: Dir[][][] = Array.from({ length: n }, () =>
		Array.from({ length: n }, () => [] as Dir[]),
	);

	for (let y = 0; y < n; y++) {
		if (y === 0) matrix[y][0] = [DIRS.DOWN];
		else if (y === n - 1) matrix[y][0] = [DIRS.RIGHT];
		else if (y % 2 === 1) matrix[y][0] = [DIRS.RIGHT, DIRS.DOWN];
		else matrix[y][0] = [DIRS.DOWN];
	}

	for (let x = 1; x <= n - 2; x++) {
		if (x % 2 === 1) {
			for (let y = 0; y < n; y++) {
				if (y === 0) matrix[y][x] = [DIRS.LEFT];
				else if (y % 2 === 1) matrix[y][x] = [DIRS.UP, DIRS.RIGHT];
				else matrix[y][x] = [DIRS.UP, DIRS.LEFT];
			}
		} else {
			for (let y = 0; y < n; y++) {
				if (y === 0) matrix[y][x] = [DIRS.LEFT, DIRS.DOWN];
				else if (y === n - 1) matrix[y][x] = [DIRS.RIGHT];
				else if (y % 2 === 1) matrix[y][x] = [DIRS.RIGHT, DIRS.DOWN];
				else matrix[y][x] = [DIRS.LEFT, DIRS.DOWN];
			}
		}
	}

	for (let y = 0; y < n; y++) {
		if (y === 0) matrix[y][n - 1] = [DIRS.LEFT];
		else if (y === n - 1) matrix[y][n - 1] = [DIRS.UP];
		else if (y % 2 === 0) matrix[y][n - 1] = [DIRS.UP, DIRS.LEFT];
		else matrix[y][n - 1] = [DIRS.UP];
	}

	return matrix;
}

function drawRoundedRect(
	context: CanvasRenderingContext2D,
	x: number,
	y: number,
	width: number,
	height: number,
	radius: number,
): void {
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

function createAppleSprite(cell: number): HTMLCanvasElement {
	const canvas = document.createElement("canvas");
	canvas.width = cell;
	canvas.height = cell;

	const context = canvas.getContext("2d");
	if (!context) {
		throw new Error("Unable to create apple sprite canvas.");
	}

	context.imageSmoothingEnabled = false;

	const art: (string | null)[][] = [
		[null, "#2EAD53", null, null, null],
		[null, "#BA222E", "#2EAD53", "#BA222E", null],
		["#821C29", "#BA222E", "#BA222E", "#BA222E", "#BA222E"],
		["#821C29", "#BA222E", "#BA222E", "#BA222E", "#BA222E"],
		["#821C29", "#821C29", "#BA222E", "#BA222E", "#BA222E"],
		[null, "#821C29", "#821C29", "#821C29", null],
	];

	const rows = art.length;
	const cols = art[0].length;
	const tileWidth = Math.floor(cell / cols);
	const tileHeight = Math.floor(cell / rows);
	const extraWidth = cell - tileWidth * cols;
	const extraHeight = cell - tileHeight * rows;

	for (let row = 0, offsetY = 0; row < rows; row++) {
		const height = tileHeight + (row < extraHeight ? 1 : 0);

		for (let col = 0, offsetX = 0; col < cols; col++) {
			const width = tileWidth + (col < extraWidth ? 1 : 0);
			const color = art[row][col];

			if (color) {
				context.fillStyle = color;
				context.fillRect(offsetX, offsetY, width, height);
			}

			offsetX += width;
		}

		offsetY += height;
	}

	return canvas;
}

function mountSnakeGame(
	host: HTMLDivElement,
	PhaserLib: PhaserModule,
	{
		boardSize,
		cellPx,
		speedRef,
		pausedRef,
		autoRef,
		arrowsRef,
		overRef,
		winRef,
		resetBus,
		justReset,
		scoreR,
		stepsR,
		lastUiSync,
		setPaused,
		setScore,
		setSteps,
		setGameOver,
		setWin,
	}: MountOptions,
): () => void {
	const N = boardSize;
	const CELL = cellPx;
	const W = N * CELL;
	const H = N * CELL;
	const SIZE = N * N;
	const NOT_VIS: Point | null = null;
	const dirmat = buildDirectionMatrix(N);
	const appleSprite = createAppleSprite(CELL);

	const IDX = (x: number, y: number) => y * N + x;
	const toPoint = (index: number): Point => ({ x: index % N, y: (index / N) | 0 });

	const adj: Int16Array[] = Array.from({ length: SIZE }, () =>
		new Int16Array(4).fill(-1),
	);
	const nbr4: Int16Array[] = Array.from({ length: SIZE }, () =>
		new Int16Array(4).fill(-1),
	);

	for (let y = 0; y < N; y++) {
		for (let x = 0; x < N; x++) {
			const index = IDX(x, y);
			const dirs = dirmat[y][x];
			let allowedCount = 0;

			for (const dir of dirs) {
				const nextX = x + dir.x;
				const nextY = y + dir.y;

				if (nextX >= 0 && nextY >= 0 && nextX < N && nextY < N) {
					adj[index][allowedCount++] = IDX(nextX, nextY);
				}
			}

			let neighborCount = 0;
			const cardinalDirs: [number, number][] = [
				[1, 0],
				[-1, 0],
				[0, 1],
				[0, -1],
			];

			for (const [dx, dy] of cardinalDirs) {
				const nextX = x + dx;
				const nextY = y + dy;

				if (nextX >= 0 && nextY >= 0 && nextX < N && nextY < N) {
					nbr4[index][neighborCount++] = IDX(nextX, nextY);
				}
			}
		}
	}

	let game: PhaserGame | null = null;
	let renderer: PhaserCanvasRenderer | null = null;
	let snake: Point[] = [];
	let dir: Dir = Object.values(DIRS)[Math.floor(Math.random() * 4)];
	let queued: Dir | null = null;
	let apple: Point = { x: 0, y: 0 };
	let movesPerSecond = speedRef.current;
	let stepMs = 1000 / movesPerSecond;
	let accumulator = 0;
	let lastFrameAt = performance.now();
	let lastCell: Point | null = null;
	let insideStreak = 0;

	function neighborsAllowed(point: Point): Point[] {
		const out: Point[] = [];
		const dirs = dirmat[point.y][point.x];

		for (let i = 0; i < dirs.length; i++) {
			const nextX = point.x + dirs[i].x;
			const nextY = point.y + dirs[i].y;

			if (nextX >= 0 && nextY >= 0 && nextX < N && nextY < N) {
				out.push({ x: nextX, y: nextY });
			}
		}

		return out;
	}

	function blockedGridCurrent(): Uint8Array {
		const blocked = new Uint8Array(SIZE);

		for (let i = 0; i < snake.length; i++) {
			blocked[IDX(snake[i].x, snake[i].y)] = 1;
		}

		return blocked;
	}

	function wouldCollide(nextHead: Point, willGrow: boolean) {
		const limit = snake.length - (willGrow ? 0 : 1);

		for (let i = 1; i < limit; i++) {
			if (equal(snake[i], nextHead)) {
				return true;
			}
		}

		return false;
	}

	function bfs(): Point[] | null {
		if (apple.x < 0 || apple.y < 0) return null;

		const startIndex = IDX(snake[0].x, snake[0].y);
		const goalIndex = IDX(apple.x, apple.y);

		if (goalIndex < 0 || goalIndex >= SIZE) return null;
		if (startIndex === goalIndex) return [snake[0]];

		const blocked = new Uint8Array(SIZE);
		for (let i = 0; i < snake.length - 1; i++) {
			blocked[IDX(snake[i].x, snake[i].y)] = 1;
		}

		const visited = new Uint8Array(SIZE);
		const came = new Int32Array(SIZE);
		came.fill(-1);

		const queue = new Int32Array(SIZE);
		let head = 0;
		let tail = 0;
		queue[tail++] = startIndex;
		visited[startIndex] = 1;

		while (head < tail) {
			const current = queue[head++];
			const neighbors = adj[current];

			for (let i = 0; i < 4; i++) {
				const neighbor = neighbors[i];

				if (neighbor === -1 || visited[neighbor] || blocked[neighbor]) continue;

				visited[neighbor] = 1;
				came[neighbor] = current;

				if (neighbor === goalIndex) {
					head = tail;
					break;
				}

				queue[tail++] = neighbor;
			}
		}

		if (came[goalIndex] === -1) return null;

		const path: number[] = [];
		for (let current = goalIndex; current !== -1; current = came[current]) {
			path.push(current);
			if (path.length > SIZE) return null;
		}

		path.reverse();
		return path.map(toPoint);
	}

	function dirEq(a: Dir, b: Dir) {
		return a.x === b.x && a.y === b.y;
	}

	function rightOf(direction: Dir): Dir {
		if (direction.x === 1 && direction.y === 0) return { x: 0, y: 1 };
		if (direction.x === -1 && direction.y === 0) return { x: 0, y: -1 };
		if (direction.x === 0 && direction.y === 1) return { x: -1, y: 0 };
		return { x: 1, y: 0 };
	}

	function cellMoveInside(point: Point): Dir {
		if ((point.y & 1) === 0) return (point.x & 1) === 0 ? DIRS.DOWN : DIRS.LEFT;
		return (point.x & 1) === 0 ? DIRS.RIGHT : DIRS.UP;
	}

	function cellMoveOutside(point: Point): Dir {
		if ((point.y & 1) === 0) return (point.x & 1) === 0 ? DIRS.LEFT : DIRS.UP;
		return (point.x & 1) === 0 ? DIRS.DOWN : DIRS.RIGHT;
	}

	function isCellMove(point: Point, direction: Dir) {
		const inside = cellMoveInside(point);
		const outside = cellMoveOutside(point);
		return dirEq(direction, inside) || dirEq(direction, outside);
	}

	function cellOf(point: Point) {
		return { x: point.x >> 1, y: point.y >> 1 };
	}

	function buildCellTreeParentsFromSnake() {
		const cellWidth = N >> 1;
		const cellHeight = N >> 1;
		const parents: (Point | null)[][] = Array.from({ length: cellHeight }, () =>
			Array(cellWidth).fill(NOT_VIS),
		);
		let parent: Point = { x: -2, y: -2 };

		for (let i = snake.length - 1; i >= 0; --i) {
			const cell = cellOf(snake[i]);
			if (parents[cell.y][cell.x] === NOT_VIS) parents[cell.y][cell.x] = parent;
			parent = cell;
		}

		return parents;
	}

	function canMoveInCellTree(
		parents: (Point | null)[][],
		from: Point,
		to: Point,
		direction: Dir,
		blocked: Uint8Array,
	) {
		if (!isCellMove(from, direction)) return false;
		if (to.x < 0 || to.y < 0 || to.x >= N || to.y >= N) return false;
		if (blocked[IDX(to.x, to.y)]) return false;

		const fromCell = cellOf(from);
		const toCell = cellOf(to);

		if (toCell.x === fromCell.x && toCell.y === fromCell.y) return true;
		if (parents[toCell.y][toCell.x] === NOT_VIS) return true;

		const parent = parents[fromCell.y][fromCell.x];
		return !!parent && parent.x === toCell.x && parent.y === toCell.y;
	}

	function normDir(from: Point, to: Point): Dir {
		return { x: Math.sign(to.x - from.x), y: Math.sign(to.y - from.y) };
	}

	function aStarWithPenalties(
		start: Point,
		goal: Point,
		parents: (Point | null)[][],
		blocked: Uint8Array,
	) {
		const INF = 1e15;
		const STEP = 1000;
		const dist = new Float64Array(SIZE).fill(INF);
		const came = new Int32Array(SIZE).fill(-1);
		const open = new Uint8Array(SIZE);
		const startIndex = IDX(start.x, start.y);
		const goalIndex = IDX(goal.x, goal.y);

		const heuristic = (point: Point) =>
			(Math.abs(point.x - goal.x) + Math.abs(point.y - goal.y)) * STEP;

		dist[startIndex] = 0;
		open[startIndex] = 1;

		const getMinF = () => {
			let best = -1;
			let bestScore = INF;

			for (let i = 0; i < SIZE; i++) {
				if (!open[i]) continue;

				const point = toPoint(i);
				const score = dist[i] + heuristic(point);

				if (score < bestScore) {
					bestScore = score;
					best = i;
				}
			}

			return best;
		};

		const penaltyCfg = {
			same: 50,
			parent: 5,
			nuovo: 0,
			edgeIn: 4,
			edgeOut: 2,
			wallIn: 6,
			wallOut: 3,
			openIn: 20,
			openOut: 2,
		};

		while (true) {
			const currentIndex = getMinF();
			if (currentIndex === -1) break;

			open[currentIndex] = 0;
			if (currentIndex === goalIndex) break;

			const current = toPoint(currentIndex);
			const candidates: Dir[] = [DIRS.RIGHT, DIRS.LEFT, DIRS.DOWN, DIRS.UP];

			for (const candidate of candidates) {
				const next = { x: current.x + candidate.x, y: current.y + candidate.y };
				if (!canMoveInCellTree(parents, current, next, candidate, blocked)) {
					continue;
				}

				const currentCell = cellOf(current);
				const nextCell = cellOf(next);
				const parent = parents[currentCell.y][currentCell.x];
				const toParent =
					!!parent && parent.x === nextCell.x && parent.y === nextCell.y;
				const toSame = currentCell.x === nextCell.x && currentCell.y === nextCell.y;

				const right = rightOf(candidate);
				const rightNeighbor = { x: next.x + right.x, y: next.y + right.y };
				const hugsEdge =
					rightNeighbor.x < 0 ||
					rightNeighbor.y < 0 ||
					rightNeighbor.x >= N ||
					rightNeighbor.y >= N;
				const hugsWall = !hugsEdge && blocked[IDX(rightNeighbor.x, rightNeighbor.y)];

				let cost =
					STEP +
					(toParent
						? penaltyCfg.parent
						: toSame
							? penaltyCfg.same
							: penaltyCfg.nuovo) +
					(toSame
						? hugsEdge
							? penaltyCfg.edgeIn
							: hugsWall
								? penaltyCfg.wallIn
								: penaltyCfg.openIn
						: hugsEdge
							? penaltyCfg.edgeOut
							: hugsWall
								? penaltyCfg.wallOut
								: penaltyCfg.openOut);

				if (current.x === start.x && current.y === start.y) {
					cost += candidate.x === dir.x && candidate.y === dir.y ? -5 : 5;
				}

				const nextIndex = IDX(next.x, next.y);
				const nextDistance = dist[currentIndex] + cost;

				if (nextDistance < dist[nextIndex]) {
					dist[nextIndex] = nextDistance;
					came[nextIndex] = currentIndex;
					open[nextIndex] = 1;
				}
			}
		}

		if (came[goalIndex] === -1) {
			return { path: null as Point[] | null, dist, came };
		}

		const path: Point[] = [];
		for (let current = goalIndex; current !== startIndex; current = came[current]) {
			if (current === -1) return { path: null as Point[] | null, dist, came };
			path.push(toPoint(current));
		}

		path.reverse();
		return { path, dist, came };
	}

	function firstStepToward(came: Int32Array, startIndex: number, targetIndex: number) {
		let current = targetIndex;
		let previous = came[current];

		if (current === -1) return null;

		while (previous !== startIndex && previous !== -1) {
			current = previous;
			previous = came[current];
		}

		if (previous !== startIndex) return null;
		return toPoint(current);
	}

	function simulateAfterMoves(path: Point[]) {
		const grid = blockedGridCurrent().slice();
		const snakeAfter = snake.map((segment) => ({ x: segment.x, y: segment.y }));

		for (let i = 0; i < path.length; i++) {
			const point = path[i];
			grid[IDX(point.x, point.y)] = 1;
			snakeAfter.unshift({ x: point.x, y: point.y });

			if (!equal(point, apple)) {
				const tail = snakeAfter.pop();
				if (tail) {
					grid[IDX(tail.x, tail.y)] = 0;
				}
			}
		}

		return { grid, snakeAfter, headAfter: snakeAfter[0] };
	}

	function floodReachable(
		parents: (Point | null)[][],
		grid: Uint8Array,
		start: Point,
	) {
		const seen = new Uint8Array(SIZE);
		const queue = new Int32Array(SIZE);
		let head = 0;
		let tail = 0;
		const startIndex = IDX(start.x, start.y);

		queue[tail++] = startIndex;
		seen[startIndex] = 1;

		const pushIfOk = (from: Point, direction: Dir) => {
			const to = { x: from.x + direction.x, y: from.y + direction.y };

			if (to.x < 0 || to.y < 0 || to.x >= N || to.y >= N) return;
			if (grid[IDX(to.x, to.y)]) return;
			if (!isCellMove(from, direction)) return;

			const fromCell = cellOf(from);
			const toCell = cellOf(to);
			const sameCell = fromCell.x === toCell.x && fromCell.y === toCell.y;
			const unvisited = parents[toCell.y][toCell.x] === NOT_VIS;
			const parent = parents[fromCell.y][fromCell.x];
			const parentLink =
				!!parent && parent.x === toCell.x && parent.y === toCell.y;

			if (!(sameCell || unvisited || parentLink)) return;

			const index = IDX(to.x, to.y);
			if (seen[index]) return;

			seen[index] = 1;
			queue[tail++] = index;
		};

		while (head < tail) {
			const currentIndex = queue[head++];
			const current = toPoint(currentIndex);

			pushIfOk(current, DIRS.RIGHT);
			pushIfOk(current, DIRS.LEFT);
			pushIfOk(current, DIRS.DOWN);
			pushIfOk(current, DIRS.UP);
		}

		return seen;
	}

	function placeApple() {
		const occupied = new Set(snake.map((segment) => `${segment.x},${segment.y}`));
		const free: Point[] = [];

		for (let y = 0; y < N; y++) {
			for (let x = 0; x < N; x++) {
				if (!occupied.has(`${x},${y}`)) free.push({ x, y });
			}
		}

		if (free.length === 0) {
			setWin(true);
			setGameOver(true);
			setPaused(true);
			apple = { x: -1, y: -1 };
			return;
		}

		apple = free[Math.floor(Math.random() * free.length)];
	}

	function pickInitialDir(): Dir {
		const head = snake[0];
		const path = bfs();

		if (path && path.length >= 2) {
			const next = path[1];
			const dx = Math.sign(next.x - head.x);
			const dy = Math.sign(next.y - head.y);

			return dx === 1
				? DIRS.RIGHT
				: dx === -1
					? DIRS.LEFT
					: dy === 1
						? DIRS.DOWN
						: DIRS.UP;
		}

		const neighbors = neighborsAllowed(head);
		if (neighbors.length) {
			const next = neighbors[0];
			return {
				x: Math.sign(next.x - head.x),
				y: Math.sign(next.y - head.y),
			};
		}

		const candidates: Dir[] = [DIRS.RIGHT, DIRS.LEFT, DIRS.DOWN, DIRS.UP];
		for (const candidate of candidates) {
			const nextX = head.x + candidate.x;
			const nextY = head.y + candidate.y;
			if (nextX >= 0 && nextY >= 0 && nextX < N && nextY < N) return candidate;
		}

		return DIRS.RIGHT;
	}

	function reset() {
		snake = [
			{
				x: Math.floor(Math.random() * Math.max(4, N - 10)) + 3,
				y: Math.floor(Math.random() * Math.max(4, N - 10)) + 3,
			},
		];
		queued = null;
		lastCell = null;
		insideStreak = 0;
		placeApple();
		dir = pickInitialDir();
		accumulator = 0;
		lastUiSync.current = 0;
		setPaused(false);
		setScore(0);
		scoreR.current = 0;
		setSteps(0);
		stepsR.current = 0;
		setGameOver(false);
		setWin(false);
		justReset.current = true;
	}

	function autoDir(): Dir | null {
		const head = snake[0];
		if (apple.x < 0 || apple.y < 0) return null;

		const parents = buildCellTreeParentsFromSnake();
		const blocked = blockedGridCurrent();
		const { path, dist, came } = aStarWithPenalties(head, apple, parents, blocked);

		if (!path || path.length === 0) {
			const fallbackPath = bfs();
			if (fallbackPath && fallbackPath.length >= 2) {
				return normDir(head, fallbackPath[1]);
			}

			const neighbors = neighborsAllowed(head);
			const occupied = new Set(snake.map((segment) => `${segment.x},${segment.y}`));

			for (let i = 0; i < neighbors.length; i++) {
				if (!occupied.has(`${neighbors[i].x},${neighbors[i].y}`)) {
					return normDir(head, neighbors[i]);
				}
			}

			return null;
		}

		if (stepsR.current > 110) {
			const after = simulateAfterMoves(path);
			const parentsAfter = (() => {
				const cellWidth = N >> 1;
				const cellHeight = N >> 1;
				const nextParents: (Point | null)[][] = Array.from(
					{ length: cellHeight },
					() => Array(cellWidth).fill(NOT_VIS),
				);
				let parent: Point = { x: -2, y: -2 };

				for (let i = after.snakeAfter.length - 1; i >= 0; --i) {
					const cell = cellOf(after.snakeAfter[i]);
					if (nextParents[cell.y][cell.x] === NOT_VIS) {
						nextParents[cell.y][cell.x] = parent;
					}
					parent = cell;
				}

				return nextParents;
			})();

			const reach = floodReachable(parentsAfter, after.grid, after.headAfter);
			let bestIndex = -1;
			let bestDistance = Infinity;

			for (let i = 0; i < SIZE; i++) {
				if (blocked[i] || reach[i]) continue;

				const distance = dist[i];
				if (distance < bestDistance) {
					bestDistance = distance;
					bestIndex = i;
				}
			}

			if (bestIndex !== -1 && bestDistance < 1e15) {
				const stepPoint = firstStepToward(
					came,
					IDX(head.x, head.y),
					bestIndex,
				);
				if (stepPoint) return normDir(head, stepPoint);
			}
		}

		let nextDir = normDir(head, path[0]);
		const currentCell = cellOf(head);
		const appleCell = cellOf(apple);
		const suggestedInside = dirEq(nextDir, cellMoveInside(head));

		if (
			lastCell &&
			lastCell.x === currentCell.x &&
			lastCell.y === currentCell.y
		) {
			insideStreak = suggestedInside ? insideStreak + 1 : 0;
		} else {
			insideStreak = suggestedInside ? 1 : 0;
		}

		lastCell = currentCell;

		if (
			insideStreak >= 3 &&
			!(appleCell.x === currentCell.x && appleCell.y === currentCell.y)
		) {
			const forced = cellMoveOutside(head);
			const nextHead = { x: head.x + forced.x, y: head.y + forced.y };

			if (
				nextHead.x >= 0 &&
				nextHead.y >= 0 &&
				nextHead.x < N &&
				nextHead.y < N
			) {
				const willGrow = equal(nextHead, apple);
				if (!wouldCollide(nextHead, willGrow)) {
					insideStreak = 0;
					nextDir = forced;
				}
			}
		}

		return nextDir;
	}

	function step() {
		if (apple.x < 0 || apple.y < 0) {
			setGameOver(true);
			setPaused(true);
			return;
		}

		if (pausedRef.current || overRef.current) return;

		if (autoRef.current) {
			const nextDir = autoDir();
			const allowReverseOnce = justReset.current;

			if (nextDir && (!isOpposite(nextDir, dir) || allowReverseOnce)) {
				dir = nextDir;
				justReset.current = false;
			}
		} else if (queued && !isOpposite(queued, dir)) {
			dir = queued;
		}

		queued = null;

		const head = snake[0];
		const nextHead: Point = { x: head.x + dir.x, y: head.y + dir.y };

		if (nextHead.x < 0 || nextHead.y < 0 || nextHead.x >= N || nextHead.y >= N) {
			setGameOver(true);
			setPaused(true);
			return;
		}

		const willGrow = equal(nextHead, apple);
		const limit = snake.length - (willGrow ? 0 : 1);

		for (let i = 1; i < limit; i++) {
			if (equal(snake[i], nextHead)) {
				setGameOver(true);
				setPaused(true);
				return;
			}
		}

		snake.unshift(nextHead);

		if (equal(nextHead, apple)) {
			scoreR.current += 1;

			if (snake.length === SIZE) {
				apple = { x: -1, y: -1 };
				setWin(true);
				setGameOver(true);
				setPaused(true);
				return;
			}

			placeApple();
		} else {
			snake.pop();
		}

		stepsR.current += 1;
	}

	function drawBoard(context: CanvasRenderingContext2D) {
		context.fillStyle = "rgb(18 18 18)";
		context.fillRect(0, 0, W, H);

		context.fillStyle = "rgba(120, 120, 120, 0.862745098)";
		const pad = Math.floor(CELL * 0.2);
		const gap = pad >> 1;

		for (let x = 0; x < N; x++) {
			for (let y = 0; y < N; y++) {
				drawRoundedRect(
					context,
					x * CELL + gap,
					y * CELL + gap,
					CELL - pad,
					CELL - pad,
					3,
				);
			}
		}
	}

	function drawDirectionHints(context: CanvasRenderingContext2D) {
		if (!arrowsRef.current) return;

		context.strokeStyle = "rgb(220 80 120)";
		context.fillStyle = "rgb(220 80 120)";
		context.lineWidth = 1.25;

		for (let y = 0; y < N; y++) {
			for (let x = 0; x < N; x++) {
				const centerX = x * CELL + CELL / 2;
				const centerY = y * CELL + CELL / 2;
				const dirs = dirmat[y][x];

				for (let i = 0; i < dirs.length; i++) {
					const dx = dirs[i].x * CELL * 0.45;
					const dy = dirs[i].y * CELL * 0.45;
					const endX = centerX + dx;
					const endY = centerY + dy;
					const angle = Math.atan2(dy, dx);
					const arrowHead = CELL * 0.16;
					const x1 = endX + Math.cos(angle + Math.PI * 0.8) * arrowHead;
					const y1 = endY + Math.sin(angle + Math.PI * 0.8) * arrowHead;
					const x2 = endX + Math.cos(angle - Math.PI * 0.8) * arrowHead;
					const y2 = endY + Math.sin(angle - Math.PI * 0.8) * arrowHead;

					context.beginPath();
					context.moveTo(centerX, centerY);
					context.lineTo(endX, endY);
					context.stroke();

					context.beginPath();
					context.moveTo(endX, endY);
					context.lineTo(x1, y1);
					context.lineTo(x2, y2);
					context.closePath();
					context.fill();
				}
			}
		}
	}

	function drawPathOverlay(context: CanvasRenderingContext2D) {
		if (!arrowsRef.current || overRef.current || winRef.current) return;

		const path = bfs();
		if (!path || path.length <= 1) return;

		context.strokeStyle = "rgb(70 150 255)";
		context.lineWidth = Math.max(2, CELL * 0.08);
		context.beginPath();

		for (let i = 0; i < path.length; i++) {
			const centerX = path[i].x * CELL + CELL / 2;
			const centerY = path[i].y * CELL + CELL / 2;

			if (i === 0) context.moveTo(centerX, centerY);
			else context.lineTo(centerX, centerY);
		}

		context.stroke();

		context.fillStyle = "rgba(70, 150, 255, 0.549019608)";
		const radius = Math.max(3, CELL * 0.12);

		for (let i = 0; i < path.length; i++) {
			const centerX = path[i].x * CELL + CELL / 2;
			const centerY = path[i].y * CELL + CELL / 2;

			context.beginPath();
			context.arc(centerX, centerY, radius / 2, 0, Math.PI * 2);
			context.fill();
		}
	}

	function drawSnake(context: CanvasRenderingContext2D) {
		for (let i = 0; i < snake.length; i++) {
			const segment = snake[i];
			const intensity = Math.floor(255 - i * (255 / (snake.length * 1.7)));

			context.fillStyle = `rgb(0 ${intensity} ${255 - intensity})`;
			drawRoundedRect(
				context,
				segment.x * CELL,
				segment.y * CELL,
				CELL,
				CELL,
				4,
			);

			if (i !== 0) continue;

			context.fillStyle = "rgb(255 64 64)";
			const eye = CELL / 5;

			const drawEye = (x: number, y: number) => {
				drawRoundedRect(context, x, y, eye, eye, 2);
			};

			if (dir.x === 1) {
				drawEye(segment.x * CELL + CELL * 0.6, segment.y * CELL + CELL * 0.25);
				drawEye(segment.x * CELL + CELL * 0.6, segment.y * CELL + CELL * 0.6);
			} else if (dir.x === -1) {
				drawEye(segment.x * CELL + CELL * 0.2, segment.y * CELL + CELL * 0.25);
				drawEye(segment.x * CELL + CELL * 0.2, segment.y * CELL + CELL * 0.6);
			} else if (dir.y === -1) {
				drawEye(segment.x * CELL + CELL * 0.25, segment.y * CELL + CELL * 0.2);
				drawEye(segment.x * CELL + CELL * 0.6, segment.y * CELL + CELL * 0.2);
			} else {
				drawEye(segment.x * CELL + CELL * 0.25, segment.y * CELL + CELL * 0.6);
				drawEye(segment.x * CELL + CELL * 0.6, segment.y * CELL + CELL * 0.6);
			}
		}
	}

	function drawApple(context: CanvasRenderingContext2D) {
		if (apple.x < 0 || overRef.current || winRef.current) return;
		context.drawImage(appleSprite, apple.x * CELL, apple.y * CELL);
	}

	function drawOverlay(context: CanvasRenderingContext2D) {
		if (!pausedRef.current && !overRef.current) return;

		context.fillStyle = "rgba(0, 0, 0, 0.588235294)";
		context.fillRect(0, 0, W, H);
		context.fillStyle = "white";
		context.textAlign = "center";
		context.textBaseline = "middle";
		context.font = "22px sans-serif";
		context.fillText(
			overRef.current ? (winRef.current ? "You Win!" : "Game Over") : "Paused",
			W / 2,
			H / 2 - 16,
		);
		context.font = "14px sans-serif";
		context.fillText(
			"Enter to restart • Space to toggle pause",
			W / 2,
			H / 2 + 10,
		);
	}

	function syncUi(now: number) {
		if (now - lastUiSync.current <= 100) return;
		setScore(scoreR.current);
		setSteps(stepsR.current);
		lastUiSync.current = now;
	}

	function drawFrame() {
		if (!renderer) return;

		if (resetBus.current) {
			resetBus.current = false;
			reset();
		}

		if (movesPerSecond !== speedRef.current) {
			movesPerSecond = speedRef.current;
			stepMs = 1000 / movesPerSecond;
		}

		const now = performance.now();
		const delta = now - lastFrameAt;
		lastFrameAt = now;

		accumulator += delta;
		while (accumulator >= stepMs) {
			step();
			accumulator -= stepMs;
			if (apple.x < 0 || apple.y < 0) break;
		}

		const context = renderer.gameContext;
		context.setTransform(1, 0, 0, 1, 0, 0);
		context.imageSmoothingEnabled = false;
		context.clearRect(0, 0, W, H);

		drawBoard(context);
		drawDirectionHints(context);
		drawPathOverlay(context);
		drawSnake(context);
		drawApple(context);
		drawOverlay(context);
		syncUi(now);
	}

	function onKeyDown(event: KeyboardEvent) {
		const key = event.key.toLowerCase();
		const controlsKey =
			key === " " ||
			key === "escape" ||
			key === "enter" ||
			key === "w" ||
			key === "a" ||
			key === "s" ||
			key === "d" ||
			event.key === "ArrowUp" ||
			event.key === "ArrowDown" ||
			event.key === "ArrowLeft" ||
			event.key === "ArrowRight";

		if (!controlsKey) return;

		event.preventDefault();

		if (overRef.current) {
			if (event.key === "Enter") {
				resetBus.current = true;
				setPaused(false);
				setGameOver(false);
			}
			return;
		}

		if (key === " " || key === "escape") {
			setPaused((value) => !value);
			return;
		}

		if (pausedRef.current) return;

		let nextDir: Dir | null = null;

		if (key === "w" || event.key === "ArrowUp") nextDir = DIRS.UP;
		else if (key === "s" || event.key === "ArrowDown") nextDir = DIRS.DOWN;
		else if (key === "a" || event.key === "ArrowLeft") nextDir = DIRS.LEFT;
		else if (key === "d" || event.key === "ArrowRight") nextDir = DIRS.RIGHT;

		if (nextDir) queued = nextDir;
	}

	class SnakeScene extends PhaserLib.Scene {
		constructor() {
			super("snake-phaser");
		}

		create(): void {
			renderer = this.sys.game.renderer as PhaserCanvasRenderer;
			renderer.gameContext.imageSmoothingEnabled = false;
			lastFrameAt = performance.now();
			reset();
			this.game.events.on(PhaserLib.Core.Events.POST_RENDER, drawFrame);
		}
	}

	host.innerHTML = "";

	game = new PhaserLib.Game({
		type: PhaserLib.CANVAS,
		parent: host,
		width: W,
		height: H,
		scene: new SnakeScene() as PhaserScene,
		banner: false,
		disableContextMenu: true,
		audio: { noAudio: true },
		clearBeforeRender: false,
		transparent: false,
		antialias: false,
		pixelArt: true,
		backgroundColor: "#121212",
	});

	window.addEventListener("keydown", onKeyDown);

	return () => {
		window.removeEventListener("keydown", onKeyDown);

		if (game) {
			game.events.off(PhaserLib.Core.Events.POST_RENDER, drawFrame);
			game.destroy(true);
			game = null;
		}

		renderer = null;
	};
}

export default function SnakePhaser({
	boardSize = 20,
	cellPx = 40,
	initialSpeed = 5,
	className = "",
}: {
	boardSize?: number;
	cellPx?: number;
	initialSpeed?: number;
	className?: string;
}) {
	const hostRef = useRef<HTMLDivElement | null>(null);

	const [score, setScore] = useState(0);
	const [steps, setSteps] = useState(0);
	const [speed, setSpeed] = useState(initialSpeed);
	const [paused, setPaused] = useState(false);
	const [gameOver, setGameOver] = useState(false);
	const [win, setWin] = useState(false);
	const [autoPlay, setAutoPlay] = useState(true);
	const [showArrows, setShowArrows] = useState(false);

	const speedRef = useRef(speed);
	const pausedRef = useRef(paused);
	const autoRef = useRef(autoPlay);
	const arrowsRef = useRef(showArrows);
	const overRef = useRef(gameOver);
	const winRef = useRef(false);
	const resetBus = useRef(false);
	const justReset = useRef(false);
	const scoreR = useRef(0);
	const stepsR = useRef(0);
	const lastUiSync = useRef(0);

	useEffect(() => {
		speedRef.current = speed;
	}, [speed]);

	useEffect(() => {
		pausedRef.current = paused;
	}, [paused]);

	useEffect(() => {
		autoRef.current = autoPlay;
	}, [autoPlay]);

	useEffect(() => {
		arrowsRef.current = showArrows;
	}, [showArrows]);

	useEffect(() => {
		overRef.current = gameOver;
	}, [gameOver]);

	useEffect(() => {
		winRef.current = win;
	}, [win]);

	useEffect(() => {
		if (!hostRef.current) return;

		let cleanup: (() => void) | null = null;
		let cancelled = false;

		(async () => {
			if (!hostRef.current) return;

			const phaserModule = await import("phaser");
			if (cancelled || !hostRef.current) return;

			const PhaserLib = ("default" in phaserModule
				? phaserModule.default
				: phaserModule) as PhaserModule;

			cleanup = mountSnakeGame(hostRef.current, PhaserLib, {
				boardSize,
				cellPx,
				speedRef,
				pausedRef,
				autoRef,
				arrowsRef,
				overRef,
				winRef,
				resetBus,
				justReset,
				scoreR,
				stepsR,
				lastUiSync,
				setPaused,
				setScore,
				setSteps,
				setGameOver,
				setWin,
			});
		})();

		return () => {
			cancelled = true;
			cleanup?.();
		};
	}, [boardSize, cellPx]);

	const holdRAF = useRef<number | null>(null);
	const holdStart = useRef(0);
	const holdDir = useRef<1 | -1>(1);
	const holdClicksAcc = useRef(0);

	function stepSpeed(direction: 1 | -1, clicks = 1) {
		setSpeed((currentSpeed) => {
			let nextSpeed = currentSpeed + direction * 0.5 * clicks;
			if (!Number.isFinite(nextSpeed)) nextSpeed = currentSpeed;
			nextSpeed = Math.max(0.5, Math.min(200, nextSpeed));
			return +nextSpeed.toFixed(1);
		});
	}

	function cancelHold() {
		if (holdRAF.current) {
			cancelAnimationFrame(holdRAF.current);
			holdRAF.current = null;
		}
	}

	function startHold(direction: 1 | -1) {
		holdDir.current = direction;
		holdStart.current = performance.now();
		holdClicksAcc.current = 0;

		const DELAY = 300;
		const R0 = 0.35;
		const K = 5;

		let last = performance.now();
		let seeded = false;

		const loop = (now: number) => {
			if (!holdRAF.current) return;

			const elapsed = now - holdStart.current;

			if (elapsed >= DELAY && !seeded) {
				seeded = true;
				stepSpeed(holdDir.current, 1);
				holdClicksAcc.current = 0;
				last = now;
			}

			if (elapsed < DELAY) {
				holdRAF.current = requestAnimationFrame(loop);
				return;
			}

			const dt = (now - last) / 1000;
			last = now;
			const t = (elapsed - DELAY) / 1000;
			const clicksPerSec = R0 * Math.exp(K * t);

			holdClicksAcc.current += clicksPerSec * dt;

			const wholeClicks = Math.floor(holdClicksAcc.current);
			if (wholeClicks >= 1) {
				stepSpeed(holdDir.current, wholeClicks);
				holdClicksAcc.current -= wholeClicks;
			}

			holdRAF.current = requestAnimationFrame(loop);
		};

		holdRAF.current = requestAnimationFrame(loop);
	}

	function endHold(direction: 1 | -1, applyTap: boolean) {
		const elapsed = performance.now() - holdStart.current;
		cancelHold();
		if (applyTap && elapsed < 300) stepSpeed(direction, 1);
	}

	return (
		<div className={`snake-root flex flex-col items-center gap-3 ${className}`}>
			<style jsx>{`
				.snake-root,
				.snake-root * {
					-webkit-user-select: none !important;
					user-select: none !important;
				}
			`}</style>
			<div
				className="flex flex-wrap items-center gap-3 text-zinc-200"
				onMouseDown={(event) => event.preventDefault()}
			>
				<div className="px-3 py-1 rounded bg-zinc-800/80 border border-zinc-700">
					<span className="font-semibold">Speed:</span>{" "}
					<button
						type="button"
						className="px-2 hover:text-white text-purple-300"
						onPointerDown={(event) => {
							event.preventDefault();
							event.currentTarget.setPointerCapture(event.pointerId);
							startHold(-1);
						}}
						onPointerUp={() => endHold(-1, true)}
						onPointerCancel={() => cancelHold()}
						onPointerLeave={() => cancelHold()}
						onContextMenu={(event) => event.preventDefault()}
					>
						–
					</button>
					<span className="mx-1 tabular-nums inline-block text-right">
						{speed.toFixed(1)}
					</span>
					<button
						type="button"
						className="px-2 hover:text-white text-purple-300"
						onPointerDown={(event) => {
							event.preventDefault();
							event.currentTarget.setPointerCapture(event.pointerId);
							startHold(1);
						}}
						onPointerUp={() => endHold(1, true)}
						onPointerCancel={() => cancelHold()}
						onPointerLeave={() => cancelHold()}
						onContextMenu={(event) => event.preventDefault()}
					>
						+
					</button>
				</div>
				<div className="px-3 py-1 rounded bg-zinc-800/80 border border-zinc-700">
					<span className="font-semibold">Score:</span>{" "}
					<span className="tabular-nums">{score}</span>
				</div>
				<div className="px-3 py-1 rounded bg-zinc-800/80 border border-zinc-700">
					<span className="font-semibold">Steps:</span>{" "}
					<span className="tabular-nums">{steps}</span>
				</div>
				<button
					type="button"
					className={`px-3 py-1 rounded border border-zinc-700 ${
						paused ? "bg-zinc-700" : "bg-zinc-800/80 hover:bg-zinc-700"
					}`}
					onClick={() => setPaused((value) => !value)}
				>
					{paused ? "Resume" : "Pause"}
				</button>
				<button
					type="button"
					className={`px-3 py-1 rounded border border-zinc-700 ${
						autoPlay ? "bg-emerald-700" : "bg-zinc-800/80 hover:bg-zinc-700"
					}`}
					onClick={() => setAutoPlay((value) => !value)}
				>
					{autoPlay ? "Autoplay" : "Manual"}
				</button>
				<button
					type="button"
					className={`px-3 py-1 rounded border border-zinc-700 ${
						showArrows ? "bg-fuchsia-700" : "bg-zinc-800/80 hover:bg-zinc-700"
					}`}
					onClick={() => setShowArrows((value) => !value)}
				>
					{showArrows ? "Arrows On" : "Arrows Off"}
				</button>
				<button
					type="button"
					className="px-3 py-1 rounded bg-zinc-800/80 border border-zinc-700 hover:bg-zinc-700"
					onClick={() => {
						resetBus.current = true;
						setPaused(false);
						setGameOver(false);
					}}
				>
					Restart
				</button>
			</div>
			<div
				ref={hostRef}
				className="rounded-lg overflow-hidden shadow-lg"
				style={{ width: boardSize * cellPx, height: boardSize * cellPx }}
			/>
			<div className="text-sm text-zinc-400">
				WASD/Arrows • Space pause • Enter restart
			</div>
		</div>
	);
}
