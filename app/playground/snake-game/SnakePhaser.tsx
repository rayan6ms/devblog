"use client";

import {
	useEffect,
	useRef,
	useState,
	type Dispatch,
	type RefObject,
	type SetStateAction,
} from "react";

type Point = { x: number; y: number };
type Dir = { x: number; y: number };
type MutableRef<T> = RefObject<T>;

type PhaserModule = typeof import("phaser");
type PhaserGame = import("phaser").Game;
type PhaserScene = import("phaser").Scene;
type PhaserCanvasRenderer = import("phaser").Renderer.Canvas.CanvasRenderer;

type BoardGraph = {
	dirmat: Dir[][][];
	adjAllowed: Int32Array;
	nbr4: Int32Array;
};

type SearchPool = {
	blocked: Uint8Array;
	visited: Uint8Array;
	closed: Uint8Array;
	came: Int32Array;
	queue: Int32Array;
	dist: Float64Array;
	reachSeen: Uint8Array;
	scratchGrid: Uint8Array;
	heapNodes: number[];
	heapScores: number[];
};

type UiBridge = {
	speedRef: MutableRef<number>;
	pausedRef: MutableRef<boolean>;
	autoRef: MutableRef<boolean>;
	overRef: MutableRef<boolean>;
	winRef: MutableRef<boolean>;
	resetBus: MutableRef<boolean>;
	justReset: MutableRef<boolean>;
	scoreR: MutableRef<number>;
	stepsR: MutableRef<number>;
	setPaused: Dispatch<SetStateAction<boolean>>;
	setScore: Dispatch<SetStateAction<number>>;
	setSteps: Dispatch<SetStateAction<number>>;
	setGameOver: Dispatch<SetStateAction<boolean>>;
	setWin: Dispatch<SetStateAction<boolean>>;
};

type MountOptions = UiBridge & {
	boardSize: number;
	cellPx: number;
	seed?: number;
	arrowsRef: MutableRef<boolean>;
	lastUiSync: MutableRef<number>;
};

type EngineOptions = UiBridge & {
	boardSize: number;
	seed?: number;
	graph: BoardGraph;
};

type SnakeEngine = {
	getAppleId: () => number;
	getDir: () => Dir;
	getOverlayPathIds: () => readonly number[] | null;
	getSnakeIds: () => readonly number[];
	queueDir: (nextDir: Dir) => void;
	reset: () => void;
	step: () => void;
};

const ROOT_PARENT = -2;
const UNVISITED_PARENT = -1;
const A_STAR_INF = 1e15;
const A_STAR_STEP = 1000;

const DIRS = {
	UP: { x: 0, y: -1 },
	DOWN: { x: 0, y: 1 },
	LEFT: { x: -1, y: 0 },
	RIGHT: { x: 1, y: 0 },
} as const;

const CARDINAL_DIRS: readonly Dir[] = [
	DIRS.RIGHT,
	DIRS.LEFT,
	DIRS.DOWN,
	DIRS.UP,
];

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

