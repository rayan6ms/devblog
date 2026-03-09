"use client";

import { Chess, type Color, type PieceSymbol, type Square } from "chess.js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type PhaserModule = typeof import("phaser");
type PhaserGame = import("phaser").Game;
type PhaserScene = import("phaser").Scene;
type PhaserCanvasRenderer = import("phaser").Renderer.Canvas.CanvasRenderer;

const COLORS = {
	light: "#a1a1aa",
	dark: "#374151",
	selected: "rgba(199,210,254,0.8)",
	lastMove: "rgba(254,215,170,0.8)",
	capture: "rgba(254,202,202,0.8)",
	check: "rgba(239,68,68,0.6)",
	dot: "rgba(165,180,252,1)",
	whitePiece: "#e5e7eb",
	blackPiece: "#0f172a",
	dim: "rgba(0,0,0,0.55)",
	hint: "rgba(240,209,86,0.70)",
};

const PIECE_FONT =
	'"Segoe UI Symbol","Noto Sans Symbols 2","Apple Symbols","Arial Unicode MS",serif';

const GLYPH: Record<PieceSymbol, { w: string; b: string }> = {
	p: { w: "♙", b: "♟" },
	r: { w: "♖", b: "♜" },
	n: { w: "♘", b: "♞" },
	b: { w: "♗", b: "♝" },
	q: { w: "♕", b: "♛" },
	k: { w: "♔", b: "♚" },
};

const PIECE_VALUE: Record<PieceSymbol, number> = {
	p: 1,
	n: 3,
	b: 3,
	r: 5,
	q: 9,
	k: 0,
};

const MOVE_TIME_LIMIT_MS = 3 * 60 * 1000;
const DEFAULT_DEPTH = 1;
const SKILL_FOR_DEPTH: Record<number, number> = { 1: 1, 3: 5, 6: 10, 10: 20 };
const HUMAN_ENGINE_DELAY_BASE = 4200;
const AI_VS_AI_DELAY_BASE = 3600;
const ENGINE_TIMEOUT_MS = 3200;

type PlayAs = "w" | "b" | null;
type HintsMode = "off" | "once" | "auto";
type PromotionPiece = "q" | "r" | "b" | "n";

type LoggedMove = {
	from: Square;
	to: Square;
	color: Color;
	fenBefore: string;
	fenAfter: string;
	promotion?: PieceSymbol;
	san?: string;
	piece?: PieceSymbol;
	captured?: PieceSymbol;
	timeMs?: number;
	acc?: number;
};

type MovePair = {
	index: number;
	w: { san: string; piece: PieceSymbol; timeMs: number; acc: number };
	b: { san: string; piece: PieceSymbol; timeMs: number; acc: number };
};

type BoardSnapshot = {
	game: Chess;
	playAs: PlayAs;
	flip: boolean;
	selected: Square | null;
	moves: Square[];
	lastMove: { from: Square; to: Square } | null;
	overlay: string | null;
	paused: boolean;
	hintMove: { from: Square; to: Square } | null;
};

type BoardMountOptions = {
	stateRef: React.MutableRefObject<BoardSnapshot>;
	onSquareClick: (square: Square) => void;
	onBoardResize: (size: number) => void;
};

function materialTotals(game: Chess) {
	let w = 0;
	let b = 0;
	for (let file = 0; file < 8; file += 1) {
		for (let rank = 0; rank < 8; rank += 1) {
			const square = toSquare(file, rank);
			const piece = game.get(square);
			if (!piece) continue;
			if (piece.color === "w") w += PIECE_VALUE[piece.type];
			else b += PIECE_VALUE[piece.type];
		}
	}
	return { w, b };
}

function materialScore(game: Chess) {
	let w = 0;
	let b = 0;
	for (let file = 0; file < 8; file += 1) {
		for (let rank = 0; rank < 8; rank += 1) {
			const square = toSquare(file, rank);
			const piece = game.get(square);
			if (!piece) continue;
			if (piece.color === "w") w += PIECE_VALUE[piece.type];
			else b += PIECE_VALUE[piece.type];
		}
	}
	return w - b;
}

function fmtSec(ms: number) {
	return `${(ms / 1000).toFixed(1)}s`;
}

function thinkDelay(base: number, variance = 0.45, min = 2100, max = 5200) {
	const jitter = base * variance;
	const delayed = Math.round(base + (Math.random() * 2 - 1) * jitter);
	return Math.max(min, Math.min(max, delayed));
}

function toSquare(file: number, rank: number): Square {
	return `${String.fromCharCode(97 + file)}${rank + 1}` as Square;
}

function parseUCIMove(uci: string) {
	const promotion = normalizePromotion(uci[4]);
	return {
		from: uci.slice(0, 2) as Square,
		to: uci.slice(2, 4) as Square,
		promotion,
	};
}

function normalizePromotion(value: string | undefined): PromotionPiece | undefined {
	return value === "q" || value === "r" || value === "b" || value === "n"
		? value
		: undefined;
}

function findCheckedKingSquare(game: Chess): Square | null {
	if (!game.inCheck()) return null;
	const color = game.turn();
	for (let file = 0; file < 8; file += 1) {
		for (let rank = 0; rank < 8; rank += 1) {
			const square = toSquare(file, rank);
			const piece = game.get(square);
			if (piece && piece.type === "k" && piece.color === color) return square;
		}
	}
	return null;
}

function randomLegalUCIMove(fen: string) {
	const game = new Chess(fen);
	const moves = game.moves({ verbose: true });
	if (moves.length === 0) return "";
	const move = moves[Math.floor(Math.random() * moves.length)];
	return `${move.from}${move.to}${move.promotion || ""}`;
}

function resolveBoardSize(host: HTMLDivElement) {
	const rect = host.getBoundingClientRect();
	return Math.max(1, Math.floor(host.clientWidth || rect.width || 560));
}

function squareToDisplay(square: Square, flipped: boolean) {
	const file = square.charCodeAt(0) - 97;
	const rank = Number(square[1]) - 1;
	return {
		file: flipped ? 7 - file : file,
		rank: flipped ? rank : 7 - rank,
	};
}

