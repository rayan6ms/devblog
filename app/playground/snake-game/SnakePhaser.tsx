"use client";

import {
	type Dispatch,
	type RefObject,
	type SetStateAction,
	useEffect,
	useRef,
	useState,
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

type RgbColor = {
	r: number;
	g: number;
	b: number;
};

type SnakeTheme = {
	key: string;
	label: string;
	description: string;
	accent: string;
	snakeHead: RgbColor;
	snakeTail: RgbColor;
	snakeEye: string;
};

type BoardTheme = {
	key: string;
	label: string;
	boardBg: string;
	cellStart: string;
	cellEnd: string;
	boardShadow: string;
	arrow: string;
	path: string;
	pathDot: string;
	overlayTint: string;
	overlayText: string;
	appleStem: string;
	appleBody: string;
	appleShadow: string;
	stageGlow: string;
	stageGrid: string;
};

type LoadStatus = "loading" | "ready" | "error";

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
	bodyGapRef: MutableRef<boolean>;
	lastUiSync: MutableRef<number>;
	themeRef: MutableRef<SnakeTheme>;
	boardThemeRef: MutableRef<BoardTheme>;
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
const SPEED_MIN = 1;
const SPEED_MAX = 100;
const SPEED_STEP = 0.5;
const STAGE_PADDING = 8;
const SNAKE_COLOR_INTERVALS = 15;
const SNAKE_COLOR_SOFT_END = 11 / 15;

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

const SNAKE_THEMES: readonly SnakeTheme[] = [
	{
		key: "classic",
		label: "Original",
		description: "The original green-to-blue arcade body with red eyes.",
		accent: "#22c55e",
		snakeHead: { r: 0, g: 255, b: 0 },
		snakeTail: { r: 0, g: 0, b: 255 },
		snakeEye: "rgb(255 96 96)",
	},
	{
		key: "solar-flare",
		label: "Solar Flare",
		description: "Gold head fading into hot pink.",
		accent: "#fb923c",
		snakeHead: { r: 251, g: 191, b: 36 },
		snakeTail: { r: 236, g: 72, b: 153 },
		snakeEye: "rgb(255 249 196)",
	},
	{
		key: "midnight-bloom",
		label: "Midnight Bloom",
		description: "Pink head tapering into violet.",
		accent: "#c084fc",
		snakeHead: { r: 244, g: 114, b: 182 },
		snakeTail: { r: 129, g: 140, b: 248 },
		snakeEye: "rgb(255 255 255)",
	},
	{
		key: "glacier",
		label: "Glacier",
		description: "Ice blue head with a mint tail.",
		accent: "#67e8f9",
		snakeHead: { r: 125, g: 211, b: 252 },
		snakeTail: { r: 16, g: 185, b: 129 },
		snakeEye: "rgb(224 242 254)",
	},
	{
		key: "toxic",
		label: "Toxic",
		description: "Acid lime head with a deep purple tail.",
		accent: "#a3e635",
		snakeHead: { r: 163, g: 230, b: 53 },
		snakeTail: { r: 88, g: 28, b: 135 },
		snakeEye: "rgb(250 250 250)",
	},
	{
		key: "ember",
		label: "Ember",
		description: "Flame orange body cooling into crimson.",
		accent: "#f97316",
		snakeHead: { r: 249, g: 115, b: 22 },
		snakeTail: { r: 190, g: 24, b: 93 },
		snakeEye: "rgb(255 245 157)",
	},
	{
		key: "lagoon",
		label: "Lagoon",
		description: "Bright aqua blending into ocean blue.",
		accent: "#22d3ee",
		snakeHead: { r: 34, g: 211, b: 238 },
		snakeTail: { r: 37, g: 99, b: 235 },
		snakeEye: "rgb(240 253 250)",
	},
	{
		key: "candy",
		label: "Candy",
		description: "Bubblegum pink sliding into cherry red.",
		accent: "#fb7185",
		snakeHead: { r: 251, g: 113, b: 133 },
		snakeTail: { r: 220, g: 38, b: 38 },
		snakeEye: "rgb(255 255 255)",
	},
	{
		key: "citrus",
		label: "Citrus",
		description: "Lemon yellow with a tangerine finish.",
		accent: "#facc15",
		snakeHead: { r: 250, g: 204, b: 21 },
		snakeTail: { r: 249, g: 115, b: 22 },
		snakeEye: "rgb(120 53 15)",
	},
	{
		key: "forest",
		label: "Forest",
		description: "Fresh green body fading into dark pine.",
		accent: "#4ade80",
		snakeHead: { r: 74, g: 222, b: 128 },
		snakeTail: { r: 21, g: 128, b: 61 },
		snakeEye: "rgb(240 253 244)",
	},
	{
		key: "royal",
		label: "Royal",
		description: "Lavender highlights with a cobalt tail.",
		accent: "#818cf8",
		snakeHead: { r: 196, g: 181, b: 253 },
		snakeTail: { r: 67, g: 56, b: 202 },
		snakeEye: "rgb(255 255 255)",
	},
	{
		key: "mono",
		label: "Monochrome",
		description: "White body fading into graphite.",
		accent: "#e5e7eb",
		snakeHead: { r: 255, g: 255, b: 255 },
		snakeTail: { r: 82, g: 82, b: 91 },
		snakeEye: "rgb(239 68 68)",
	},
] as const;

const BOARD_THEMES: readonly BoardTheme[] = [
	{
		key: "classic",
		label: "Classic",
		boardBg: "rgb(18 18 18)",
		cellStart: "rgba(122, 122, 122, 0.92)",
		cellEnd: "rgba(76, 76, 76, 0.92)",
		boardShadow: "rgba(255, 255, 255, 0.08)",
		arrow: "rgb(220 80 120)",
		path: "rgb(70 150 255)",
		pathDot: "rgba(70, 150, 255, 0.55)",
		overlayTint: "rgba(0, 0, 0, 0.62)",
		overlayText: "rgb(255 255 255)",
		appleStem: "#2EAD53",
		appleBody: "#BA222E",
		appleShadow: "#821C29",
		stageGlow: "rgba(56, 189, 248, 0.14)",
		stageGrid: "rgba(125, 211, 252, 0.12)",
	},
	{
		key: "ember",
		label: "Ember",
		boardBg: "rgb(28 14 9)",
		cellStart: "rgba(251, 146, 60, 0.84)",
		cellEnd: "rgba(194, 65, 12, 0.84)",
		boardShadow: "rgba(251, 146, 60, 0.12)",
		arrow: "rgb(251 146 60)",
		path: "rgb(244 114 182)",
		pathDot: "rgba(244, 114, 182, 0.58)",
		overlayTint: "rgba(20, 9, 4, 0.68)",
		overlayText: "rgb(255 237 213)",
		appleStem: "#65A30D",
		appleBody: "#FB7185",
		appleShadow: "#9F1239",
		stageGlow: "rgba(251, 146, 60, 0.16)",
		stageGrid: "rgba(253, 186, 116, 0.12)",
	},
	{
		key: "midnight",
		label: "Midnight",
		boardBg: "rgb(9 13 28)",
		cellStart: "rgba(129, 140, 248, 0.78)",
		cellEnd: "rgba(79, 70, 229, 0.78)",
		boardShadow: "rgba(196, 181, 253, 0.12)",
		arrow: "rgb(244 114 182)",
		path: "rgb(129 140 248)",
		pathDot: "rgba(129, 140, 248, 0.55)",
		overlayTint: "rgba(7, 9, 20, 0.72)",
		overlayText: "rgb(241 245 249)",
		appleStem: "#34D399",
		appleBody: "#F472B6",
		appleShadow: "#9D174D",
		stageGlow: "rgba(192, 132, 252, 0.16)",
		stageGrid: "rgba(196, 181, 253, 0.12)",
	},
	{
		key: "glacier",
		label: "Glacier",
		boardBg: "rgb(6 24 30)",
		cellStart: "rgba(103, 232, 249, 0.72)",
		cellEnd: "rgba(45, 212, 191, 0.7)",
		boardShadow: "rgba(103, 232, 249, 0.1)",
		arrow: "rgb(34 197 94)",
		path: "rgb(34 211 238)",
		pathDot: "rgba(34, 211, 238, 0.5)",
		overlayTint: "rgba(4, 17, 21, 0.68)",
		overlayText: "rgb(236 254 255)",
		appleStem: "#84CC16",
		appleBody: "#F97316",
		appleShadow: "#9A3412",
		stageGlow: "rgba(34, 211, 238, 0.14)",
		stageGrid: "rgba(103, 232, 249, 0.12)",
	},
] as const;

function cycleOption<T>(values: readonly T[], current: T) {
	const index = values.indexOf(current);
	return values[(index + 1) % values.length] ?? values[0];
}

function mixColor(from: RgbColor, to: RgbColor, amount: number): RgbColor {
	const t = Math.max(0, Math.min(1, amount));
	return {
		r: Math.round(from.r + (to.r - from.r) * t),
		g: Math.round(from.g + (to.g - from.g) * t),
		b: Math.round(from.b + (to.b - from.b) * t),
	};
}

function colorToCss(color: RgbColor, alpha?: number) {
	if (alpha === undefined) {
		return `rgb(${color.r} ${color.g} ${color.b})`;
	}

	return `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
}

function snapToDevicePixels(value: number, scale: number) {
	return Math.round(value * scale) / scale;
}

function getBoardInset(cellPx: number) {
	return Math.max(2, Math.floor(cellPx * 0.2));
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

function drawCornerRoundedRect(
	context: CanvasRenderingContext2D,
	x: number,
	y: number,
	width: number,
	height: number,
	radii: { tl: number; tr: number; br: number; bl: number },
): void {
	const tl = Math.max(0, Math.min(radii.tl, width / 2, height / 2));
	const tr = Math.max(0, Math.min(radii.tr, width / 2, height / 2));
	const br = Math.max(0, Math.min(radii.br, width / 2, height / 2));
	const bl = Math.max(0, Math.min(radii.bl, width / 2, height / 2));

	context.beginPath();
	context.moveTo(x + tl, y);
	context.lineTo(x + width - tr, y);
	if (tr > 0) context.quadraticCurveTo(x + width, y, x + width, y + tr);
	else context.lineTo(x + width, y);
	context.lineTo(x + width, y + height - br);
	if (br > 0)
		context.quadraticCurveTo(x + width, y + height, x + width - br, y + height);
	else context.lineTo(x + width, y + height);
	context.lineTo(x + bl, y + height);
	if (bl > 0) context.quadraticCurveTo(x, y + height, x, y + height - bl);
	else context.lineTo(x, y + height);
	context.lineTo(x, y + tl);
	if (tl > 0) context.quadraticCurveTo(x, y, x + tl, y);
	else context.lineTo(x, y);
	context.closePath();
	context.fill();
}

function createCanvasLayer(width: number, height: number): HTMLCanvasElement {
	const canvas = document.createElement("canvas");
	canvas.width = width;
	canvas.height = height;
	return canvas;
}

function createBoardLayer(
	boardSize: number,
	cellPx: number,
	boardTheme: BoardTheme,
): HTMLCanvasElement {
	const boardInset = getBoardInset(cellPx);
	const width = boardSize * cellPx + boardInset * 2;
	const height = boardSize * cellPx + boardInset * 2;
	const canvas = createCanvasLayer(width, height);
	const context = canvas.getContext("2d");

	if (!context) {
		throw new Error("Unable to create board canvas.");
	}

	context.imageSmoothingEnabled = false;
	context.fillStyle = boardTheme.boardBg;
	context.fillRect(0, 0, width, height);
	context.strokeStyle = boardTheme.boardShadow;
	context.lineWidth = Math.max(1, cellPx * 0.05);
	context.strokeRect(0.5, 0.5, width - 1, height - 1);

	const pad = Math.floor(cellPx * 0.2);
	const gap = pad >> 1;

	for (let x = 0; x < boardSize; x++) {
		for (let y = 0; y < boardSize; y++) {
			const gradient = context.createLinearGradient(
				boardInset + x * cellPx + gap,
				boardInset + y * cellPx + gap,
				boardInset + x * cellPx + cellPx - gap,
				boardInset + y * cellPx + cellPx - gap,
			);
			gradient.addColorStop(0, boardTheme.cellStart);
			gradient.addColorStop(1, boardTheme.cellEnd);
			context.fillStyle = gradient;
			drawRoundedRect(
				context,
				boardInset + x * cellPx + gap,
				boardInset + y * cellPx + gap,
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
	boardTheme: BoardTheme,
): HTMLCanvasElement {
	const boardInset = getBoardInset(cellPx);
	const width = boardSize * cellPx + boardInset * 2;
	const height = boardSize * cellPx + boardInset * 2;
	const canvas = createCanvasLayer(width, height);
	const context = canvas.getContext("2d");

	if (!context) {
		throw new Error("Unable to create direction hints canvas.");
	}

	context.imageSmoothingEnabled = false;
	context.strokeStyle = boardTheme.arrow;
	context.fillStyle = boardTheme.arrow;
	context.lineWidth = 1.25;

	for (let y = 0; y < boardSize; y++) {
		for (let x = 0; x < boardSize; x++) {
			const centerX = boardInset + x * cellPx + cellPx / 2;
			const centerY = boardInset + y * cellPx + cellPx / 2;
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

function createAppleSprite(cell: number, boardTheme: BoardTheme): HTMLCanvasElement {
	const canvas = document.createElement("canvas");
	canvas.width = cell;
	canvas.height = cell;

	const context = canvas.getContext("2d");
	if (!context) {
		throw new Error("Unable to create apple sprite canvas.");
	}

	context.imageSmoothingEnabled = false;

	const art: (string | null)[][] = [
		[null, boardTheme.appleStem, null, null, null],
		[null, boardTheme.appleBody, boardTheme.appleStem, boardTheme.appleBody, null],
		[
			boardTheme.appleShadow,
			boardTheme.appleBody,
			boardTheme.appleBody,
			boardTheme.appleBody,
			boardTheme.appleBody,
		],
		[
			boardTheme.appleShadow,
			boardTheme.appleBody,
			boardTheme.appleBody,
			boardTheme.appleBody,
			boardTheme.appleBody,
		],
		[
			boardTheme.appleShadow,
			boardTheme.appleShadow,
			boardTheme.appleBody,
			boardTheme.appleBody,
			boardTheme.appleBody,
		],
		[
			null,
			boardTheme.appleShadow,
			boardTheme.appleShadow,
			boardTheme.appleShadow,
			null,
		],
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
		bodyGapRef,
		overRef,
		winRef,
		resetBus,
		justReset,
		scoreR,
		stepsR,
		lastUiSync,
		themeRef,
		boardThemeRef,
		setPaused,
		setScore,
		setSteps,
		setGameOver,
		setWin,
	}: MountOptions,
): () => void {
	const boardInset = getBoardInset(cellPx);
	const width = boardSize * cellPx + boardInset * 2;
	const height = boardSize * cellPx + boardInset * 2;
	const graph = buildBoardGraph(boardSize);
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
	const renderScale =
		typeof window === "undefined"
			? 1
			: Math.max(1, window.devicePixelRatio || 1);
	let activeTheme = themeRef.current;
	let activeBoardTheme = boardThemeRef.current;
	let boardLayer = createBoardLayer(boardSize, cellPx, activeBoardTheme);
	let arrowsLayer = createDirectionHintsLayer(
		boardSize,
		cellPx,
		graph.dirmat,
		activeBoardTheme,
	);
	let appleSprite = createAppleSprite(cellPx, activeBoardTheme);

	function refreshThemeAssets(theme: SnakeTheme) {
		activeTheme = theme;
	}

	function refreshBoardThemeAssets(theme: BoardTheme) {
		activeBoardTheme = theme;
		boardLayer = createBoardLayer(boardSize, cellPx, theme);
		arrowsLayer = createDirectionHintsLayer(boardSize, cellPx, graph.dirmat, theme);
		appleSprite = createAppleSprite(cellPx, theme);
	}

	function drawPathOverlay(
		context: CanvasRenderingContext2D,
		pathIds: readonly number[] | null,
	) {
		if (!arrowsRef.current || overRef.current || winRef.current) return;
		if (!pathIds || pathIds.length <= 1) return;

		context.strokeStyle = activeBoardTheme.path;
		context.lineWidth = Math.max(2, cellPx * 0.08);
		context.beginPath();

		for (let i = 0; i < pathIds.length; i++) {
			const id = pathIds[i];
			const centerX = boardInset + (id % boardSize) * cellPx + cellPx / 2;
			const centerY = boardInset + ((id / boardSize) | 0) * cellPx + cellPx / 2;

			if (i === 0) context.moveTo(centerX, centerY);
			else context.lineTo(centerX, centerY);
		}

		context.stroke();

		context.fillStyle = activeBoardTheme.pathDot;
		const radius = Math.max(3, cellPx * 0.12);

		for (let i = 0; i < pathIds.length; i++) {
			const id = pathIds[i];
			const centerX = boardInset + (id % boardSize) * cellPx + cellPx / 2;
			const centerY = boardInset + ((id / boardSize) | 0) * cellPx + cellPx / 2;

			context.beginPath();
			context.arc(centerX, centerY, radius / 2, 0, Math.PI * 2);
			context.fill();
		}
	}

	function drawSnake(context: CanvasRenderingContext2D) {
		const snakeIds = engine.getSnakeIds();
		const dir = engine.getDir();
		const lastIndex = Math.max(1, snakeIds.length - 1);
		const occupied = new Set(snakeIds);
		const inBounds = (x: number, y: number) =>
			x >= 0 && y >= 0 && x < boardSize && y < boardSize;

		for (let i = 0; i < snakeIds.length; i++) {
			const id = snakeIds[i];
			const x = id % boardSize;
			const y = (id / boardSize) | 0;
			const progress =
				(i / Math.max(lastIndex, SNAKE_COLOR_INTERVALS)) * SNAKE_COLOR_SOFT_END;
			const segmentColor = mixColor(
				activeTheme.snakeHead,
				activeTheme.snakeTail,
				progress,
			);
			const inset = bodyGapRef.current ? Math.max(1, Math.floor(cellPx * 0.06)) : 0;
			const isHead = i === 0;
			const isTail = i === snakeIds.length - 1;
			const segmentRadius = bodyGapRef.current
				? Math.max(4, Math.floor(cellPx * 0.22))
				: Math.max(2, Math.floor(cellPx * 0.16));
			const drawX = snapToDevicePixels(boardInset + x * cellPx + inset, renderScale);
			const drawY = snapToDevicePixels(boardInset + y * cellPx + inset, renderScale);
			const drawSize = Math.max(
				1 / renderScale,
				snapToDevicePixels(cellPx - inset * 2, renderScale),
			);

			context.fillStyle = colorToCss(segmentColor, i === 0 ? 1 : 0.96);

			if (bodyGapRef.current) {
				drawRoundedRect(
					context,
					drawX,
					drawY,
					drawSize,
					drawSize,
					segmentRadius,
				);
			} else {
				let cornerRadii = { tl: 0, tr: 0, br: 0, bl: 0 };

				if (snakeIds.length === 1) {
					cornerRadii = {
						tl: segmentRadius,
						tr: segmentRadius,
						br: segmentRadius,
						bl: segmentRadius,
					};
				} else if (isHead || isTail) {
					const exposedDir =
						isHead
							? dir
							: (() => {
								const prev = snakeIds[snakeIds.length - 2] ?? id;
								const prevX = prev % boardSize;
								const prevY = (prev / boardSize) | 0;
								return { x: x - prevX, y: y - prevY };
							})();

					if (exposedDir.x === 1) {
						cornerRadii = { tl: 0, tr: segmentRadius, br: segmentRadius, bl: 0 };
					} else if (exposedDir.x === -1) {
						cornerRadii = { tl: segmentRadius, tr: 0, br: 0, bl: segmentRadius };
					} else if (exposedDir.y === -1) {
						cornerRadii = { tl: segmentRadius, tr: segmentRadius, br: 0, bl: 0 };
					} else {
						cornerRadii = { tl: 0, tr: 0, br: segmentRadius, bl: segmentRadius };
					}
				} else {
					const prevId = snakeIds[i - 1] ?? id;
					const nextId = snakeIds[i + 1] ?? id;
					const prevDir = {
						x: (prevId % boardSize) - x,
						y: ((prevId / boardSize) | 0) - y,
					};
					const nextDir = {
						x: (nextId % boardSize) - x,
						y: ((nextId / boardSize) | 0) - y,
					};

					if (prevDir.x !== nextDir.x && prevDir.y !== nextDir.y) {
						const exposedX = -(prevDir.x || nextDir.x);
						const exposedY = -(prevDir.y || nextDir.y);
						const diagonalX = x + exposedX;
						const diagonalY = y + exposedY;
						const diagonalBlocked =
							inBounds(diagonalX, diagonalY) &&
							occupied.has(diagonalY * boardSize + diagonalX);

						if (!diagonalBlocked) {
							if (exposedX === -1 && exposedY === -1) {
								cornerRadii.tl = segmentRadius;
							} else if (exposedX === 1 && exposedY === -1) {
								cornerRadii.tr = segmentRadius;
							} else if (exposedX === 1 && exposedY === 1) {
								cornerRadii.br = segmentRadius;
							} else if (exposedX === -1 && exposedY === 1) {
								cornerRadii.bl = segmentRadius;
							}
						}
					}
				}

				if (
					cornerRadii.tl === 0 &&
					cornerRadii.tr === 0 &&
					cornerRadii.br === 0 &&
					cornerRadii.bl === 0
				) {
					context.fillRect(
						snapToDevicePixels(boardInset + x * cellPx, renderScale),
						snapToDevicePixels(boardInset + y * cellPx, renderScale),
						snapToDevicePixels(cellPx, renderScale),
						snapToDevicePixels(cellPx, renderScale),
					);
				} else {
					drawCornerRoundedRect(
						context,
						drawX,
						drawY,
						drawSize,
						drawSize,
						cornerRadii,
					);
				}
			}

			if (!isHead) continue;

			context.fillStyle = activeTheme.snakeEye;
			const eye = Math.max(2, Math.floor(cellPx * 0.18));
			const drawEye = (eyeX: number, eyeY: number) => {
				context.fillRect(
					snapToDevicePixels(boardInset + eyeX, renderScale),
					snapToDevicePixels(boardInset + eyeY, renderScale),
					eye,
					eye,
				);
			};

			if (dir.x === 1) {
				drawEye(x * cellPx + cellPx * 0.58, y * cellPx + cellPx * 0.22);
				drawEye(x * cellPx + cellPx * 0.58, y * cellPx + cellPx * 0.6);
			} else if (dir.x === -1) {
				drawEye(x * cellPx + cellPx * 0.18, y * cellPx + cellPx * 0.22);
				drawEye(x * cellPx + cellPx * 0.18, y * cellPx + cellPx * 0.6);
			} else if (dir.y === -1) {
				drawEye(x * cellPx + cellPx * 0.22, y * cellPx + cellPx * 0.18);
				drawEye(x * cellPx + cellPx * 0.6, y * cellPx + cellPx * 0.18);
			} else {
				drawEye(x * cellPx + cellPx * 0.22, y * cellPx + cellPx * 0.58);
				drawEye(x * cellPx + cellPx * 0.6, y * cellPx + cellPx * 0.58);
			}
		}
	}

	function drawApple(context: CanvasRenderingContext2D) {
		const appleId = engine.getAppleId();
		if (appleId < 0 || overRef.current || winRef.current) return;

		const x = appleId % boardSize;
		const y = (appleId / boardSize) | 0;
		context.drawImage(appleSprite, boardInset + x * cellPx, boardInset + y * cellPx);
	}

	function drawOverlay(context: CanvasRenderingContext2D) {
		if (!pausedRef.current && !overRef.current) return;

		context.fillStyle = activeBoardTheme.overlayTint;
		context.fillRect(0, 0, width, height);
		context.fillStyle = activeBoardTheme.overlayText;
		context.textAlign = "center";
		context.textBaseline = "middle";
		context.font =
			'600 22px ui-monospace, "SFMono-Regular", "Cascadia Code", monospace';
		context.fillText(
			overRef.current ? (winRef.current ? "You Win!" : "Game Over") : "Paused",
			width / 2,
			height / 2 - 16,
		);
		context.font =
			'500 14px ui-monospace, "SFMono-Regular", "Cascadia Code", monospace';
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

		if (themeRef.current !== activeTheme) {
			refreshThemeAssets(themeRef.current);
		}
		if (boardThemeRef.current !== activeBoardTheme) {
			refreshBoardThemeAssets(boardThemeRef.current);
		}

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
		context.setTransform(renderScale, 0, 0, renderScale, 0, 0);
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

		if (key === "enter") {
			resetBus.current = true;
			pausedRef.current = false;
			overRef.current = false;
			winRef.current = false;
			setPaused(false);
			setGameOver(false);
			setWin(false);
			return;
		}

		if (overRef.current) return;

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
			this.game.canvas.width = Math.round(width * renderScale);
			this.game.canvas.height = Math.round(height * renderScale);
			this.game.canvas.style.width = `${width}px`;
			this.game.canvas.style.height = `${height}px`;
			this.game.canvas.style.display = "block";
			this.game.canvas.style.imageRendering = "pixelated";
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
		backgroundColor: activeBoardTheme.boardBg,
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
	const stageViewportRef = useRef<HTMLDivElement | null>(null);

	const [status, setStatus] = useState<LoadStatus>("loading");
	const [score, setScore] = useState(0);
	const [steps, setSteps] = useState(0);
	const [speed, setSpeed] = useState(
		Math.min(SPEED_MAX, Math.max(SPEED_MIN, initialSpeed)),
	);
	const [paused, setPaused] = useState(false);
	const [gameOver, setGameOver] = useState(false);
	const [win, setWin] = useState(false);
	const [autoPlay, setAutoPlay] = useState(true);
	const [showArrows, setShowArrows] = useState(false);
	const [boardDimension, setBoardDimension] = useState(boardSize);
	const [showBodyGap, setShowBodyGap] = useState(true);
	const [boardTheme, setBoardTheme] = useState<BoardTheme>(BOARD_THEMES[0]);
	const [theme, setTheme] = useState<SnakeTheme>(SNAKE_THEMES[0]);
	const [stageSize, setStageSize] = useState({ width: 0, height: 0 });

	const speedRef = useRef(speed);
	const pausedRef = useRef(paused);
	const autoRef = useRef(autoPlay);
	const arrowsRef = useRef(showArrows);
	const bodyGapRef = useRef(showBodyGap);
	const overRef = useRef(gameOver);
	const winRef = useRef(win);
	const themeRef = useRef(theme);
	const boardThemeRef = useRef(boardTheme);
	const resetBus = useRef(false);
	const justReset = useRef(false);
	const scoreR = useRef(0);
	const stepsR = useRef(0);
	const lastUiSync = useRef(0);
	const speedHoldTimeoutRef = useRef<number | null>(null);
	const speedHoldIntervalRef = useRef<number | null>(null);

	const safeBoardWidth = Math.max(
		0,
		stageSize.width - STAGE_PADDING,
	);
	const safeBoardHeight = Math.max(
		0,
		stageSize.height - STAGE_PADDING,
	);
	const resolvedCellPx =
		safeBoardWidth > 0 && safeBoardHeight > 0
			? Math.max(
				4,
				Math.min(
					cellPx,
					Math.floor(
						Math.min(
							safeBoardWidth / boardDimension,
							safeBoardHeight / boardDimension,
						),
					),
				),
			)
			: 0;
	const boardInsetPx = getBoardInset(resolvedCellPx);
	const boardPixelSize = resolvedCellPx * boardDimension + boardInsetPx * 2;
	const length = score + 1;
	const statusLabel =
		status === "loading" ? "Loading" : status === "error" ? "Error" : "Ready";
	const sessionLabel = gameOver
		? win
			? "Won"
			: "Game Over"
		: paused
			? "Paused"
			: statusLabel;

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
		bodyGapRef.current = showBodyGap;
	}, [showBodyGap]);

	useEffect(() => {
		overRef.current = gameOver;
	}, [gameOver]);

	useEffect(() => {
		winRef.current = win;
	}, [win]);

	useEffect(() => {
		themeRef.current = theme;
	}, [theme]);

	useEffect(() => {
		boardThemeRef.current = boardTheme;
	}, [boardTheme]);

	useEffect(() => {
		setBoardDimension(boardSize);
	}, [boardSize]);

	useEffect(() => {
		const node = stageViewportRef.current;
		if (!node) return;

		const syncSize = (width: number, height: number) => {
			const next = {
				width: Math.max(0, Math.floor(width)),
				height: Math.max(0, Math.floor(height)),
			};
			setStageSize((current) =>
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
		if (!hostRef.current || resolvedCellPx < 4) return;

		let cleanup: (() => void) | null = null;
		let cancelled = false;

		(async () => {
			if (!hostRef.current) return;

			try {
				setStatus("loading");
				const phaserModule = await import("phaser");
				if (cancelled || !hostRef.current) return;

				const PhaserLib = ("default" in phaserModule
					? phaserModule.default
					: phaserModule) as PhaserModule;

				cleanup = mountSnakeGame(hostRef.current, PhaserLib, {
					boardSize: boardDimension,
					cellPx: resolvedCellPx,
					seed,
					speedRef,
					pausedRef,
					autoRef,
					arrowsRef,
					bodyGapRef,
					overRef,
					winRef,
					resetBus,
					justReset,
					scoreR,
					stepsR,
					lastUiSync,
					themeRef,
					boardThemeRef,
					setPaused,
					setScore,
					setSteps,
					setGameOver,
					setWin,
				});
				setStatus("ready");
			} catch {
				if (!cancelled) {
					setStatus("error");
				}
			}
		})();

		return () => {
			cancelled = true;
			cleanup?.();
		};
	}, [boardDimension, resolvedCellPx, seed]);

	function stepSpeed(direction: 1 | -1, clicks = 1) {
		setSpeed((currentSpeed) => {
			let nextSpeed = currentSpeed + direction * SPEED_STEP * clicks;
			if (!Number.isFinite(nextSpeed)) nextSpeed = currentSpeed;
			nextSpeed = Math.max(SPEED_MIN, Math.min(SPEED_MAX, nextSpeed));
			return +nextSpeed.toFixed(1);
		});
	}

	function clearSpeedHold() {
		if (speedHoldTimeoutRef.current !== null) {
			window.clearTimeout(speedHoldTimeoutRef.current);
			speedHoldTimeoutRef.current = null;
		}

		if (speedHoldIntervalRef.current !== null) {
			window.clearInterval(speedHoldIntervalRef.current);
			speedHoldIntervalRef.current = null;
		}
	}

	function startSpeedHold(direction: 1 | -1) {
		clearSpeedHold();
		stepSpeed(direction);
		speedHoldTimeoutRef.current = window.setTimeout(() => {
			speedHoldIntervalRef.current = window.setInterval(() => {
				stepSpeed(direction);
			}, 80);
		}, 240);
	}

	useEffect(() => {
		return () => {
			if (speedHoldTimeoutRef.current !== null) {
				window.clearTimeout(speedHoldTimeoutRef.current);
			}
			if (speedHoldIntervalRef.current !== null) {
				window.clearInterval(speedHoldIntervalRef.current);
			}
		};
	}, []);

	function restartGame() {
		resetBus.current = true;
		pausedRef.current = false;
		overRef.current = false;
		winRef.current = false;
		setPaused(false);
		setGameOver(false);
		setWin(false);
	}

	return (
		<div
			className={`snake-root flex h-full min-h-0 w-full select-none flex-col overflow-hidden rounded-[30px] border border-[#243347] bg-[radial-gradient(circle_at_top,#173150_0%,#0b1422_35%,#050810_100%)] text-slate-100 shadow-[0_28px_90px_rgba(0,0,0,0.45)] ${className}`}
		>
			<style jsx>{`
				.snake-root,
				.snake-root * {
					-webkit-user-select: none !important;
					user-select: none !important;
				}
			`}</style>
			<div className="border-b border-[#233247] bg-[#07111d]/92 backdrop-blur">
				<div className="flex flex-wrap items-center gap-3 px-4 py-4 sm:px-5">
					<div className="mr-auto min-w-48">
						<div className="font-mono text-sm font-semibold uppercase tracking-[0.28em] text-slate-100">
							Snake Grid
						</div>
						<div className="font-mono text-xs text-slate-400">
							Classic snake, plenty of snake palettes, and a responsive square stage.
						</div>
					</div>
					<div className="flex flex-wrap items-center gap-2 font-mono text-xs text-slate-200">
						<div className="rounded-full border border-[#1b2535] bg-[#0b1320] px-3 py-1.5 text-slate-300">
							Score {score}
						</div>
						<div className="rounded-full border border-[#1b2535] bg-[#0b1320] px-3 py-1.5 text-slate-300">
							Length {length}
						</div>
						<div className="rounded-full border border-[#1b2535] bg-[#0b1320] px-3 py-1.5 text-slate-300">
							Steps {steps}
						</div>
						<div className="rounded-full border border-[#1b2535] bg-[#0b1320] px-3 py-1.5 text-slate-300">
							Mode {autoPlay ? "Auto" : "Manual"}
						</div>
						<div className="rounded-full border border-[#1b2535] bg-[#0b1320] px-3 py-1.5 text-slate-300">
							Theme {boardTheme.label}
						</div>
						<div className="rounded-full border border-[#1b2535] bg-[#0b1320] px-3 py-1.5 text-slate-300">
							Snake {theme.label}
						</div>
						<div className="rounded-full border border-[#1b2535] bg-[#0b1320] px-3 py-1.5 text-slate-300">
							{sessionLabel}
						</div>
					</div>
				</div>

				<div className="flex flex-wrap gap-2 px-4 pb-4 sm:px-5">
					<button
						type="button"
						className="select-none rounded-full bg-slate-100 px-4 py-2 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-slate-950 transition hover:bg-white"
						onClick={restartGame}
					>
						Restart
					</button>
					<button
						type="button"
						className="select-none rounded-full border border-[#223048] bg-[#0b1320] px-4 py-2 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-slate-100 transition hover:border-[#2d4262] hover:bg-[#10192a]"
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
						className="select-none rounded-full border border-[#223048] bg-[#0b1320] px-4 py-2 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-slate-100 transition hover:border-[#2d4262] hover:bg-[#10192a]"
						onClick={() => {
							const nextAutoPlay = !autoRef.current;
							autoRef.current = nextAutoPlay;
							setAutoPlay(nextAutoPlay);
						}}
					>
						{autoPlay ? "Autoplay On" : "Autoplay Off"}
					</button>
					<button
						type="button"
						className="select-none rounded-full border border-[#223048] bg-[#0b1320] px-4 py-2 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-slate-100 transition hover:border-[#2d4262] hover:bg-[#10192a]"
						onClick={() => {
							const nextShowArrows = !arrowsRef.current;
							arrowsRef.current = nextShowArrows;
							setShowArrows(nextShowArrows);
						}}
					>
						{showArrows ? "Path Hints On" : "Path Hints Off"}
					</button>
					<button
						type="button"
						className="select-none rounded-full border border-[#223048] bg-[#0b1320] px-4 py-2 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-slate-100 transition hover:border-[#2d4262] hover:bg-[#10192a]"
						onClick={() =>
							setBoardTheme((current) => cycleOption(BOARD_THEMES, current))
						}
					>
						Theme {boardTheme.label}
					</button>
					<button
						type="button"
						className="select-none rounded-full border border-[#223048] bg-[#0b1320] px-4 py-2 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-slate-100 transition hover:border-[#2d4262] hover:bg-[#10192a]"
						onClick={() =>
							setTheme((current) => cycleOption(SNAKE_THEMES, current))
						}
					>
						Snake Colors {theme.label}
					</button>
				</div>
			</div>

			<div className="grid min-h-0 flex-1 gap-3 px-4 pb-2 pt-2 sm:px-5 sm:pb-3 sm:pt-3 xl:grid-cols-[320px_minmax(0,1fr)]">
				<div className="flex min-h-0 flex-col gap-4">
					<div className="rounded-[26px] border border-[#223048] bg-[#09121e]/88 p-4 shadow-[0_16px_40px_rgba(0,0,0,0.28)]">
						<div className="flex items-start justify-between gap-3">
							<div>
								<p className="font-mono text-[11px] uppercase tracking-[0.22em] text-slate-400">
									Speed
								</p>
								<p className="mt-2 font-mono text-3xl font-semibold text-slate-100">
									{speed.toFixed(1)}
								</p>
							</div>
							<div className="rounded-full border border-[#223048] bg-[#0b1320] px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-slate-300">
								Moves / sec
							</div>
						</div>

						<div className="mt-4 flex items-center gap-3">
							<button
								type="button"
								className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#223048] bg-[#0b1320] text-xl text-slate-100 transition hover:border-[#2d4262] hover:bg-[#10192a]"
								onPointerDown={(event) => {
									event.preventDefault();
									event.currentTarget.setPointerCapture(event.pointerId);
									startSpeedHold(-1);
								}}
								onPointerUp={clearSpeedHold}
								onPointerCancel={clearSpeedHold}
								onContextMenu={(event) => event.preventDefault()}
								aria-label="Decrease speed"
							>
								-
							</button>
							<input
								type="range"
								min={SPEED_MIN}
								max={SPEED_MAX}
								step={SPEED_STEP}
								value={speed}
								onChange={(event) => {
									setSpeed(Number(event.target.value));
								}}
								className="h-2 w-full cursor-pointer appearance-none rounded-full bg-[#162234] accent-slate-100"
								aria-label="Snake speed"
							/>
							<button
								type="button"
								className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#223048] bg-[#0b1320] text-xl text-slate-100 transition hover:border-[#2d4262] hover:bg-[#10192a]"
								onPointerDown={(event) => {
									event.preventDefault();
									event.currentTarget.setPointerCapture(event.pointerId);
									startSpeedHold(1);
								}}
								onPointerUp={clearSpeedHold}
								onPointerCancel={clearSpeedHold}
								onContextMenu={(event) => event.preventDefault()}
								aria-label="Increase speed"
							>
								+
							</button>
						</div>

						<div className="mt-3 flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.18em] text-slate-500">
							<span>Precision {SPEED_STEP.toFixed(1)}</span>
							<span>
								Range {SPEED_MIN.toFixed(0)}-{SPEED_MAX.toFixed(0)}
							</span>
						</div>
						<p className="mt-3 font-mono text-xs leading-6 text-slate-400">
							Tap for exact half-step changes or hold either side to sweep the slider.
						</p>
					</div>

					<div className="rounded-[26px] border border-[#223048] bg-[#09121e]/88 p-4 shadow-[0_16px_40px_rgba(0,0,0,0.28)]">
						<div className="flex items-center gap-3">
							<span
								className="h-3 w-3 rounded-full"
								style={{ backgroundColor: theme.accent }}
							/>
							<div>
								<p className="font-mono text-[11px] uppercase tracking-[0.22em] text-slate-400">
									Snake Palette
								</p>
								<p className="mt-1 font-mono text-lg text-slate-100">
									{theme.label}
								</p>
							</div>
						</div>
						<p className="mt-3 font-mono text-xs leading-6 text-slate-400">
							{theme.description}
						</p>
						<div className="mt-4 grid grid-cols-2 gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-slate-300">
							<div className="rounded-2xl border border-[#223048] bg-[#0b1320] px-3 py-2">
								Theme {boardTheme.label}
							</div>
							<div className="rounded-2xl border border-[#223048] bg-[#0b1320] px-3 py-2">
								Controls WASD / Arrows
							</div>
							<div className="rounded-2xl border border-[#223048] bg-[#0b1320] px-3 py-2">
								Space Pause
							</div>
							<div className="rounded-2xl border border-[#223048] bg-[#0b1320] px-3 py-2">
								Enter Restart
							</div>
							<div className="rounded-2xl border border-[#223048] bg-[#0b1320] px-3 py-2">
								Board {boardDimension}x{boardDimension}
							</div>
						</div>

						<div className="mt-4 border-t border-[#223048] pt-4">
							<div className="flex items-start justify-between gap-3">
								<div>
									<p className="font-mono text-[11px] uppercase tracking-[0.22em] text-slate-400">
										Board Size
									</p>
									<p className="mt-1 font-mono text-lg text-slate-100">
										{boardDimension} x {boardDimension}
									</p>
								</div>
								<button
									type="button"
									className="rounded-full border border-[#223048] bg-[#0b1320] px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-slate-300"
									onClick={() => setShowBodyGap((current) => !current)}
								>
									Body Gap {showBodyGap ? "On" : "Off"}
								</button>
							</div>
							<input
								type="range"
								min={10}
								max={30}
								step={2}
								value={boardDimension}
								onChange={(event) => {
									setBoardDimension(Number(event.target.value));
								}}
								className="mt-4 h-2 w-full cursor-pointer appearance-none rounded-full bg-[#162234] accent-slate-100"
								aria-label="Board size"
							/>
							<div className="mt-3 flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.18em] text-slate-500">
								<span>10 x 10</span>
								<span>Default 20 x 20</span>
								<span>30 x 30</span>
							</div>
						</div>
					</div>
				</div>

				<div
					ref={stageViewportRef}
					className="relative min-h-[380px] overflow-hidden rounded-[28px] border border-[#223048] bg-[#07111d]/80"
				>
					<div
						className="pointer-events-none absolute inset-0"
						style={{
							backgroundImage: `radial-gradient(circle at top, ${boardTheme.stageGlow}, transparent 55%), linear-gradient(135deg, ${boardTheme.stageGrid} 0, transparent 32%, transparent 68%, ${boardTheme.stageGrid} 100%)`,
						}}
					/>
					<div className="absolute inset-0 grid place-items-center overflow-hidden p-0">
						{boardPixelSize > 0 && (
							<div
								ref={hostRef}
								className="overflow-hidden bg-[#050810] ring-1 ring-inset ring-[#26344d] shadow-[0_24px_70px_rgba(0,0,0,0.38)]"
								style={{
									width: boardPixelSize,
									height: boardPixelSize,
									maxWidth: "100%",
									maxHeight: "100%",
									borderRadius: Math.max(6, boardInsetPx * 1.15),
									imageRendering: "pixelated",
								}}
							/>
						)}
					</div>

					{status === "loading" && (
						<div className="absolute inset-0 grid place-items-center bg-[#050810]/72 px-6 text-center font-mono text-sm text-slate-300">
							Booting Phaser scene...
						</div>
					)}

					{status === "error" && (
						<div className="absolute inset-0 grid place-items-center bg-[#050810]/82 px-6 text-center font-mono text-sm text-rose-300">
							Unable to load the snake scene.
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