function buildBoardGraph(n: number): BoardGraph {
	const dirmat = buildDirectionMatrix(n);
	const size = n * n;
	const adjAllowed = new Int32Array(size * 4).fill(-1);
	const nbr4 = new Int32Array(size * 4).fill(-1);
	const id = (x: number, y: number) => y * n + x;

	for (let y = 0; y < n; y++) {
		for (let x = 0; x < n; x++) {
			const index = id(x, y);
			let allowedCount = 0;

			for (const dir of dirmat[y][x]) {
				const nextX = x + dir.x;
				const nextY = y + dir.y;

				if (nextX >= 0 && nextY >= 0 && nextX < n && nextY < n) {
					adjAllowed[index * 4 + allowedCount] = id(nextX, nextY);
					allowedCount += 1;
				}
			}

			let neighborCount = 0;
			for (const [dx, dy] of [
				[1, 0],
				[-1, 0],
				[0, 1],
				[0, -1],
			] as const) {
				const nextX = x + dx;
				const nextY = y + dy;

				if (nextX >= 0 && nextY >= 0 && nextX < n && nextY < n) {
					nbr4[index * 4 + neighborCount] = id(nextX, nextY);
					neighborCount += 1;
				}
			}
		}
	}

	return { dirmat, adjAllowed, nbr4 };
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

function createCanvasLayer(width: number, height: number): HTMLCanvasElement {
	const canvas = document.createElement("canvas");
	canvas.width = width;
	canvas.height = height;
	return canvas;
}

function createBoardLayer(boardSize: number, cellPx: number): HTMLCanvasElement {
	const width = boardSize * cellPx;
	const height = boardSize * cellPx;
	const canvas = createCanvasLayer(width, height);
	const context = canvas.getContext("2d");

	if (!context) {
		throw new Error("Unable to create board canvas.");
	}

	context.imageSmoothingEnabled = false;
	context.fillStyle = "rgb(18 18 18)";
	context.fillRect(0, 0, width, height);

	context.fillStyle = "rgba(120, 120, 120, 0.862745098)";
	const pad = Math.floor(cellPx * 0.2);
	const gap = pad >> 1;

	for (let x = 0; x < boardSize; x++) {
		for (let y = 0; y < boardSize; y++) {
			drawRoundedRect(
				context,
				x * cellPx + gap,
				y * cellPx + gap,
				cellPx - pad,
				cellPx - pad,
				3,
			);
		}
	}

	return canvas;
}

function createDirectionHintsLayer(
	boardSize: number,
	cellPx: number,
	dirmat: Dir[][][],
): HTMLCanvasElement {
	const width = boardSize * cellPx;
	const height = boardSize * cellPx;
	const canvas = createCanvasLayer(width, height);
	const context = canvas.getContext("2d");

	if (!context) {
		throw new Error("Unable to create direction hints canvas.");
	}

	context.imageSmoothingEnabled = false;
	context.strokeStyle = "rgb(220 80 120)";
	context.fillStyle = "rgb(220 80 120)";
	context.lineWidth = 1.25;

	for (let y = 0; y < boardSize; y++) {
		for (let x = 0; x < boardSize; x++) {
			const centerX = x * cellPx + cellPx / 2;
			const centerY = y * cellPx + cellPx / 2;
			const dirs = dirmat[y][x];

			for (let i = 0; i < dirs.length; i++) {
				const dx = dirs[i].x * cellPx * 0.45;
				const dy = dirs[i].y * cellPx * 0.45;
				const endX = centerX + dx;
				const endY = centerY + dy;
				const angle = Math.atan2(dy, dx);
				const arrowHead = cellPx * 0.16;
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

	return canvas;
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

function createSearchPool(size: number): SearchPool {
	return {
		blocked: new Uint8Array(size),
		visited: new Uint8Array(size),
		closed: new Uint8Array(size),
		came: new Int32Array(size),
		queue: new Int32Array(size),
		dist: new Float64Array(size),
		reachSeen: new Uint8Array(size),
		scratchGrid: new Uint8Array(size),
		heapNodes: [],
		heapScores: [],
	};
}

function createRng(seed: number) {
	let state = seed >>> 0;
	if (state === 0) {
		state = 0x9e3779b9;
	}

	return {
		next() {
			state = (Math.imul(1664525, state) + 1013904223) >>> 0;
			return state / 0x100000000;
		},
	};
}

function randomSeed() {
	return (Math.random() * 0xffffffff) >>> 0;
}

function mountSnakeGame(
	host: HTMLDivElement,
	PhaserLib: PhaserModule,
	{
		boardSize,
		cellPx,
		seed,
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
	const width = boardSize * cellPx;
	const height = boardSize * cellPx;
	const graph = buildBoardGraph(boardSize);
	const boardLayer = createBoardLayer(boardSize, cellPx);
	const arrowsLayer = createDirectionHintsLayer(
		boardSize,
		cellPx,
		graph.dirmat,
	);
	const appleSprite = createAppleSprite(cellPx);
	const engine = createSnakeEngine({
		boardSize,
		seed,
		graph,
		speedRef,
		pausedRef,
		autoRef,
		overRef,
		winRef,
		resetBus,
		justReset,
		scoreR,
		stepsR,
		setPaused,
		setScore,
		setSteps,
		setGameOver,
		setWin,
	});

	let game: PhaserGame | null = null;
	let renderer: PhaserCanvasRenderer | null = null;
	let movesPerSecond = speedRef.current;
	let stepMs = 1000 / movesPerSecond;
	let accumulator = 0;
	let lastFrameAt = performance.now();

	function drawPathOverlay(
		context: CanvasRenderingContext2D,
		pathIds: readonly number[] | null,
	) {
		if (!arrowsRef.current || overRef.current || winRef.current) return;
		if (!pathIds || pathIds.length <= 1) return;

		context.strokeStyle = "rgb(70 150 255)";
		context.lineWidth = Math.max(2, cellPx * 0.08);
		context.beginPath();

		for (let i = 0; i < pathIds.length; i++) {
			const id = pathIds[i];
			const centerX = (id % boardSize) * cellPx + cellPx / 2;
			const centerY = ((id / boardSize) | 0) * cellPx + cellPx / 2;

			if (i === 0) context.moveTo(centerX, centerY);
			else context.lineTo(centerX, centerY);
		}

		context.stroke();

		context.fillStyle = "rgba(70, 150, 255, 0.549019608)";
		const radius = Math.max(3, cellPx * 0.12);

		for (let i = 0; i < pathIds.length; i++) {
			const id = pathIds[i];
			const centerX = (id % boardSize) * cellPx + cellPx / 2;
			const centerY = ((id / boardSize) | 0) * cellPx + cellPx / 2;

			context.beginPath();
			context.arc(centerX, centerY, radius / 2, 0, Math.PI * 2);
			context.fill();
		}
	}

	function drawSnake(context: CanvasRenderingContext2D) {
		const snakeIds = engine.getSnakeIds();
		const dir = engine.getDir();

		for (let i = 0; i < snakeIds.length; i++) {
			const id = snakeIds[i];
			const x = id % boardSize;
			const y = (id / boardSize) | 0;
			const intensity = Math.floor(255 - i * (255 / (snakeIds.length * 1.7)));

			context.fillStyle = `rgb(0 ${intensity} ${255 - intensity})`;
			drawRoundedRect(context, x * cellPx, y * cellPx, cellPx, cellPx, 4);

			if (i !== 0) continue;

			context.fillStyle = "rgb(255 64 64)";
			const eye = cellPx / 5;
			const drawEye = (eyeX: number, eyeY: number) => {
				drawRoundedRect(context, eyeX, eyeY, eye, eye, 2);
			};

			if (dir.x === 1) {
				drawEye(x * cellPx + cellPx * 0.6, y * cellPx + cellPx * 0.25);
				drawEye(x * cellPx + cellPx * 0.6, y * cellPx + cellPx * 0.6);
			} else if (dir.x === -1) {
				drawEye(x * cellPx + cellPx * 0.2, y * cellPx + cellPx * 0.25);
				drawEye(x * cellPx + cellPx * 0.2, y * cellPx + cellPx * 0.6);
			} else if (dir.y === -1) {
				drawEye(x * cellPx + cellPx * 0.25, y * cellPx + cellPx * 0.2);
				drawEye(x * cellPx + cellPx * 0.6, y * cellPx + cellPx * 0.2);
			} else {
				drawEye(x * cellPx + cellPx * 0.25, y * cellPx + cellPx * 0.6);
				drawEye(x * cellPx + cellPx * 0.6, y * cellPx + cellPx * 0.6);
			}
		}
	}

	function drawApple(context: CanvasRenderingContext2D) {
		const appleId = engine.getAppleId();
		if (appleId < 0 || overRef.current || winRef.current) return;

		const x = appleId % boardSize;
		const y = (appleId / boardSize) | 0;
		context.drawImage(appleSprite, x * cellPx, y * cellPx);
	}

	function drawOverlay(context: CanvasRenderingContext2D) {
		if (!pausedRef.current && !overRef.current) return;

		context.fillStyle = "rgba(0, 0, 0, 0.588235294)";
		context.fillRect(0, 0, width, height);
		context.fillStyle = "white";
		context.textAlign = "center";
		context.textBaseline = "middle";
		context.font = "22px sans-serif";
		context.fillText(
			overRef.current ? (winRef.current ? "You Win!" : "Game Over") : "Paused",
			width / 2,
			height / 2 - 16,
		);
		context.font = "14px sans-serif";
		context.fillText(
			"Enter to restart • Space to toggle pause",
			width / 2,
			height / 2 + 10,
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
			engine.reset();
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
			engine.step();
			accumulator -= stepMs;
			if (engine.getAppleId() < 0) break;
		}

		const context = renderer.gameContext;
		context.setTransform(1, 0, 0, 1, 0, 0);
		context.imageSmoothingEnabled = false;
		context.clearRect(0, 0, width, height);
		context.drawImage(boardLayer, 0, 0);

		if (arrowsRef.current) {
			context.drawImage(arrowsLayer, 0, 0);
			drawPathOverlay(context, engine.getOverlayPathIds());
		}

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
				pausedRef.current = false;
				overRef.current = false;
				setPaused(false);
				setGameOver(false);
			}
			return;
		}

		if (key === " " || key === "escape") {
			const nextPaused = !pausedRef.current;
			pausedRef.current = nextPaused;
			setPaused(nextPaused);
			return;
		}

		if (pausedRef.current) return;

		let nextDir: Dir | null = null;

		if (key === "w" || event.key === "ArrowUp") nextDir = DIRS.UP;
		else if (key === "s" || event.key === "ArrowDown") nextDir = DIRS.DOWN;
		else if (key === "a" || event.key === "ArrowLeft") nextDir = DIRS.LEFT;
		else if (key === "d" || event.key === "ArrowRight") nextDir = DIRS.RIGHT;

		if (nextDir) {
			engine.queueDir(nextDir);
		}
	}

	class SnakeScene extends PhaserLib.Scene {
		constructor() {
			super("snake-phaser");
		}

		create(): void {
			renderer = this.sys.game.renderer as PhaserCanvasRenderer;
			renderer.gameContext.imageSmoothingEnabled = false;
			lastFrameAt = performance.now();
			engine.reset();
			this.game.events.on(PhaserLib.Core.Events.POST_RENDER, drawFrame);
		}
	}

	host.innerHTML = "";

	game = new PhaserLib.Game({
		type: PhaserLib.CANVAS,
		parent: host,
		width,
		height,
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

function createSnakeEngine({
	boardSize,
	seed,
	graph,
	pausedRef,
	autoRef,
	overRef,
	winRef,
	justReset,
	scoreR,
	stepsR,
	setPaused,
	setScore,
	setSteps,
	setGameOver,
	setWin,
}: EngineOptions): SnakeEngine {
	const size = boardSize * boardSize;
	const search = createSearchPool(size);
	const occupied = new Uint8Array(size);
	const freeIndex = new Int32Array(size).fill(-1);
	const freeCells: number[] = [];
	const cellWidth = boardSize >> 1;
	const cellCount = cellWidth * (boardSize >> 1);

	let rng = createRng(seed ?? randomSeed());
	let snakeIds: number[] = [];
	let dir: Dir = DIRS.RIGHT;
	let queued: Dir | null = null;
	let appleId = -1;
	let lastCellId = -1;
	let insideStreak = 0;
	let stateVersion = 0;
	let overlayVersion = -1;
	let overlayPathIds: number[] | null = null;

	const setPausedValue = (value: boolean) => {
		pausedRef.current = value;
		setPaused(value);
	};

	const setGameOverValue = (value: boolean) => {
		overRef.current = value;
		setGameOver(value);
	};

	const setWinValue = (value: boolean) => {
		winRef.current = value;
		setWin(value);
	};

	const markChanged = () => {
		stateVersion += 1;
	};

	const idToPoint = (id: number): Point => ({
		x: id % boardSize,
		y: (id / boardSize) | 0,
	});

	const moveId = (id: number, direction: Dir) => {
		const x = (id % boardSize) + direction.x;
		const y = ((id / boardSize) | 0) + direction.y;
		if (x < 0 || y < 0 || x >= boardSize || y >= boardSize) return -1;
		return y * boardSize + x;
	};

	const dirFromIds = (from: number, to: number): Dir => ({
		x: Math.sign((to % boardSize) - (from % boardSize)),
		y: Math.sign(((to / boardSize) | 0) - ((from / boardSize) | 0)),
	});

	const heapClear = () => {
		search.heapNodes.length = 0;
		search.heapScores.length = 0;
	};

	const heapPush = (node: number, score: number) => {
		let index = search.heapNodes.length;
		search.heapNodes.push(node);
		search.heapScores.push(score);

		while (index > 0) {
			const parent = (index - 1) >> 1;
			if (search.heapScores[parent] <= score) break;

			search.heapNodes[index] = search.heapNodes[parent];
			search.heapScores[index] = search.heapScores[parent];
			index = parent;
		}

		search.heapNodes[index] = node;
		search.heapScores[index] = score;
	};

	const heapPop = () => {
		if (search.heapNodes.length === 0) return -1;

		const top = search.heapNodes[0];
		const lastNode = search.heapNodes.pop();
		const lastScore = search.heapScores.pop();

		if (
			lastNode === undefined ||
			lastScore === undefined ||
			search.heapNodes.length === 0
		) {
			return top;
		}

		let index = 0;
		const length = search.heapNodes.length;

		while (true) {
			const left = index * 2 + 1;
			const right = left + 1;
			if (left >= length) break;

			let child = left;
			if (
				right < length &&
				search.heapScores[right] < search.heapScores[left]
			) {
				child = right;
			}

			if (search.heapScores[child] >= lastScore) break;
			search.heapNodes[index] = search.heapNodes[child];
			search.heapScores[index] = search.heapScores[child];
			index = child;
		}

		search.heapNodes[index] = lastNode;
		search.heapScores[index] = lastScore;
		return top;
	};

	function reseed() {
		rng = createRng(seed ?? randomSeed());
	}

	function removeFree(id: number) {
		const index = freeIndex[id];
		if (index === -1) return;

		const last = freeCells.pop();
		freeIndex[id] = -1;

		if (last === undefined || last === id) return;
		freeCells[index] = last;
		freeIndex[last] = index;
	}

	function addFree(id: number) {
		if (freeIndex[id] !== -1) return;
		freeIndex[id] = freeCells.length;
		freeCells.push(id);
	}

	function occupy(id: number) {
		occupied[id] = 1;
		removeFree(id);
	}

	function release(id: number) {
		occupied[id] = 0;
		addFree(id);
	}

	function resetFreeCells() {
		freeCells.length = 0;
		occupied.fill(0);
		freeIndex.fill(-1);

		for (let i = 0; i < size; i++) {
			freeIndex[i] = freeCells.length;
			freeCells.push(i);
		}
	}

	function buildBlocked(excludeTail: boolean) {
		search.blocked.set(occupied);
		if (excludeTail && snakeIds.length > 0) {
			search.blocked[snakeIds[snakeIds.length - 1]] = 0;
		}
		return search.blocked;
	}

	function bfsPath(
		startId: number,
		goalId: number,
		adjacency: Int32Array,
		blocked: Uint8Array,
		includeStart: boolean,
	): number[] | null {
		if (goalId < 0 || goalId >= size || startId === goalId) {
			return includeStart ? [startId] : [];
		}

		search.visited.fill(0);
		search.came.fill(-1);

		let head = 0;
		let tail = 0;
		search.queue[tail++] = startId;
		search.visited[startId] = 1;

		while (head < tail) {
			const current = search.queue[head++];
			const base = current * 4;

			for (let i = 0; i < 4; i++) {
				const next = adjacency[base + i];
				if (next === -1 || search.visited[next] || blocked[next]) continue;

				search.visited[next] = 1;
				search.came[next] = current;

				if (next === goalId) {
					head = tail;
					break;
				}

				search.queue[tail++] = next;
			}
		}

		if (search.came[goalId] === -1) return null;

		const path: number[] = [];
		for (let current = goalId; current !== -1; current = search.came[current]) {
			path.push(current);
			if (path.length > size) return null;
		}

		path.reverse();
		return includeStart ? path : path.slice(1);
	}

	function pathToApple() {
		if (snakeIds.length === 0 || appleId < 0) return null;
		return bfsPath(
			snakeIds[0],
			appleId,
			graph.adjAllowed,
			buildBlocked(true),
			true,
		);
	}

	function rightOf(direction: Dir): Dir {
		if (direction.x === 1 && direction.y === 0) return { x: 0, y: 1 };
		if (direction.x === -1 && direction.y === 0) return { x: 0, y: -1 };
		if (direction.x === 0 && direction.y === 1) return { x: -1, y: 0 };
		return { x: 1, y: 0 };
	}

	function cellMoveInside(id: number): Dir {
		const x = id % boardSize;
		const y = (id / boardSize) | 0;
		if ((y & 1) === 0) return (x & 1) === 0 ? DIRS.DOWN : DIRS.LEFT;
		return (x & 1) === 0 ? DIRS.RIGHT : DIRS.UP;
	}

	function cellMoveOutside(id: number): Dir {
		const x = id % boardSize;
		const y = (id / boardSize) | 0;
		if ((y & 1) === 0) return (x & 1) === 0 ? DIRS.LEFT : DIRS.UP;
		return (x & 1) === 0 ? DIRS.DOWN : DIRS.RIGHT;
	}

	function isCellMove(id: number, direction: Dir) {
		const inside = cellMoveInside(id);
		if (inside.x === direction.x && inside.y === direction.y) return true;

		const outside = cellMoveOutside(id);
		return outside.x === direction.x && outside.y === direction.y;
	}

	function cellId(id: number) {
		const point = idToPoint(id);
		return ((point.y >> 1) * cellWidth) + (point.x >> 1);
	}

	function buildCellTreeParents(ids = snakeIds) {
		const parents = new Int32Array(cellCount).fill(UNVISITED_PARENT);
		let parent = ROOT_PARENT;

		for (let i = ids.length - 1; i >= 0; i--) {
			const nextCellId = cellId(ids[i]);
			if (parents[nextCellId] === UNVISITED_PARENT) {
				parents[nextCellId] = parent;
			}
			parent = nextCellId;
		}

		return parents;
	}

	function canMoveInCellTree(
		parents: Int32Array,
		fromId: number,
		toId: number,
		direction: Dir,
		blocked: Uint8Array,
	) {
		if (!isCellMove(fromId, direction)) return false;
		if (toId < 0 || blocked[toId]) return false;

		const fromCellId = cellId(fromId);
		const toCellId = cellId(toId);

		if (fromCellId === toCellId) return true;
		if (parents[toCellId] === UNVISITED_PARENT) return true;
		return parents[fromCellId] === toCellId;
	}

	function aStarWithPenalties(startId: number, goalId: number, parents: Int32Array) {
		search.dist.fill(A_STAR_INF);
		search.came.fill(-1);
		search.closed.fill(0);
		heapClear();

		const blocked = buildBlocked(false);
		const heuristic = (id: number) => {
			const point = idToPoint(id);
			const goal = idToPoint(goalId);
			return (
				(Math.abs(point.x - goal.x) + Math.abs(point.y - goal.y)) * A_STAR_STEP
			);
		};

		search.dist[startId] = 0;
		heapPush(startId, heuristic(startId));

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

		while (search.heapNodes.length > 0) {
			const currentId = heapPop();
			if (currentId === -1 || search.closed[currentId]) continue;

			search.closed[currentId] = 1;
			if (currentId === goalId) break;

			for (const candidate of CARDINAL_DIRS) {
				const nextId = moveId(currentId, candidate);
				if (
					nextId === -1 ||
					!canMoveInCellTree(parents, currentId, nextId, candidate, blocked)
				) {
					continue;
				}

				const currentCellId = cellId(currentId);
				const nextCellId = cellId(nextId);
				const toParent = parents[currentCellId] === nextCellId;
				const toSame = currentCellId === nextCellId;

				const right = rightOf(candidate);
				const rightNeighborId = moveId(nextId, right);
				const hugsEdge = rightNeighborId === -1;
				const hugsWall = !hugsEdge && blocked[rightNeighborId] === 1;

				let cost =
					A_STAR_STEP +
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

				if (currentId === startId) {
					cost += candidate.x === dir.x && candidate.y === dir.y ? -5 : 5;
				}

				const nextDistance = search.dist[currentId] + cost;
				if (nextDistance >= search.dist[nextId]) continue;

				search.dist[nextId] = nextDistance;
				search.came[nextId] = currentId;
				heapPush(nextId, nextDistance + heuristic(nextId));
			}
		}

		if (search.came[goalId] === -1) {
			return { path: null as number[] | null, dist: search.dist, came: search.came };
		}

		const path: number[] = [];
		for (let current = goalId; current !== startId; current = search.came[current]) {
			if (current === -1) {
				return { path: null as number[] | null, dist: search.dist, came: search.came };
			}
			path.push(current);
		}

		path.reverse();
		return { path, dist: search.dist, came: search.came };
	}

	function firstStepToward(
		came: Int32Array,
		startId: number,
		targetId: number,
	) {
		let current = targetId;
		let previous = came[current];

		if (current === -1) return -1;

		while (previous !== startId && previous !== -1) {
			current = previous;
			previous = came[current];
		}

		return previous === startId ? current : -1;
	}

	function floodReachable(parents: Int32Array, grid: Uint8Array, startId: number) {
		search.reachSeen.fill(0);

		let head = 0;
		let tail = 0;
		search.queue[tail++] = startId;
		search.reachSeen[startId] = 1;

		while (head < tail) {
			const currentId = search.queue[head++];

			for (const direction of CARDINAL_DIRS) {
				const nextId = moveId(currentId, direction);
				if (nextId === -1 || grid[nextId] || !isCellMove(currentId, direction)) {
					continue;
				}

				const fromCellId = cellId(currentId);
				const toCellId = cellId(nextId);
				const sameCell = fromCellId === toCellId;
				const unvisited = parents[toCellId] === UNVISITED_PARENT;
				const parentLink = parents[fromCellId] === toCellId;

				if (!(sameCell || unvisited || parentLink) || search.reachSeen[nextId]) {
					continue;
				}

				search.reachSeen[nextId] = 1;
				search.queue[tail++] = nextId;
			}
		}

		return search.reachSeen;
	}

	function placeApple() {
		if (freeCells.length === 0) {
			setWinValue(true);
			setGameOverValue(true);
			setPausedValue(true);
			appleId = -1;
			markChanged();
			return;
		}

		appleId = freeCells[Math.floor(rng.next() * freeCells.length)];
		markChanged();
	}

	function pickInitialDir(): Dir {
		const headId = snakeIds[0];
		const path = pathToApple();

		if (path && path.length >= 2) {
			return dirFromIds(headId, path[1]);
		}

		const base = headId * 4;
		for (let i = 0; i < 4; i++) {
			const nextId = graph.adjAllowed[base + i];
			if (nextId !== -1) {
				return dirFromIds(headId, nextId);
			}
		}

		for (const candidate of CARDINAL_DIRS) {
			if (moveId(headId, candidate) !== -1) return candidate;
		}

		return DIRS.RIGHT;
	}

	function wouldCollide(nextId: number, willGrow: boolean) {
		const limit = snakeIds.length - (willGrow ? 0 : 1);
		for (let i = 1; i < limit; i++) {
			if (snakeIds[i] === nextId) return true;
		}
		return false;
	}

	function canReachTailAfterMove(nextId: number, willGrow: boolean) {
		if (snakeIds.length <= 2) return true;

		search.scratchGrid.set(occupied);
		if (!willGrow) {
			search.scratchGrid[snakeIds[snakeIds.length - 1]] = 0;
		}
		search.scratchGrid[nextId] = 1;

		const futureTailId = willGrow
			? snakeIds[snakeIds.length - 1]
			: snakeIds[snakeIds.length - 2];

		search.scratchGrid[futureTailId] = 0;

		const path = bfsPath(
			nextId,
			futureTailId,
			graph.nbr4,
			search.scratchGrid,
			false,
		);

		search.scratchGrid[futureTailId] = 1;
		return path !== null;
	}

	function chooseSafeMove(preferredDir: Dir | null) {
		const headId = snakeIds[0];
		const safeMoves: Array<{ dir: Dir; score: number }> = [];

		for (const candidate of CARDINAL_DIRS) {
			const nextId = moveId(headId, candidate);
			if (nextId === -1) continue;

			const willGrow = nextId === appleId;
			if (wouldCollide(nextId, willGrow)) continue;
			if (!canReachTailAfterMove(nextId, willGrow)) continue;

			const applePoint = appleId >= 0 ? idToPoint(appleId) : null;
			const nextPoint = idToPoint(nextId);
			const distanceToApple = applePoint
				? Math.abs(nextPoint.x - applePoint.x) + Math.abs(nextPoint.y - applePoint.y)
				: 0;
			const turnPenalty =
				candidate.x === dir.x && candidate.y === dir.y ? 0 : 0.25;

			safeMoves.push({
				dir: candidate,
				score: distanceToApple + turnPenalty,
			});
		}

		if (
			preferredDir &&
			safeMoves.some(
				(candidate) =>
					candidate.dir.x === preferredDir.x && candidate.dir.y === preferredDir.y,
			)
		) {
			return preferredDir;
		}

		safeMoves.sort((a, b) => a.score - b.score);
		return safeMoves[0]?.dir ?? preferredDir;
	}

	function autoDir() {
		const headId = snakeIds[0];
		if (appleId < 0) return null;

		const parents = buildCellTreeParents();
		const { path, dist, came } = aStarWithPenalties(headId, appleId, parents);

		if (!path || path.length === 0) {
			const fallbackPath = pathToApple();
			if (fallbackPath && fallbackPath.length >= 2) {
				return chooseSafeMove(dirFromIds(headId, fallbackPath[1]));
			}

			for (let i = 0; i < 4; i++) {
				const nextId = graph.adjAllowed[headId * 4 + i];
				if (nextId !== -1 && !occupied[nextId]) {
					return chooseSafeMove(dirFromIds(headId, nextId));
				}
			}

			return chooseSafeMove(null);
		}

		if (stepsR.current > 110) {
			const simulationGrid = buildBlocked(false).slice();
			const snakeAfter = snakeIds.slice();

			for (let i = 0; i < path.length; i++) {
				const nextId = path[i];
				simulationGrid[nextId] = 1;
				snakeAfter.unshift(nextId);

				if (nextId !== appleId) {
					const tailId = snakeAfter.pop();
					if (tailId !== undefined) {
						simulationGrid[tailId] = 0;
					}
				}
			}

			const parentsAfter = buildCellTreeParents(snakeAfter);
			const reach = floodReachable(parentsAfter, simulationGrid, snakeAfter[0]);
			const blockedNow = buildBlocked(false);
			let bestId = -1;
			let bestDistance = Infinity;

			for (let i = 0; i < size; i++) {
				if (blockedNow[i] || reach[i]) continue;

				const distance = dist[i];
				if (distance < bestDistance) {
					bestDistance = distance;
					bestId = i;
				}
			}

			if (bestId !== -1 && bestDistance < A_STAR_INF) {
				const firstStepId = firstStepToward(came, headId, bestId);
				if (firstStepId !== -1) {
					return chooseSafeMove(dirFromIds(headId, firstStepId));
				}
			}
		}

		let nextDir = dirFromIds(headId, path[0]);
		const currentCellId = cellId(headId);
		const appleCellId = cellId(appleId);
		const inside = cellMoveInside(headId);
		const suggestedInside = nextDir.x === inside.x && nextDir.y === inside.y;

		if (lastCellId === currentCellId) {
			insideStreak = suggestedInside ? insideStreak + 1 : 0;
		} else {
			insideStreak = suggestedInside ? 1 : 0;
		}

		lastCellId = currentCellId;

		if (insideStreak >= 3 && appleCellId !== currentCellId) {
			const forced = cellMoveOutside(headId);
			const nextHeadId = moveId(headId, forced);

			if (nextHeadId !== -1 && !wouldCollide(nextHeadId, nextHeadId === appleId)) {
				insideStreak = 0;
				nextDir = forced;
			}
		}

		return chooseSafeMove(nextDir);
	}

	function reset() {
		reseed();
		resetFreeCells();

		const x =
			Math.floor(rng.next() * Math.max(4, boardSize - 10)) + 3;
		const y =
			Math.floor(rng.next() * Math.max(4, boardSize - 10)) + 3;
		const headId = y * boardSize + x;

		snakeIds = [headId];
		occupy(headId);
		queued = null;
		lastCellId = -1;
		insideStreak = 0;
		overlayVersion = -1;
		overlayPathIds = null;
		appleId = -1;

		placeApple();
		dir = pickInitialDir();
		scoreR.current = 0;
		stepsR.current = 0;
		setScore(0);
		setSteps(0);
		setGameOverValue(false);
		setWinValue(false);
		setPausedValue(false);
		justReset.current = true;
		lastCellId = cellId(headId);
	}

	function step() {
		if (appleId < 0) {
			setGameOverValue(true);
			setPausedValue(true);
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

		const nextHeadId = moveId(snakeIds[0], dir);
		if (nextHeadId === -1) {
			setGameOverValue(true);
			setPausedValue(true);
			return;
		}

		const willGrow = nextHeadId === appleId;
		if (wouldCollide(nextHeadId, willGrow)) {
			setGameOverValue(true);
			setPausedValue(true);
			return;
		}

		snakeIds.unshift(nextHeadId);
		occupy(nextHeadId);

		if (willGrow) {
			scoreR.current += 1;

			if (snakeIds.length === size) {
				appleId = -1;
				setWinValue(true);
				setGameOverValue(true);
				setPausedValue(true);
				markChanged();
				return;
			}

			placeApple();
		} else {
			const tailId = snakeIds.pop();
			if (tailId !== undefined) {
				release(tailId);
			}
			markChanged();
		}

		stepsR.current += 1;
	}

	return {
		getAppleId: () => appleId,
		getDir: () => dir,
		getOverlayPathIds: () => {
			if (overlayVersion !== stateVersion) {
				overlayPathIds = pathToApple();
				overlayVersion = stateVersion;
			}

			return overlayPathIds;
		},
		getSnakeIds: () => snakeIds,
		queueDir: (nextDir: Dir) => {
			queued = nextDir;
		},
		reset,
		step,
	};
}

export default function SnakePhaser({
	boardSize = 20,
	cellPx = 40,
	initialSpeed = 5,
	seed,
	className = "",
}: {
	boardSize?: number;
	cellPx?: number;
	initialSpeed?: number;
	seed?: number;
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
	const winRef = useRef(win);
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
				seed,
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
	}, [boardSize, cellPx, seed]);

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

		const delay = 300;
		const r0 = 0.35;
		const k = 5;

		let last = performance.now();
		let seeded = false;

		const loop = (now: number) => {
			if (!holdRAF.current) return;

			const elapsed = now - holdStart.current;

			if (elapsed >= delay && !seeded) {
				seeded = true;
				stepSpeed(holdDir.current, 1);
				holdClicksAcc.current = 0;
				last = now;
			}

			if (elapsed < delay) {
				holdRAF.current = requestAnimationFrame(loop);
				return;
			}

			const dt = (now - last) / 1000;
			last = now;
			const t = (elapsed - delay) / 1000;
			const clicksPerSec = r0 * Math.exp(k * t);

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
					onClick={() => {
						const nextPaused = !pausedRef.current;
						pausedRef.current = nextPaused;
						setPaused(nextPaused);
					}}
				>
					{paused ? "Resume" : "Pause"}
				</button>
				<button
					type="button"
					className={`px-3 py-1 rounded border border-zinc-700 ${
						autoPlay ? "bg-emerald-700" : "bg-zinc-800/80 hover:bg-zinc-700"
					}`}
					onClick={() => {
						const nextAutoPlay = !autoRef.current;
						autoRef.current = nextAutoPlay;
						setAutoPlay(nextAutoPlay);
					}}
				>
					{autoPlay ? "Autoplay" : "Manual"}
				</button>
				<button
					type="button"
					className={`px-3 py-1 rounded border border-zinc-700 ${
						showArrows ? "bg-fuchsia-700" : "bg-zinc-800/80 hover:bg-zinc-700"
					}`}
					onClick={() => {
						const nextShowArrows = !arrowsRef.current;
						arrowsRef.current = nextShowArrows;
						setShowArrows(nextShowArrows);
					}}
				>
					{showArrows ? "Arrows On" : "Arrows Off"}
				</button>
				<button
					type="button"
					className="px-3 py-1 rounded bg-zinc-800/80 border border-zinc-700 hover:bg-zinc-700"
					onClick={() => {
						resetBus.current = true;
						pausedRef.current = false;
						overRef.current = false;
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