function squareFromPoint(
	x: number,
	y: number,
	boardSize: number,
	flipped: boolean,
): Square | null {
	if (x < 0 || y < 0 || x >= boardSize || y >= boardSize) return null;
	const cell = boardSize / 8;
	const displayFile = Math.floor(x / cell);
	const displayRank = Math.floor(y / cell);
	const file = flipped ? 7 - displayFile : displayFile;
	const rank = flipped ? displayRank : 7 - displayRank;
	return toSquare(file, rank);
}

function tintSquare(
	context: CanvasRenderingContext2D,
	square: Square,
	flipped: boolean,
	cell: number,
	color: string,
) {
	const position = squareToDisplay(square, flipped);
	context.fillStyle = color;
	context.fillRect(position.file * cell, position.rank * cell, cell, cell);
}

function drawDot(
	context: CanvasRenderingContext2D,
	square: Square,
	flipped: boolean,
	cell: number,
	color: string,
) {
	const position = squareToDisplay(square, flipped);
	context.fillStyle = color;
	context.beginPath();
	context.arc(
		position.file * cell + cell / 2,
		position.rank * cell + cell / 2,
		cell * 0.125,
		0,
		Math.PI * 2,
	);
	context.fill();
}

function drawArrow(
	context: CanvasRenderingContext2D,
	from: Square,
	to: Square,
	flipped: boolean,
	cell: number,
) {
	const start = squareToDisplay(from, flipped);
	const end = squareToDisplay(to, flipped);
	const x1 = start.file * cell + cell / 2;
	const y1 = start.rank * cell + cell / 2;
	const x2 = end.file * cell + cell / 2;
	const y2 = end.rank * cell + cell / 2;
	const dx = x2 - x1;
	const dy = y2 - y1;
	const length = Math.hypot(dx, dy);

	if (length < 1) return;

	const startOffset = cell * 0.24;
	const shaftWidth = Math.max(cell * 0.18, 8);
	const headLength = Math.max(cell * 0.36, 16);
	const headWidth = Math.max(shaftWidth * 2.2, headLength * 0.9);
	const ux = dx / length;
	const uy = dy / length;
	const px = -uy;
	const py = ux;
	const sx = x1 + ux * startOffset;
	const sy = y1 + uy * startOffset;
	const bx = x2 - ux * headLength;
	const by = y2 - uy * headLength;
	const halfShaft = shaftWidth / 2;
	const halfHead = headWidth / 2;

	context.save();
	context.fillStyle = COLORS.hint;
	context.beginPath();
	context.moveTo(sx - px * halfShaft, sy - py * halfShaft);
	context.lineTo(sx + px * halfShaft, sy + py * halfShaft);
	context.lineTo(bx + px * halfHead, by + py * halfHead);
	context.lineTo(x2, y2);
	context.lineTo(bx - px * halfHead, by - py * halfHead);
	context.closePath();
	context.fill();
	context.restore();
}

function drawBoardFrame(
	context: CanvasRenderingContext2D,
	size: number,
	state: BoardSnapshot,
) {
	const { game, flip, lastMove, selected, moves, hintMove, overlay, paused } =
		state;
	const cell = size / 8;

	context.setTransform(1, 0, 0, 1, 0, 0);
	context.clearRect(0, 0, size, size);
	context.imageSmoothingEnabled = false;

	for (let file = 0; file < 8; file += 1) {
		for (let rank = 0; rank < 8; rank += 1) {
			const x = (flip ? 7 - file : file) * cell;
			const y = (flip ? rank : 7 - rank) * cell;
			context.fillStyle = (file + rank) % 2 === 0 ? COLORS.light : COLORS.dark;
			context.fillRect(x, y, cell, cell);
		}
	}

	if (lastMove) {
		tintSquare(context, lastMove.from, flip, cell, COLORS.lastMove);
		tintSquare(context, lastMove.to, flip, cell, COLORS.lastMove);
	}

	if (selected) {
		tintSquare(context, selected, flip, cell, COLORS.selected);
	}

	for (const move of moves) {
		if (game.get(move)) tintSquare(context, move, flip, cell, COLORS.capture);
		else drawDot(context, move, flip, cell, COLORS.dot);
	}

	const labelPad = cell * 0.08;
	const coordSize = cell * 0.18;

	context.font = `700 ${coordSize}px sans-serif`;
	context.textBaseline = "top";
	context.textAlign = "left";
	for (let displayRank = 0; displayRank < 8; displayRank += 1) {
		const actualFile = flip ? 7 : 0;
		const actualRank = flip ? displayRank : 7 - displayRank;
		const isLight = (actualFile + actualRank) % 2 === 0;
		context.fillStyle = isLight ? COLORS.blackPiece : COLORS.whitePiece;
		const label = String(flip ? 1 + displayRank : 8 - displayRank);
		context.fillText(label, labelPad, displayRank * cell + labelPad);
	}

	context.textBaseline = "bottom";
	context.textAlign = "right";
	for (let displayFile = 0; displayFile < 8; displayFile += 1) {
		const actualFile = flip ? 7 - displayFile : displayFile;
		const actualRank = flip ? 7 : 0;
		const isLight = (actualFile + actualRank) % 2 === 0;
		context.fillStyle = isLight ? COLORS.blackPiece : COLORS.whitePiece;
		const label = String.fromCharCode(
			flip ? "h".charCodeAt(0) - displayFile : "a".charCodeAt(0) + displayFile,
		);
		context.fillText(label, displayFile * cell + cell - labelPad, size - labelPad);
	}

	const checkSquare = findCheckedKingSquare(game);
	if (checkSquare) {
		tintSquare(context, checkSquare, flip, cell, COLORS.check);
	}

	context.textAlign = "center";
	context.textBaseline = "middle";
	for (let file = 0; file < 8; file += 1) {
		for (let rank = 0; rank < 8; rank += 1) {
			const square = toSquare(file, rank);
			const piece = game.get(square);
			if (!piece) continue;

			const display = squareToDisplay(square, flip);
			const sizeMultiplier = selected === square ? 0.82 : 0.7;
			context.fillStyle =
				piece.color === "w" ? COLORS.whitePiece : COLORS.blackPiece;
			context.font = `${Math.floor(cell * sizeMultiplier)}px ${PIECE_FONT}`;
			context.fillText(
				GLYPH[piece.type][piece.color],
				display.file * cell + cell / 2,
				display.rank * cell + cell / 2 + cell * 0.02,
			);
		}
	}

	if (hintMove) {
		drawArrow(context, hintMove.from, hintMove.to, flip, cell);
	}

	if (overlay || paused) {
		context.fillStyle = COLORS.dim;
		context.fillRect(0, 0, size, size);
		context.fillStyle = "#fff";
		context.textAlign = "center";
		context.textBaseline = "middle";
		context.font = `700 ${Math.floor(size * 0.06)}px sans-serif`;
		context.fillText(overlay ?? "Paused", size / 2, size / 2);
	}
}

function mountChessBoard(
	host: HTMLDivElement,
	PhaserLib: PhaserModule,
	{ stateRef, onSquareClick, onBoardResize }: BoardMountOptions,
): () => void {
	let game: PhaserGame | null = null;
	let renderer: PhaserCanvasRenderer | null = null;
	let canvas: HTMLCanvasElement | null = null;
	let observer: ResizeObserver | null = null;
	let hoverClientX = 0;
	let hoverClientY = 0;
	let pointerInside = false;

	const updateCursor = () => {
		if (!canvas) return;
		const state = stateRef.current;
		if (state.overlay || state.paused || !pointerInside) {
			canvas.style.cursor = "default";
			return;
		}

		const rect = canvas.getBoundingClientRect();
		const square = squareFromPoint(
			hoverClientX - rect.left,
			hoverClientY - rect.top,
			rect.width,
			state.flip,
		);

		if (!square) {
			canvas.style.cursor = "default";
			return;
		}

		canvas.style.cursor = state.game.get(square) ? "pointer" : "default";
	};

	const drawFrame = () => {
		if (!renderer || !canvas) return;
		drawBoardFrame(renderer.gameContext, canvas.width, stateRef.current);
		updateCursor();
	};

	const resizeBoard = () => {
		if (!host) return;
		const size = resolveBoardSize(host);
		onBoardResize(size);

		if (!game) return;
		game.scale.resize(size, size);
		if (canvas) {
			canvas.style.width = `${size}px`;
			canvas.style.height = `${size}px`;
		}
	};

	const handlePointerMove = (event: PointerEvent) => {
		hoverClientX = event.clientX;
		hoverClientY = event.clientY;
		pointerInside = true;
		updateCursor();
	};

	const handlePointerLeave = () => {
		pointerInside = false;
		if (canvas) canvas.style.cursor = "default";
	};

	const handlePointerDown = (event: PointerEvent) => {
		if (!canvas) return;
		const rect = canvas.getBoundingClientRect();
		const square = squareFromPoint(
			event.clientX - rect.left,
			event.clientY - rect.top,
			rect.width,
			stateRef.current.flip,
		);
		if (!square) return;
		onSquareClick(square);
	};

	class ChessScene extends PhaserLib.Scene {
		constructor() {
			super("chess-phaser");
		}

		create() {
			renderer = this.sys.game.renderer as PhaserCanvasRenderer;
			canvas = this.game.canvas;
			canvas.style.display = "block";
			canvas.style.width = `${canvas.width}px`;
			canvas.style.height = `${canvas.height}px`;
			renderer.gameContext.imageSmoothingEnabled = false;
			canvas.addEventListener("pointermove", handlePointerMove);
			canvas.addEventListener("pointerleave", handlePointerLeave);
			canvas.addEventListener("pointerdown", handlePointerDown);
			this.game.events.on(PhaserLib.Core.Events.POST_RENDER, drawFrame);
		}
	}

	host.innerHTML = "";
	const initialSize = resolveBoardSize(host);
	onBoardResize(initialSize);

	game = new PhaserLib.Game({
		type: PhaserLib.CANVAS,
		parent: host,
		width: initialSize,
		height: initialSize,
		scene: new ChessScene() as PhaserScene,
		banner: false,
		disableContextMenu: true,
		audio: { noAudio: true },
		clearBeforeRender: false,
		transparent: false,
		antialias: false,
		pixelArt: false,
		backgroundColor: COLORS.dark,
	});

	observer = new ResizeObserver(() => {
		resizeBoard();
	});
	observer.observe(host);

	return () => {
		observer?.disconnect();
		observer = null;

		if (canvas) {
			canvas.removeEventListener("pointermove", handlePointerMove);
			canvas.removeEventListener("pointerleave", handlePointerLeave);
			canvas.removeEventListener("pointerdown", handlePointerDown);
		}

		if (game) {
			game.events.off(PhaserLib.Core.Events.POST_RENDER, drawFrame);
			game.destroy(true);
			game = null;
		}

		renderer = null;
		canvas = null;
	};
}

function useStockfish() {
	const workerRef = useRef<Worker | null>(null);
	const [ready, setReady] = useState(false);

	useEffect(() => {
		const worker = new Worker("/stockfish.js");
		workerRef.current = worker;

		const onMessage = (event: MessageEvent<unknown>) => {
			const payload = event.data;
			const line =
				typeof payload === "string" ? payload : String((payload as { type?: string })?.type || "");
			if (line.includes("uciok") || line === "uciok" || line === "readyok") {
				setReady(true);
			}
		};

		worker.addEventListener("message", onMessage);
		worker.postMessage("uci");
		worker.postMessage("isready");

		return () => {
			worker.removeEventListener("message", onMessage);
			worker.terminate();
			workerRef.current = null;
		};
	}, []);

	const setOptions = useCallback(
		(options: Record<string, string | number | boolean>) => {
			const worker = workerRef.current;
			if (!worker) return;
			for (const [key, value] of Object.entries(options)) {
				worker.postMessage(`setoption name ${key} value ${value}`);
			}
		},
		[],
	);

	const go = useCallback(
		(
			fen: string,
			depth: number,
			options: {
				onBest: (uci: string) => void;
				onTimeout?: () => void;
				timeoutMs?: number;
				skill?: number;
				movetime?: number;
			},
		) => {
			const worker = workerRef.current;
			if (!worker) return () => {};

			worker.postMessage("stop");
			let done = false;

			const handle = (event: MessageEvent<string>) => {
				const text = event.data || "";
				if (!text.startsWith("bestmove") || done) return;
				done = true;
				worker.removeEventListener("message", handle);
				window.clearTimeout(timer);
				options.onBest(text.split(/\s+/)[1] || "");
			};

			worker.addEventListener("message", handle);
			if (options.skill != null) {
				worker.postMessage(`setoption name Skill Level value ${options.skill}`);
			}
			worker.postMessage(`position fen ${fen}`);
			worker.postMessage(
				options.movetime ? `go movetime ${options.movetime}` : `go depth ${depth}`,
			);

			const timer = window.setTimeout(() => {
				if (done) return;
				done = true;
				worker.removeEventListener("message", handle);
				worker.postMessage("stop");
				options.onTimeout?.();
			}, options.timeoutMs ?? 5000);

			return () => {
				if (done) return;
				done = true;
				worker.removeEventListener("message", handle);
				worker.postMessage("stop");
				window.clearTimeout(timer);
			};
		},
		[],
	);

	return { ready, setOptions, go };
}

export default function ChessPhaser() {
	const containerRef = useRef<HTMLDivElement | null>(null);
	const boardStateRef = useRef<BoardSnapshot>({
		game: new Chess(),
		playAs: "w",
		flip: false,
		selected: null,
		moves: [],
		lastMove: null,
		overlay: null,
		paused: false,
		hintMove: null,
	});
	const clickRef = useRef<(square: Square) => void>(() => {});
	const moveSetRef = useRef<Set<Square>>(new Set());
	const engineCancelRef = useRef<null | (() => void)>(null);
	const hintCancelRef = useRef<null | (() => void)>(null);
	const waitingRef = useRef(false);
	const aiTimerRef = useRef<number | null>(null);
	const moveLogRef = useRef<LoggedMove[]>([]);
	const redoStackRef = useRef<LoggedMove[]>([]);
	const moveListRef = useRef<HTMLDivElement | null>(null);
	const turnStartRef = useRef<number>(performance.now());
	const pauseStartedAtRef = useRef<number | null>(null);
	const hiddenStartedAtRef = useRef<number | null>(null);

	const [game, setGame] = useState(() => new Chess());
	const [playAs, setPlayAs] = useState<PlayAs>("w");
	const [boardH, setBoardH] = useState(560);
	const [flip, setFlip] = useState(false);
	const [depth, setDepth] = useState(DEFAULT_DEPTH);
	const [selected, setSelected] = useState<Square | null>(null);
	const [moves, setMoves] = useState<Square[]>([]);
	const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(
		null,
	);
	const [overlay, setOverlay] = useState<string | null>(null);
	const [thinking, setThinking] = useState(false);
	const [paused, setPaused] = useState(false);
	const [taken, setTaken] = useState<{ w: PieceSymbol[]; b: PieceSymbol[] }>({
		w: [],
		b: [],
	});
	const [pairs, setPairs] = useState<MovePair[]>([]);
	const [hintsMode, setHintsMode] = useState<HintsMode>("off");
	const [hintMove, setHintMove] = useState<{ from: Square; to: Square } | null>(
		null,
	);
	const [redoCount, setRedoCount] = useState(0);

	const {
		ready: engineReady,
		go: engineGo,
		setOptions: engineSetOptions,
	} = useStockfish();

	const gameFen = game.fen();
	const totals = useMemo(() => materialTotals(game), [gameFen]);
	const whitePct = useMemo(() => {
		const score = materialTotals(game);
		const sum = score.w + score.b;
		return sum ? score.w / sum : 0.5;
	}, [gameFen]);

	useEffect(() => {
		if (!engineReady) return;
		try {
			const threads = Math.max(
				1,
				Math.min(4, (navigator as Navigator & { hardwareConcurrency?: number }).hardwareConcurrency || 2),
			);
			engineSetOptions({ Threads: threads, Hash: 32 });
		} catch {
			// Ignore engines that reject option changes.
		}
	}, [engineReady, engineSetOptions]);

	useEffect(() => {
		boardStateRef.current = {
			game,
			playAs,
			flip,
			selected,
			moves,
			lastMove,
			overlay,
			paused,
			hintMove,
		};
	}, [game, playAs, flip, selected, moves, lastMove, overlay, paused, hintMove]);

	useEffect(() => {
		const list = moveListRef.current;
		if (list) list.scrollTop = list.scrollHeight;
	}, [pairs.length]);

	useEffect(() => {
		setFlip(playAs === "b");
	}, [playAs]);

	useEffect(() => {
		turnStartRef.current = performance.now();
	}, []);

	useEffect(() => {
		const onVisibilityChange = () => {
			if (document.hidden) {
				if (hiddenStartedAtRef.current == null) {
					hiddenStartedAtRef.current = performance.now();
				}
				return;
			}

			if (hiddenStartedAtRef.current != null) {
				turnStartRef.current += performance.now() - hiddenStartedAtRef.current;
				hiddenStartedAtRef.current = null;
			}
		};

		document.addEventListener("visibilitychange", onVisibilityChange);
		return () => document.removeEventListener("visibilitychange", onVisibilityChange);
	}, []);

	function gameOutcome(nextGame: Chess): string | null {
		if (nextGame.isCheckmate()) {
			return nextGame.turn() === "w"
				? "Black wins (checkmate)"
				: "White wins (checkmate)";
		}
		if (nextGame.isStalemate()) return "Stalemate";
		if (nextGame.isThreefoldRepetition()) return "Threefold repetition";
		if (nextGame.isInsufficientMaterial()) return "Insufficient material";
		if (nextGame.isDraw()) return "Draw";
		return null;
	}

	function rebuildFromLog() {
		const nextTaken = { w: [] as PieceSymbol[], b: [] as PieceSymbol[] };
		const nextPairs: MovePair[] = [];
		let index = 1;
		let whiteMove: MovePair["w"] | null = null;

		for (const move of moveLogRef.current) {
			if (move.captured) {
				(move.color === "w" ? nextTaken.b : nextTaken.w).push(move.captured);
			}

			const moveData = {
				san: move.san || "",
				piece: move.piece || "p",
				timeMs: move.timeMs || 0,
				acc: move.acc ?? 50,
			};

			if (move.color === "w") {
				whiteMove = moveData;
				continue;
			}

			if (whiteMove) {
				nextPairs.push({ index, w: whiteMove, b: moveData });
				index += 1;
				whiteMove = null;
			}
		}

		setTaken(nextTaken);
		setPairs(nextPairs);
	}

	function requestHint() {
		const state = boardStateRef.current;
		if (state.playAs === null || state.game.turn() !== state.playAs) return;

		if (!engineReady) {
			setHintMove(null);
			return;
		}

		if (hintCancelRef.current) {
			hintCancelRef.current();
			hintCancelRef.current = null;
		}

		const skill = SKILL_FOR_DEPTH[depth] ?? 5;
		hintCancelRef.current = engineGo(state.game.fen(), depth, {
			timeoutMs: ENGINE_TIMEOUT_MS,
			skill,
			onBest: (uci) => {
				const next = parseUCIMove(uci);
				setHintMove((current) =>
					current && current.from === next.from && current.to === next.to
						? current
						: next,
				);
			},
			onTimeout: () => setHintMove(null),
		});
	}

	function startNewGame(next: PlayAs | null = playAs) {
		if (aiTimerRef.current) {
			window.clearTimeout(aiTimerRef.current);
			aiTimerRef.current = null;
		}

		if (engineCancelRef.current) {
			engineCancelRef.current();
			engineCancelRef.current = null;
		}

		if (hintCancelRef.current) {
			hintCancelRef.current();
			hintCancelRef.current = null;
		}

		const nextGame = new Chess();
		setGame(nextGame);
		setPlayAs(next);
		setFlip(next === "b");
		setSelected(null);
		setMoves([]);
		setLastMove(null);
		setOverlay(null);
		setThinking(false);
		setTaken({ w: [], b: [] });
		setPairs([]);
		setHintMove(null);
		setHintsMode("off");
		setRedoCount(0);
		moveSetRef.current = new Set();
		moveLogRef.current = [];
		redoStackRef.current = [];
		waitingRef.current = false;
		turnStartRef.current = performance.now();
	}

	function applyMove(move: {
		from: Square;
		to: Square;
		promotion?: PromotionPiece;
	}) {
		const base = boardStateRef.current.game;
		const fenBefore = base.fen();
		const nextGame = new Chess(fenBefore);
		const timeMs = performance.now() - turnStartRef.current;

		const legal = nextGame
			.moves({ verbose: true })
			.some(
				(candidate) =>
					(candidate.from as Square) === move.from &&
					(candidate.to as Square) === move.to,
			);
		if (!legal) return;

		const piece = nextGame.get(move.from);
		const needsPromotion =
			piece?.type === "p" && (move.to[1] === "1" || move.to[1] === "8");

		const result = nextGame.move({
			from: move.from,
			to: move.to,
			promotion: needsPromotion ? "q" : move.promotion,
		});
		if (!result) return;

		const beforeScore = materialScore(new Chess(fenBefore));
		const afterScore = materialScore(nextGame);
		const delta = afterScore - beforeScore;
		const scale = 50 / 9;
		const accuracy =
			result.color === "w"
				? Math.max(0, Math.min(100, 50 + delta * scale))
				: Math.max(0, Math.min(100, 50 - delta * scale));

		if (result.captured) {
			setTaken((current) =>
				result.color === "w"
					? { ...current, b: [...current.b, result.captured as PieceSymbol] }
					: { ...current, w: [...current.w, result.captured as PieceSymbol] },
			);
		}

		moveLogRef.current.push({
			from: result.from as Square,
			to: result.to as Square,
			promotion: result.promotion as PieceSymbol | undefined,
			color: result.color as Color,
			fenBefore,
			fenAfter: nextGame.fen(),
			san: result.san,
			piece: result.piece as PieceSymbol,
			captured: result.captured as PieceSymbol | undefined,
			timeMs,
			acc: accuracy,
		});

		redoStackRef.current = [];
		setRedoCount(0);
		setGame(nextGame);
		setLastMove({ from: result.from as Square, to: result.to as Square });

		if (result.color === boardStateRef.current.playAs) {
			if (hintCancelRef.current) {
				hintCancelRef.current();
				hintCancelRef.current = null;
			}
			setHintMove(null);
			setHintsMode((current) => (current === "once" ? "off" : current));
		}

		turnStartRef.current = performance.now();
		setSelected(null);
		setMoves([]);
		moveSetRef.current = new Set();

		const outcome = gameOutcome(nextGame);
		if (outcome) setOverlay(outcome);
		rebuildFromLog();
	}

	function undo() {
		if (overlay) setOverlay(null);
		if (playAs === null) return;

		if (aiTimerRef.current) {
			window.clearTimeout(aiTimerRef.current);
			aiTimerRef.current = null;
		}

		if (engineCancelRef.current) {
			engineCancelRef.current();
			engineCancelRef.current = null;
		}

		waitingRef.current = false;
		setThinking(false);

		const log = moveLogRef.current;
		if (!log.length) return;

		if (log[log.length - 1]?.color !== playAs) {
			const engineMove = log.pop();
			if (engineMove) redoStackRef.current.push(engineMove);
			setRedoCount(redoStackRef.current.length);
		}

		if (!log.length || log[log.length - 1]?.color !== playAs) return;
		const myMove = log.pop();
		if (!myMove) return;
		redoStackRef.current.push(myMove);
		setRedoCount(redoStackRef.current.length);

		const nextGame = log.length ? new Chess(log[log.length - 1].fenAfter) : new Chess();
		setGame(nextGame);

		if (log.length) {
			const last = log[log.length - 1];
			setLastMove({ from: last.from, to: last.to });
		} else {
			setLastMove(null);
		}

		setSelected(null);
		setMoves([]);
		moveSetRef.current = new Set();
		rebuildFromLog();
	}

	function redo() {
		const next = redoStackRef.current.pop();
		if (!next) return;

		setRedoCount(redoStackRef.current.length);
		setGame(new Chess(next.fenAfter));
		moveLogRef.current.push(next);
		setLastMove({ from: next.from, to: next.to });
		setSelected(null);
		setMoves([]);
		moveSetRef.current = new Set();

		const outcome = gameOutcome(new Chess(next.fenAfter));
		if (outcome) setOverlay(outcome);
		rebuildFromLog();
	}

	function surrender() {
		const winner =
			boardStateRef.current.game.turn() === "w" ? "Black wins" : "White wins";
		setOverlay(`${winner} (surrender)`);
	}

	function handleBoardSquareClick(square: Square) {
		const state = boardStateRef.current;
		if (state.overlay || state.paused) return;

		const turn = state.game.turn();
		const piece = state.game.get(square);
		const isHumanTurn = state.playAs !== null && turn === state.playAs;

		if (state.selected && state.selected === square) {
			setSelected(null);
			setMoves([]);
			moveSetRef.current = new Set();
			return;
		}

		if (state.selected === null) {
			if (isHumanTurn && piece && piece.color === turn) {
				const nextMoves = state.game
					.moves({ square, verbose: true })
					.map((move) => move.to as Square);
				setSelected(square);
				setMoves(nextMoves);
				moveSetRef.current = new Set(nextMoves);
			}
			return;
		}

		if (piece && piece.color === turn) {
			const nextMoves = state.game
				.moves({ square, verbose: true })
				.map((move) => move.to as Square);
			setSelected(square);
			setMoves(nextMoves);
			moveSetRef.current = new Set(nextMoves);
			return;
		}

		if (moveSetRef.current.has(square)) {
			applyMove({ from: state.selected, to: square });
		}
	}

	clickRef.current = handleBoardSquareClick;

	useEffect(() => {
		if (!containerRef.current) return;

		let cleanup: (() => void) | null = null;
		let cancelled = false;

		(async () => {
			if (!containerRef.current) return;
			const phaserModule = await import("phaser");
			if (cancelled || !containerRef.current) return;

			const PhaserLib = ("default" in phaserModule
				? phaserModule.default
				: phaserModule) as PhaserModule;

			cleanup = mountChessBoard(containerRef.current, PhaserLib, {
				stateRef: boardStateRef,
				onSquareClick: (square) => clickRef.current(square),
				onBoardResize: (size) => setBoardH(size),
			});
		})();

		return () => {
			cancelled = true;
			cleanup?.();
		};
	}, []);

	useEffect(() => {
		if (aiTimerRef.current) {
			window.clearTimeout(aiTimerRef.current);
			aiTimerRef.current = null;
		}

		if (engineCancelRef.current) {
			engineCancelRef.current();
			engineCancelRef.current = null;
		}

		waitingRef.current = false;
		setThinking(false);

		if (overlay || paused || !engineReady) return;

		const turn = game.turn();
		const useRandom = depth <= 1;
		const scheduleApply = (uciOrEmpty: string, baseDelay: number) => {
			aiTimerRef.current = window.setTimeout(() => {
				waitingRef.current = false;
				setThinking(false);

				if (!uciOrEmpty || uciOrEmpty === "(none)") {
					const fallback = new Chess(boardStateRef.current.game.fen());
					const legalMoves = fallback.moves({ verbose: true });
					if (legalMoves.length) {
						const move =
							legalMoves[Math.floor(Math.random() * legalMoves.length)];
						applyMove({
							from: move.from as Square,
							to: move.to as Square,
							promotion: normalizePromotion(move.promotion),
						});
					} else {
						const outcome = gameOutcome(fallback);
						if (outcome) setOverlay(outcome);
					}
					return;
				}

				const move = parseUCIMove(uciOrEmpty);
				applyMove(move);
			}, thinkDelay(baseDelay));
		};

		if (playAs === null) {
			if (!waitingRef.current) {
				waitingRef.current = true;
				setThinking(true);
				if (useRandom) {
					scheduleApply(randomLegalUCIMove(gameFen), AI_VS_AI_DELAY_BASE);
				} else {
					const skill = SKILL_FOR_DEPTH[depth] ?? 5;
					engineCancelRef.current = engineGo(gameFen, depth, {
						timeoutMs: ENGINE_TIMEOUT_MS,
						skill,
						onBest: (uci) => scheduleApply(uci, AI_VS_AI_DELAY_BASE),
						onTimeout: () => scheduleApply("", AI_VS_AI_DELAY_BASE),
					});
				}
			}
			return;
		}

		if (turn !== playAs && !waitingRef.current) {
			waitingRef.current = true;
			setThinking(true);
			if (useRandom) {
				scheduleApply(randomLegalUCIMove(gameFen), HUMAN_ENGINE_DELAY_BASE);
			} else {
				const skill = SKILL_FOR_DEPTH[depth] ?? 5;
				engineCancelRef.current = engineGo(gameFen, depth, {
					timeoutMs: ENGINE_TIMEOUT_MS,
					skill,
					onBest: (uci) => scheduleApply(uci, HUMAN_ENGINE_DELAY_BASE),
					onTimeout: () => scheduleApply("", HUMAN_ENGINE_DELAY_BASE),
				});
			}
		}
	}, [game, gameFen, playAs, engineGo, engineReady, depth, overlay, paused]);

	useEffect(() => {
		if (playAs === null) return;

		const myTurn = game.turn() === playAs;
		if (!myTurn) {
			if (hintCancelRef.current) {
				hintCancelRef.current();
				hintCancelRef.current = null;
			}
			setHintMove(null);
			return;
		}

		if (!engineReady) return;
		if (hintsMode === "auto" || hintsMode === "once") {
			requestHint();
		}
	}, [game, hintsMode, playAs, engineReady]);

	const isAIvAI = playAs === null;
	const effectivePlayAs: "w" | "b" = playAs ?? "w";
	const turnLabel = game.turn() === "w" ? "White" : "Black";
	const playingLabel = isAIvAI
		? "AI vs AI"
		: playAs === "w"
			? "White"
			: "Black";

	function cycleHints() {
		if (isAIvAI) return;

		if (hintCancelRef.current) {
			hintCancelRef.current();
			hintCancelRef.current = null;
		}

		setHintMove(null);
		setHintsMode((current) => {
			const next: HintsMode =
				current === "off" ? "once" : current === "once" ? "auto" : "off";

			const state = boardStateRef.current;
			if (
				state.playAs !== null &&
				state.game.turn() === state.playAs &&
				(next === "once" || next === "auto")
			) {
				requestHint();
			}

			return next;
		});
	}

	return (
		<div className="w-full max-w-6xl mx-auto">
			<div className="w-fit mx-auto mt-1 mb-2 rounded-xl border border-zinc-700/50 bg-zinc-900/60 px-3 py-3 flex flex-wrap items-center gap-3">
				<div className="flex items-center gap-2">
					<span className="text-sm text-zinc-300">Play as</span>
					<div className="inline-flex rounded-lg overflow-hidden border border-zinc-700/60">
						<button
							onClick={() => startNewGame("w")}
							className={`px-4 py-1.5 text-sm ${playAs === "w" ? "bg-zinc-200 text-zinc-900" : "bg-zinc-800/60 text-zinc-200 hover:bg-zinc-700/60"}`}
						>
							White
						</button>
						<button
							onClick={() => startNewGame("b")}
							className={`px-4 py-1.5 text-sm ${playAs === "b" ? "bg-zinc-200 text-zinc-900" : "bg-zinc-800/60 text-zinc-200 hover:bg-zinc-700/60"}`}
						>
							Black
						</button>
						<button
							onClick={() => startNewGame(null)}
							className={`px-4 py-1.5 text-sm ${isAIvAI ? "bg-zinc-200 text-zinc-900" : "bg-zinc-800/60 text-zinc-200 hover:bg-zinc-700/60"}`}
						>
							AI vs AI
						</button>
					</div>
				</div>

				<div className="flex items-center gap-2">
					<label className="text-sm text-zinc-300">Difficulty</label>
					<select
						value={depth}
						onChange={(event) => setDepth(Number(event.target.value))}
						className="rounded-md border border-zinc-700 bg-zinc-800/70 py-1.5 text-sm text-center text-zinc-100"
					>
						<option value={1}>Easy</option>
						<option value={3}>Medium</option>
						<option value={6}>Hard</option>
						<option value={10}>No Way</option>
					</select>
				</div>

				<div className="flex items-center gap-2">
					<button
						onClick={cycleHints}
						disabled={isAIvAI}
						className={`rounded-md border px-4 py-1.5 text-sm select-none ${
							isAIvAI
								? "border-zinc-700/40 bg-zinc-800/30 text-zinc-500 cursor-not-allowed"
								: hintsMode === "off"
									? "border-zinc-700 bg-zinc-800/70 text-zinc-100 hover:bg-zinc-700"
									: hintsMode === "once"
										? "border-yellow-500/60 bg-yellow-500/20 text-yellow-100 hover:bg-yellow-500/30"
										: "border-yellow-500/60 bg-yellow-500/30 text-yellow-100 hover:bg-yellow-500/40"
						}`}
						title="Cycle: Once → Always → Off"
					>
						💡 Hints:{" "}
						{hintsMode === "off"
							? "Off"
							: hintsMode === "once"
								? "Once"
								: "Always"}
					</button>
				</div>

				<div className="flex items-center gap-2">
					<button
						onClick={() => {
							const nextPaused = !paused;
							setPaused(nextPaused);
							const now = performance.now();

							if (nextPaused) {
								pauseStartedAtRef.current = now;
								if (aiTimerRef.current) {
									window.clearTimeout(aiTimerRef.current);
									aiTimerRef.current = null;
								}
								waitingRef.current = false;
								setThinking(false);
							} else if (pauseStartedAtRef.current != null) {
								turnStartRef.current += now - pauseStartedAtRef.current;
								pauseStartedAtRef.current = null;
							}
						}}
						className="rounded-md border border-zinc-700 bg-zinc-800/70 px-4 py-1.5 text-sm text-zinc-100 hover:bg-zinc-700"
					>
						{paused ? "▶ Resume" : "⏸ Pause"}
					</button>
					<button
						onClick={() => startNewGame(playAs)}
						className="rounded-md border border-zinc-700 bg-zinc-800/70 px-4 py-1.5 text-sm text-zinc-100 hover:bg-zinc-700"
					>
						New
					</button>
					<button
						onClick={undo}
						className="rounded-md border border-zinc-700 bg-zinc-800/70 px-4 py-1.5 text-sm text-zinc-100 hover:bg-zinc-700"
					>
						Undo
					</button>
					<button
						onClick={redo}
						disabled={redoCount === 0}
						className={`rounded-md border px-4 py-1.5 text-sm ${
							redoCount
								? "border-zinc-700 bg-zinc-800/70 text-zinc-100 hover:bg-zinc-700"
								: "border-zinc-700/40 bg-zinc-800/30 text-zinc-500 cursor-not-allowed"
						}`}
					>
						Redo
					</button>
					<button
						onClick={surrender}
						className="rounded-md border border-red-600/40 bg-red-600/20 px-4 py-1.5 text-sm text-red-200 hover:bg-red-600/30"
					>
						Surrender
					</button>
				</div>
			</div>

			<div className="relative grid grid-cols-[36px_1fr_360px] gap-3 items-stretch">
				<div className="hidden sm:flex items-stretch">
					<div className="relative w-9 rounded-lg overflow-hidden border border-zinc-700/60 bg-zinc-800/60">
						<div className="absolute inset-0 bg-zinc-900" />
						{flip ? (
							<div
								className="absolute inset-x-0 top-0"
								style={{ height: `${whitePct * 100}%`, background: "#e4e4e7" }}
							/>
						) : (
							<div
								className="absolute inset-x-0 bottom-0"
								style={{ height: `${whitePct * 100}%`, background: "#e4e4e7" }}
							/>
						)}
						{flip ? (
							<>
								<div className="absolute left-0 top-1 py-1 w-full text-center text-[10px] leading-none font-bold text-zinc-800">
									{totals.w}
								</div>
								<div className="absolute left-0 bottom-1 py-1 w-full text-center text-[10px] leading-none font-bold text-zinc-200">
									{totals.b}
								</div>
							</>
						) : (
							<>
								<div className="absolute left-0 top-1 py-1 w-full text-center text-[10px] leading-none font-bold text-zinc-200">
									{totals.b}
								</div>
								<div className="absolute left-0 bottom-1 py-1 w-full text-center text-[10px] leading-none font-bold text-zinc-800">
									{totals.w}
								</div>
							</>
						)}
					</div>
				</div>

				<div className="relative">
					<div
						ref={containerRef}
						className="relative mx-auto aspect-square w-full max-w-3xl overflow-hidden rounded-lg"
					/>
					{overlay ? (
						<div className="absolute inset-0" onClick={() => setOverlay(null)} />
					) : null}
				</div>

				<div
					className="w-[360px] rounded-xl border border-zinc-700/50 bg-zinc-900/60 p-3 flex flex-col h-full min-h-0"
					style={{ maxHeight: boardH }}
				>
					<div className="flex-1 flex flex-col justify-start gap-3 min-h-0">
						<div className="flex items-start justify-between gap-2 h-20 shrink-0">
							<div className="flex flex-wrap gap-1 text-2xl leading-none overflow-hidden">
								{(effectivePlayAs === "w" ? taken.w : taken.b).map((piece, index) => (
									<span key={index}>
										{GLYPH[piece][effectivePlayAs === "w" ? "b" : "w"]}
									</span>
								))}
							</div>
							<div className="select-none">
								<div
									className="rounded-xl px-2 py-1 text-2xl font-extrabold"
									style={{
										background: effectivePlayAs === "w" ? "#2d2e2e" : "#e4e4e7",
										color: effectivePlayAs === "w" ? "#ffffff" : "#2d2e2e",
									}}
								>
									{(effectivePlayAs === "w"
										? 100 - whitePct * 100
										: whitePct * 100
									).toFixed(1)}
								</div>
							</div>
						</div>

						<div ref={moveListRef} className="flex-1 overflow-auto -mx-3 min-h-64">
							{pairs.map((row, index) => {
								const even = index % 2 === 1;
								const rowClass = even ? "bg-zinc-800/40" : "bg-zinc-900/40";
								const whiteBar = Math.min(1, row.w.timeMs / MOVE_TIME_LIMIT_MS);
								const blackBar = Math.min(1, row.b.timeMs / MOVE_TIME_LIMIT_MS);

								return (
									<div
										key={row.index}
										className={`${rowClass} py-1 pr-2 flex items-center gap-2`}
									>
										<span className="w-7 text-right text-zinc-300">
											{row.index}.
										</span>

										<div className="flex items-center gap-2 text-zinc-100">
											<span className="text-lg leading-none">
												{GLYPH[row.w.piece].b}
											</span>
											<span className="text-sm">{row.w.san}</span>
										</div>

										<div className="flex items-center gap-2 text-zinc-500">
											<span className="text-lg leading-none">
												{GLYPH[row.b.piece].w}
											</span>
											<span className="text-sm">{row.b.san}</span>
										</div>

										<div className="ml-auto w-36">
											<div className="flex flex-col gap-1.5">
												<div className="flex items-center gap-1">
													<div className="relative h-3 flex-1">
														<div
															className="absolute inset-y-0 right-0 rounded-sm bg-zinc-200"
															style={{ width: `${whiteBar * 100}%` }}
														/>
													</div>
													<span className="text-[10px] leading-none text-zinc-300">
														{fmtSec(row.w.timeMs)}
													</span>
												</div>
												<div className="flex items-center gap-1">
													<div className="relative h-3 flex-1">
														<div
															className="absolute inset-y-0 right-0 rounded-sm bg-zinc-500"
															style={{ width: `${blackBar * 100}%` }}
														/>
													</div>
													<span className="text-[10px] leading-none text-zinc-400">
														{fmtSec(row.b.timeMs)}
													</span>
												</div>
											</div>
										</div>
									</div>
								);
							})}
						</div>

						<div className="flex items-end justify-between gap-2 h-20 shrink-0">
							<div className="flex flex-wrap gap-1 text-2xl leading-none overflow-hidden">
								{(effectivePlayAs === "w" ? taken.b : taken.w).map((piece, index) => (
									<span key={index}>
										{GLYPH[piece][effectivePlayAs === "w" ? "w" : "b"]}
									</span>
								))}
							</div>
							<div className="select-none">
								<div
									className="rounded-xl px-2 py-1 text-2xl font-extrabold"
									style={{
										background: effectivePlayAs === "w" ? "#e4e4e7" : "#2d2e2e",
										color: effectivePlayAs === "w" ? "#2d2e2e" : "#ffffff",
									}}
								>
									{(effectivePlayAs === "w"
										? whitePct * 100
										: 100 - whitePct * 100
									).toFixed(1)}
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			<div className="mx-auto mt-2 w-fit px-3 py-1.5 text-sm text-zinc-200 flex items-center gap-2">
				<span>
					Turn: <strong>{turnLabel}</strong>
				</span>
				<span>•</span>
				<span>
					Playing as: <strong>{playingLabel}</strong>
				</span>
				<span>•</span>
				<span>
					AI:{" "}
					<strong className={thinking ? "animate-pulse" : ""}>
						{thinking ? "Thinking…" : "Idle"}
					</strong>
				</span>
			</div>
		</div>
	);
}
