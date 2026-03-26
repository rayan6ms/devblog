"use client";

import { useEffect, useRef } from "react";

const mountGame = (host: HTMLDivElement, PhaserLib: any) => {
	const HALF_PI = Math.PI / 2;
	const PI = Math.PI;
	const TAU = Math.PI * 2;
	const CENTER = "center";
	const LEFT = "left";
	const RIGHT = "right";
	const BASELINE = "baseline";
	const BOLD = "bold";
	const NORMAL = "normal";
	const ROUND = "round";
	const BEVEL = "bevel";
	const ARROW = "default";
	const HAND = "pointer";
	const LEFT_ARROW = 37;
	const RIGHT_ARROW = 39;
	const UP_ARROW = 38;
	const DOWN_ARROW = 40;
	const CLOSE = "close";
	const CORNER = "corner";
	const CORNERS = "corners";
	const RADIUS = "radius";
	const BLEND = "blend";

	let scene: any = null;
	let game: any = null;
	let canvasEl: HTMLCanvasElement;
	let drawingContext: CanvasRenderingContext2D;
	let ro: ResizeObserver | null = null;
	let resizeRaf = 0;
	let width = 1;
	let height = 1;
	let mouseX = 0;
	let mouseY = 0;
	let deltaTime = 1000 / 60;
	let mouseIsPressed = false;
	let lastDelta = 1000 / 60;
	const cleanupCallbacks: Array<() => void> = [];
	const onCleanup = (cb: () => void) => {
		cleanupCallbacks.push(cb);
	};

	const hostEl = () => {
		const fullscreenElement = document.fullscreenElement as HTMLElement | null;
		if (fullscreenElement === canvasEl) return canvasEl;
		return host;
	};

	const hostSize = () => {
		const el = hostEl();
		let w = el?.clientWidth || 1;
		let h = el?.clientHeight || 1;
		if ((!w || !h) && el?.getBoundingClientRect) {
			const rect = el.getBoundingClientRect();
			w = Math.max(1, Math.floor(rect.width));
			h = Math.max(1, Math.floor(rect.height));
		}
		return { w: Math.max(1, w), h: Math.max(1, h) };
	};

	const updateVirtualFromHost = () => {
		const size = hostSize();
		width = size.w;
		height = size.h;
	};

	type DrawState = {
		fillEnabled: boolean;
		fillStyle: string;
		strokeEnabled: boolean;
		strokeStyle: string;
		lineWidth: number;
		lineJoin: CanvasLineJoin;
		lineCap: CanvasLineCap;
		rectMode: string;
		textAlign: CanvasTextAlign;
		textBaseline: CanvasTextBaseline;
		fontSize: number;
		fontWeight: string;
		fontFamily: string;
		blendMode: GlobalCompositeOperation;
	};

	const DIRTY_FILL_STYLE = 1 << 0;
	const DIRTY_STROKE_STYLE = 1 << 1;
	const DIRTY_LINE_WIDTH = 1 << 2;
	const DIRTY_LINE_JOIN = 1 << 3;
	const DIRTY_LINE_CAP = 1 << 4;
	const DIRTY_TEXT_ALIGN = 1 << 5;
	const DIRTY_TEXT_BASELINE = 1 << 6;
	const DIRTY_FONT = 1 << 7;
	const DIRTY_BLEND_MODE = 1 << 8;
	const DIRTY_ALL =
		DIRTY_FILL_STYLE |
		DIRTY_STROKE_STYLE |
		DIRTY_LINE_WIDTH |
		DIRTY_LINE_JOIN |
		DIRTY_LINE_CAP |
		DIRTY_TEXT_ALIGN |
		DIRTY_TEXT_BASELINE |
		DIRTY_FONT |
		DIRTY_BLEND_MODE;
	const DIRTY_PATH_STATE =
		DIRTY_FILL_STYLE |
		DIRTY_STROKE_STYLE |
		DIRTY_LINE_WIDTH |
		DIRTY_LINE_JOIN |
		DIRTY_LINE_CAP |
		DIRTY_BLEND_MODE;
	const DIRTY_TEXT_STATE = DIRTY_PATH_STATE | DIRTY_TEXT_ALIGN | DIRTY_TEXT_BASELINE | DIRTY_FONT;

	const defaultDrawState = (): DrawState => ({
		fillEnabled: true,
		fillStyle: "rgba(255,255,255,1)",
		strokeEnabled: true,
		strokeStyle: "rgba(0,0,0,1)",
		lineWidth: 1,
		lineJoin: "miter",
		lineCap: "butt",
		rectMode: CORNER,
		textAlign: "left",
		textBaseline: "alphabetic",
		fontSize: 12,
		fontWeight: "normal",
		fontFamily: "sans-serif",
		blendMode: "source-over",
	});

	let drawState = defaultDrawState();
	let drawStateDirty = DIRTY_ALL;
	const stateStack: DrawState[] = [];
	let shapeVertices: number[] = [];

	const clampByte = (value: number) => Math.max(0, Math.min(255, Math.round(value)));
	const colorArgs = (values: any[]) =>
		values.length === 1 && Array.isArray(values[0]) ? values[0] : values;
	const COLOR_CACHE_LIMIT = 256;
	const colorCache = new Map<number | string, string>();

	const colorCacheKey = (r: number, g: number, b: number, a: number) =>
		Number.isInteger(a)
			? ((((a & 255) << 24) >>> 0) | (b << 16) | (g << 8) | r) >>> 0
			: r + "|" + g + "|" + b + "|" + a;

	const cacheCanvasColor = (r: number, g: number, b: number, a: number) => {
		const key = colorCacheKey(r, g, b, a);
		const cached = colorCache.get(key);
		if (cached) return cached;
		const next =
			"rgba(" + r + ", " + g + ", " + b + ", " + a / 255 + ")";
		if (colorCache.size >= COLOR_CACHE_LIMIT) colorCache.clear();
		colorCache.set(key, next);
		return next;
	};

	const toCanvasColor = (...input: any[]) => {
		const values = colorArgs(input);
		if (!values.length) return "rgba(255,255,255,1)";
		if (typeof values[0] === "string") return values[0];
		let r = 0;
		let g = 0;
		let b = 0;
		let a = 255;
		if (values.length === 1) {
			r = g = b = Number(values[0] ?? 0);
		} else if (values.length === 2) {
			r = g = b = Number(values[0] ?? 0);
			a = Number(values[1] ?? 255);
		} else {
			r = Number(values[0] ?? 0);
			g = Number(values[1] ?? 0);
			b = Number(values[2] ?? 0);
			a = Number(values[3] ?? 255);
		}
		return cacheCanvasColor(
			clampByte(r),
			clampByte(g),
			clampByte(b),
			Math.max(0, Math.min(255, a)),
		);
	};

	const markDrawStateDirty = (mask: number) => {
		drawStateDirty |= mask;
	};

	const fontString = (state: DrawState) =>
		state.fontWeight + " " + state.fontSize + "px " + state.fontFamily;

	const syncDrawState = (mask = DIRTY_ALL) => {
		if (!drawingContext) return;
		const dirty = drawStateDirty & mask;
		if (!dirty) return;
		if (dirty & DIRTY_FILL_STYLE) drawingContext.fillStyle = drawState.fillStyle;
		if (dirty & DIRTY_STROKE_STYLE) drawingContext.strokeStyle = drawState.strokeStyle;
		if (dirty & DIRTY_LINE_WIDTH) drawingContext.lineWidth = drawState.lineWidth;
		if (dirty & DIRTY_LINE_JOIN) drawingContext.lineJoin = drawState.lineJoin;
		if (dirty & DIRTY_LINE_CAP) drawingContext.lineCap = drawState.lineCap;
		if (dirty & DIRTY_TEXT_ALIGN) drawingContext.textAlign = drawState.textAlign;
		if (dirty & DIRTY_TEXT_BASELINE) drawingContext.textBaseline = drawState.textBaseline;
		if (dirty & DIRTY_FONT) drawingContext.font = fontString(drawState);
		if (dirty & DIRTY_BLEND_MODE) {
			drawingContext.globalCompositeOperation = drawState.blendMode;
		}
		drawStateDirty &= ~dirty;
	};

	const resetDrawState = () => {
		shapeVertices.length = 0;
		stateStack.length = 0;
		drawState = defaultDrawState();
		drawStateDirty = DIRTY_ALL;
		if (drawingContext) {
			drawingContext.setTransform(1, 0, 0, 1, 0, 0);
			syncDrawState();
		}
	};

	const pixelDensity = (_value?: number) => 1;

	const resizeCanvas = (nextWidth: number, nextHeight: number) => {
		const nextW = Math.max(1, Math.floor(nextWidth));
		const nextH = Math.max(1, Math.floor(nextHeight));
		if (
			nextW === width &&
			nextH === height &&
			(!canvasEl || (canvasEl.width === nextW && canvasEl.height === nextH))
		) {
			return canvasEl;
		}
		width = nextW;
		height = nextH;
		if (game?.scale?.resize) game.scale.resize(width, height);
		if (canvasEl) {
			canvasEl.width = width;
			canvasEl.height = height;
			canvasEl.style.width = "100%";
			canvasEl.style.height = "100%";
		}
		return canvasEl;
	};

	const createCanvas = (nextWidth: number, nextHeight: number) => {
		resizeCanvas(nextWidth, nextHeight);
		drawingContext = (game?.context || canvasEl.getContext("2d")) as CanvasRenderingContext2D;
		resetDrawState();
		return canvasEl;
	};

	const frameRate = (fps: number) => {
		if (game?.loop) game.loop.targetFps = fps;
	};

	const push = () => {
		syncDrawState();
		drawingContext.save();
		stateStack.push({ ...drawState });
	};

	const pop = () => {
		if (!stateStack.length) return;
		drawingContext.restore();
		drawState = stateStack.pop() as DrawState;
		drawStateDirty = DIRTY_ALL;
	};

	const translate = (x: number, y: number) => drawingContext.translate(x, y);
	const rotate = (angle: number) => drawingContext.rotate(angle);
	const scale = (x: number, y?: number) => drawingContext.scale(x, y ?? x);

	const fill = (...input: any[]) => {
		const nextFill = toCanvasColor(...input);
		drawState.fillEnabled = true;
		if (drawState.fillStyle !== nextFill) {
			drawState.fillStyle = nextFill;
			markDrawStateDirty(DIRTY_FILL_STYLE);
		}
	};

	const noFill = () => {
		drawState.fillEnabled = false;
	};

	const stroke = (...input: any[]) => {
		const nextStroke = toCanvasColor(...input);
		drawState.strokeEnabled = true;
		if (drawState.strokeStyle !== nextStroke) {
			drawState.strokeStyle = nextStroke;
			markDrawStateDirty(DIRTY_STROKE_STYLE);
		}
	};

	const noStroke = () => {
		drawState.strokeEnabled = false;
	};

	const strokeWeight = (value: number) => {
		if (drawState.lineWidth === value) return;
		drawState.lineWidth = value;
		markDrawStateDirty(DIRTY_LINE_WIDTH);
	};

	const strokeJoin = (value: string) => {
		const nextJoin = (value === ROUND
			? "round"
			: value === BEVEL
				? "bevel"
				: "miter") as CanvasLineJoin;
		if (drawState.lineJoin === nextJoin) return;
		drawState.lineJoin = nextJoin;
		markDrawStateDirty(DIRTY_LINE_JOIN);
	};

	const rectMode = (mode: string) => {
		drawState.rectMode = mode;
	};

	const resolveRect = (x: number, y: number, w: number, h: number) => {
		if (drawState.rectMode === CENTER) return { x: x - w / 2, y: y - h / 2, w, h };
		if (drawState.rectMode === RADIUS) return { x: x - w, y: y - h, w: w * 2, h: h * 2 };
		if (drawState.rectMode === CORNERS) return { x, y, w: w - x, h: h - y };
		return { x, y, w, h };
	};

	const roundedRectPath = (x: number, y: number, w: number, h: number, radius = 0) => {
		const ctx: any = drawingContext;
		const r = Math.max(0, Math.min(Math.abs(radius), Math.abs(w) / 2, Math.abs(h) / 2));
		ctx.beginPath();
		if (r === 0) {
			ctx.rect(x, y, w, h);
			return;
		}
		if (typeof ctx.roundRect === "function") {
			ctx.roundRect(x, y, w, h, r);
			return;
		}
		ctx.moveTo(x + r, y);
		ctx.arcTo(x + w, y, x + w, y + h, r);
		ctx.arcTo(x + w, y + h, x, y + h, r);
		ctx.arcTo(x, y + h, x, y, r);
		ctx.arcTo(x, y, x + w, y, r);
		ctx.closePath();
	};

	const commitPath = () => {
		syncDrawState(DIRTY_PATH_STATE);
		if (drawState.fillEnabled) drawingContext.fill();
		if (drawState.strokeEnabled) drawingContext.stroke();
	};

	const rect = (x: number, y: number, w: number, h: number, radius = 0) => {
		const resolved = resolveRect(x, y, w, h);
		roundedRectPath(resolved.x, resolved.y, resolved.w, resolved.h, radius);
		commitPath();
	};

	const ellipse = (x: number, y: number, w: number, h = w) => {
		drawingContext.beginPath();
		drawingContext.ellipse(x, y, Math.abs(w) / 2, Math.abs(h) / 2, 0, 0, TAU);
		commitPath();
	};

	const circle = (x: number, y: number, diameter: number) => {
		ellipse(x, y, diameter, diameter);
	};

	const triangle = (x1: number, y1: number, x2: number, y2: number, x3: number, y3: number) => {
		drawingContext.beginPath();
		drawingContext.moveTo(x1, y1);
		drawingContext.lineTo(x2, y2);
		drawingContext.lineTo(x3, y3);
		drawingContext.closePath();
		commitPath();
	};

	const beginShape = () => {
		shapeVertices.length = 0;
	};

	const vertex = (x: number, y: number) => {
		shapeVertices.push(x, y);
	};

	const endShape = (mode?: string) => {
		if (!shapeVertices.length) return;
		drawingContext.beginPath();
		drawingContext.moveTo(shapeVertices[0], shapeVertices[1]);
		for (let i = 2; i < shapeVertices.length; i += 2) {
			drawingContext.lineTo(shapeVertices[i], shapeVertices[i + 1]);
		}
		if (mode === CLOSE) drawingContext.closePath();
		commitPath();
	};

	const blendMode = (mode: string) => {
		const nextBlend = (mode === BLEND ? "source-over" : mode) as GlobalCompositeOperation;
		if (drawState.blendMode === nextBlend) return;
		drawState.blendMode = nextBlend;
		markDrawStateDirty(DIRTY_BLEND_MODE);
	};

	const textAlign = (horizontal: string, vertical = BASELINE) => {
		const nextAlign = (horizontal === CENTER
			? "center"
			: horizontal === RIGHT
				? "right"
				: "left") as CanvasTextAlign;
		const nextBaseline = (vertical === CENTER
			? "middle"
			: vertical === "top"
				? "top"
				: vertical === "bottom"
					? "bottom"
					: "alphabetic") as CanvasTextBaseline;
		if (drawState.textAlign !== nextAlign) {
			drawState.textAlign = nextAlign;
			markDrawStateDirty(DIRTY_TEXT_ALIGN);
		}
		if (drawState.textBaseline !== nextBaseline) {
			drawState.textBaseline = nextBaseline;
			markDrawStateDirty(DIRTY_TEXT_BASELINE);
		}
	};

	const textSize = (size: number) => {
		if (drawState.fontSize === size) return;
		drawState.fontSize = size;
		markDrawStateDirty(DIRTY_FONT);
	};

	const textStyle = (style: string) => {
		const nextWeight = style === BOLD ? "bold" : "normal";
		if (drawState.fontWeight === nextWeight) return;
		drawState.fontWeight = nextWeight;
		markDrawStateDirty(DIRTY_FONT);
	};

	const textFont = (font: string) => {
		if (drawState.fontFamily === font) return;
		drawState.fontFamily = font;
		markDrawStateDirty(DIRTY_FONT);
	};

	const textWidth = (value: string) => {
		syncDrawState(DIRTY_FONT);
		return drawingContext.measureText(String(value)).width;
	};

	const text = (value: string, x: number, y: number) => {
		const textValue = String(value);
		syncDrawState(DIRTY_TEXT_STATE);
		if (drawState.fillEnabled) drawingContext.fillText(textValue, x, y);
		if (drawState.strokeEnabled) drawingContext.strokeText(textValue, x, y);
	};

	const cursor = (value: string) => {
		if (canvasEl) canvasEl.style.cursor = value;
	};

	const noCursor = () => {
		if (canvasEl) canvasEl.style.cursor = "none";
	};

	const background = (...input: any[]) => {
		syncDrawState();
		drawingContext.save();
		drawingContext.setTransform(1, 0, 0, 1, 0, 0);
		drawingContext.globalCompositeOperation = "source-over";
		drawingContext.fillStyle = toCanvasColor(...input);
		drawingContext.fillRect(0, 0, width, height);
		drawingContext.restore();
	};

	const constrain = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
	const random = (minOrMax?: number | any[], maybeMax?: number) => {
		if (Array.isArray(minOrMax)) {
			if (!minOrMax.length) return undefined;
			return minOrMax[Math.floor(Math.random() * minOrMax.length)];
		}
		if (typeof minOrMax === "number" && typeof maybeMax === "number") {
			return minOrMax + (maybeMax - minOrMax) * Math.random();
		}
		if (typeof minOrMax === "number") return Math.random() * minOrMax;
		return Math.random();
	};
	const dist = (x1: number, y1: number, x2: number, y2: number) => Math.hypot(x2 - x1, y2 - y1);
	const KEY_STATE_SIZE = 256;
	const keyDown = new Uint8Array(KEY_STATE_SIZE);
	const keyPressedEdges = new Uint8Array(KEY_STATE_SIZE);
	const KEY_CODES: Record<string, number> = {
		ArrowLeft: LEFT_ARROW,
		ArrowRight: RIGHT_ARROW,
		ArrowUp: UP_ARROW,
		ArrowDown: DOWN_ARROW,
		KeyA: 65,
		KeyC: 67,
		KeyD: 68,
		KeyE: 69,
		KeyF: 70,
		KeyS: 83,
		KeyW: 87,
		Digit1: 49,
		Digit2: 50,
		Digit3: 51,
		Digit4: 52,
		Digit5: 53,
		Digit6: 54,
		Digit7: 55,
		Digit8: 56,
		Numpad1: 49,
		Numpad2: 50,
		Numpad3: 51,
		Numpad4: 52,
		Numpad5: 53,
		Numpad6: 54,
		Numpad7: 55,
		Numpad8: 56,
		F1: 112,
		F2: 113,
		F3: 114,
		F4: 115,
	};
	const KEY = (event: KeyboardEvent) => {
		const mapped = KEY_CODES[event.code] ?? KEY_CODES[event.key];
		if (mapped) return mapped;
		if (/^[a-z0-9]$/i.test(event.key)) return event.key.toUpperCase().charCodeAt(0);
		return 0;
	};
	const KD = (code: number) => code > 0 && code < KEY_STATE_SIZE && keyDown[code] === 1;
	const justPressed = (code: number) => {
		if (code <= 0 || code >= KEY_STATE_SIZE || keyPressedEdges[code] === 0) return false;
		keyPressedEdges[code] = 0;
		return true;
	};
	const DIGITS_1_8 = [49, 50, 51, 52, 53, 54, 55, 56];

	const updatePointerFromEvent = (event: MouseEvent) => {
		const rect = canvasEl.getBoundingClientRect();
		const scaleX = rect.width ? width / rect.width : 1;
		const scaleY = rect.height ? height / rect.height : 1;
		mouseX = (event.clientX - rect.left) * scaleX;
		mouseY = (event.clientY - rect.top) * scaleY;
	};

	const allowFSKey = (value: string) =>
		value === "Escape" || value === "Esc" || value === "f" || value === "F";

	const toggleCanvasFullscreen = async () => {
		const docAny = document as any;
		const isFullscreen = !!(document.fullscreenElement || docAny.webkitFullscreenElement);
		try {
			if (!isFullscreen) {
				if (canvasEl.requestFullscreen) {
					await canvasEl.requestFullscreen({ navigationUI: "hide" } as any);
				} else if ((canvasEl as any).webkitRequestFullscreen) {
					(canvasEl as any).webkitRequestFullscreen();
				}
				try {
					setTimeout(() => canvasEl.focus(), 0);
				} catch { }
				try {
					(navigator as any).keyboard?.lock?.(["Escape"]);
				} catch { }
			} else if (document.exitFullscreen) {
				await document.exitFullscreen();
			} else if (docAny.webkitExitFullscreen) {
				docAny.webkitExitFullscreen();
			}
		} catch { }
	};

	const WORLD = { w: 10000, h: 10000 };
	const GRID_SPACING = 26;

	const COLORS = {
		bg: 160,
		worldFill: 200,
		gridMinor: 190,
		gridMajor: 190,
		bounds: 110,

		playerBody: [0, 178, 225],
		playerBodyBorderMul: 0.72,
		playerBarrel: [153, 153, 153],
		playerBarrelBorder: [114, 114, 114],

		shapeTri: [252, 118, 119],
		shapeSqr: [255, 232, 105],
		shapePent: [118, 141, 252],
		shapeDiaPink: [241, 119, 221],
		shapeHex: [190, 127, 245],
		shapeShiny: [127, 245, 213],

		barBg: [0, 0, 0, 190],

		barText: [255, 255, 255, 255],
		xpFill: [234, 210, 102],
		scoreFill: [102, 234, 156],
		hpFill: [133, 227, 125],

		statFills: [
			[231, 176, 137],
			[229, 102, 234],
			[166, 77, 255],
			[102, 144, 234],
			[234, 210, 102],
			[234, 102, 102],
			[146, 234, 102],
			[102, 234, 229],
		],

		miniBg: [180, 180, 180, 180],
		miniBorder: [0, 0, 0, 130],
		miniDot: [30, 140, 220],

		fpsPanelBg: [0, 0, 0, 140],
		fpsText: [255, 255, 255, 255],

		debugCrasherZone: [255, 165, 0, 80],
		debugHexZone: [191, 127, 245, 80],
	};

	const LEVEL_LOSS_THRESHOLD = 12;
	const LEVEL_LOSS_BELOW = 1;
	const LEVEL_LOSS_AT_OR_ABOVE = 3;

	const SHINY_CHANCE = 1 / 900;
	const SHINY_XP_HP_MULT = 40;

	const WORLD_FILL_CSS = `rgb(${COLORS.worldFill},${COLORS.worldFill},${COLORS.worldFill})`;

	const HIT_R = [182, 52, 52];
	const HIT_R_DARK = [131, 37, 37];
	const HIT_R_INNER = [191, 76, 76];
	const HIT_W = [230, 230, 230];
	const HIT_W_DARK = [165, 165, 165];
	const HIT_W_INNER = [233, 233, 233];

	const MINIMAP = { margin: 14, size: 184 };
	const UI = {
		margin: 6,
		statBarW: 210,
		statBarH: 18,
		statRowH: 24,
		barPad: 3,
		hpBarPad: 0.1,
		barOuterR: 10,
		barInnerR: 7,
		statOuterR: 8,
		statInnerR: 6,
	};

	const XP_GAIN_MULT = 1;
	const XP_REQUIRED_MULT = 1.0;

	const XP_TOTALS = [
		0, 4, 13, 28, 50, 78, 113, 157, 211, 275, 350, 437, 538, 655, 787,
		938, 1109, 1301, 1516, 1757, 2026, 2325, 2658, 3026, 3433, 3883, 4379,
		4925, 5525, 6184, 6907, 7698, 8537, 9426, 10368, 11367, 12426, 13549,
		14739, 16000, 17337, 18754, 20256, 21849, 23536,
	];
	const LEVEL_CAP = 45;
	const xpToLevel = (lvl: number) =>
		Math.floor(XP_TOTALS[lvl] * XP_REQUIRED_MULT);
	const TOTAL_TO_MAX = xpToLevel(LEVEL_CAP - 1);

	const TANK_COMBAT_COOLDOWN = 6.0;
	const REGEN_RATE = [
		0.0312, 0.0326, 0.0433, 0.066, 0.0851, 0.1095, 0.1295, 0.156,
	];
	const HYPER_REGEN_AFTER = 30.0;
	const HYPER_REGEN_MULT = 3.0;

	const MAX_HP_BONUS = [0, 20, 40, 60, 80, 100, 120, 140];

	const BODY_HIT_SHAPE = [20, 24, 28, 32, 36, 40, 44, 48];

	const SHAPES_DEF = {
		sqr: {
			color: COLORS.shapeSqr,
			r: 22,
			hp: 10,
			body: 8,
			xp: 10,
			rotSpd: 0.18,
			orbitSpd: 0.42,
			orbitR: 26,
		},
		tri: {
			color: COLORS.shapeTri,
			r: 26,
			hp: 30,
			body: 8,
			xp: 25,
			rotSpd: 0.15,
			orbitSpd: 0.48,
			orbitR: 32,
		},
		pent: {
			color: COLORS.shapePent,
			r: 40,
			hp: 100,
			body: 12,
			xp: 130,
			rotSpd: 0.12,
			orbitSpd: 0.34,
			orbitR: 36,
		},
		dia: {
			color: COLORS.shapeDiaPink,
			r: 30,
			hp: 10,
			body: 10,
			xp: 15,
			rotSpd: 0.22,
			orbitSpd: 0.0,
			orbitR: 0,
		},
		hex: {
			color: COLORS.shapeHex,
			r: 120,
			hp: 6000,
			body: 20,
			xp: 4500,
			rotSpd: 0.09,
			orbitSpd: 0.0,
			orbitR: 10,
		},
	};

	const BULLET_HP = [7, 12, 16, 21, 25, 32, 37, 43];
	const BULLET_DMG = [7, 10, 13, 16, 19, 22, 25, 28];
	const RELOAD_SEC = [0.6, 0.56, 0.52, 0.48, 0.44, 0.4, 0.36, 0.32];
	const BULLET_SPEED_BASE = 380;
	const BULLET_SPEED_STEP = 58;
	const BULLET_LIFE_BASE = 2.05;
	const BULLET_LIFE_PER_SPEED = 0.03;
	const BULLET_PVP_DAMAGE_FROM_DMG = 0.018;
	const BULLET_PVP_DAMAGE_FROM_PEN = 0.014;
	const BULLET_PVP_HP_FROM_PEN = 0.02;
	const BULLET_PVP_HP_FROM_DMG = 0.012;
	const BULLET_TANK_DAMAGE_MUL = 1.15;
	const BOT_DODGE_TRIGGER_CHANCE = 0.69;
	const BOT_DODGE_WINDOW_FRAMES = 14;

	const TEAMS: Array<{ name: TeamName; color: number[]; key: string }> = [
		{ name: "blue", color: [61, 184, 220], key: "tl" },
		{ name: "purple", color: [195, 148, 234], key: "tr" },
		{ name: "green", color: [61, 217, 139], key: "bl" },
		{ name: "red", color: [229, 113, 120], key: "br" },
	];
	const TEAM_TANK_COLORS: Record<TeamName, number[]> = {
		blue: [0, 178, 225],
		purple: [191, 127, 245],
		green: [0, 225, 110],
		red: [241, 78, 84],
	};

	const TEAM_TANK_COLORS_STROKE: Record<TeamName, number[]> = {
		blue: [
			Math.floor(TEAM_TANK_COLORS.blue[0] * COLORS.playerBodyBorderMul),
			Math.floor(TEAM_TANK_COLORS.blue[1] * COLORS.playerBodyBorderMul),
			Math.floor(TEAM_TANK_COLORS.blue[2] * COLORS.playerBodyBorderMul),
		],
		purple: [
			Math.floor(TEAM_TANK_COLORS.purple[0] * COLORS.playerBodyBorderMul),
			Math.floor(TEAM_TANK_COLORS.purple[1] * COLORS.playerBodyBorderMul),
			Math.floor(TEAM_TANK_COLORS.purple[2] * COLORS.playerBodyBorderMul),
		],
		green: [
			Math.floor(TEAM_TANK_COLORS.green[0] * COLORS.playerBodyBorderMul),
			Math.floor(TEAM_TANK_COLORS.green[1] * COLORS.playerBodyBorderMul),
			Math.floor(TEAM_TANK_COLORS.green[2] * COLORS.playerBodyBorderMul),
		],
		red: [
			Math.floor(TEAM_TANK_COLORS.red[0] * COLORS.playerBodyBorderMul),
			Math.floor(TEAM_TANK_COLORS.red[1] * COLORS.playerBodyBorderMul),
			Math.floor(TEAM_TANK_COLORS.red[2] * COLORS.playerBodyBorderMul),
		],
	};

	const _flashCache: { body: Partial<Record<TeamName, number[]>>; barrel: number[] | null } = {
		body: {},
		barrel: null,
	};
	function getBodyFlash(team: TeamName) {
		let v = _flashCache.body[team];
		if (!v) {
			v = lighten(TEAM_TANK_COLORS[team], 0.35);
			_flashCache.body[team] = v;
		}
		return v;
	}
	function getBarrelFlash(): number[] {
		if (!_flashCache.barrel) {
			_flashCache.barrel = lighten(COLORS.playerBarrel, 0.35);
		}
		return _flashCache.barrel;
	}

	const UPGRADE_LEVELS: UpgradeLevel[] = [15, 30, 45];
	const UPGRADE_DIGITS = [112, 113, 114, 115];
	const UPGRADE_CARD_BG = [88, 88, 88];
	const MENU_TANK_BODY = COLORS.playerBody;
	const MENU_TANK_BODY_BORDER = TEAM_TANK_COLORS_STROKE.blue;

	const TANK_CLASS_NAMES: Record<TankClassId, string> = {
		basic: "Basic",
		double: "Double",
		isole: "Isole",
		flanc: "Flanc",
		fracas: "Fracas",
		tripler: "Tripler",
		quatri: "Quatri",
		tireur: "Tireur",
		surveiller: "Surveiller",
		triangle: "Triangle",
		pointe: "Pointe",
		cinq: "Cinq",
		huit: "Huit",
		ampli: "Ampli",
		gamme: "Gamme",
		mort: "Mort",
		suzerain: "Suzerain",
	};

	const TANK_UPGRADE_TREE: Partial<
		Record<TankClassId, Partial<Record<UpgradeLevel, TankClassId[]>>>
	> = {
		basic: {
			15: ["double", "isole", "flanc"],
		},
		double: {
			30: ["tripler", "quatri"],
		},
		isole: {
			30: ["tireur", "surveiller"],
		},
		flanc: {
			30: ["triangle", "quatri"],
		},
		fracas: {
			45: ["pointe"],
		},
		tripler: {
			45: ["cinq"],
		},
		quatri: {
			45: ["huit"],
		},
		tireur: {
			45: ["gamme"],
		},
		surveiller: {
			45: ["mort", "suzerain"],
		},
		triangle: {
			45: ["ampli"],
		},
	};

	const TANK_CLASS_DEFS: Record<
		| "basic"
		| "double"
		| "isole"
		| "flanc"
		| "fracas"
		| "tripler"
		| "quatri"
		| "tireur"
		| "surveiller"
		| "triangle"
		| "pointe"
		| "cinq"
		| "huit"
		| "ampli"
		| "gamme"
		| "mort"
		| "suzerain",
		TankClassDef
	> = {
		basic: {
			id: "basic",
			name: "Basic",
			implemented: true,
			bodyShape: "circle",
			previewAngle: -PI / 2 + 0.15,
			uiTop: [169, 241, 240],
			uiBottom: [127, 204, 203],
			renderBarrels: [{ angle: 0 }],
			botPreference: {
				sniper: 0.1,
				skirmisher: 0.1,
				brawler: 0.1,
				bulwark: 0.1,
				raider: 0.1,
			},
		},
		double: {
			id: "double",
			name: "Double",
			implemented: true,
			bodyShape: "circle",
			previewAngle: -PI / 2 + 0.08,
			uiTop: [147, 236, 236],
			uiBottom: [121, 198, 198],
			stats: {
				bulletDamageMul: 0.65,
				bulletHPMul: 0.9,
				reloadMul: 0.5,
				recoilMul: 0.25,
			},
			renderBarrels: [
				{ angle: 0, mountY: -0.39, widthMul: 0.7 },
				{ angle: 0, mountY: 0.39, widthMul: 0.7 },
			],
			botPreference: {
				sniper: 0.2,
				skirmisher: 1.0,
				brawler: 0.35,
				bulwark: 0.58,
				raider: 0.8,
			},
		},
		isole: {
			id: "isole",
			name: "Isole",
			implemented: true,
			bodyShape: "circle",
			previewAngle: -PI / 2 + 0.12,
			uiTop: [183, 246, 150],
			uiBottom: [149, 207, 118],
			stats: {
				bulletSpeedMul: 1.22,
				reloadMul: 1.25,
				fovBonus: 160,
			},
			renderBarrels: [{ angle: 0, lengthMul: 2.05, widthMul: 0.68 }],
			botPreference: {
				sniper: 1.0,
				skirmisher: 0.45,
				brawler: 0.1,
				bulwark: 0.74,
				raider: 0.24,
			},
		},
		flanc: {
			id: "flanc",
			name: "Flanc",
			implemented: true,
			bodyShape: "circle",
			previewAngle: -PI / 2 + 0.1,
			uiTop: [250, 231, 156],
			uiBottom: [211, 196, 125],
			renderBarrels: [{ angle: 0 }, { angle: PI, lengthMul: 1.38, widthMul: 0.68 }],
			botPreference: {
				sniper: 0.15,
				skirmisher: 0.62,
				brawler: 0.9,
				bulwark: 0.42,
				raider: 1.0,
			},
		},
		fracas: {
			id: "fracas",
			name: "Fracas",
			implemented: true,
			bodyShape: "circle",
			previewAngle: -PI / 2 + 0.08,
			uiTop: [164, 218, 231],
			uiBottom: [121, 173, 184],
			stats: {
				moveSpeedMul: 1.1,
				fovBonus: 140,
			},
			bodyDecoration: {
				kind: "hex",
				radiusMul: 1.17,
				spinSpeed: 1.35,
				previewAngle: PI / 10,
			},
			renderBarrels: [],
			meleeOnly: true,
			botPreference: {
				sniper: 0.02,
				skirmisher: 0.16,
				brawler: 1.0,
				bulwark: 0.82,
				raider: 0.34,
			},
		},
		tripler: {
			id: "tripler",
			name: "Tripler",
			implemented: true,
			bodyShape: "circle",
			previewAngle: -PI / 2 + 0.08,
			uiTop: [151, 234, 238],
			uiBottom: [120, 193, 198],
			stats: {
				bulletDamageMul: 0.7,
				bulletHPMul: 1.0,
				reloadMul: 0.52,
				recoilMul: 0.25,
			},
			renderBarrels: [
				{ angle: -0.66, mountY: -0.16, lengthMul: 1.58 },
				{ angle: 0.66, mountY: 0.16, lengthMul: 1.58 },
				{ angle: 0, lengthMul: 1.76 },
			],
			botPreference: {
				sniper: 0.22,
				skirmisher: 1.0,
				brawler: 0.28,
				bulwark: 0.52,
				raider: 0.72,
			},
		},
		quatri: {
			id: "quatri",
			name: "Quatri",
			implemented: true,
			bodyShape: "circle",
			previewAngle: -PI / 3,
			uiTop: [182, 246, 154],
			uiBottom: [148, 206, 119],
			stats: {
				bulletDamageMul: 0.82,
				bulletHPMul: 0.75,
				reloadMul: 0.9,
				recoilMul: 0,
			},
			renderBarrels: [
				{ angle: 0 },
				{ angle: HALF_PI },
				{ angle: PI },
				{ angle: -HALF_PI },
			],
			botPreference: {
				sniper: 0.2,
				skirmisher: 0.66,
				brawler: 0.68,
				bulwark: 1.0,
				raider: 0.82,
			},
		},
		tireur: {
			id: "tireur",
			name: "Tireur",
			implemented: true,
			bodyShape: "circle",
			previewAngle: -PI / 2 + 0.08,
			uiTop: [154, 234, 240],
			uiBottom: [122, 198, 204],
			stats: {
				bulletSpeedMul: 1.34,
				reloadMul: 1.12,
				fovBonus: 290,
				recoilMul: 1.28,
			},
			renderBarrels: [{ angle: 0, lengthMul: 2.45, widthMul: 0.66 }],
			botPreference: {
				sniper: 1.0,
				skirmisher: 0.32,
				brawler: 0.08,
				bulwark: 0.76,
				raider: 0.12,
			},
		},
		surveiller: {
			id: "surveiller",
			name: "Surveiller",
			implemented: true,
			bodyShape: "circle",
			previewAngle: -PI / 2 + 0.12,
			uiTop: [182, 246, 154],
			uiBottom: [148, 206, 119],
			stats: {
				fovBonus: 180,
			},
			renderBarrels: [
				{ angle: HALF_PI, weaponKind: "spawner", baseOffsetMul: 0.82, lengthMul: 0.82, widthMul: 1.02 },
				{ angle: -HALF_PI, weaponKind: "spawner", baseOffsetMul: 0.82, lengthMul: 0.82, widthMul: 1.02 },
			],
			aimBarrels: [],
			droneCapacity: 8,
			droneShape: "tri",
			droneRadius: 15,
			droneBody: 8,
			droneHP: 16,
			droneSpeed: 450,
			droneCooldown: 2.25,
			droneAutoRange: 900,
			botPreference: {
				sniper: 0.84,
				skirmisher: 0.36,
				brawler: 0.06,
				bulwark: 1.0,
				raider: 0.18,
			},
		},
		triangle: {
			id: "triangle",
			name: "Triangle",
			implemented: true,
			bodyShape: "circle",
			previewAngle: -PI / 2 + 0.1,
			uiTop: [154, 234, 240],
			uiBottom: [122, 198, 204],
			renderBarrels: [
				{ angle: 0 },
				{ angle: PI - 0.72, mountY: -0.06, lengthMul: 1.28, widthMul: 0.6 },
				{ angle: -PI + 0.72, mountY: 0.06, lengthMul: 1.28, widthMul: 0.6 },
			],
			aimBarrels: [
				{ angle: 0, recoilMul: 0.7 },
				{ angle: PI - 0.72, lengthMul: 1.28, widthMul: 0.6, damageMul: 0.2, hpMul: 0.2, recoilMul: 1.3 },
				{ angle: -PI + 0.72, lengthMul: 1.28, widthMul: 0.6, damageMul: 0.2, hpMul: 0.2, recoilMul: 1.3 },
			],
			botPreference: {
				sniper: 0.08,
				skirmisher: 0.58,
				brawler: 0.9,
				bulwark: 0.16,
				raider: 1.0,
			},
		},
		pointe: {
			id: "pointe",
			name: "Pointe",
			implemented: true,
			bodyShape: "circle",
			previewAngle: -PI / 2 + 0.08,
			uiTop: [250, 182, 186],
			uiBottom: [209, 132, 137],
			stats: {
				moveSpeedMul: 1.1,
				fovBonus: 160,
				bodyHitBonus: 8,
			},
			bodyDecoration: {
				kind: "spikes",
				radiusMul: 1.46,
				innerRadiusMul: 1.08,
				count: 12,
				spinSpeed: 4.6,
				previewAngle: PI / 12,
			},
			renderBarrels: [],
			meleeOnly: true,
			botPreference: {
				sniper: 0.01,
				skirmisher: 0.12,
				brawler: 1.0,
				bulwark: 0.94,
				raider: 0.28,
			},
		},
		cinq: {
			id: "cinq",
			name: "Cinq",
			implemented: true,
			bodyShape: "circle",
			previewAngle: -PI / 2 + 0.06,
			uiTop: [181, 246, 154],
			uiBottom: [148, 206, 119],
			stats: {
				bulletDamageMul: 0.5,
				bulletHPMul: 0.95,
				reloadMul: 0.54,
				recoilMul: 0.22,
			},
			renderBarrels: [
				{ angle: -0.78, lengthMul: 1.4, widthMul: 0.66 },
				{ angle: 0.78, lengthMul: 1.4, widthMul: 0.66 },
				{ angle: -0.38, mountY: -0.04, lengthMul: 1.6, widthMul: 0.7 },
				{ angle: 0.38, mountY: 0.04, lengthMul: 1.6, widthMul: 0.7 },
				{ angle: 0, lengthMul: 1.95 },
			],
			botPreference: {
				sniper: 0.24,
				skirmisher: 1.0,
				brawler: 0.18,
				bulwark: 0.44,
				raider: 0.64,
			},
		},
		huit: {
			id: "huit",
			name: "Huit",
			implemented: true,
			bodyShape: "circle",
			previewAngle: -PI / 4,
			uiTop: [154, 234, 240],
			uiBottom: [122, 198, 204],
			stats: {
				bulletDamageMul: 0.48,
				bulletHPMul: 0.6,
				reloadMul: 0.94,
				recoilMul: 0,
			},
			renderBarrels: [
				{ angle: 0 },
				{ angle: PI / 4 },
				{ angle: HALF_PI },
				{ angle: (3 * PI) / 4 },
				{ angle: PI },
				{ angle: -(3 * PI) / 4 },
				{ angle: -HALF_PI },
				{ angle: -PI / 4 },
			],
			botPreference: {
				sniper: 0.14,
				skirmisher: 0.46,
				brawler: 0.62,
				bulwark: 1.0,
				raider: 0.54,
			},
		},
		ampli: {
			id: "ampli",
			name: "Ampli",
			implemented: true,
			bodyShape: "circle",
			previewAngle: -PI / 2 + 0.08,
			uiTop: [181, 246, 154],
			uiBottom: [148, 206, 119],
			renderBarrels: [
				{ angle: 0, lengthMul: 1.8 },
				{ angle: PI - 0.95, mountY: -0.18, lengthMul: 1.32, widthMul: 0.58 },
				{ angle: -PI + 0.95, mountY: 0.18, lengthMul: 1.32, widthMul: 0.58 },
				{ angle: PI - 0.48, mountY: -0.02, lengthMul: 1.42, widthMul: 0.56 },
				{ angle: -PI + 0.48, mountY: 0.02, lengthMul: 1.42, widthMul: 0.56 },
			],
			aimBarrels: [
				{ angle: 0, recoilMul: 0.65 },
				{ angle: PI - 0.95, mountY: -0.18, lengthMul: 1.2, widthMul: 0.58, damageMul: 0.2, hpMul: 0.2, speedMul: 1.2, lifeMul: 0.5, recoilMul: 1.45 },
				{ angle: PI - 0.48, mountY: -0.02, lengthMul: 1.34, widthMul: 0.58, damageMul: 0.2, hpMul: 0.2, speedMul: 1.2, lifeMul: 0.5, recoilMul: 1.45 },
				{ angle: -PI + 0.48, mountY: 0.02, lengthMul: 1.34, widthMul: 0.58, damageMul: 0.2, hpMul: 0.2, speedMul: 1.2, lifeMul: 0.5, recoilMul: 1.45 },
				{ angle: -PI + 0.95, mountY: 0.18, lengthMul: 1.2, widthMul: 0.58, damageMul: 0.2, hpMul: 0.2, speedMul: 1.2, lifeMul: 0.5, recoilMul: 1.45 },
			],
			botPreference: {
				sniper: 0.06,
				skirmisher: 0.48,
				brawler: 0.86,
				bulwark: 0.1,
				raider: 1.0,
			},
		},
		gamme: {
			id: "gamme",
			name: "Gamme",
			implemented: true,
			bodyShape: "circle",
			previewAngle: -PI / 2 + 0.08,
			uiTop: [151, 234, 238],
			uiBottom: [120, 193, 198],
			stats: {
				bulletSpeedMul: 1.34,
				reloadMul: 1.12,
				fovBonus: 420,
				recoilMul: 1.28,
			},
			renderBarrels: [
				{ angle: 0, lengthMul: 2.45, widthMul: 0.66 },
				{ angle: 0, baseOffsetMul: 0.56, lengthMul: 0.98, widthMul: 0.86, weaponKind: "spawner" },
			],
			aimBarrels: [{ angle: 0, lengthMul: 2.45, widthMul: 0.66 }],
			botPreference: {
				sniper: 1.0,
				skirmisher: 0.24,
				brawler: 0.04,
				bulwark: 0.58,
				raider: 0.08,
			},
		},
		mort: {
			id: "mort",
			name: "Mort",
			implemented: true,
			bodyShape: "square",
			bodyScale: 0.94,
			previewAngle: -PI / 2 + 0.1,
			uiTop: [181, 246, 154],
			uiBottom: [148, 206, 119],
			renderBarrels: [
				{ angle: HALF_PI, weaponKind: "spawner", baseOffsetMul: 0.9, lengthMul: 0.6, widthMul: 1.08 },
				{ angle: -HALF_PI, weaponKind: "spawner", baseOffsetMul: 0.9, lengthMul: 0.6, widthMul: 1.08 },
			],
			aimBarrels: [],
			droneCapacity: 28,
			droneShape: "sqr",
			droneRadius: 14,
			droneBody: 6,
			droneHP: 12,
			droneSpeed: 380,
			droneCooldown: 2.6,
			droneAutoRange: 860,
			infectSquares: true,
			botPreference: {
				sniper: 0.52,
				skirmisher: 0.34,
				brawler: 0.12,
				bulwark: 1.0,
				raider: 0.14,
			},
		},
		suzerain: {
			id: "suzerain",
			name: "Suzerain",
			implemented: true,
			bodyShape: "circle",
			previewAngle: -PI / 3,
			uiTop: [169, 241, 240],
			uiBottom: [127, 204, 203],
			renderBarrels: [
				{ angle: 0, weaponKind: "spawner", baseOffsetMul: 0.84, lengthMul: 0.78, widthMul: 0.98 },
				{ angle: HALF_PI, weaponKind: "spawner", baseOffsetMul: 0.84, lengthMul: 0.78, widthMul: 0.98 },
				{ angle: PI, weaponKind: "spawner", baseOffsetMul: 0.84, lengthMul: 0.78, widthMul: 0.98 },
				{ angle: -HALF_PI, weaponKind: "spawner", baseOffsetMul: 0.84, lengthMul: 0.78, widthMul: 0.98 },
			],
			aimBarrels: [],
			droneCapacity: 11,
			droneShape: "tri",
			droneRadius: 17,
			droneBody: 10,
			droneHP: 18,
			droneSpeed: 490,
			droneCooldown: 2.35,
			droneAutoRange: 980,
			botPreference: {
				sniper: 0.76,
				skirmisher: 0.42,
				brawler: 0.06,
				bulwark: 1.0,
				raider: 0.16,
			},
		},
	};

	function isImplementedTankClass(id: TankClassId) {
		return Object.prototype.hasOwnProperty.call(TANK_CLASS_DEFS, id);
	}

	function getTankClassDef(id: TankClassId) {
		if (isImplementedTankClass(id)) {
			return TANK_CLASS_DEFS[id as keyof typeof TANK_CLASS_DEFS];
		}
		return TANK_CLASS_DEFS.basic;
	}

	function tankClassName(id: TankClassId) {
		return TANK_CLASS_NAMES[id] || TANK_CLASS_NAMES.basic;
	}

	let _spawnerAccum = 0;

	let TEAM_PROTECTORS: ShapeEntity[][] = [];
	let TEAM_LIMIT_R: number[] = [];
	let protectorLocks: Array<
		Record<string, { chosenIds: number[]; until: number; requiredCount: number }>
	> = [];
	const PROTECTOR_STICKY_SEC = 4.0;
	const DRONE_BULLET_SPEED_BASE = 360;
	const DRONE_BULLET_DAMAGE_TAKEN_MUL = 0.35;
	const DRONE_BASE_SPEED_BUFF = 1.04;
	const DRONE_AUTO_LEASH_RATIO = 0.82;
	let nextTankId = 1;

	type Point = {
		x: number;
		y: number;
	};

	type TeamName = "blue" | "purple" | "green" | "red";

	type Rect = Point & {
		w: number;
		h: number;
	};

	type DeathPreviewKind = "none" | "tank" | "shape" | "protector" | "bullet";
	type DeathPreviewShapeType = "tri" | "sqr" | "pent" | "dia" | "hex";

	type DeathInfo = {
		killer: string;
		score: number;
		level: number;
		time: number;
		kills: number;
		tankClass: TankClassId;
		killerTankClass?: TankClassId | null;
		killerTankTeamIdx?: number | null;
		killerPreviewKind?: DeathPreviewKind | null;
		killerPreviewShape?: DeathPreviewShapeType | null;
		killerPreviewTeamIdx?: number | null;
	};

	type SpawnerPlayerRef = Point & {
		r: number;
		dead?: boolean;
		getRadiusScaled?: () => number;
		[key: string]: any;
	};

	type TankStats = {
		regen: number;
		maxHP: number;
		bodyDmg: number;
		bulletSpd: number;
		penetration: number;
		bulletDmg: number;
		reload: number;
		moveSpd: number;
		[key: string]: number;
	};

	type TankEntity = {
		x: number;
		y: number;
		r: number;
		vx: number;
		vy: number;
		lastHit: number;
		hitTimer: number;
		reloadTimer: number;
		recoilX: number;
		recoilY: number;
		level: number;
		xp: number;
		statPoints: number;
		stats: TankStats;
		hp: number;
		_hpInit: boolean;
		hpVis: number;
		barrelKick: number;
		barrelAng: number;
		teamIdx: number;
		isDead: boolean;
		lifeStartTime: number;
		lastDamagedBy: string | null;
		deathInfo: DeathInfo | null;
		invincible: boolean;
		tankClass: TankClassId;
		upgradeSelections: Partial<Record<UpgradeLevel, TankClassId>>;
		pendingUpgradeLevel: UpgradeLevel | 0;
		shotCycle: number;
		doubleSyncShots: boolean;
		autoFireToggleChain: number;
		lastAutoFireToggleAt: number;
		droneSpawnTimer: number;
		[key: string]: any;
	};

	type ShapeEntity = {
		id: number;
		type: string;
		spawnBucket?: ShapeSpawnBucket;
		sides: number;
		active: number;
		col: number[];
		colBorder: number[];
		colInner: number[];
		r: number;
		cx: number;
		cy: number;
		theta: number;
		orbitSpd: number;
		orbitR: number;
		rot: number;
		rotSpd: number;
		kx: number;
		ky: number;
		kvx: number;
		kvy: number;
		hp: number;
		maxHp: number;
		body: number;
		xp: number;
		lastHit: number;
		hitTimer: number;
		hitTimer2: number;
		dying: boolean;
		deathTimer: number;
		dead: boolean;
		hpVis: number;
		x: number;
		y: number;
		[key: string]: any;
	};

	type BulletEntity = {
		_bi: number;
		[key: string]: any;
	};

	type ShapeOptions = {
		col?: number[];
		r?: number;
		spawnBucket?: ShapeSpawnBucket;
		forceNoShiny?: boolean;
		invincible?: boolean;
		ai?: string;
		seekSpd?: number;
		aiAccel?: number;
		friction?: number;
		teamIdx?: number;
		baseCenter?: Point;
		homeTheta?: number;
		homeR?: number;
		limitR?: number;
		idleOmega?: number;
		isCrasher?: boolean;
		rvo?: boolean;
		[key: string]: any;
	};

	type DrawTextOptions = {
		size?: number;
		bold?: boolean;
		alignX?: string;
		alignY?: string;
	};

	type BotTargetInfo = {
		type: "tank" | "shape" | "none";
		target: TankEntity | ShapeEntity | null;
		score: number;
		dist: number;
		desiredRange: number;
		shouldRam: boolean;
		aimX: number;
		aimY: number;
		blocked: number;
		threat: number;
		killConfirm: number;
		duelEdge: number;
		baseDanger: number;
	};

	type BotMode =
		| "patrol"
		| "farm"
		| "engage"
		| "chase"
		| "retreat"
		| "recover";

	type BotBuildKey =
		| "sniper"
		| "skirmisher"
		| "brawler"
		| "bulwark"
		| "raider";

	type BotAIState = {
		build: BotBuildKey;
		mode: BotMode;
		confidence: number;
		pressure: number;
		caution: number;
		aggressionJitter: number;
		farmJitter: number;
		retreatJitter: number;
		strafeJitter: number;
		roamJitter: number;
		focusJitter: number;
		strafeDir: number;
		strafeSwapAt: number;
		roamX: number;
		roamY: number;
		roamUntil: number;
		focusTankUid: number;
		focusShapeId: number;
		focusUntil: number;
		lastThreatUid: number;
		lastDamageAt: number;
		lastKillAt: number;
		lastModeChangeAt: number;
		retreatUntil: number;
		recoverUntil: number;
		burstUntil: number;
		aimX: number;
		aimY: number;
		lastHp: number;
		kills: number;
		deaths: number;
	};

	type UpgradeLevel = 15 | 30 | 45;

	type TankClassId =
		| "basic"
		| "double"
		| "isole"
		| "flanc"
		| "fracas"
		| "tripler"
		| "quatri"
		| "tireur"
		| "surveiller"
		| "triangle"
		| "pointe"
		| "cinq"
		| "huit"
		| "ampli"
		| "gamme"
		| "mort"
		| "suzerain";

	type TankBodyShape = "circle" | "square";

	type TankBodyDecoration = {
		kind: "hex" | "spikes";
		radiusMul?: number;
		innerRadiusMul?: number;
		count?: number;
		spinSpeed?: number;
		previewAngle?: number;
		color?: number[];
	};

	type TankBarrelLayout = {
		angle: number;
		mountX?: number;
		mountY?: number;
		baseOffsetMul?: number;
		lengthMul?: number;
		widthMul?: number;
		weaponKind?: "barrel" | "spawner";
	};

	type TankShotBarrel = TankBarrelLayout & {
		damageMul?: number;
		hpMul?: number;
		speedMul?: number;
		lifeMul?: number;
		recoilMul?: number;
	};

	type TankClassStats = {
		bulletDamageMul?: number;
		bulletHPMul?: number;
		reloadMul?: number;
		bulletSpeedMul?: number;
		fovBonus?: number;
		recoilMul?: number;
		moveSpeedMul?: number;
		bodyHitBonus?: number;
	};

	type TankClassDef = {
		id: TankClassId;
		name: string;
		implemented?: boolean;
		bodyShape?: TankBodyShape;
		bodyDecoration?: TankBodyDecoration;
		bodyScale?: number;
		previewAngle?: number;
		uiTop: number[];
		uiBottom: number[];
		stats?: TankClassStats;
		renderBarrels: TankBarrelLayout[];
		aimBarrels?: TankShotBarrel[];
		droneCapacity?: number;
		droneShape?: "tri" | "sqr";
		droneRadius?: number;
		droneBody?: number;
		droneHP?: number;
		droneSpeed?: number;
		droneCooldown?: number;
		droneAutoRange?: number;
		infectSquares?: boolean;
		meleeOnly?: boolean;
		botPreference?: Partial<Record<BotBuildKey, number>>;
	};

	type RespawnRequest = {
		group: number;
		[key: string]: any;
	};

	type ShapeSpawnBucket = "field" | "nest" | "crasher";

	type SpawnTicket = {
		readyAt: number;
	};

	type SpawnerConfig = {
		world: { w: number; h: number };
		gridSize: number;
		polygonWeights?: number[];
		maxHexagons?: number;
		minDistFromPlayer?: number;
		minDistFromTank?: number;
		hideRegularSpawnsFromTanks?: boolean;
		crasherEqualsNest?: boolean;
		maxPlacementAttempts?: number;
		rng?: () => number;
		factory: {
			createPolygon: (kind: number, p: Point, fromNest?: boolean) => ShapeEntity | null;
			createNestPolygon: (kind: number, p: Point) => ShapeEntity | null;
			createCrasher: (p: Point, elite: boolean) => ShapeEntity | null;
			createEnemy: (request: RespawnRequest, p: Point) => unknown;
		};
		getPlayer?: () => SpawnerPlayerRef | null;
		getTanks?: () => TankEntity[];
		budgets?: {
			rates?: Partial<Record<"polygons" | "nest" | "crashers" | "respawns", number>>;
			caps?: Partial<Record<"polygons" | "nest" | "crashers" | "respawns", number>>;
		};
		crasherCooldownSec?: number;
		nestPentCooldownSec?: number;
		desiredPentFrac?: number;
	};

	class Pool<T = any> {
		free: T[] = [];

		acquire(newObj: () => T) {
			return this.free.pop() || newObj();
		}
		release(obj: T) {
			this.free.push(obj);
		}
	}

	function randf(a: number, b: number, rf: () => number = Math.random) {
		return a + (b - a) * rf();
	}
	function randInt(a: number, b: number, rf: () => number = Math.random) {
		return Math.floor(randf(a, b + 1, rf));
	}
	function distance(ax: number, ay: number, bx: number, by: number) {
		const dx = ax - bx,
			dy = ay - by;
		return Math.hypot(dx, dy);
	}
	function distanceSq(ax: number, ay: number, bx: number, by: number) {
		const dx = ax - bx;
		const dy = ay - by;
		return dx * dx + dy * dy;
	}
	function withinRect(p: Point, rect: Rect) {
		return (
			p.x >= rect.x &&
			p.x <= rect.x + rect.w &&
			p.y >= rect.y &&
			p.y <= rect.y + rect.h
		);
	}

	type IndexedQueue<T> = {
		items: T[];
		head: number;
	};

	function queueLength<T>(queue: IndexedQueue<T>) {
		return queue.items.length - queue.head;
	}

	function queueClear<T>(queue: IndexedQueue<T>) {
		queue.items.length = 0;
		queue.head = 0;
	}

	function queuePush<T>(queue: IndexedQueue<T>, value: T) {
		queue.items.push(value);
	}

	function queuePeek<T>(queue: IndexedQueue<T>) {
		return queue.head < queue.items.length ? queue.items[queue.head] : undefined;
	}

	function queueCompact<T>(queue: IndexedQueue<T>) {
		if (queue.head === 0) return;
		if (queue.head >= queue.items.length) {
			queue.items.length = 0;
			queue.head = 0;
			return;
		}
		if (queue.head > 32 && queue.head * 2 >= queue.items.length) {
			queue.items.splice(0, queue.head);
			queue.head = 0;
		}
	}

	function queueShift<T>(queue: IndexedQueue<T>) {
		if (queue.head >= queue.items.length) return undefined;
		const value = queue.items[queue.head++] as T;
		queueCompact(queue);
		return value;
	}

	class Spawner {
		[key: string]: any;

		constructor(cfg: SpawnerConfig) {
			this.w = cfg.world.w;
			this.h = cfg.world.h;
			this.grid = cfg.gridSize;
			this.weights = cfg.polygonWeights || [0.6, 0.3, 0.1];
			this.maxHex = cfg.maxHexagons || 2;
			this.minDistFromPlayer = cfg.minDistFromPlayer || 200;
			this.minDistFromTank = cfg.minDistFromTank || 220;
			this.hideRegularSpawnsFromTanks =
				cfg.hideRegularSpawnsFromTanks !== undefined
					? cfg.hideRegularSpawnsFromTanks
					: true;
			this.crasherEqualsNest =
				cfg.crasherEqualsNest !== undefined
					? cfg.crasherEqualsNest
					: true;
			this.maxPlacementAttempts = cfg.maxPlacementAttempts || 10;
			this.rng = cfg.rng || Math.random;
			this.factory = cfg.factory;
			this.getPlayer = cfg.getPlayer;
			this.getTanks = cfg.getTanks;
			this.polygonPool = new Pool();
			this.nestPolygonPool = new Pool();
			this.crasherPool = new Pool();
			this.enemyPool = new Pool();
			this.respawnQueue = { items: [], head: 0 };
			this.polygonQueue = { items: [], head: 0 };
			this.nestQueue = { items: [], head: 0 };
			this.time = 0;
			this.rate = {
				polygons: cfg.budgets?.rates?.polygons || 6,
				nest: cfg.budgets?.rates?.nest || 3,
				crashers: cfg.budgets?.rates?.crashers || 2,
				respawns: cfg.budgets?.rates?.respawns || 1,
			};
			this.cap = {
				polygons: cfg.budgets?.caps?.polygons || 6,
				nest: cfg.budgets?.caps?.nest || 3,
				crashers: cfg.budgets?.caps?.crashers || 2,
				respawns: cfg.budgets?.caps?.respawns || 2,
			};
			this.budget = { polygons: 0, nest: 0, crashers: 0, respawns: 0 };
			this.polygonTarget = 0;
			this.nestTarget = 0;
			this.crasherTarget = 0;
			this.polygonCount = 0;
			this.nestCount = 0;
			this.crasherCount = 0;
			this.hexagonCount = 0;
			this.enemyCount = [0, 0, 0, 0];
			this.nestBox = null;
			this.crasherZone = null;
			this.margin = 120;
			this.crasherCooldown = 0;
			this.crasherCooldownSec = cfg.crasherCooldownSec || 10;
			this.prevInCrasher = false;
			this.pendingCrasherBurst = 0;
			this.desiredPentFrac = cfg.desiredPentFrac || 0.14;
			this.polyCounts = { sqr: 0, tri: 0, pent: 0 };
			this._recountT = 0;
			this._stamp = 1;
			this._failStamp = null;
		}
		reset() {
			const nestSide = this.w / 6.3;
			const nx = (this.w - nestSide) / 2,
				ny = (this.h - nestSide) / 2;
			this.nestBox = { x: nx, y: ny, w: nestSide, h: nestSide };
			const czSide = nestSide * 2;
			const cx = (this.w - czSide) / 2,
				cy = (this.h - czSide) / 2;
			this.crasherZone = { x: cx, y: cy, w: czSide, h: czSide };
			const A = this.w * this.h;
			this.polygonTarget = Math.floor(A / (180 * this.grid * this.grid));
			this.nestTarget = Math.floor(
				(nestSide * nestSide) / (220 * this.grid * this.grid),
			);
			this.crasherTarget = this.crasherEqualsNest
				? this.nestTarget
				: Math.max(1, Math.floor(this.nestTarget * 0.8));
			this.polygonCount = 0;
			this.nestCount = 0;
			this.crasherCount = 0;
			this.hexagonCount = 0;
			this.enemyCount = [0, 0, 0, 0];
			queueClear(this.respawnQueue);
			queueClear(this.polygonQueue);
			queueClear(this.nestQueue);
			this.time = 0;
			this.budget.polygons = this.cap.polygons;
			this.budget.nest = this.cap.nest;
			this.budget.crashers = this.cap.crashers;
			this.budget.respawns = this.cap.respawns;
			this.prevInCrasher = false;
			this.polyCounts = { sqr: 0, tri: 0, pent: 0 };
			if (!this._failStamp || this._failStamp.length !== CELL_COUNT)
				this._failStamp = new Int32Array(CELL_COUNT);
			this._stamp = (this._stamp | 0) + 1;
			this._recountT = 0;
		}
		primePopulation() {
			const primeFieldLimit = Math.max(0, this.polygonTarget * 10);
			let fieldAttempts = 0;
			while (
				this.polygonCount < this.polygonTarget &&
				fieldAttempts++ < primeFieldLimit
			) {
				if (!this._spawnPolygon()) break;
			}

			const primeNestLimit = Math.max(0, this.nestTarget * 12);
			let nestAttempts = 0;
			while (
				this.nestCount < this.nestTarget &&
				nestAttempts++ < primeNestLimit
			) {
				if (!this._spawnNestPolygon()) break;
			}

			queueClear(this.polygonQueue);
			queueClear(this.nestQueue);
		}
		enqueueRespawn(q: RespawnRequest) {
			queuePush(this.respawnQueue, q);
		}

		update(dt: number) {
			this.time += dt;
			this._stamp = (this._stamp | 0) + 1;
			this.budget.polygons = Math.min(
				this.cap.polygons,
				this.budget.polygons + this.rate.polygons * dt,
			);
			this.budget.nest = Math.min(
				this.cap.nest,
				this.budget.nest + this.rate.nest * dt,
			);
			this.budget.crashers = Math.min(
				this.cap.crashers,
				this.budget.crashers + this.rate.crashers * dt,
			);
			this.budget.respawns = Math.min(
				this.cap.respawns,
				this.budget.respawns + this.rate.respawns * dt,
			);

			this.crasherCooldown = Math.max(0, this.crasherCooldown - dt);
			this._queueDeficits(
				this.polygonQueue,
				this.polygonCount,
				this.polygonTarget,
				0.25,
				0.75,
			);
			this._queueDeficits(
				this.nestQueue,
				this.nestCount,
				this.nestTarget,
				0.55,
				1.2,
			);
			this._drainShapeQueue(
				this.polygonQueue,
				"polygons",
				() => this._spawnPolygon(),
				3,
			);
			this._drainShapeQueue(
				this.nestQueue,
				"nest",
				() => this._spawnNestPolygon(),
				2,
			);

			const pl = this.getPlayer && this.getPlayer();
			const inCZ = pl && !pl.dead && withinRect(pl, this.crasherZone);
			const justEntered = inCZ && !this.prevInCrasher;
			const justLeft =
				(!inCZ && this.prevInCrasher) ||
				(pl && pl.dead && this.prevInCrasher);

			if (pl && pl.dead) {
				this.pendingCrasherBurst = 0;
				this.crasherCooldown = 0;
			}

			if (justEntered) {
				if (this.pendingCrasherBurst <= 0)
					this.pendingCrasherBurst = randInt(2, 4, this.rng);
				this.crasherCooldown = randf(9, 16, this.rng);
			}

			if (inCZ && this.crasherCooldown <= 0) {
				if (this.pendingCrasherBurst <= 0)
					this.pendingCrasherBurst = randInt(2, 4, this.rng);
				const maxPerFrame = 1;
				const toSpawn = Math.min(
					maxPerFrame,
					this.pendingCrasherBurst,
					this.crasherTarget - this.crasherCount,
					Math.floor(this.budget.crashers),
				);
				for (let i = 0; i < toSpawn; i++) {
					if (!this._spawnCrasher(pl)) break;
					this.budget.crashers -= 1;
					this.pendingCrasherBurst--;
				}
				if (this.pendingCrasherBurst <= 0)
					this.crasherCooldown = randf(9, 16, this.rng);
			}

			if (justLeft) {
				this.pendingCrasherBurst = 0;
				this.crasherCooldown = 0;
			}

			const can = Math.min(
				queueLength(this.respawnQueue),
				Math.floor(this.budget.respawns),
			);
			for (let i = 0; i < can; i++) {
				const q = queuePeek(this.respawnQueue as IndexedQueue<RespawnRequest>);
				if (!q) break;
				if (!this._spawnEnemy(q)) break;
				queueShift(this.respawnQueue);
				this.budget.respawns -= 1;
			}

			this.prevInCrasher = !!inCZ;
		}

		onShapeDied(sh: ShapeEntity) {
			const bucket = sh.spawnBucket as ShapeSpawnBucket | undefined;
			if (bucket === "crasher") {
				this.crasherCount = Math.max(0, this.crasherCount - 1);
				return;
			}
			if (bucket === "nest") {
				this.nestCount = Math.max(0, this.nestCount - 1);
				if (sh.type === "hex") {
					this.hexagonCount = Math.max(0, this.hexagonCount - 1);
				}
				return;
			}
			if (bucket !== "field") return;
			this.polygonCount = Math.max(0, this.polygonCount - 1);
			if (sh.type === "sqr") {
				this.polyCounts.sqr = Math.max(0, (this.polyCounts.sqr || 0) - 1);
				return;
			}
			if (sh.type === "tri") {
				this.polyCounts.tri = Math.max(0, (this.polyCounts.tri || 0) - 1);
				return;
			}
			if (sh.type === "pent") {
				this.polyCounts.pent = Math.max(0, (this.polyCounts.pent || 0) - 1);
			}
		}

		_recount() {
			let poly = 0,
				nest = 0,
				crash = 0,
				hex = 0;
			let ps = 0,
				pt = 0,
				pp = 0;
			const nz = this.nestBox,
				cz = this.crasherZone;
			for (let i = 0; i < shapes.length; i++) {
				if ((S_dead[i] | S_dying[i]) !== 0) continue;
				const x = S_x[i],
					y = S_y[i];
				const t = S_type[i] | 0;
				if (t === 1 || t === 2 || t === 3) {
					if (
						x < cz.x ||
						x > cz.x + cz.w ||
						y < cz.y ||
						y > cz.y + cz.h
					) {
						poly++;
						if (t === 1) ps++;
						else if (t === 2) pt++;
						else pp++;
					}
				}
				if (
					(t === 5 || t === 3) &&
					x >= nz.x &&
					x <= nz.x + nz.w &&
					y >= nz.y &&
					y <= nz.y + nz.h
				) {
					nest++;
					if (t === 5) hex++;
				}
				if (t === 4) {
					const sh = shapes[i];
					if (sh && sh.isCrasher === true) crash++;
				}
			}
			this.polygonCount = poly;
			this.nestCount = nest;
			this.crasherCount = crash;
			this.hexagonCount = hex;
			this.polyCounts = { sqr: ps, tri: pt, pent: pp };
		}

		_randPolyType() {
			const tot =
				this.polyCounts.sqr + this.polyCounts.tri + this.polyCounts.pent;
			const pentFrac = tot > 0 ? this.polyCounts.pent / tot : 0;
			if (pentFrac < this.desiredPentFrac * 0.6 && this.rng() < 0.75)
				return 2;
			if (pentFrac < this.desiredPentFrac && this.rng() < 0.45) return 2;
			const r = this.rng();
			const w0 = this.weights[0],
				w1 = w0 + this.weights[1];
			if (r < w0) return 0;
			if (r < w1) return 1;
			return 2;
		}

		_randomInRect(rect: Rect) {
			if (!this._p1) this._p1 = { x: 0, y: 0 };
			const pad = Math.min(
				this.margin,
				Math.max(24, rect.w * 0.25),
				Math.max(24, rect.h * 0.25),
			);
			this._p1.x = randf(rect.x + pad, rect.x + rect.w - pad, this.rng);
			this._p1.y = randf(rect.y + pad, rect.y + rect.h - pad, this.rng);
			return this._p1;
		}
		_randomInWorld() {
			if (!this._p2) this._p2 = { x: 0, y: 0 };
			this._p2.x = randf(this.margin, this.w - this.margin, this.rng);
			this._p2.y = randf(this.margin, this.h - this.margin, this.rng);
			return this._p2;
		}
		_randomInBase() {
			if (!this._p3) this._p3 = { x: 0, y: 0 };
			const baseIdx = randInt(0, TEAMS.length - 1, this.rng);
			const rect = getTeamBaseRect(baseIdx);
			const pad = 96;
			this._p3.x = randf(rect.x + pad, rect.x + rect.w - pad, this.rng);
			this._p3.y = randf(rect.y + pad, rect.y + rect.h - pad, this.rng);
			return this._p3;
		}

		_queueDeficits(
			queue: IndexedQueue<SpawnTicket>,
			alive: number,
			target: number,
			minDelay: number,
			maxDelay: number,
		) {
			while (alive + queueLength(queue) < target) {
				const immediate = alive + queueLength(queue) < Math.min(target, 6);
				queuePush(queue, {
					readyAt: this.time + (immediate ? 0 : randf(minDelay, maxDelay, this.rng)),
				});
			}
		}

		_drainShapeQueue(
			queue: IndexedQueue<SpawnTicket>,
			budgetKey: "polygons" | "nest",
			spawnOne: () => boolean,
			maxPerUpdate: number,
		) {
			let spawned = 0;
			while (
				queueLength(queue) &&
				spawned < maxPerUpdate &&
				this.budget[budgetKey] >= 1
			) {
				const ticket = queuePeek(queue);
				if (!ticket) break;
				if (ticket.readyAt > this.time) break;
				if (spawnOne()) {
					queueShift(queue);
					this.budget[budgetKey] -= 1;
					spawned++;
					continue;
				}
				ticket.readyAt = this.time + randf(0.35, 0.9, this.rng);
				break;
			}
		}

		_tanks() {
			return this.getTanks ? this.getTanks() || [] : [];
		}

		_isInsideBlockedBase(p: Point) {
			for (let i = 0; i < TEAMS.length; i++) {
				const r = getTeamBaseRect(i);
				const pad = BASE_NO_SPAWN_PAD;
				if (
					p.x >= r.x - pad &&
					p.x <= r.x + r.w + pad &&
					p.y >= r.y - pad &&
					p.y <= r.y + r.h + pad
				) {
					return true;
				}
			}
			return false;
		}

		_bucketAllowsPoint(
			bucket: ShapeSpawnBucket,
			p: Point,
			r: number,
			allowBases = false,
		) {
			if (
				p.x < r ||
				p.y < r ||
				p.x > this.w - r ||
				p.y > this.h - r
			) {
				return false;
			}
			if (bucket === "field") {
				if (withinRect(p, this.nestBox) || withinRect(p, this.crasherZone))
					return false;
				if (!allowBases && this._isInsideBlockedBase(p)) return false;
				return true;
			}
			if (bucket === "nest") return withinRect(p, this.nestBox);
			if (!withinRect(p, this.crasherZone)) return false;
			if (withinRect(p, this.nestBox)) return false;
			return true;
		}

		_placementScore(
			bucket: ShapeSpawnBucket,
			p: Point,
			r: number,
			minSep: number,
			allowBases = false,
		) {
			if (!this._bucketAllowsPoint(bucket, p, r, allowBases)) return -1;

			const idx = neighborIndices(p.x, p.y);
			let minShapeClear = 1e9;
			for (let n = 0; n < idx.length; n++) {
				const s = shapes[idx[n]];
				if (!s || s.dead || s.dying) continue;
				const sx = s.cx ?? s.x,
					sy = s.cy ?? s.y;
				const sr = (s.r || 0) + minSep;
				const centerClear = Math.hypot(p.x - sx, p.y - sy) - sr;
				if (centerClear < 0) return -1;
				minShapeClear = Math.min(minShapeClear, centerClear);
				const srx = s.x ?? sx,
					sry = s.y ?? sy;
				const bodyClear = Math.hypot(p.x - srx, p.y - sry) - sr;
				if (bodyClear < 0) return -1;
				minShapeClear = Math.min(minShapeClear, bodyClear);
			}

			let minTankClear = 1e9;
			const tanks = this._tanks();
			for (let i = 0; i < tanks.length; i++) {
				const t = tanks[i];
				if (!t || t.isDead) continue;
				const tankPad =
					bucket === "crasher"
						? Math.max(150, this.minDistFromTank * 0.7)
						: this.minDistFromTank;
				const clear = distance(p.x, p.y, t.x, t.y) - (t.r || 0) - r - tankPad;
				if (clear < 0) return -1;
				if (
					bucket !== "crasher" &&
					this.hideRegularSpawnsFromTanks &&
					inFOV(t, p.x, p.y)
				) {
					return -1;
				}
				minTankClear = Math.min(minTankClear, clear);
			}

			const edgeClear = Math.min(
				p.x - r,
				p.y - r,
				this.w - p.x - r,
				this.h - p.y - r,
			);
			return minShapeClear * 1.05 + minTankClear * 0.75 + edgeClear * 0.08;
		}

		_pickPoint(
			bucket: ShapeSpawnBucket,
			r: number,
			minSep: number,
			sampler: () => Point,
			attempts: number,
			allowBases = false,
		) {
			let best: Point | null = null;
			let bestScore = -1;
			for (let attempt = 0; attempt < attempts; attempt++) {
				const p = sampler();
				const cxi = (p.x / COLL_CELL) | 0;
				const cyi = (p.y / COLL_CELL) | 0;
				const ci = cellIndexClamped(cxi, cyi);
				if (
					ci >= 0 &&
					this._failStamp &&
					this._failStamp[ci] === this._stamp
				)
					continue;
				const score = this._placementScore(bucket, p, r, minSep, allowBases);
				if (score > bestScore) {
					best = { x: p.x, y: p.y };
					bestScore = score;
					if (score > 520) break;
				} else if (score < 0 && ci >= 0 && this._failStamp) {
					this._failStamp[ci] = this._stamp;
				}
			}
			return best;
		}

		_spawnPolygon() {
			let t = this._randPolyType();
			let kind: keyof typeof SHAPES_DEF =
				t === 0 ? "sqr" : t === 1 ? "tri" : "pent";
			const useBasePocket = this.rng() < 0.02;
			if (useBasePocket && kind === "pent") {
				kind = this.rng() < 0.72 ? "sqr" : "tri";
				t = kind === "sqr" ? 0 : 1;
			}
			const def = SHAPES_DEF[kind];
			const sep = kind === "sqr" ? 54 : kind === "tri" ? 64 : 102;
			const p =
				(useBasePocket
					? this._pickPoint(
						"field",
						def.r,
						sep,
						() => this._randomInBase(),
						this.maxPlacementAttempts * 3,
						true,
					)
					: null) ||
				this._pickPoint(
					"field",
					def.r,
					sep,
					() => this._randomInWorld(),
					this.maxPlacementAttempts * 5,
				);
			if (!p) return false;
			this.polygonPool.acquire(() => ({}));
			const sh = this.factory.createPolygon(t, p, false);
			if (!sh) return false;
			sh.spawnBucket = "field";
			this.polygonCount++;
			this.polyCounts[kind] = (this.polyCounts[kind] || 0) + 1;
			return true;
		}

		_spawnNestPolygon() {
			const hexDeficit = this.maxHex - this.hexagonCount;
			const wantHex =
				hexDeficit > 0 &&
				(this.hexagonCount === 0
					? this.rng() < 0.5
					: this.rng() < Math.min(0.28, 0.12 + hexDeficit * 0.08));
			const kind: keyof typeof SHAPES_DEF = wantHex ? "hex" : "pent";
			const def = SHAPES_DEF[kind];
			const sep = kind === "hex" ? 180 : 112;
			const p = this._pickPoint(
				"nest",
				def.r,
				sep,
				() => this._randomInRect(this.nestBox),
				this.maxPlacementAttempts * 6,
			);
			if (!p) return false;
			this.nestPolygonPool.acquire(() => ({}));
			const sh = this.factory.createNestPolygon(kind === "hex" ? 3 : 2, p);
			if (!sh) return false;
			sh.spawnBucket = "nest";
			this.nestCount++;
			if (kind === "hex") this.hexagonCount++;
			return true;
		}

		_spawnCrasher(anchor: TankEntity | null) {
			const cz = this.crasherZone;
			const nz = this.nestBox;
			const elite = this.rng() < 0.2;
			const r = elite ? 24 : 18;
			const sep = elite ? 70 : 58;
			let best: Point | null = null;
			let bestScore = -1;

			for (let attempts = 0; attempts < this.maxPlacementAttempts * 5; attempts++) {
				let p: Point;
				if (anchor && withinRect(anchor, cz)) {
					const orbit = randf(280, 520, this.rng);
					const a = randf(0, TAU, this.rng);
					const tx = anchor.x + Math.cos(a) * orbit;
					const ty = anchor.y + Math.sin(a) * orbit;
					const mx = cz.x + this.margin;
					const Mx = cz.x + cz.w - this.margin;
					const my = cz.y + this.margin;
					const My = cz.y + cz.h - this.margin;
					p = {
						x: Math.max(mx, Math.min(Mx, tx)),
						y: Math.max(my, Math.min(My, ty)),
					};
				} else {
					const band = randInt(0, 3, this.rng);
					if (band === 0) {
						p = {
							x: randf(cz.x, nz.x, this.rng),
							y: randf(cz.y, cz.y + cz.h, this.rng),
						};
					} else if (band === 1) {
						p = {
							x: randf(nz.x + nz.w, cz.x + cz.w, this.rng),
							y: randf(cz.y, cz.y + cz.h, this.rng),
						};
					} else if (band === 2) {
						p = {
							x: randf(cz.x, cz.x + cz.w, this.rng),
							y: randf(cz.y, nz.y, this.rng),
						};
					} else {
						p = {
							x: randf(cz.x, cz.x + cz.w, this.rng),
							y: randf(nz.y + nz.h, cz.y + cz.h, this.rng),
						};
					}
				}
				const score = this._placementScore("crasher", p, r, sep);
				if (score > bestScore) {
					best = { x: p.x, y: p.y };
					bestScore = score;
				}
			}

			if (!best) return false;
			this.crasherPool.acquire(() => ({}));
			const sh = this.factory.createCrasher(best, elite);
			if (!sh) return false;
			sh.spawnBucket = "crasher";
			this.crasherCount++;
			return true;
		}

		_spawnEnemy(q: RespawnRequest) {
			let attempts = 0;
			while (attempts++ < this.maxPlacementAttempts) {
				const p = this._randomInWorld();
				if (withinRect(p, this.crasherZone)) continue;
				const pl = this.getPlayer && this.getPlayer();
				if (pl) {
					const minD =
						(this.minDistFromPlayer || 200) +
						(pl.getRadiusScaled ? pl.getRadiusScaled() : pl.r || 0);
					if (distance(p.x, p.y, pl.x, pl.y) < minD) continue;
				}
				this.enemyPool.acquire(() => ({}));
				const ok = this.factory.createEnemy(q, p);
				if (ok !== false) {
					this.enemyCount[q.group]++;
					return true;
				}
			}
			return false;
		}
	}

	let spawner: Spawner | null = null;
	let tanks: TankEntity[] = [];
	const TEAM_BASE_SIZE = 2000;
	let fpsAccum = 0,
		fpsFrames = 0,
		fpsShown = 60;

	const BOT_NAME_POOL = [
		"Alex",
		"Noah",
		"Liam",
		"Ethan",
		"Mason",
		"Lucas",
		"Owen",
		"Jack",
		"Levi",
		"Ezra",
		"Leo",
		"Rayan",
		"Nolan",
		"Eli",
		"Adam",
		"Ian",
		"Jude",
		"Milo",
		"Evan",
		"Dean",
		"Ava",
		"Emma",
		"Mia",
		"Sophia",
		"Chloe",
		"Lily",
		"Zoey",
		"Nora",
		"Lucy",
		"Ruby",
		"Anna",
		"Clara",
		"Elena",
		"Grace",
		"Julia",
		"Nina",
		"Iris",
		"Alice",
		"Sarah",
		"Maya",
		"Aria",
		"Layla",
		"Naomi",
		"Stella",
		"Paige",
		"Vera",
		"Cora",
		"Audrey",
	];
	const usedBotNames = new Set<string>();
	function teamNameCap(idx: number) {
		const s = TEAMS[idx].name;
		return s.charAt(0).toUpperCase() + s.slice(1);
	}

	function takeNextBotName() {
		for (let i = 0; i < BOT_NAME_POOL.length; i++) {
			const name = BOT_NAME_POOL[i];
			if (usedBotNames.has(name)) continue;
			usedBotNames.add(name);
			return name;
		}
		let suffix = 2;
		while (true) {
			for (let i = 0; i < BOT_NAME_POOL.length; i++) {
				const name = `${BOT_NAME_POOL[i]} ${suffix}`;
				if (usedBotNames.has(name)) continue;
				usedBotNames.add(name);
				return name;
			}
			suffix++;
		}
	}

	function formatShort(n: number) {
		const a = Math.abs(n);
		if (a >= 1e9) return (n / 1e9).toFixed(1) + "b";
		if (a >= 1e6) return (n / 1e6).toFixed(1) + "m";
		if (a >= 1e3) return (n / 1e3).toFixed(1) + "k";
		return String(Math.floor(n));
	}

	function tankDisplayName(t: TankEntity | null | undefined) {
		if (!t) return "Unknown tank";
		if (t.isBot) return t.name || `${teamNameCap(t.teamIdx)} Bot`;
		return "You";
	}

	function topTank(excludeUid = 0) {
		let best: TankEntity | null = null;
		let bestScore = -1;
		for (let i = 0; i < tanks.length; i++) {
			const t = tanks[i];
			if (!t || t.isDead) continue;
			if (excludeUid && (t.uid | 0) === (excludeUid | 0)) continue;
			const score = Math.floor(t.xp || 0);
			if (!best || score > bestScore) {
				best = t;
				bestScore = score;
			}
		}
		return best;
	}

	function currentTopTankUid() {
		return topTank()?.uid || 0;
	}

	const scoreboardRowsCache: Array<{
		t: TankEntity;
		name: string;
		score: number;
		label: string;
	}> = [];
	let scoreboardMaxScore = 1;
	let scoreboardCacheUntil = -1;

	function scoreboardRows() {
		if (now < scoreboardCacheUntil) return scoreboardRowsCache;
		scoreboardRowsCache.length = 0;
		for (let i = 0; i < tanks.length; i++) {
			const t = tanks[i];
			if (!t) continue;
			const name = tankDisplayName(t);
			const score = Math.floor(t.xp || 0);
			scoreboardRowsCache.push({
				t,
				name,
				score,
				label: `${name} - ${formatShort(score)}`,
			});
		}
		scoreboardRowsCache.sort((a, b) => b.score - a.score);
		scoreboardMaxScore = Math.max(1, scoreboardRowsCache[0]?.score || 1);
		scoreboardCacheUntil = now + SCOREBOARD_CACHE_SEC;
		return scoreboardRowsCache;
	}

	function drawOutlinedText(
		txt: string,
		x: number,
		y: number,
		alignH = LEFT,
		alignV = BASELINE,
		size = 14,
		bold = false,
	) {
		push();
		blendMode(BLEND);
		if (drawingContext) {
			drawingContext.shadowBlur = 0;
			drawingContext.shadowColor = "rgba(0,0,0,0)";
		}
		textAlign(alignH, alignV);
		textSize(size);
		textStyle(bold ? BOLD : NORMAL);
		fill(255, 255, 255);
		stroke(0);
		strokeJoin(ROUND);
		strokeWeight(3);
		syncDrawState();
		if (drawingContext) {
			drawingContext.strokeText(txt, x, y);
			drawingContext.fillText(txt, x, y);
		} else {
			text(txt, x, y);
		}
		pop();
	}

	function drawScoreboard() {
		const margin = UI.margin;
		const w = 240;
		const barH = UI.statBarH;
		const gap = 6;
		const pad = UI.barPad;

		const x = width - margin - w;
		let y = margin + 20;

		drawOutlinedText(
			"Scoreboard",
			x + w / 2,
			y,
			CENTER,
			BASELINE,
			22,
			true,
		);
		y += 12;

		const rows = scoreboardRows();
		const maxScore = scoreboardMaxScore;

		for (let i = 0; i < rows.length; i++) {
			const { t, label, score } = rows[i];
			const frac = Math.min(1, score / maxScore);
			const col = TEAM_TANK_COLORS[TEAMS[t.teamIdx].name];
			const rankX = x + 16;
			const iconX = x + 46;
			const labelX = x + w / 2 + 12;

			noStroke();
			fill(...COLORS.barBg);
			rect(x, y, w, barH, UI.barOuterR);
			const ix = x + pad,
				iy = y + pad,
				iw = w - pad * 2,
				ih = barH - pad * 2;
			fill(40, 40, 40, 140);
			rect(ix, iy, iw, ih, UI.barInnerR);
			fill(...col);
			rect(ix, iy, iw * frac, ih, UI.barInnerR);

			drawOutlinedText(`#${i + 1}`, rankX, y + barH / 2 + 1, CENTER, CENTER, 10, true);
			drawLeaderboardTankIcon(t, iconX, y + barH / 2 + 1);
			drawTextWithOutline(label, labelX, y + barH / 2 + 1, {
				size: 12,
				bold: true,
				alignX: CENTER,
				alignY: CENTER,
			});
			y += barH + gap;
		}
	}

	let eventBanner: null | { text: string; ttl: number; key?: string } = null;
	const eventBannerQueue: IndexedQueue<{ text: string; ttl: number; key?: string }> = {
		items: [],
		head: 0,
	};
	function pushEventMessage(txt: string, ttl = 2.6, key?: string) {
		if (key) {
			if (eventBanner && eventBanner.key === key) {
				eventBanner.text = txt;
				eventBanner.ttl = ttl;
				return;
			}
			for (let i = eventBannerQueue.items.length - 1; i >= eventBannerQueue.head; i--) {
				if (eventBannerQueue.items[i].key === key) {
					eventBannerQueue.items[i].text = txt;
					eventBannerQueue.items[i].ttl = ttl;
					return;
				}
			}
		}
		queuePush(eventBannerQueue, { text: txt, ttl, key });
		if (queueLength(eventBannerQueue) > 8) queueShift(eventBannerQueue);
	}

	function drawEventBanner(dt: number) {
		if (!eventBanner && queueLength(eventBannerQueue)) {
			eventBanner = queueShift(eventBannerQueue) || null;
		}
		if (!eventBanner) return;
		eventBanner.ttl -= dt;
		if (eventBanner.ttl <= 0) {
			eventBanner = null;
			return;
		}

		const msg = eventBanner.text;
		const pad = 12,
			h = 28;
		textSize(16);
		textStyle(BOLD);
		const tw = (textWidth ? textWidth(msg) : 160) + pad * 2;
		const w = Math.min(tw, width - 40);
		const x = (width - w) / 2;
		const y = 36;

		noStroke();
		fill(...COLORS.fpsPanelBg);
		rect(x, y, w, h, 10);

		textAlign(CENTER, CENTER);
		fill(...COLORS.fpsText);
		text(msg, x + w / 2, y + h / 2 + 1);
	}

	const BASE_NO_SPAWN_PAD = 240;
	const CENTER_RING_R = 820;
	const CENTER_CORE_R = 380;

	function moveLevelFactor(level: number) {
		return 1 - (0.3 * (level - 1)) / (LEVEL_CAP - 1);
	}

	const BASE_FOV = 1000;
	const MAX_FOV = 1300;

	function radiusForLevel(L: number) {
		return 26 + 0.15 * Math.max(0, (L | 0) - 1);
	}
	const MAX_TANK_RADIUS = radiusForLevel(LEVEL_CAP);
	function updateTankRadius(t: any) {
		t.r = radiusForLevel(t.level | 0);
	}
	function fovForTank(t: any) {
		const classStats = getTankClassDef((t.tankClass || "basic") as TankClassId).stats;
		const fromSize = (t.r - 26) * 3;
		const fromLevel = (Math.sqrt(Math.max(1, t.level | 0)) - 1) * 80;
		const bonus = classStats?.fovBonus || 0;
		return Math.min(MAX_FOV + bonus, BASE_FOV + fromSize + fromLevel + bonus);
	}
	function inFOV(t: any, x: number, y: number) {
		const r = fovForTank(t);
		const dx = x - t.x,
			dy = y - t.y;
		return dx * dx + dy * dy <= r * r;
	}
	function mouseWorld(): [number, number] {
		const z = cam.zoom || 1;
		return [
			cam.x - width / (2 * z) + mouseX / z,
			cam.y - height / (2 * z) + mouseY / z,
		];
	}
	function screenScale() {
		return 1 / (cam?.zoom || 1);
	}
	function expLerp(
		cur: number,
		target: number,
		rate: number,
		step: number = FIXED_H,
	) {
		const alpha = 1 - Math.exp(-rate * step);
		return cur + (target - cur) * alpha;
	}

	let player: TankEntity,
		cam: any,
		bullets: BulletEntity[] = [],
		shapes: ShapeEntity[] = [];

	const DEBUG = true;

	const debugShapes = {
		spawned: 0,
		killed: 0,
		aliveSet: new Set<number>(),
		logSpawn(sh: any) {
			this.spawned++;
			this.aliveSet.add(sh.id);
		},
		logKill(sh: any, _reason: string) {
			this.killed++;
			this.aliveSet.delete(sh.id);
		},
	};

	let S_CAP = 4096;
	let S_x = new Float32Array(S_CAP);
	let S_y = new Float32Array(S_CAP);
	let S_vx = new Float32Array(S_CAP);
	let S_vy = new Float32Array(S_CAP);
	let S_r = new Float32Array(S_CAP);
	let S_hp = new Float32Array(S_CAP);
	let S_hpVis = new Float32Array(S_CAP);
	let S_dead = new Uint8Array(S_CAP);
	let S_dying = new Uint8Array(S_CAP);
	let S_body = new Int16Array(S_CAP);
	let S_team = new Int16Array(S_CAP);
	let S_type = new Uint8Array(S_CAP);
	let S_visStamp = new Int32Array(S_CAP);
	let _nbrMark = new Int32Array(S_CAP);
	let _nbrStamp = 1;

	let S_minCX = new Int16Array(S_CAP);
	let S_minCY = new Int16Array(S_CAP);
	let S_maxCX = new Int16Array(S_CAP);
	let S_maxCY = new Int16Array(S_CAP);

	S_team.fill(-1);
	S_minCX.fill(-1);
	S_minCY.fill(-1);
	S_maxCX.fill(-1);
	S_maxCY.fill(-1);

	const shapeFree: number[] = [];

	let B_CAP = 8192;
	let B_owner = new Int32Array(B_CAP);
	let B_x = new Float32Array(B_CAP);
	let B_y = new Float32Array(B_CAP);
	let B_vx = new Float32Array(B_CAP);
	let B_vy = new Float32Array(B_CAP);
	let B_r = new Float32Array(B_CAP);
	let B_hp = new Float32Array(B_CAP);
	let B_life = new Float32Array(B_CAP);
	let B_dmg = new Float32Array(B_CAP);
	let B_pvpDmgMul = new Float32Array(B_CAP);
	let B_pvpHpMul = new Float32Array(B_CAP);
	let B_dead = new Uint8Array(B_CAP);
	let B_dying = new Uint8Array(B_CAP);
	let B_team = new Int16Array(B_CAP);
	let B_dieT = new Float32Array(B_CAP);
	let bulletNext = new Int32Array(B_CAP);
	bulletNext.fill(-1);
	let bulletPrev = new Int32Array(B_CAP);
	bulletPrev.fill(-1);
	let bulletCell = new Int32Array(B_CAP);
	bulletCell.fill(-1);
	let bulletQueryStamp = new Int32Array(B_CAP);
	const bulletFree: number[] = [];
	let nextBulletIdx = 0;

	function ensureShapeCapacity(n: number) {
		if (n <= S_CAP) return;
		let cap = 1;
		while (cap < n) cap <<= 1;

		function gF32(a: Float32Array) {
			const b = new Float32Array(cap);
			b.set(a);
			return b;
		}
		function gU8(a: Uint8Array) {
			const b = new Uint8Array(cap);
			b.set(a);
			return b;
		}
		function gI16(a: Int16Array) {
			const b = new Int16Array(cap);
			b.set(a);
			return b;
		}
		function gI32(a: Int32Array) {
			const b = new Int32Array(cap);
			b.set(a);
			return b;
		}

		S_visStamp = gI32(S_visStamp);

		S_x = gF32(S_x);
		S_y = gF32(S_y);
		S_vx = gF32(S_vx);
		S_vy = gF32(S_vy);
		S_r = gF32(S_r);
		S_hp = gF32(S_hp);
		S_hpVis = gF32(S_hpVis);
		S_dead = gU8(S_dead);
		S_dying = gU8(S_dying);

		S_body = gI16(S_body);
		S_team = gI16(S_team);
		S_type = gU8(S_type);

		const nMinCX = new Int16Array(cap);
		nMinCX.set(S_minCX);
		S_minCX = nMinCX;
		const nMinCY = new Int16Array(cap);
		nMinCY.set(S_minCY);
		S_minCY = nMinCY;
		const nMaxCX = new Int16Array(cap);
		nMaxCX.set(S_maxCX);
		S_maxCX = nMaxCX;
		const nMaxCY = new Int16Array(cap);
		nMaxCY.set(S_maxCY);
		S_maxCY = nMaxCY;

		for (let i = S_CAP; i < cap; i++) {
			S_team[i] = -1;
			S_minCX[i] = -1;
			S_minCY[i] = -1;
			S_maxCX[i] = -1;
			S_maxCY[i] = -1;
		}
		_nbrMark = new Int32Array(cap);
		const nextShotSeenStamp = new Int32Array(cap);
		nextShotSeenStamp.set(_shotSeenStamp);
		_shotSeenStamp = nextShotSeenStamp;
		const nextSupportShapeStamp = new Int32Array(cap);
		nextSupportShapeStamp.set(_supportShapeStamp);
		_supportShapeStamp = nextSupportShapeStamp;
		S_CAP = cap;
	}

	function ensureBulletCapacity(n: number) {
		if (n <= B_CAP) return;
		let cap = 1;
		while (cap < n) cap <<= 1;
		const b1 = new Float32Array(cap);
		b1.set(B_x);
		B_x = b1;
		const b2 = new Float32Array(cap);
		b2.set(B_y);
		B_y = b2;
		const b3 = new Float32Array(cap);
		b3.set(B_vx);
		B_vx = b3;
		const b4 = new Float32Array(cap);
		b4.set(B_vy);
		B_vy = b4;
		const b5 = new Float32Array(cap);
		b5.set(B_r);
		B_r = b5;
		const b6 = new Float32Array(cap);
		b6.set(B_hp);
		B_hp = b6;
		const b7 = new Float32Array(cap);
		b7.set(B_life);
		B_life = b7;
		const b8 = new Float32Array(cap);
		b8.set(B_dmg);
		B_dmg = b8;
		const b9 = new Float32Array(cap);
		b9.set(B_pvpDmgMul);
		B_pvpDmgMul = b9;
		const b10 = new Float32Array(cap);
		b10.set(B_pvpHpMul);
		B_pvpHpMul = b10;
		const b11 = new Uint8Array(cap);
		b11.set(B_dead);
		B_dead = b11;
		const b12 = new Uint8Array(cap);
		b12.set(B_dying);
		B_dying = b12;
		const b13 = new Int16Array(cap);
		b13.set(B_team);
		B_team = b13;
		const b14 = new Float32Array(cap);
		b14.set(B_dieT);
		B_dieT = b14;
		const b15 = new Int32Array(cap);
		b15.set(B_owner);
		B_owner = b15;
		const b16 = new Int32Array(cap);
		b16.fill(-1);
		b16.set(bulletNext);
		bulletNext = b16;
		const b16b = new Int32Array(cap);
		b16b.fill(-1);
		b16b.set(bulletPrev);
		bulletPrev = b16b;
		const b16c = new Int32Array(cap);
		b16c.fill(-1);
		b16c.set(bulletCell);
		bulletCell = b16c;
		const b17 = new Int32Array(cap);
		b17.set(bulletQueryStamp);
		bulletQueryStamp = b17;
		B_CAP = cap;
	}

	function allocShapeIndex(): number {
		if (shapeFree.length) return shapeFree.pop() as number;
		const idx = shapes.length;
		ensureShapeCapacity(idx + 1);
		return idx;
	}

	function allocBulletIndex(): number {
		if (bulletFree.length) return bulletFree.pop() as number;
		const idx = nextBulletIdx++;
		ensureBulletCapacity(idx + 1);
		return idx;
	}

	function shapeTypeCode(k: string) {
		if (k === "sqr") return 1;
		if (k === "tri") return 2;
		if (k === "pent") return 3;
		if (k === "dia") return 4;
		if (k === "hex") return 5;
		return 0;
	}

	let _gridTile: HTMLCanvasElement | null = null;
	let _gridPattern: CanvasPattern | null = null;

	function _ensureGridTile() {
		if (_gridTile) return;
		const c = document.createElement("canvas");
		c.width = GRID_SPACING;
		c.height = GRID_SPACING;
		const g = c.getContext("2d");
		if (!g) return;
		g.clearRect(0, 0, c.width, c.height);
		g.strokeStyle = `rgba(${COLORS.gridMinor},${COLORS.gridMinor},${COLORS.gridMinor},0.8)`;
		g.lineWidth = 1;
		g.beginPath();
		g.moveTo(0.5, 0);
		g.lineTo(0.5, GRID_SPACING);
		g.moveTo(0, 0.5);
		g.lineTo(GRID_SPACING, 0.5);
		g.stroke();
		_gridTile = c;
	}

	const bulletPool = new Pool<BulletEntity>();
	const input = { ix: 0, iy: 0, firing: false };
	let nextShapeId = 1;
	let now = 0;
	let dFrame: any = null;
	const COLL_CELL = 64;
	const ACTIVE_PAD = 220;
	const BOT_TARGET_REFRESH_FRAMES = 3;
	const BOT_AI_THINK_MID_FRAMES = 2;
	const BOT_AI_THINK_FAR_FRAMES = 4;
	const BOT_RENDER_MARGIN = 48;
	const BOT_LABEL_MAX_DIST = 1500;
	const BOT_LABEL_MAX_DIST_SQ = BOT_LABEL_MAX_DIST * BOT_LABEL_MAX_DIST;
	const MAX_PHYSICS_STEPS_PER_FRAME = 4;
	const SCOREBOARD_CACHE_SEC = 0.18;

	const GRID_W = Math.ceil(WORLD.w / COLL_CELL);
	const GRID_H = Math.ceil(WORLD.h / COLL_CELL);
	const CELL_COUNT = GRID_W * GRID_H;

	const cellHead = new Int32Array(CELL_COUNT);
	cellHead.fill(-1);
	const bulletCellHead = new Int32Array(CELL_COUNT);
	bulletCellHead.fill(-1);
	const tankCellHead = new Int32Array(CELL_COUNT);
	tankCellHead.fill(-1);
	let nodeNext = new Int32Array(1024);
	let nodeShape = new Int32Array(1024);
	let nodeCell = new Int32Array(1024);
	let nodeCount = 0;
	let freeNodeHead = -1;

	const _cellStamp = new Int32Array(CELL_COUNT);
	let _curStamp = 1;

	const _neighborBuf: number[] = [];
	const _supportShapeBuf: number[] = [];
	let _visibleBuf: number[] = [];
	let _visStamp = 0;
	let _shotSeenStamp = new Int32Array(S_CAP);
	let _shotSeenSeq = 1;
	let _supportShapeStamp = new Int32Array(S_CAP);
	let _supportShapeSeq = 1;
	let _bulletQuerySeq = 1;
	let _tankQuerySeq = 1;
	let tankNext = new Int32Array(64);
	tankNext.fill(-1);
	let tankPrev = new Int32Array(64);
	tankPrev.fill(-1);
	let tankCell = new Int32Array(64);
	tankCell.fill(-1);
	let tankQueryStamp = new Int32Array(64);
	const _tankBroadphaseBuf: number[] = [];

	let _binSqr = new Int32Array(256);
	let _binTri = new Int32Array(256);
	let _binPent = new Int32Array(256);
	let _binDia = new Int32Array(256);
	let _binHex = new Int32Array(256);

	function _roundPow2(n: number) {
		let x = 1;
		while (x < n) x <<= 1;
		return x;
	}
	function _ensureBinCapacity(n: number) {
		if (_binSqr.length >= n) return;
		const cap = _roundPow2(n);
		_binSqr = new Int32Array(cap);
		_binTri = new Int32Array(cap);
		_binPent = new Int32Array(cap);
		_binDia = new Int32Array(cap);
		_binHex = new Int32Array(cap);
	}

	function collectVisibleIndices(minX: number, minY: number, maxX: number, maxY: number) {
		_visibleBuf.length = 0;
		_visStamp++;
		const minCX = Math.max(0, (minX / COLL_CELL) | 0);
		const maxCX = Math.min(GRID_W - 1, (maxX / COLL_CELL) | 0);
		const minCY = Math.max(0, (minY / COLL_CELL) | 0);
		const maxCY = Math.min(GRID_H - 1, (maxY / COLL_CELL) | 0);
		for (let cx = minCX; cx <= maxCX; cx++) {
			for (let cy = minCY; cy <= maxCY; cy++) {
				const ci = cx * GRID_H + cy;
				let n = cellHead[ci];
				while (n !== -1) {
					const idx = nodeShape[n] | 0;
					if (S_dead[idx] === 0) {
						if (S_visStamp[idx] !== _visStamp) {
							S_visStamp[idx] = _visStamp;
							_visibleBuf.push(idx);
						}
					}
					n = nodeNext[n];
				}
			}
		}
		return _visibleBuf;
	}

	function neighborIndices(x: number, y: number) {
		const cx = (x / COLL_CELL) | 0;
		const cy = (y / COLL_CELL) | 0;
		_neighborBuf.length = 0;
		_nbrStamp++;
		for (let dx = -1; dx <= 1; dx++) {
			for (let dy = -1; dy <= 1; dy++) {
				const ci = cellIndexClamped(cx + dx, cy + dy);
				if (ci < 0) continue;
				let n = cellHead[ci];
				while (n !== -1) {
					const si = nodeShape[n];
					if (_nbrMark[si] !== _nbrStamp) {
						_nbrMark[si] = _nbrStamp;
						_neighborBuf.push(si);
					}
					n = nodeNext[n];
				}
			}
		}
		return _neighborBuf;
	}

	function cellIndexClamped(cx: number, cy: number) {
		if (cx < 0 || cy < 0 || cx >= GRID_W || cy >= GRID_H) return -1;
		return cx * GRID_H + cy;
	}

	function worldCellRange(x: number, y: number, r: number) {
		const minCX = Math.max(0, ((x - r) / COLL_CELL) | 0);
		const maxCX = Math.min(GRID_W - 1, ((x + r) / COLL_CELL) | 0);
		const minCY = Math.max(0, ((y - r) / COLL_CELL) | 0);
		const maxCY = Math.min(GRID_H - 1, ((y + r) / COLL_CELL) | 0);
		return [minCX, minCY, maxCX, maxCY];
	}

	function ensureTankGridCapacity(n: number) {
		if (n <= tankNext.length) return;
		let cap = 1;
		while (cap < n) cap <<= 1;
		const next = new Int32Array(cap);
		next.fill(-1);
		next.set(tankNext);
		tankNext = next;
		const prev = new Int32Array(cap);
		prev.fill(-1);
		prev.set(tankPrev);
		tankPrev = prev;
		const cells = new Int32Array(cap);
		cells.fill(-1);
		cells.set(tankCell);
		tankCell = cells;
		const stamps = new Int32Array(cap);
		stamps.set(tankQueryStamp);
		tankQueryStamp = stamps;
	}

	function nextBulletQuerySeq() {
		_bulletQuerySeq = (_bulletQuerySeq + 1) | 0;
		if (_bulletQuerySeq === 0) {
			bulletQueryStamp.fill(0);
			_bulletQuerySeq = 1;
		}
		return _bulletQuerySeq;
	}

	function nextTankQuerySeq() {
		_tankQuerySeq = (_tankQuerySeq + 1) | 0;
		if (_tankQuerySeq === 0) {
			tankQueryStamp.fill(0);
			_tankQuerySeq = 1;
		}
		return _tankQuerySeq;
	}

	function rebuildBulletGrid() {
		bulletCellHead.fill(-1);
		for (let j = 0; j < bullets.length; j++) {
			const bi = bullets[j]._bi | 0;
			bulletNext[bi] = -1;
			bulletPrev[bi] = -1;
			bulletCell[bi] = -1;
			if (B_dead[bi] || B_dying[bi]) continue;
			const ci = cellIndexClamped((B_x[bi] / COLL_CELL) | 0, (B_y[bi] / COLL_CELL) | 0);
			if (ci < 0) continue;
			bulletNext[bi] = bulletCellHead[ci];
			if (bulletNext[bi] !== -1) bulletPrev[bulletNext[bi]] = bi;
			bulletCellHead[ci] = bi;
			bulletCell[bi] = ci;
		}
	}

	function bulletGridDetach(bi: number) {
		const ci = bulletCell[bi];
		if (ci < 0) return;
		const prev = bulletPrev[bi];
		const next = bulletNext[bi];
		if (prev !== -1) bulletNext[prev] = next;
		else bulletCellHead[ci] = next;
		if (next !== -1) bulletPrev[next] = prev;
		bulletNext[bi] = -1;
		bulletPrev[bi] = -1;
		bulletCell[bi] = -1;
	}

	function bulletGridAttach(bi: number, ci: number) {
		bulletPrev[bi] = -1;
		bulletNext[bi] = bulletCellHead[ci];
		if (bulletNext[bi] !== -1) bulletPrev[bulletNext[bi]] = bi;
		bulletCellHead[ci] = bi;
		bulletCell[bi] = ci;
	}

	function maybeUpdateBulletGridEntry(bi: number) {
		if (B_dead[bi] || B_dying[bi]) {
			bulletGridDetach(bi);
			return;
		}
		const ci = cellIndexClamped((B_x[bi] / COLL_CELL) | 0, (B_y[bi] / COLL_CELL) | 0);
		if (ci === bulletCell[bi]) return;
		bulletGridDetach(bi);
		if (ci >= 0) bulletGridAttach(bi, ci);
	}

	function rebuildTankGrid() {
		ensureTankGridCapacity(tanks.length);
		tankCellHead.fill(-1);
		for (let ti = 0; ti < tanks.length; ti++) {
			tankNext[ti] = -1;
			tankPrev[ti] = -1;
			tankCell[ti] = -1;
			const t = tanks[ti];
			if (!t || t.isDead) continue;
			const ci = cellIndexClamped((t.x / COLL_CELL) | 0, (t.y / COLL_CELL) | 0);
			if (ci < 0) continue;
			tankNext[ti] = tankCellHead[ci];
			if (tankNext[ti] !== -1) tankPrev[tankNext[ti]] = ti;
			tankCellHead[ci] = ti;
			tankCell[ti] = ci;
		}
	}

	function tankGridDetach(ti: number) {
		const ci = tankCell[ti];
		if (ci < 0) return;
		const prev = tankPrev[ti];
		const next = tankNext[ti];
		if (prev !== -1) tankNext[prev] = next;
		else tankCellHead[ci] = next;
		if (next !== -1) tankPrev[next] = prev;
		tankNext[ti] = -1;
		tankPrev[ti] = -1;
		tankCell[ti] = -1;
	}

	function tankGridAttach(ti: number, ci: number) {
		tankPrev[ti] = -1;
		tankNext[ti] = tankCellHead[ci];
		if (tankNext[ti] !== -1) tankPrev[tankNext[ti]] = ti;
		tankCellHead[ci] = ti;
		tankCell[ti] = ci;
	}

	function maybeUpdateTankGridEntry(ti: number) {
		const t = tanks[ti];
		if (!t || t.isDead) {
			tankGridDetach(ti);
			return;
		}
		const ci = cellIndexClamped((t.x / COLL_CELL) | 0, (t.y / COLL_CELL) | 0);
		if (ci === tankCell[ti]) return;
		tankGridDetach(ti);
		if (ci >= 0) tankGridAttach(ti, ci);
	}

	function forEachBulletNearAABB(
		minX: number,
		minY: number,
		maxX: number,
		maxY: number,
		cb: (bi: number) => void,
	) {
		const stamp = nextBulletQuerySeq();
		const minCX = Math.max(0, ((minX / COLL_CELL) | 0) - 1);
		const maxCX = Math.min(GRID_W - 1, ((maxX / COLL_CELL) | 0) + 1);
		const minCY = Math.max(0, ((minY / COLL_CELL) | 0) - 1);
		const maxCY = Math.min(GRID_H - 1, ((maxY / COLL_CELL) | 0) + 1);
		for (let cx = minCX; cx <= maxCX; cx++) {
			for (let cy = minCY; cy <= maxCY; cy++) {
				let bi = bulletCellHead[cx * GRID_H + cy];
				while (bi !== -1) {
					if (bulletQueryStamp[bi] !== stamp) {
						bulletQueryStamp[bi] = stamp;
						cb(bi);
					}
					bi = bulletNext[bi];
				}
			}
		}
	}

	function forEachTankNearAABB(
		minX: number,
		minY: number,
		maxX: number,
		maxY: number,
		cb: (tank: TankEntity, tankIndex: number) => void,
	) {
		const stamp = nextTankQuerySeq();
		const minCX = Math.max(0, ((minX / COLL_CELL) | 0) - 1);
		const maxCX = Math.min(GRID_W - 1, ((maxX / COLL_CELL) | 0) + 1);
		const minCY = Math.max(0, ((minY / COLL_CELL) | 0) - 1);
		const maxCY = Math.min(GRID_H - 1, ((maxY / COLL_CELL) | 0) + 1);
		for (let cx = minCX; cx <= maxCX; cx++) {
			for (let cy = minCY; cy <= maxCY; cy++) {
				let ti = tankCellHead[cx * GRID_H + cy];
				while (ti !== -1) {
					if (tankQueryStamp[ti] !== stamp) {
						tankQueryStamp[ti] = stamp;
						cb(tanks[ti], ti);
					}
					ti = tankNext[ti];
				}
			}
		}
	}

	function ensureNodeCapacity(add: number) {
		const need = nodeCount + add;
		if (need <= nodeNext.length) return;
		let cap = nodeNext.length;
		while (cap < need) cap <<= 1;
		const nN = new Int32Array(cap);
		nN.set(nodeNext);
		nodeNext = nN;
		const nS = new Int32Array(cap);
		nS.set(nodeShape);
		nodeShape = nS;
		const nC = new Int32Array(cap);
		nC.set(nodeCell);
		nodeCell = nC;
	}

	function allocNode() {
		if (freeNodeHead !== -1) {
			const n = freeNodeHead;
			freeNodeHead = nodeNext[n];
			return n;
		}
		ensureNodeCapacity(1);
		return nodeCount++;
	}

	function freeNode(n: number) {
		nodeNext[n] = freeNodeHead;
		freeNodeHead = n;
	}

	function gridInsertRange(i: number, minCX: number, minCY: number, maxCX: number, maxCY: number) {
		const span = (maxCX - minCX + 1) * (maxCY - minCY + 1);
		ensureNodeCapacity(span);
		for (let cx = minCX; cx <= maxCX; cx++) {
			for (let cy = minCY; cy <= maxCY; cy++) {
				const ci = cx * GRID_H + cy;
				const n = allocNode();
				nodeShape[n] = i;
				nodeCell[n] = ci;
				nodeNext[n] = cellHead[ci];
				cellHead[ci] = n;
			}
		}
		S_minCX[i] = minCX;
		S_minCY[i] = minCY;
		S_maxCX[i] = maxCX;
		S_maxCY[i] = maxCY;
	}

	function gridRemoveRange(i: number, minCX: number, minCY: number, maxCX: number, maxCY: number) {
		for (let cx = minCX; cx <= maxCX; cx++) {
			for (let cy = minCY; cy <= maxCY; cy++) {
				const ci = cx * GRID_H + cy;
				let head = cellHead[ci],
					prev = -1,
					n = head;
				while (n !== -1) {
					const nxt = nodeNext[n];
					if (nodeShape[n] === i) {
						if (prev === -1) head = nxt;
						else nodeNext[prev] = nxt;
						freeNode(n);
					} else prev = n;
					n = nxt;
				}
				cellHead[ci] = head;
			}
		}
		S_minCX[i] = S_minCY[i] = S_maxCX[i] = S_maxCY[i] = -1;
	}

	function gridMaybeUpdateShape(i: number) {
		const s = shapes[i];
		const x = s.x,
			y = s.y,
			r = s.r;
		const minCX = Math.max(0, ((x - r) / COLL_CELL) | 0);
		const maxCX = Math.min(GRID_W - 1, ((x + r) / COLL_CELL) | 0);
		const minCY = Math.max(0, ((y - r) / COLL_CELL) | 0);
		const maxCY = Math.min(GRID_H - 1, ((y + r) / COLL_CELL) | 0);
		const o0 = S_minCX[i],
			o1 = S_minCY[i],
			o2 = S_maxCX[i],
			o3 = S_maxCY[i];
		if (o0 === minCX && o1 === minCY && o2 === maxCX && o3 === maxCY)
			return;
		if (o0 !== -1) gridRemoveRange(i, o0, o1, o2, o3);
		gridInsertRange(i, minCX, minCY, maxCX, maxCY);
	}

	function gridRemoveShape(i: number) {
		const o0 = S_minCX[i];
		if (o0 !== -1)
			gridRemoveRange(i, o0, S_minCY[i], S_maxCX[i], S_maxCY[i]);
	}

	function gridInit() {
		cellHead.fill(-1);
		nodeCount = 0;
		freeNodeHead = -1;
	}

	const PLAYER_PAIR_BASE = 268435456;
	const FIXED_H = 1 / 120;
	let _accum = 0;
	let physicsFrame = 0;
	const COOLDOWN_FRAMES = 22;
	const SUPPORT_CONTACT_COOLDOWN_FRAMES = 4;

	const PAIR_TABLE_BITS = 18;
	const PAIR_TABLE_SIZE = 1 << PAIR_TABLE_BITS;
	const PAIR_TABLE_MASK = PAIR_TABLE_SIZE - 1;
	const _pairKeys = new Int32Array(PAIR_TABLE_SIZE);
	const _pairVals = new Int32Array(PAIR_TABLE_SIZE);

	function hash32(x: number) {
		x |= 0;
		x ^= x >>> 16;
		x = (x * 0x7feb352d) | 0;
		x ^= x >>> 15;
		x = (x * 0x846ca68b) | 0;
		x ^= x >>> 16;
		return x | 0;
	}

	function hashUnit(x: number) {
		return (hash32(x) >>> 0) / 4294967295;
	}

	function hashPair(k: number) {
		const hi = (k / 4294967296) | 0;
		const lo = k | 0;
		let h = hash32(hi ^ lo);
		if (h === 0) h = 1;
		return h;
	}

	function canPairFrames(k: number, cooldownFrames: number) {
		const h = hashPair(k);
		let idx = h & PAIR_TABLE_MASK;
		for (let p = 0; p < 8; p++) {
			const key = _pairKeys[idx];
			if (key === 0) return true;
			if (key === h) {
				const s = _pairVals[idx] | 0;
				return physicsFrame - s > cooldownFrames;
			}
			idx = (idx + 1) & PAIR_TABLE_MASK;
		}
		return true;
	}

	function canPair(k: number) {
		return canPairFrames(k, COOLDOWN_FRAMES);
	}

	function markPair(k: number) {
		const h = hashPair(k);
		let idx = h & PAIR_TABLE_MASK;
		for (let p = 0; p < 8; p++) {
			const key = _pairKeys[idx];
			if (key === 0 || key === h) {
				_pairKeys[idx] = h;
				_pairVals[idx] = physicsFrame;
				return;
			}
			idx = (idx + 1) & PAIR_TABLE_MASK;
		}
		_pairKeys[idx] = h;
		_pairVals[idx] = physicsFrame;
	}

	function bulletPairKey(a: number, b: number) {
		const lo = a < b ? a : b;
		const hi = a < b ? b : a;
		return (0x60000000 ^ (lo * 65537 + hi)) | 0;
	}
	function shapePairKey(a: number, b: number) {
		const lo = a < b ? a : b;
		const hi = a < b ? b : a;
		return (0x50000000 ^ (lo * 65537 + hi)) | 0;
	}
	function canPairBullet(a: number, b: number) {
		return canPair(bulletPairKey(a, b));
	}
	function markPairBullet(a: number, b: number) {
		markPair(bulletPairKey(a, b));
	}

	const POLY_UNIT: Record<number, Array<[number, number]>> = {};
	function unitPoly(sides: number) {
		let v = POLY_UNIT[sides];
		if (v) return v;
		v = [];
		for (let i = 0; i < sides; i++) {
			const a = -HALF_PI + (i * TAU) / sides;
			v.push([Math.cos(a), Math.sin(a)]);
		}
		POLY_UNIT[sides] = v;
		return v;
	}

	const DECAY_RECOIL = Math.exp(-12 * FIXED_H);
	const DECAY_PLAYER_DRAG = Math.exp(-3 * FIXED_H);
	const DECAY_BULLET_DYING = Math.exp(-8 * FIXED_H);
	const DECAY_SHAPE_VEL = Math.exp(-6 * FIXED_H);

	const MAX_SHAPE_KNOCKBACK_V = 240;

	let autoShoot = false,
		autoSpin = false;
	const SPIN_SPEED = 1.8;
	const BULLET_DECEL_K = 0.0012;

	let deathBtnRect: Rect | null = null;
	let upgradeCardRects: Array<{ id: TankClassId; rect: Rect }> = [];
	let upgradeIgnoreRect: Rect | null = null;
	let hoveredUpgradeChoice: TankClassId | null = null;
	let hoveredUpgradeMenuAction = false;
	let suppressPlayerUpgradeMenu = false;
	let suppressPlayerUpgradeLevel: UpgradeLevel | 0 = 0;
	let blockShootUntilRelease = false;
	let liveCounts: {
		outer: Record<string, number>;
		ring: Record<string, number>;
		core: Record<string, number>;
	} = {
		outer: { sqr: 0, tri: 0, pent: 0 },
		ring: { sqr: 0, tri: 0, pent: 0 },
		core: { pent: 0 },
	};
	let _cursorState: string | null = null;

	function clearPlayerUpgradeMenuSuppression() {
		suppressPlayerUpgradeMenu = false;
		suppressPlayerUpgradeLevel = 0;
	}
	const _rvoTmp = [0, 0];

	function setup() {
		pixelDensity(1);
		const { w, h } = hostSize();
		updateVirtualFromHost();
		createCanvas(w, h);
		const onKeyDown = (e: KeyboardEvent) => {
			if (!allowFSKey(e.key)) {
				e.preventDefault();
				e.stopPropagation();
			}
			const code = KEY(e);
			if (code > 0 && code < KEY_STATE_SIZE && keyDown[code] === 0) {
				keyDown[code] = 1;
				keyPressedEdges[code] = 1;
			}
			keyPressed();
		};

		const onKeyUp = (e: KeyboardEvent) => {
			if (!allowFSKey(e.key)) {
				e.preventDefault();
				e.stopPropagation();
			}
			const code = KEY(e);
			if (code > 0 && code < KEY_STATE_SIZE) {
				keyDown[code] = 0;
				keyPressedEdges[code] = 0;
			}
		};

		const clearKeys = () => {
			keyDown.fill(0);
			keyPressedEdges.fill(0);
			mouseIsPressed = false;
		};

		const onMouseMove = (e: MouseEvent) => {
			updatePointerFromEvent(e);
		};

		const onMouseDown = (e: MouseEvent) => {
			updatePointerFromEvent(e);
			mouseIsPressed = true;
			try {
				canvasEl.focus();
			} catch { }
			mousePressed();
		};

		const onMouseUp = (e: MouseEvent) => {
			updatePointerFromEvent(e);
			if (mouseIsPressed) mouseReleased();
			mouseIsPressed = false;
		};

		canvasEl.addEventListener(
			"keydown",
			onKeyDown,
		);
		canvasEl.addEventListener("keyup", onKeyUp);
		canvasEl.addEventListener("mousemove", onMouseMove);
		canvasEl.addEventListener("mousedown", onMouseDown);
		window.addEventListener("mousemove", onMouseMove);
		window.addEventListener("mouseup", onMouseUp);
		window.addEventListener("blur", clearKeys);
		canvasEl.tabIndex = 0;
		try {
			canvasEl.focus();
		} catch { }

		canvasEl.style.outline = "none";
		canvasEl.style.userSelect = "none";
		canvasEl.style.caretColor = "transparent";

		const host = hostEl();

		ro = new ResizeObserver(() => {
			if (resizeRaf) cancelAnimationFrame(resizeRaf);
			resizeRaf = requestAnimationFrame(() => {
				resizeRaf = 0;
				const { w, h } = hostSize();
				resizeCanvas(w, h);
				updateVirtualFromHost();
			});
		});
		ro.observe(host);

		onCleanup(() => {
			try {
				ro?.disconnect();
			} catch { }
			try {
				if (resizeRaf) cancelAnimationFrame(resizeRaf);
				resizeRaf = 0;
			} catch { }
			try {
				canvasEl.removeEventListener("keydown", onKeyDown);
				canvasEl.removeEventListener("keyup", onKeyUp);
				canvasEl.removeEventListener("mousemove", onMouseMove);
				canvasEl.removeEventListener("mousedown", onMouseDown);
				window.removeEventListener("mousemove", onMouseMove);
				window.removeEventListener("mouseup", onMouseUp);
				window.removeEventListener("blur", clearKeys);
			} catch { }
		});
		canvasEl.style.display = "block";
		canvasEl.style.width = "100%";
		canvasEl.style.height = "100%";

		textFont("monospace");
		textSize(12);
		frameRate(120);

		player = makePlayer();
		player.name = "You";
		player.uid = nextTankId++;
		tanks = [player];
		const _plRef: SpawnerPlayerRef = {
			x: 0,
			y: 0,
			r: 0,
			getRadiusScaled() {
				return this.r;
			},
		};
		spawner = new Spawner({
			world: { w: WORLD.w, h: WORLD.h },
			gridSize: GRID_SPACING,
			polygonWeights: [0.7, 0.26, 0.04],
			maxHexagons: 2,
			minDistFromPlayer: 240,
			minDistFromTank: 220,
			hideRegularSpawnsFromTanks: true,
			crasherEqualsNest: true,
			maxPlacementAttempts: 12,
			desiredPentFrac: 0.06,
			budgets: {
				rates: { polygons: 6, nest: 3, crashers: 0.75, respawns: 1 },
				caps: { polygons: 6, nest: 3, crashers: 4, respawns: 1 },
			},
			rng: Math.random,
			getPlayer: () => {
				_plRef.x = player.x;
				_plRef.y = player.y;
				_plRef.r = player.r;
				_plRef.dead = player.isDead;
				return _plRef;
			},
			getTanks: () => tanks,
			factory: {
				createPolygon: (type: number, pos: Point) => {
					const k = type === 0 ? "sqr" : type === 1 ? "tri" : "pent";
					return addShape(k, pos.x, pos.y, { spawnBucket: "field" });
				},
				createNestPolygon: (type: number, pos: Point) => {
					const k = type === 3 ? "hex" : "pent";
					return addShape(k, pos.x, pos.y, { spawnBucket: "nest" });
				},
				createCrasher: (pos: Point, elite: boolean) => {
					const r = elite ? 24 : 18;
					return addShape("dia", pos.x, pos.y, {
						ai: "seek",
						seekSpd: 260,
						r,
						isCrasher: true,
						rvo: true,
						spawnBucket: "crasher",
					});
				},
				createEnemy: (_q: RespawnRequest, _pos: Point) => {
					return true;
				},
			},
		});
		assignRandomTeam();
		spawnAtTeamBase();
		spawnBotsToFillTeams();

		cam = { x: player.x, y: player.y, vx: 0, vy: 0 };

		gridInit();
		ensureNodeCapacity(30000);
		_ensureGridTile();
		_ensureBinCapacity(4096);
		_visibleBuf = new Array(4096);
		_visibleBuf.length = 0;
		initBaseProtectors();
		protectorLocks = [];
		for (let i = 0; i < TEAMS.length; i++) protectorLocks[i] = {};
		spawner.reset();
		spawner.primePopulation();
		if (_gridTile) {
			_gridPattern = drawingContext.createPattern(_gridTile, "repeat");
		}
	}

	function windowResized() {
		const { w, h } = hostSize();
		resizeCanvas(w, h);
		updateVirtualFromHost();
	}

	function draw() {
		const dtActual = deltaTime / 1000;
		const dtFrame = Math.min(0.03, dtActual);
		_accum = Math.min(0.25, _accum + dtFrame);
		handleInput();

		let steps = 0;
		while (_accum >= FIXED_H && steps < MAX_PHYSICS_STEPS_PER_FRAME) {
			stepPhysics(FIXED_H);
			physicsFrame++;
			_accum -= FIXED_H;
			steps++;
		}
		if (_accum >= FIXED_H) {
			// Drop excess backlog after a long frame so a single stall does not cascade
			// into several expensive catch-up renders on the next few frames.
			_accum = Math.min(_accum, FIXED_H);
		}

		if (!dFrame) dFrame = derived(player);

		fpsAccum += dtActual;
		fpsFrames++;
		if (fpsAccum >= 0.5) {
			fpsShown = Math.round(fpsFrames / fpsAccum);
			fpsAccum = 0;
			fpsFrames = 0;
		}

		background(COLORS.bg);

		push();
		translate(width / 2, height / 2);
		scale(cam.zoom || 1);
		translate(-cam.x, -cam.y);

		const z = cam.zoom || 1;
		const minX = cam.x - width / (2 * z),
			minY = cam.y - height / (2 * z);
		const maxX = cam.x + width / (2 * z),
			maxY = cam.y + height / (2 * z);

		drawWorld(minX, minY, maxX, maxY);
		drawShapes(minX, minY, maxX, maxY);
		drawBullets(minX, minY, maxX, maxY);
		drawPlayer();
		drawBots(minX, minY, maxX, maxY);

		pop();

		drawTopLeaderIndicator();
		drawMinimap();
		drawScoreBar();
		drawXPBar();
		drawStatsPanel();
		drawUpgradeMenu();
		drawFPS();
		drawEventBanner(dtFrame);
		drawScoreboard();
		if (player.isDead) {
			if (_cursorState !== "none") {
				noCursor();
				_cursorState = "none";
			}
			drawDeathScreen();
		} else {
			const upgradeUiHover = hoveredUpgradeChoice || hoveredUpgradeMenuAction;
			const nextCursor = upgradeUiHover ? HAND : ARROW;
			const nextCursorState = upgradeUiHover ? "hand" : "arrow";
			if (_cursorState !== nextCursorState) {
				cursor(nextCursor);
				_cursorState = nextCursorState;
			}
		}
	}

	function tickSpawnGrace(dt: number) {
		for (let i = 0; i < shapes.length; i++) {
			const sh = shapes[i];
			if (!sh || sh.dead || sh.dying) continue;
			if (sh.spawnGrace && sh.spawnGrace > 0) {
				sh.spawnGrace = Math.max(0, sh.spawnGrace - dt);
			}
		}
	}

	function stepPhysics(h: number) {
		if (spawner) {
			_spawnerAccum += h;
			if (_spawnerAccum >= 0.05) {
				spawner.update(_spawnerAccum);
				_spawnerAccum = 0;
			}
		}
		updateShapes(h);
		updatePlayer(h);
		updateBots(h);
		updateAllTankDrones(h);
		rebuildTankGrid();
		handleTankTankCollisions();
		dFrame = derived(player);
		handleShooting(h);
		updateBullets(h);
		updateCamera(h);
		now += h;
	}

	function relaxOverlapSingle(sh: ShapeEntity, limit: number) {
		const idx = neighborIndices(sh.x, sh.y);
		let applied = 0;
		for (let n = 0; n < idx.length && applied < limit; n++) {
			const o = shapes[idx[n]];
			if (!o || o === sh || o.dead || o.dying) continue;
			const dx = sh.x - o.x,
				dy = sh.y - o.y;
			const min = sh.r + o.r + 2;
			const d2 = dx * dx + dy * dy;
			if (d2 > 0 && d2 < min * min) {
				const d = Math.sqrt(d2);
				const nx = dx / (d || 1),
					ny = dy / (d || 1);

				const isProtector = sh.ai === "protector";
				const pushMul = isProtector ? 1.6 : 1.0;
				const impMul = isProtector ? 1.4 : 1.0;

				const push = (min - d) * 0.5 * pushMul;
				sh.kx += nx * push;
				sh.ky += ny * push;
				sh.kvx += nx * 220 * impMul;
				sh.kvy += ny * 220 * impMul;
				applied++;
			}
		}
	}

	function makePlayer(): TankEntity {
		return {
			x: WORLD.w / 2,
			y: WORLD.h / 2,
			r: radiusForLevel(1),
			vx: 0,
			vy: 0,
			lastHit: -1e9,
			hitTimer: 0,

			reloadTimer: 0,
			recoilX: 0,
			recoilY: 0,

			level: 1,
			xp: 0,
			statPoints: 0,
			stats: {
				regen: 0,
				maxHP: 0,
				bodyDmg: 0,
				bulletSpd: 0,
				penetration: 0,
				bulletDmg: 0,
				reload: 0,
				moveSpd: 0,
			},
			hp: -1,
			_hpInit: false,
			hpVis: 0,
			barrelKick: 0,
			barrelAng: 0,

			teamIdx: 0,
			isDead: false,
			lifeStartTime: 0,
			lastDamagedBy: null,
			deathInfo: null,
			invincible: false,
			tankClass: "basic",
			upgradeSelections: {},
			pendingUpgradeLevel: 0,
			shotCycle: 0,
			doubleSyncShots: false,
			autoFireToggleChain: 0,
			lastAutoFireToggleAt: -1e9,
			droneSpawnTimer: 0,
			lifeKills: 0,
			lastLifeTankClass: "basic",
		};
	}

	function currentUpgradeSourceClass(
		t: TankEntity,
		level: UpgradeLevel,
	): TankClassId {
		if (level === 15) return "basic";
		if (level === 30) return t.upgradeSelections[15] || "basic";
		return (
			t.upgradeSelections[30] ||
			t.upgradeSelections[15] ||
			"basic"
		);
	}

	function upgradeChoicesForLevel(
		t: TankEntity,
		level: UpgradeLevel,
	): TankClassId[] {
		if (level === 30 && hasDeferredBasicUpgradeChoices(t)) {
			return basicDeferredUpgradeChoices().filter(isImplementedTankClass);
		}
		const source = currentUpgradeSourceClass(t, level);
		const ids = TANK_UPGRADE_TREE[source]?.[level] || [];
		return ids.filter(isImplementedTankClass);
	}

	function nextPendingUpgradeLevel(t: TankEntity): UpgradeLevel | 0 {
		if (hasDeferredBasicUpgradeChoices(t)) return 30;
		for (let i = 0; i < UPGRADE_LEVELS.length; i++) {
			const level = UPGRADE_LEVELS[i];
			if ((t.level | 0) < level) break;
			if (level === 15 && t.upgradeSelections[30]) continue;
			if (t.upgradeSelections[level]) continue;
			if (upgradeChoicesForLevel(t, level).length > 0) return level;
		}
		return 0;
	}

	function refreshPendingUpgrade(t: TankEntity) {
		t.pendingUpgradeLevel = nextPendingUpgradeLevel(t);
	}

	function resetTankUpgrades(t: TankEntity) {
		t.tankClass = "basic";
		t.upgradeSelections = {};
		t.pendingUpgradeLevel = 0;
		t.shotCycle = 0;
		t.doubleSyncShots = false;
		t.autoFireToggleChain = 0;
		t.lastAutoFireToggleAt = -1e9;
		t.droneSpawnTimer = 0;
	}

	function selectTankUpgrade(
		t: TankEntity,
		choiceId: TankClassId,
		showMessage = false,
	) {
		const level = t.pendingUpgradeLevel;
		if (!level) return false;
		const choices = upgradeChoicesForLevel(t, level);
		if (choices.indexOf(choiceId) === -1) return false;
		const usingDeferredBasicMenu =
			level === 30 &&
			hasDeferredBasicUpgradeChoices(t) &&
			(basicDeferredUpgradeChoices() as TankClassId[]).includes(choiceId);
		const deferToBasicBranchOnly = usingDeferredBasicMenu && choiceId !== "fracas";
		const prevClass = t.tankClass || "basic";
		if (tankClassUsesDrones(prevClass) && choiceId !== prevClass) {
			cleanupOwnedDrones(t.uid | 0);
		}
		if (deferToBasicBranchOnly) {
			t.upgradeSelections[15] = choiceId;
			delete t.upgradeSelections[30];
		} else {
			t.upgradeSelections[level] = choiceId;
		}
		t.tankClass = choiceId;
		tuneBotBuildForTankClass(t, choiceId);
		t.shotCycle = 0;
		t.doubleSyncShots = false;
		t.autoFireToggleChain = 0;
		t.lastAutoFireToggleAt = -1e9;
		t.droneSpawnTimer = tankClassUsesDrones(choiceId)
			? Math.min(0.4, droneRespawnCooldown(t, getTankClassDef(choiceId)))
			: 0;
		const refunded = applyTankClassStatRules(t);
		const maxHP = derived(t).maxHP;
		t.hp = Math.min(t.hp, maxHP);
		t.hpVis = Math.min(t.hpVis, maxHP);
		refreshPendingUpgrade(t);
		if (t === player) clearPlayerUpgradeMenuSuppression();
		if (showMessage) {
			pushEventMessage(`Tank upgraded to ${tankClassName(choiceId)}`);
			if (refunded > 0 && t === player) {
				pushEventMessage(
					`Recovered ${refunded} stat point${refunded === 1 ? "" : "s"} from disabled bullet upgrades`,
				);
			}
		}
		return true;
	}

	function hasRearFiringBarrel(t: TankEntity) {
		const specs = getTankClassDef(t.tankClass).renderBarrels;
		for (let i = 0; i < specs.length; i++) {
			const ang = ((specs[i].angle + TAU) % TAU) || 0;
			if (Math.abs(ang - Math.PI) < 0.18) return true;
		}
		return false;
	}

	function isFriendlySupportShape(sh: ShapeEntity | null | undefined, teamIdx: number) {
		return !!sh && sh.ai === "drone" && (sh.teamIdx | 0) === (teamIdx | 0);
	}

	function isSupportShape(sh: ShapeEntity | null | undefined) {
		return !!sh && (sh.ai === "protector" || sh.ai === "drone");
	}

	function cleanupOwnedDrones(ownerUid: number) {
		if (!ownerUid) return;
		for (let i = 0; i < shapes.length; i++) {
			const sh = shapes[i];
			if (!sh || sh.dead || sh.dying) continue;
			if (sh.ai !== "drone" || (sh.ownerUid | 0) !== (ownerUid | 0)) continue;
			sh.dying = true;
			sh.deathTimer = 0.12;
			sh.xp = 0;
		}
	}

	function tankClassUsesDrones(id: TankClassId) {
		const def = getTankClassDef(id);
		return !!(def.droneCapacity || def.infectSquares);
	}

	function tankDroneConfig(t: TankEntity) {
		const def = getTankClassDef(t.tankClass || "basic");
		if (!def.droneCapacity && !def.infectSquares) return null;
		return def;
	}

	function ownedDroneCount(t: TankEntity) {
		let count = 0;
		for (let i = 0; i < shapes.length; i++) {
			const sh = shapes[i];
			if (!sh || sh.dead || sh.dying) continue;
			if (sh.ai === "drone" && (sh.ownerUid | 0) === (t.uid | 0)) count++;
		}
		return count;
	}

	function syncShapeCombatBuffers(sh: ShapeEntity, idx = shapes.indexOf(sh)) {
		if (idx < 0) return;
		S_body[idx] = sh.body | 0;
		S_hp[idx] = sh.hp;
		S_hpVis[idx] = sh.hpVis;
		S_team[idx] = (sh.teamIdx ?? -1) | 0;
	}

	function legacyBulletSpeedForTank(owner: TankEntity) {
		const classStats = getTankClassDef(owner.tankClass || "basic").stats || {};
		return (360 + (owner.stats.bulletSpd || 0) * 50) * (classStats.bulletSpeedMul || 1);
	}

	function droneSpeedScale(owner: TankEntity) {
		const bulletSpeed = legacyBulletSpeedForTank(owner);
		return Math.max(
			1.35 * DRONE_BASE_SPEED_BUFF,
			Math.min(
				2.85 * DRONE_BASE_SPEED_BUFF,
				((bulletSpeed / DRONE_BULLET_SPEED_BASE) * 1.12 +
					owner.stats.penetration * 0.05) *
				DRONE_BASE_SPEED_BUFF,
			),
		);
	}

	function droneLeashRadius(def: TankClassDef) {
		return Math.max(220, (def.droneAutoRange || 900) * DRONE_AUTO_LEASH_RATIO);
	}

	function droneRespawnCooldown(owner: TankEntity, def: TankClassDef) {
		const base = def.droneCooldown || 1.45;
		const reloadMul = 1 + (owner.stats.reload || 0) * 0.085;
		return Math.max(0.35, base / reloadMul);
	}

	function droneSeekSpeed(owner: TankEntity, def: TankClassDef, speedMul = 1) {
		return (def.droneSpeed || 380) * droneSpeedScale(owner) * speedMul;
	}

	function droneAccel(owner: TankEntity) {
		return 2600 * Math.max(1, Math.sqrt(droneSpeedScale(owner)));
	}

	function droneBodyDamage(owner: TankEntity, def: TankClassDef) {
		const base = def.droneBody || 8;
		const statMul =
			1 + owner.stats.bulletDmg * 0.16 + owner.stats.penetration * 0.12;
		return Math.max(base, Math.round(base * statMul));
	}

	function droneMaxHp(owner: TankEntity, def: TankClassDef) {
		const base = def.droneHP || 16;
		const statMul =
			1 + owner.stats.penetration * 0.18 + owner.stats.bulletDmg * 0.08;
		return Math.max(base, Math.round(base * statMul));
	}

	function syncDroneMotion(
		sh: ShapeEntity,
		owner: TankEntity,
		def: TankClassDef,
		speedMul = 1,
	) {
		const seekSpd = droneSeekSpeed(owner, def, speedMul);
		const aiAccel = droneAccel(owner);
		sh.seekSpd = seekSpd;
		sh.aiAccel = aiAccel;
		sh.aiKSeek =
			1 - Math.exp((-(aiAccel || 2600) * FIXED_H) / Math.max(1, seekSpd));
	}

	function syncDroneCombat(
		sh: ShapeEntity,
		owner: TankEntity,
		def: TankClassDef,
		preserveHpRatio = true,
		idx = shapes.indexOf(sh),
	) {
		const prevMax = Math.max(1, sh.maxHp || sh.hp || 1);
		const nextMax = droneMaxHp(owner, def);
		const hpRatio = preserveHpRatio ? clamp01((sh.hp || nextMax) / prevMax) : 1;
		sh.body = droneBodyDamage(owner, def);
		sh.maxHp = nextMax;
		sh.hp = Math.min(nextMax, Math.max(1, Math.round(nextMax * hpRatio)));
		sh.hpVis = Math.min(nextMax, Math.max(sh.hpVis || sh.hp, sh.hp));
		syncShapeCombatBuffers(sh, idx);
	}

	function clampPointToCircle(
		originX: number,
		originY: number,
		x: number,
		y: number,
		maxDist: number,
	) {
		const dx = x - originX;
		const dy = y - originY;
		const d = Math.hypot(dx, dy) || 1;
		if (d <= maxDist) return [x, y] as const;
		const s = maxDist / d;
		return [originX + dx * s, originY + dy * s] as const;
	}

	function shapeRegenDelay(sh: ShapeEntity) {
		return sh.ai === "drone" ? 2.2 : HYPER_REGEN_AFTER;
	}

	function shapeRegenRate(sh: ShapeEntity) {
		if (sh.ai !== "drone") return 0.2;
		const owner = sh.ownerUid ? getTankByUid(sh.ownerUid | 0) : null;
		return 0.18 + (owner ? owner.stats.penetration * 0.012 + owner.stats.regen * 0.01 : 0);
	}

	function spawnTankDrone(t: TankEntity) {
		const teamName = TEAMS[t.teamIdx].name;
		const col = TEAM_TANK_COLORS[teamName];
		const def = tankDroneConfig(t);
		if (!def) return null;
		const capacity = def.droneCapacity || 0;
		if (capacity <= 0 || ownedDroneCount(t) >= capacity) return null;
		const ang = (t.barrelAng || 0) + ((ownedDroneCount(t) & 1) === 0 ? HALF_PI : -HALF_PI);
		const spawnR = t.r + 24;
		const droneKind = def.droneShape || "tri";
		const sh = addShape(droneKind, t.x + Math.cos(ang) * spawnR, t.y + Math.sin(ang) * spawnR, {
			col,
			r: def.droneRadius || 15,
			forceNoShiny: true,
			ai: "drone",
			seekSpd: droneSeekSpeed(t, def),
			aiAccel: droneAccel(t),
			friction: 10,
			teamIdx: t.teamIdx,
		});
		if (!sh) return null;
		sh.ownerUid = t.uid | 0;
		syncDroneCombat(sh, t, def, false);
		sh.xp = 0;
		sh.homeTheta = random(TAU);
		sh.homeR = t.r + 46 + random(14);
		sh.rotSpd = 3.6;
		sh.spawnGrace = 0.32;
		sh.droneType = t.tankClass;
		syncDroneMotion(sh, t, def);
		return sh;
	}

	function nearestDroneTarget(
		t: TankEntity,
		drone: ShapeEntity,
		maxDist: number,
		preferSquares = false,
	) {
		let best: TankEntity | ShapeEntity | null = null;
		let bestDist = maxDist;
		const leash = droneLeashRadius(tankDroneConfig(t) || getTankClassDef(t.tankClass || "basic"));
		if (preferSquares) {
			for (let i = 0; i < shapes.length; i++) {
				const sh = shapes[i];
				if (
					!sh ||
					sh.dead ||
					sh.dying ||
					sh.invincible ||
					sh.ai ||
					sh.type !== "sqr"
				)
					continue;
				if (distance(t.x, t.y, sh.x, sh.y) > leash) continue;
				const dist = distance(drone.x, drone.y, sh.x, sh.y);
				if (dist < bestDist) {
					best = sh;
					bestDist = dist;
				}
			}
			if (best) return best;
		}
		for (let i = 0; i < tanks.length; i++) {
			const other = tanks[i];
			if (!other || other.isDead || other.invincible) continue;
			if ((other.teamIdx | 0) === (t.teamIdx | 0)) continue;
			if (distance(t.x, t.y, other.x, other.y) > leash) continue;
			const dist = distance(drone.x, drone.y, other.x, other.y);
			if (dist < bestDist) {
				best = other;
				bestDist = dist;
			}
		}
		for (let i = 0; i < shapes.length; i++) {
			const sh = shapes[i];
			if (!sh || sh.dead || sh.dying || sh.invincible) continue;
			if (sh.ai === "protector" || isFriendlySupportShape(sh, t.teamIdx)) continue;
			if (distance(t.x, t.y, sh.x, sh.y) > leash) continue;
			const dist = distance(drone.x, drone.y, sh.x, sh.y);
			if (dist < bestDist) {
				best = sh;
				bestDist = dist;
			}
		}
		return best;
	}

	function untrackNaturalShape(sh: ShapeEntity) {
		if (spawner && spawner.onShapeDied && !sh.ai) spawner.onShapeDied(sh);
		const reg = sh.spawnRegion || regionFor(sh.cx, sh.cy);
		if (!sh.ai && shouldCount(sh.type, reg)) {
			if (reg === "outer") liveCounts.outer[sh.type]--;
			else if (reg === "ring") liveCounts.ring[sh.type]--;
			else if (reg === "core" && sh.type === "pent") liveCounts.core.pent--;
		}
	}

	function convertShapeToDrone(owner: TankEntity, sh: ShapeEntity) {
		const def = tankDroneConfig(owner);
		if (!def) return false;
		const teamName = TEAMS[owner.teamIdx].name;
		const col = TEAM_TANK_COLORS[teamName];
		const sourceType = sh.type;
		const sourceRadius = sh.r;
		untrackNaturalShape(sh);
		const droneKind = def.droneShape || "tri";
		sh.type = droneKind;
		sh.sides = droneKind === "tri" ? 3 : 4;
		sh.col = col.slice();
		sh.colBorder = [
			Math.max(0, Math.floor(col[0] * 0.72)),
			Math.max(0, Math.floor(col[1] * 0.72)),
			Math.max(0, Math.floor(col[2] * 0.72)),
		];
		sh.colInner = lighten(col, 0.12);
		sh.r =
			def.infectSquares && sourceType === "sqr"
				? sourceRadius
				: def.droneRadius || 15;
		sh.xp = 0;
		sh.ai = "drone";
		sh.ownerUid = owner.uid | 0;
		sh.teamIdx = owner.teamIdx;
		sh.friction = 10;
		sh.frFactor = Math.exp(-(sh.friction || 10) * FIXED_H);
		syncDroneMotion(sh, owner, def);
		sh.state = "idle";
		sh.stateTimer = 0;
		sh.orbitSpd = 0;
		sh.orbitR = 0;
		sh.theta = 0;
		sh.homeTheta = random(TAU);
		sh.homeR = owner.r + 48 + random(12);
		sh.rotSpd = 3.6;
		sh.spawnGrace = 0.32;
		sh.invincible = false;
		sh.shiny = false;
		sh.targetX = owner.x;
		sh.targetY = owner.y;
		sh.droneType = owner.tankClass;
		syncDroneCombat(sh, owner, def, false);
		return true;
	}

	function tryInfectSquare(owner: TankEntity, sh: ShapeEntity) {
		const def = tankDroneConfig(owner);
		if (!def?.infectSquares) return false;
		if (sh.ai || sh.type !== "sqr" || sh.dead || sh.dying || sh.invincible) return false;
		if (ownedDroneCount(owner) >= (def.droneCapacity || 0)) {
			killShape(sh, owner);
			return true;
		}
		return convertShapeToDrone(owner, sh);
	}

	function updateTankDrones(t: TankEntity, dt: number) {
		const def = tankDroneConfig(t);
		if (!def || t.isDead) {
			cleanupOwnedDrones(t.uid | 0);
			return;
		}
		const capacity = def.droneCapacity || 0;
		if (capacity <= 0) return;
		const ownedCount = ownedDroneCount(t);
		const needsSquareFeed =
			!!def.infectSquares && ownedCount < Math.max(1, capacity);
		if (!def.infectSquares) {
			const cooldown = droneRespawnCooldown(t, def);
			if (ownedCount >= capacity) {
				t.droneSpawnTimer = cooldown;
			} else {
				t.droneSpawnTimer = Math.max(0, (t.droneSpawnTimer || 0) - dt);
				if (t.droneSpawnTimer <= 0) {
					if (spawnTankDrone(t)) t.droneSpawnTimer = cooldown;
					else t.droneSpawnTimer = 0.25;
				}
			}
		}

		let controlX = t.x;
		let controlY = t.y;
		let forcing = false;
		if (t === player) {
			if (input.firing || autoShoot) {
				const [wx, wy] = mouseWorld();
				controlX = wx;
				controlY = wy;
				forcing = true;
			}
		} else if (t.ai) {
			const botAi = ensureBotAI(t);
			const shouldCommandDrones =
				t._fireCmd ||
				((botAi.mode === "engage" ||
					botAi.mode === "chase" ||
					botAi.mode === "farm") &&
					(botAi.focusTankUid || botAi.focusShapeId));
			if (shouldCommandDrones) {
				controlX = botAi.aimX;
				controlY = botAi.aimY;
				forcing = true;
			}
		}

		let slot = 0;
		const orbitCount = Math.max(1, Math.min(capacity, ownedCount || capacity));
		const baseDroneSpeed = droneSeekSpeed(t, def);
		const forcedDroneSpeed = baseDroneSpeed * 1.18;
		const leash = droneLeashRadius(def);
		for (let i = 0; i < shapes.length; i++) {
			const sh = shapes[i];
			if (!sh || sh.dead || sh.dying) continue;
			if (sh.ai !== "drone" || (sh.ownerUid | 0) !== (t.uid | 0)) continue;
			syncDroneCombat(sh, t, def, true, i);
			sh.homeTheta = ((sh.homeTheta || 0) + dt * 0.8) % TAU;
			const ringAng = (slot / orbitCount) * TAU + now * 0.55;
			let targetX = t.x + Math.cos(ringAng) * (sh.homeR || (t.r + 52));
			let targetY = t.y + Math.sin(ringAng) * (sh.homeR || (t.r + 52));
			if (forcing) {
				const spread =
					(slot - (orbitCount - 1) * 0.5) * Math.min(22, (sh.r || 14) * 0.9);
				const aimAng = Math.atan2(controlY - t.y, controlX - t.x);
				targetX = controlX + Math.cos(aimAng + HALF_PI) * spread;
				targetY = controlY + Math.sin(aimAng + HALF_PI) * spread;
			} else {
				const autoTarget = nearestDroneTarget(
					t,
					sh,
					def.droneAutoRange || 900,
					needsSquareFeed,
				);
				if (autoTarget) {
					const spread =
						(slot - (orbitCount - 1) * 0.5) * Math.min(20, (sh.r || 14) * 0.75);
					const aimAng = Math.atan2(autoTarget.y - sh.y, autoTarget.x - sh.x);
					targetX = autoTarget.x + Math.cos(aimAng + HALF_PI) * spread;
					targetY = autoTarget.y + Math.sin(aimAng + HALF_PI) * spread;
					[targetX, targetY] = clampPointToCircle(t.x, t.y, targetX, targetY, leash);
				}
			}
			sh.targetX = targetX;
			sh.targetY = targetY;
			syncDroneMotion(sh, t, def, forcing ? forcedDroneSpeed / baseDroneSpeed : 1);
			slot++;
		}
	}

	function updateAllTankDrones(dt: number) {
		for (let i = 0; i < tanks.length; i++) {
			const t = tanks[i];
			if (!t) continue;
			updateTankDrones(t, dt);
		}
	}

	function supportTankPairKey(shapeId: number, tankUid: number) {
		return (0x70000000 ^ ((shapeId | 0) * 131071 + (tankUid | 0))) | 0;
	}

	function pathTouchesCircle(
		x0: number,
		y0: number,
		x1: number,
		y1: number,
		cx: number,
		cy: number,
		r: number,
	) {
		const dx = x1 - cx;
		const dy = y1 - cy;
		if (dx * dx + dy * dy < r * r) return true;
		if (x0 === x1 && y0 === y1) return false;
		return segmentCircleTOI(x0, y0, x1, y1, cx, cy, r) !== null;
	}

	function supportShapeDamageLabel(sh: ShapeEntity, owner: TankEntity | null) {
		if (sh.ai === "drone" && owner) return "tankuid:" + (owner.uid | 0);
		if (sh.ai === "protector" && sh.teamIdx !== undefined)
			return "protector:" + (sh.teamIdx | 0);
		return sh.type || "shape";
	}

	function supportShapeImpactDamage(sh: ShapeEntity, t: TankEntity, owner: TankEntity | null) {
		if (sh.ai === "protector") {
			const targetMaxHp = derived(t).maxHP;
			return Math.max(sh.body | 0, Math.round(targetMaxHp * 0.09));
		}
		if (sh.ai === "drone" && owner) {
			return Math.max(sh.body | 0, droneBodyDamage(owner, tankDroneConfig(owner) || getTankClassDef(owner.tankClass || "basic")));
		}
		return sh.body | 0;
	}

	function applySupportShapeTankImpact(sh: ShapeEntity, t: TankEntity) {
		if (!sh || sh.dead || sh.dying || !t || t.isDead) return false;
		if ((sh.teamIdx | 0) === (t.teamIdx | 0)) return false;
		const key = supportTankPairKey(sh.id | 0, t.uid | 0);
		if (!canPairFrames(key, SUPPORT_CONTACT_COOLDOWN_FRAMES)) return false;
		const owner =
			sh.ai === "drone" && sh.ownerUid ? getTankByUid(sh.ownerUid | 0) : null;
		if (!sh.invincible && !(sh.spawnGrace && sh.spawnGrace > 0)) {
			sh.hp -= derived(t).bodyHitShape;
			sh.lastHit = now;
			sh.hitTimer = 0.04;
			sh.hitTimer2 = 0.08;
			if (sh.hp <= 0) killShape(sh, t);
		} else {
			sh.lastHit = now;
			sh.hitTimer = 0.04;
			sh.hitTimer2 = 0.08;
		}
		if (!t.invincible) {
			t.hp -= supportShapeImpactDamage(sh, t, owner);
			t.lastDamagedBy = supportShapeDamageLabel(sh, owner);
			t.lastHit = now;
			t.hitTimer = 0.04;
		}
		markPair(key);
		return true;
	}

	function handleSupportShapeTankContacts(sh: ShapeEntity, prevX: number, prevY: number) {
		if (!isSupportShape(sh)) return;
		for (let i = 0; i < tanks.length; i++) {
			const t = tanks[i];
			if (!t || t.isDead) continue;
			if ((t.teamIdx | 0) === (sh.teamIdx | 0)) continue;
			const reach = (sh.r || 0) + (t.r || 0);
			if (!pathTouchesCircle(prevX, prevY, sh.x, sh.y, t.x, t.y, reach)) continue;
			applySupportShapeTankImpact(sh, t);
			if (sh.dead || sh.dying) return;
		}
	}

	function handleDroneShapeContacts(sh: ShapeEntity, prevX: number, prevY: number) {
		const owner =
			sh.ownerUid && !sh.dead ? getTankByUid(sh.ownerUid | 0) : null;
		_supportShapeSeq = (_supportShapeSeq + 1) | 0;
		if (_supportShapeSeq === 0) {
			_supportShapeStamp.fill(0);
			_supportShapeSeq = 1;
		}
		_supportShapeBuf.length = 0;
		const sample0 = neighborIndices(prevX, prevY);
		for (let n = 0; n < sample0.length; n++) {
			const ci = sample0[n] | 0;
			if (_supportShapeStamp[ci] === _supportShapeSeq) continue;
			_supportShapeStamp[ci] = _supportShapeSeq;
			_supportShapeBuf.push(ci);
		}
		const sample1 = neighborIndices(sh.x, sh.y);
		for (let n = 0; n < sample1.length; n++) {
			const ci = sample1[n] | 0;
			if (_supportShapeStamp[ci] === _supportShapeSeq) continue;
			_supportShapeStamp[ci] = _supportShapeSeq;
			_supportShapeBuf.push(ci);
		}
		const midX = (prevX + sh.x) * 0.5;
		const midY = (prevY + sh.y) * 0.5;
		const sample2 = neighborIndices(midX, midY);
		for (let n = 0; n < sample2.length; n++) {
			const ci = sample2[n] | 0;
			if (_supportShapeStamp[ci] === _supportShapeSeq) continue;
			_supportShapeStamp[ci] = _supportShapeSeq;
			_supportShapeBuf.push(ci);
		}
		for (let i = 0; i < _supportShapeBuf.length; i++) {
			const ci = _supportShapeBuf[i] | 0;
			const other = shapes[ci];
			if (!other || other === sh || other.dead || other.dying || other.invincible) continue;
			if (isFriendlySupportShape(other, sh.teamIdx | 0)) continue;
			const rs = (other.r || 0) + (sh.r || 0);
			if (!pathTouchesCircle(prevX, prevY, sh.x, sh.y, other.x, other.y, rs))
				continue;
			const key = shapePairKey(sh.id | 0, other.id | 0);
			if (!canPairFrames(key, SUPPORT_CONTACT_COOLDOWN_FRAMES)) continue;
			other.hp -= sh.body || 8;
			other.lastHit = now;
			other.hitTimer = 0.04;
			other.hitTimer2 = 0.08;
			sh.hp -= Math.max(4, (other.body || 0) * 0.8);
			sh.hitTimer = 0.04;
			sh.hitTimer2 = 0.08;
			if (other.hp <= 0) {
				if (!(owner && tryInfectSquare(owner, other))) {
					killShape(other, owner && !owner.isDead ? owner : null);
				}
			}
			if (sh.hp <= 0) {
				sh.dying = true;
				sh.deathTimer = 0.14;
				sh.xp = 0;
				break;
			}
			markPair(key);
		}
	}

	function handlePlayerAutoShootToggle() {
		if (player.tankClass !== "double") {
			player.autoFireToggleChain = 0;
			player.lastAutoFireToggleAt = now;
			return;
		}
		if (now - player.lastAutoFireToggleAt <= 1.1) {
			player.autoFireToggleChain = (player.autoFireToggleChain | 0) + 1;
		} else {
			player.autoFireToggleChain = 1;
		}
		player.lastAutoFireToggleAt = now;
		if (player.autoFireToggleChain >= 4) {
			player.autoFireToggleChain = 0;
			player.doubleSyncShots = !player.doubleSyncShots;
			pushEventMessage(
				`Double fire pattern: ${player.doubleSyncShots ? "sync" : "alternate"}`,
			);
		}
	}

	function ensurePlayerHPInit() {
		if (!player._hpInit) {
			const d = derived(player);
			player.hp = d.maxHP;
			player.hpVis = player.hp;
			player.lifeStartTime = now;
			player._hpInit = true;
		}
	}

	function getTeamBaseRect(idx: number): Rect {
		const t = TEAMS[idx].key,
			s = TEAM_BASE_SIZE;
		if (t === "tl") return { x: 0, y: 0, w: s, h: s };
		if (t === "tr") return { x: WORLD.w - s, y: 0, w: s, h: s };
		if (t === "bl") return { x: 0, y: WORLD.h - s, w: s, h: s };
		return { x: WORLD.w - s, y: WORLD.h - s, w: s, h: s };
	}

	function getTeamBaseCenter(idx: number): Point {
		const r = getTeamBaseRect(idx);
		return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
	}

	function assignRandomTeam() {
		player.teamIdx = Math.floor(random(TEAMS.length));
	}

	function spawnAtTeamBase() {
		const r = getTeamBaseRect(player.teamIdx);
		const m = player.r + 40;
		player.x = random(r.x + m, r.x + r.w - m);
		player.y = random(r.y + m, r.y + r.h - m);
		const d = derived(player);
		player.hp = d.maxHP;
		player.hpVis = player.hp;
		player._hpInit = true;
		player.isDead = false;
		player.lifeStartTime = now;
		player.lastDamagedBy = null;
		player.deathInfo = null;
		player.lifeKills = 0;
		player.invincible = true;
		autoShoot = false;
		refreshPendingUpgrade(player);
	}

	function killerLabel(k: any) {
		if (typeof k === "string" && k.startsWith("tankuid:")) {
			const uid = +k.split(":")[1] | 0;
			const t = getTankByUid(uid);
			return t && t.name ? t.name : "enemy tank";
		}
		if (typeof k === "string" && k.startsWith("protector:")) {
			const idx = +k.split(":")[1] | 0;
			const name =
				TEAMS[idx] && TEAMS[idx].name ? TEAMS[idx].name : "unknown";
			return name + " protectors";
		}
		if (typeof k === "string" && k.startsWith("tank:")) {
			const idx = +k.split(":")[1] | 0;
			const name =
				TEAMS[idx] && TEAMS[idx].name ? TEAMS[idx].name : "unknown";
			return name + " bot";
		}
		if (k === "bullet") return "an enemy bullet";
		if (k === "tri") return "triangle";
		if (k === "sqr") return "square";
		if (k === "pent") return "pentagon";
		if (k === "dia") return "diamond";
		if (k === "hex") return "hexagon";
		return "unknown";
	}

	function deathPreviewInfo(k: any, killerTank: TankEntity | null = null) {
		const killer = killerLabel(k);
		if (killerTank) {
			return {
				killer,
				killerTankClass: killerTank.tankClass || "basic",
				killerTankTeamIdx: killerTank.teamIdx ?? null,
				killerPreviewKind: "tank" as DeathPreviewKind,
				killerPreviewShape: null,
				killerPreviewTeamIdx: killerTank.teamIdx ?? null,
			};
		}
		if (typeof k === "string" && k.startsWith("tank:")) {
			const idx = +k.split(":")[1] | 0;
			return {
				killer,
				killerTankClass: "basic" as TankClassId,
				killerTankTeamIdx: idx,
				killerPreviewKind: "tank" as DeathPreviewKind,
				killerPreviewShape: null,
				killerPreviewTeamIdx: idx,
			};
		}
		if (typeof k === "string" && k.startsWith("protector:")) {
			const idx = +k.split(":")[1] | 0;
			return {
				killer,
				killerTankClass: null,
				killerTankTeamIdx: null,
				killerPreviewKind: "protector" as DeathPreviewKind,
				killerPreviewShape: "dia" as DeathPreviewShapeType,
				killerPreviewTeamIdx: idx,
			};
		}
		if (
			k === "tri" ||
			k === "sqr" ||
			k === "pent" ||
			k === "dia" ||
			k === "hex"
		) {
			return {
				killer,
				killerTankClass: null,
				killerTankTeamIdx: null,
				killerPreviewKind: "shape" as DeathPreviewKind,
				killerPreviewShape: k as DeathPreviewShapeType,
				killerPreviewTeamIdx: null,
			};
		}
		if (k === "bullet") {
			return {
				killer,
				killerTankClass: null,
				killerTankTeamIdx: null,
				killerPreviewKind: "bullet" as DeathPreviewKind,
				killerPreviewShape: null,
				killerPreviewTeamIdx: null,
			};
		}
		return {
			killer,
			killerTankClass: null,
			killerTankTeamIdx: null,
			killerPreviewKind: "none" as DeathPreviewKind,
			killerPreviewShape: null,
			killerPreviewTeamIdx: null,
		};
	}

	function awardKillXPPayload(victim: any, killerUid: number) {
		if (!killerUid) return;
		const killer = getTankByUid?.(killerUid);
		if (!killer || killer.isDead) return;

		const baseXP = Math.max(0, Math.floor(victim?.xp ?? 0));
		const gained = Math.max(0, Math.floor(baseXP * 0.65));
		if (gained <= 0) return;
		killer.xp = Math.max(0, (killer.xp | 0) + gained);
		killer.lifeKills = (killer.lifeKills | 0) + 1;
		registerBotKill(killer, victim);
	}

	function onPlayerDeath(k: any) {
		const wasLeader = currentTopTankUid() === (player.uid | 0);
		player.isDead = true;
		cleanupOwnedDrones(player.uid | 0);

		let killerUid = 0;
		if (typeof k === "string" && k.startsWith("tankuid:")) {
			killerUid = +k.split(":")[1] | 0;
		}
		if (killerUid) awardKillXPPayload(player, killerUid);
		const killerTank = killerUid ? getTankByUid(killerUid) : null;
		const killerPreview = deathPreviewInfo(k, killerTank);

		const start = player.lifeStartTime ?? now;
		const alive = Math.max(0, now - start);

		player.deathInfo = {
			killer: killerPreview.killer,
			score: Math.floor(player.xp),
			level: player.level,
			time: alive,
			kills: player.lifeKills | 0,
			tankClass: player.tankClass || "basic",
			killerTankClass: killerPreview.killerTankClass,
			killerTankTeamIdx: killerPreview.killerTankTeamIdx,
			killerPreviewKind: killerPreview.killerPreviewKind,
			killerPreviewShape: killerPreview.killerPreviewShape,
			killerPreviewTeamIdx: killerPreview.killerPreviewTeamIdx,
		};
		player.lastLifeTankClass = player.tankClass || "basic";

		if (wasLeader) {
			pushEventMessage(`${tankDisplayName(player)} was killed by ${killerPreview.killer}`, 3.4);
		}

		if (killerUid) {
			const t = getTankByUid(killerUid);
			if (t && t.name) pushEventMessage(`${t.name} killed You`);
		}
		input.firing = false;
		autoShoot = false;
	}

	function onBotDeath(bot: any, killerUid?: number) {
		const wasLeader = currentTopTankUid() === (bot.uid | 0);
		bot.isDead = true;
		cleanupOwnedDrones(bot.uid | 0);
		releaseClaim(bot);
		const ai = ensureBotAI(bot);
		ai.deaths = (ai.deaths | 0) + 1;
		ai.confidence = constrain(ai.confidence - 0.24, -1, 1);
		ai.caution = constrain(ai.caution + 0.08, 0.08, 0.9);
		ai.pressure = Math.min(1.4, ai.pressure + 0.4);

		if (
			!killerUid &&
			typeof bot.lastDamagedBy === "string" &&
			bot.lastDamagedBy.startsWith("tankuid:")
		) {
			killerUid = +bot.lastDamagedBy.split(":")[1] | 0;
		}

		if (killerUid) awardKillXPPayload(bot, killerUid);

		const start = bot.lifeStartTime ?? now;
		const alive = Math.max(0, now - start);
		const killerName = killerUid
			? tankDisplayName(getTankByUid(killerUid))
			: killerLabel(bot.lastDamagedBy);
		const killerTank = killerUid ? getTankByUid(killerUid) : null;
		const killerPreview = deathPreviewInfo(bot.lastDamagedBy, killerTank);
		bot.deathInfo = {
			killer: killerName,
			score: Math.floor(bot.xp || 0),
			level: bot.level || 1,
			time: alive,
			kills: bot.lifeKills | 0,
			tankClass: bot.tankClass || "basic",
			killerTankClass: killerPreview.killerTankClass,
			killerTankTeamIdx: killerPreview.killerTankTeamIdx,
			killerPreviewKind: killerPreview.killerPreviewKind,
			killerPreviewShape: killerPreview.killerPreviewShape,
			killerPreviewTeamIdx: killerPreview.killerPreviewTeamIdx,
		};
		bot.lastLifeTankClass = bot.tankClass || "basic";

		if (killerUid && killerUid === (player.uid | 0)) {
			pushEventMessage(`You killed ${bot.name}`);
		}

		if (wasLeader) {
			pushEventMessage(`${tankDisplayName(bot)} was killed by ${killerName}`, 3.4);
		}

		maybeAdaptBotBuild(bot);
		respawnTankCommon(bot);
		resetBotTacticalState(bot);
	}

	function computeRespawnLevel(level: number) {
		const loss =
			level < LEVEL_LOSS_THRESHOLD
				? LEVEL_LOSS_BELOW
				: LEVEL_LOSS_AT_OR_ABOVE;
		return Math.max(1, (level | 0) - loss);
	}

	function calcStatPointsForLevel(level: number) {
		let pts = 0;
		for (let L = 2; L <= level; L++) {
			if (L <= 28) pts++;
			else if (L === 30) pts++;
			else if (L > 30 && (L - 30) % 3 === 0) pts++;
		}
		return pts;
	}

	function respawnTankCommon(t: TankEntity) {
		cleanupOwnedDrones(t.uid | 0);
		const newLevel = computeRespawnLevel(t.level | 0);
		t.level = newLevel;
		updateTankRadius(t);
		t.xp = xpToLevel(newLevel - 1);
		resetTankUpgrades(t);
		t.stats = {
			regen: 0,
			maxHP: 0,
			bodyDmg: 0,
			bulletSpd: 0,
			penetration: 0,
			bulletDmg: 0,
			reload: 0,
			moveSpd: 0,
		};
		t.statPoints = calcStatPointsForLevel(newLevel);
		spawnTankAtTeamBase(t);
		if (t === player) clearPlayerUpgradeMenuSuppression();
	}

	const STAT_KEYS = [
		"regen",
		"maxHP",
		"bodyDmg",
		"bulletSpd",
		"penetration",
		"bulletDmg",
		"reload",
		"moveSpd",
	] as const;
	type TankStatKey = (typeof STAT_KEYS)[number];
	const MELEE_STAT_KEYS = ["regen", "maxHP", "bodyDmg", "moveSpd"] as const;
	const DEFAULT_STAT_CAP = 7;
	const MELEE_STAT_CAP = 10;

	type BotBuildConfig = {
		key: BotBuildKey;
		label: string;
		statPlan: TankStatKey[];
		fallbackPriority: TankStatKey[];
		preferredRange: number;
		minRange: number;
		maxRange: number;
		aggression: number;
		farmBias: number;
		ramBias: number;
		strafeBias: number;
		retreatHP: number;
		chaseWindow: number;
	};

	const BOT_BUILD_CONFIGS: Record<BotBuildKey, BotBuildConfig> = {
		sniper: {
			key: "sniper",
			label: "Sniper",
			statPlan: [
				"bulletSpd",
				"bulletDmg",
				"bulletSpd",
				"reload",
				"penetration",
				"bulletSpd",
				"bulletDmg",
				"moveSpd",
				"reload",
				"penetration",
				"bulletSpd",
				"bulletDmg",
				"reload",
				"maxHP",
				"moveSpd",
				"regen",
				"penetration",
				"bulletDmg",
				"reload",
				"maxHP",
				"moveSpd",
			],
			fallbackPriority: [
				"bulletSpd",
				"bulletDmg",
				"reload",
				"penetration",
				"moveSpd",
				"maxHP",
				"regen",
				"bodyDmg",
			],
			preferredRange: 640,
			minRange: 250,
			maxRange: 980,
			aggression: 0.44,
			farmBias: 0.8,
			ramBias: 0.05,
			strafeBias: 0.8,
			retreatHP: 0.38,
			chaseWindow: 0.3,
		},
		skirmisher: {
			key: "skirmisher",
			label: "Skirmisher",
			statPlan: [
				"reload",
				"bulletDmg",
				"moveSpd",
				"bulletSpd",
				"reload",
				"bulletDmg",
				"penetration",
				"moveSpd",
				"reload",
				"bulletDmg",
				"maxHP",
				"moveSpd",
				"bulletSpd",
				"reload",
				"penetration",
				"maxHP",
				"regen",
				"bodyDmg",
				"moveSpd",
				"bulletDmg",
			],
			fallbackPriority: [
				"reload",
				"bulletDmg",
				"moveSpd",
				"bulletSpd",
				"penetration",
				"maxHP",
				"regen",
				"bodyDmg",
			],
			preferredRange: 420,
			minRange: 165,
			maxRange: 760,
			aggression: 0.62,
			farmBias: 0.45,
			ramBias: 0.2,
			strafeBias: 1.05,
			retreatHP: 0.34,
			chaseWindow: 0.48,
		},
		brawler: {
			key: "brawler",
			label: "Brawler",
			statPlan: [
				"bodyDmg",
				"moveSpd",
				"maxHP",
				"bodyDmg",
				"moveSpd",
				"reload",
				"maxHP",
				"bodyDmg",
				"regen",
				"moveSpd",
				"reload",
				"maxHP",
				"bodyDmg",
				"bulletDmg",
				"moveSpd",
				"regen",
				"reload",
				"penetration",
				"maxHP",
				"bodyDmg",
			],
			fallbackPriority: [
				"bodyDmg",
				"moveSpd",
				"maxHP",
				"reload",
				"regen",
				"bulletDmg",
				"penetration",
				"bulletSpd",
			],
			preferredRange: 150,
			minRange: 0,
			maxRange: 430,
			aggression: 0.9,
			farmBias: 0.25,
			ramBias: 1.1,
			strafeBias: 0.45,
			retreatHP: 0.26,
			chaseWindow: 0.72,
		},
		bulwark: {
			key: "bulwark",
			label: "Bulwark",
			statPlan: [
				"maxHP",
				"regen",
				"penetration",
				"maxHP",
				"reload",
				"bulletDmg",
				"bulletSpd",
				"regen",
				"maxHP",
				"penetration",
				"reload",
				"bodyDmg",
				"moveSpd",
				"bulletDmg",
				"bulletSpd",
				"maxHP",
				"regen",
				"penetration",
				"moveSpd",
				"bodyDmg",
			],
			fallbackPriority: [
				"maxHP",
				"regen",
				"penetration",
				"reload",
				"bulletDmg",
				"bulletSpd",
				"moveSpd",
				"bodyDmg",
			],
			preferredRange: 300,
			minRange: 120,
			maxRange: 650,
			aggression: 0.5,
			farmBias: 0.55,
			ramBias: 0.35,
			strafeBias: 0.65,
			retreatHP: 0.42,
			chaseWindow: 0.35,
		},
		raider: {
			key: "raider",
			label: "Raider",
			statPlan: [
				"moveSpd",
				"reload",
				"bulletDmg",
				"moveSpd",
				"bulletSpd",
				"reload",
				"moveSpd",
				"penetration",
				"bulletDmg",
				"bodyDmg",
				"reload",
				"moveSpd",
				"maxHP",
				"bulletSpd",
				"bodyDmg",
				"regen",
				"bulletDmg",
				"maxHP",
				"penetration",
			],
			fallbackPriority: [
				"moveSpd",
				"reload",
				"bulletDmg",
				"bulletSpd",
				"penetration",
				"bodyDmg",
				"maxHP",
				"regen",
			],
			preferredRange: 260,
			minRange: 80,
			maxRange: 720,
			aggression: 0.72,
			farmBias: 0.35,
			ramBias: 0.55,
			strafeBias: 1.1,
			retreatHP: 0.3,
			chaseWindow: 0.68,
		},
	};

	function statLabel(k: (typeof STAT_KEYS)[number]) {
		switch (k) {
			case "regen":
				return "Regen";
			case "maxHP":
				return "Max HP";
			case "bodyDmg":
				return "Body Dmg";
			case "bulletSpd":
				return "Bullet Speed";
			case "penetration":
				return "Penetration";
			case "bulletDmg":
				return "Bullet Damage";
			case "reload":
				return "Reload";
			case "moveSpd":
				return "Move Speed";
		}
	}

	function statPanelLabel(k: TankStatKey) {
		switch (k) {
			case "regen":
				return "Health Regen";
			case "maxHP":
				return "Max Health";
			case "bodyDmg":
				return "Body Damage";
			case "bulletSpd":
				return "Bullet Speed";
			case "penetration":
				return "Bullet Penetration";
			case "bulletDmg":
				return "Bullet Damage";
			case "reload":
				return "Reload";
			case "moveSpd":
				return "Movement Speed";
		}
	}

	const FULL_STAT_PANEL_KEYS = STAT_KEYS as readonly TankStatKey[];
	const MELEE_STAT_PANEL_KEYS = MELEE_STAT_KEYS as readonly TankStatKey[];
	const FULL_STAT_PANEL_NAMES = FULL_STAT_PANEL_KEYS.map((key) =>
		statPanelLabel(key),
	);
	const MELEE_STAT_PANEL_NAMES = MELEE_STAT_PANEL_KEYS.map((key) =>
		statPanelLabel(key),
	);
	const STAT_PANEL_SHORTCUTS = ["1", "2", "3", "4", "5", "6", "7", "8"] as const;

	function isMeleeTankClass(id: TankClassId) {
		return !!getTankClassDef(id).meleeOnly;
	}

	function availableStatKeysForTank(t: TankEntity) {
		return isMeleeTankClass(t.tankClass || "basic")
			? MELEE_STAT_PANEL_KEYS
			: FULL_STAT_PANEL_KEYS;
	}

	function statPanelNamesForTank(t: TankEntity) {
		return isMeleeTankClass(t.tankClass || "basic")
			? MELEE_STAT_PANEL_NAMES
			: FULL_STAT_PANEL_NAMES;
	}

	function maxStatLevelForTank(t: TankEntity, key: TankStatKey) {
		if (!isMeleeTankClass(t.tankClass || "basic")) return DEFAULT_STAT_CAP;
		return (MELEE_STAT_KEYS as readonly TankStatKey[]).includes(key)
			? MELEE_STAT_CAP
			: 0;
	}

	function applyTankClassStatRules(t: TankEntity) {
		let refunded = 0;
		for (let i = 0; i < STAT_KEYS.length; i++) {
			const key = STAT_KEYS[i];
			const cap = maxStatLevelForTank(t, key);
			const current = t.stats[key] | 0;
			if (current <= cap) continue;
			refunded += current - cap;
			t.stats[key] = cap;
		}
		if (refunded > 0) t.statPoints = (t.statPoints | 0) + refunded;
		return refunded;
	}

	function basicDeferredUpgradeChoices() {
		return [...(TANK_UPGRADE_TREE.basic?.[15] || []), "fracas"] as TankClassId[];
	}

	function hasDeferredBasicUpgradeChoices(t: TankEntity) {
		return (
			(t.tankClass || "basic") === "basic" &&
			!t.upgradeSelections[15] &&
			(t.level | 0) >= 30
		);
	}

	function statCurveValue(values: number[], level: number) {
		const idx = Math.max(0, level | 0);
		if (idx < values.length) return values[idx];
		if (values.length <= 1) return values[values.length - 1] || 0;
		const step = values[values.length - 1] - values[values.length - 2];
		return values[values.length - 1] + step * (idx - values.length + 1);
	}

	function bulletPvpDamageMul(stats: TankStats) {
		return (
			1 +
			(stats.bulletDmg || 0) * BULLET_PVP_DAMAGE_FROM_DMG +
			(stats.penetration || 0) * BULLET_PVP_DAMAGE_FROM_PEN
		);
	}

	function bulletPvpHpMul(stats: TankStats) {
		return (
			1 +
			(stats.penetration || 0) * BULLET_PVP_HP_FROM_PEN +
			(stats.bulletDmg || 0) * BULLET_PVP_HP_FROM_DMG
		);
	}

	function spendStatByIndex(d: number) {
		const idx = d - 1;
		if (!player || player.isDead) return;
		const key = availableStatKeysForTank(player)[idx];
		if (!key) return;
		if (player.statPoints <= 0) {
			pushEventMessage("No stat points", 1.0, "stats:spend");
			return;
		}
		const cap = maxStatLevelForTank(player, key);
		if (player.stats[key] >= cap) {
			pushEventMessage(`${statLabel(key)} is maxed`, 1.0, "stats:spend");
			return;
		}
		player.stats[key]++;
		player.statPoints--;
		pushEventMessage(
			`+1 ${statLabel(key)} (${player.stats[key]}/${cap})`,
			1.0,
			"stats:spend",
		);
	}

	function derived(p: TankEntity) {
		const stats = p.stats;
		const tankClass = p.tankClass || "basic";
		const cached = p._derivedCache;
		if (
			cached &&
			p._derivedLevel === p.level &&
			p._derivedClass === tankClass &&
			p._derivedRegen === (stats.regen | 0) &&
			p._derivedMaxHP === (stats.maxHP | 0) &&
			p._derivedBodyDmg === (stats.bodyDmg | 0) &&
			p._derivedBulletSpd === (stats.bulletSpd | 0) &&
			p._derivedPenetration === (stats.penetration | 0) &&
			p._derivedBulletDmg === (stats.bulletDmg | 0) &&
			p._derivedReload === (stats.reload | 0) &&
			p._derivedMoveSpd === (stats.moveSpd | 0)
		) {
			return cached;
		}
		const classStats = getTankClassDef(tankClass).stats || {};
		const baseHP = 50 + 2 * (p.level - 1);
		const maxHP = baseHP + statCurveValue(MAX_HP_BONUS, stats.maxHP);
		const regenRate = statCurveValue(REGEN_RATE, stats.regen);

		const levelSlow = moveLevelFactor(p.level);
		const moveSpeedMul = classStats.moveSpeedMul || 1;
		const maxSpeed = (420 + stats.moveSpd * 40) * levelSlow * moveSpeedMul;
		const accel = (900 + stats.moveSpd * 100) * levelSlow * moveSpeedMul;

		const reload =
			statCurveValue(RELOAD_SEC, stats.reload) * (classStats.reloadMul || 1);

		const bulletSpeed =
			(BULLET_SPEED_BASE + stats.bulletSpd * BULLET_SPEED_STEP) *
			(classStats.bulletSpeedMul || 1);

		const bulletDamage =
			statCurveValue(BULLET_DMG, stats.bulletDmg) *
			(classStats.bulletDamageMul || 1);
		const bulletHP =
			statCurveValue(BULLET_HP, stats.penetration) *
			(classStats.bulletHPMul || 1);

		const bodyHitShape =
			statCurveValue(BODY_HIT_SHAPE, stats.bodyDmg) +
			(classStats.bodyHitBonus || 0);

		const next = {
			maxHP,
			regenRate,
			accel,
			maxSpeed,
			reload,
			bulletSpeed,
			bulletDamage,
			bulletHP,
			bodyHitShape,
			recoilMul: classStats.recoilMul || 1,
		};
		p._derivedCache = next;
		p._derivedLevel = p.level;
		p._derivedClass = tankClass;
		p._derivedRegen = stats.regen | 0;
		p._derivedMaxHP = stats.maxHP | 0;
		p._derivedBodyDmg = stats.bodyDmg | 0;
		p._derivedBulletSpd = stats.bulletSpd | 0;
		p._derivedPenetration = stats.penetration | 0;
		p._derivedBulletDmg = stats.bulletDmg | 0;
		p._derivedReload = stats.reload | 0;
		p._derivedMoveSpd = stats.moveSpd | 0;
		return next;
	}

	function handleInput() {
		if (player.isDead) {
			input.ix = 0;
			input.iy = 0;
			input.firing = false;
			return;
		}

		refreshPendingUpgrade(player);

		if (justPressed(70)) {
			toggleCanvasFullscreen();
		}

		if (justPressed(69)) {
			autoShoot = !autoShoot;
			blockShootUntilRelease = false;
			handlePlayerAutoShootToggle();
			if (autoShoot) {
				input.firing = true;
				player.reloadTimer = 0;
				player.invincible = false;
			} else {
				input.firing = mouseIsPressed;
			}
			pushEventMessage(`Auto-shoot ${autoShoot ? "ON" : "OFF"}`, 1.1, "toggle:auto-shoot");
		}

		if (justPressed(67)) {
			autoSpin = !autoSpin;
			if (autoSpin) player.invincible = false;
			pushEventMessage(`Auto-rotate ${autoSpin ? "ON" : "OFF"}`, 1.1, "toggle:auto-rotate");
		}

		const pendingUpgradeLevel = player.pendingUpgradeLevel;
		const pendingChoices = pendingUpgradeLevel
			? upgradeChoicesForLevel(player, pendingUpgradeLevel)
			: [];

		if (pendingChoices.length > 0) {
			for (let i = 0; i < Math.min(UPGRADE_DIGITS.length, pendingChoices.length); i++) {
				if (justPressed(UPGRADE_DIGITS[i])) {
					selectTankUpgrade(player, pendingChoices[i], true);
					break;
				}
			}
		}
		const statKeys = availableStatKeysForTank(player);
		for (let i = 0; i < statKeys.length; i++) {
			if (justPressed(DIGITS_1_8[i])) {
				spendStatByIndex(i + 1);
			}
		}

		let ix = 0,
			iy = 0;
		if (KD(65) || KD(LEFT_ARROW)) ix -= 1;
		if (KD(68) || KD(RIGHT_ARROW)) ix += 1;
		if (KD(87) || KD(UP_ARROW)) iy -= 1;
		if (KD(83) || KD(DOWN_ARROW)) iy += 1;

		const len = Math.hypot(ix, iy);
		if (len > 0) {
			ix /= len;
			iy /= len;
		}

		const mouseFire = mouseIsPressed && !blockShootUntilRelease;
		input.ix = ix;
		input.iy = iy;
		input.firing = mouseFire || autoShoot;

		if (player.invincible && (len > 0 || input.firing))
			player.invincible = false;
	}

	function angleDiffAbs(a: number, b: number) {
		return Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
	}

	function tankRenderBarrels(t: TankEntity): TankBarrelLayout[] {
		return getTankClassDef(t.tankClass || "basic").renderBarrels;
	}

	function tankAimBarrels(t: TankEntity): TankShotBarrel[] {
		const def = getTankClassDef(t.tankClass || "basic");
		return (def.aimBarrels || def.renderBarrels) as TankShotBarrel[];
	}

	function tankVolleyBarrels(t: TankEntity): TankShotBarrel[] {
		const specs = tankAimBarrels(t);
		if ((t.tankClass || "basic") === "double") {
			if (t.doubleSyncShots) return specs.slice(0, 2);
			const idx = Math.abs(t.shotCycle | 0) % Math.max(1, specs.length);
			t.shotCycle = (t.shotCycle | 0) + 1;
			return [specs[idx]];
		}
		return specs;
	}

	function drawTankBodyShape(
		shape: TankBodyShape,
		r: number,
		fillCol: number[],
		borderCol: number[],
		scaleMul = 1,
	) {
		const rr = r * scaleMul;
		noStroke();
		fill(...fillCol);
		if (shape === "square") {
			rectMode(CENTER);
			rect(0, 0, rr * 2, rr * 2, rr * 0.12);
			noFill();
			stroke(...borderCol);
			strokeWeight(4);
			rect(0, 0, rr * 2 - 3, rr * 2 - 3, rr * 0.12);
			return;
		}
		circle(0, 0, rr * 2);
		noFill();
		stroke(...borderCol);
		strokeWeight(4);
		circle(0, 0, rr * 2 - 3);
	}

	function drawTankBarrels(
		t: TankEntity,
		ang: number,
		barrelFill: number[],
		kickMul = 1,
	) {
		const barrels = tankRenderBarrels(t);
		for (let i = 0; i < barrels.length; i++) {
			const spec = barrels[i];
			const inner = t.r * (spec.baseOffsetMul ?? 0.12);
			const len = t.r * (spec.lengthMul || 1.7);
			const width = t.r * (spec.widthMul || 0.74);
			const mx = t.r * (spec.mountX || 0);
			const my = t.r * (spec.mountY || 0);
			push();
			rotate(ang);
			translate(mx, my);
			rotate(spec.angle || 0);
			stroke(...COLORS.playerBarrelBorder);
			strokeWeight(4);
			fill(...barrelFill);
			const retreat =
				spec.weaponKind === "spawner"
					? 0
					: Math.min((t.barrelKick || 0) * (t.r * 0.28) * kickMul, inner);
			const cx = inner + len * 0.5 - retreat;
			if (spec.weaponKind === "spawner") {
				beginShape();
				vertex(inner, -width * 0.28);
				vertex(inner, width * 0.28);
				vertex(inner + len, width * 0.46);
				vertex(inner + len, -width * 0.46);
				endShape(CLOSE);
			} else {
				rectMode(CENTER);
				rect(cx, 0, len, width, 2);
			}
			pop();
		}
	}

	function tankAimDelta(t: TankEntity, targetAngle: number) {
		const baseAng = t.barrelAng || 0;
		const specs = tankAimBarrels(t);
		if (!specs.length) return 0;
		let best = Infinity;
		for (let i = 0; i < specs.length; i++) {
			best = Math.min(best, angleDiffAbs(baseAng + (specs[i].angle || 0), targetAngle));
		}
		return best;
	}

	function spawnBulletFromTankBarrel(
		t: TankEntity,
		d: ReturnType<typeof derived>,
		spec: TankShotBarrel,
		baseAng: number,
		spread: number,
	) {
		const len = t.r * (spec.lengthMul || 1.7);
		const width = t.r * (spec.widthMul || 0.74);
		const bR = width / 2;
		const inner = t.r * 0.12;
		const muzzleOffset = inner + len - bR;
		const mountX = t.r * (spec.mountX || 0);
		const mountY = t.r * (spec.mountY || 0);
		const baseCos = Math.cos(baseAng);
		const baseSin = Math.sin(baseAng);
		const ox = mountX * baseCos - mountY * baseSin;
		const oy = mountX * baseSin + mountY * baseCos;
		const fireAng = baseAng + (spec.angle || 0) + spread;
		const vx = Math.cos(fireAng) * d.bulletSpeed * (spec.speedMul || 1);
		const vy = Math.sin(fireAng) * d.bulletSpeed * (spec.speedMul || 1);
		let bx = t.x + ox + Math.cos(fireAng) * muzzleOffset;
		let by = t.y + oy + Math.sin(fireAng) * muzzleOffset;

		{
			const idx = neighborIndices(bx, by);
			for (let n = 0; n < idx.length; n++) {
				const si = idx[n] | 0;
				if ((S_dead[si] | S_dying[si]) !== 0) continue;
				const sx = S_x[si],
					sy = S_y[si],
					sr = S_r[si] + bR;
				const dx = bx - sx,
					dy = by - sy;
				const d2 = dx * dx + dy * dy;
				if (d2 < sr * sr) {
					const dd = Math.sqrt(d2) || 1;
					const ux = dx / dd,
						uy = dy / dd;
					bx = sx + ux * (sr + 0.01);
					by = sy + uy * (sr + 0.01);
				}
			}
		}

		const life =
			(BULLET_LIFE_BASE + (t.stats.bulletSpd || 0) * BULLET_LIFE_PER_SPEED) *
			(spec.lifeMul || 1);
		const pvpDmgMul = bulletPvpDamageMul(t.stats);
		const pvpHpMul = bulletPvpHpMul(t.stats);
		const b = bulletPool.acquire(() => ({ _bi: -1 }));
		const bi = allocBulletIndex();
		b._bi = bi;
		b.x = bx;
		b.y = by;
		b.vx = vx;
		b.vy = vy;
		b.life = life;
		b.hp = d.bulletHP * (spec.hpMul || 1);
		b.dmg = d.bulletDamage * (spec.damageMul || 1);
		b.r = bR;
		b.dying = false;
		b.deathTimer = 0;
		b.dead = false;
		b.fromTeamIdx = t.teamIdx;
		bullets.push(b);

		B_x[bi] = bx;
		B_y[bi] = by;
		B_vx[bi] = vx;
		B_vy[bi] = vy;
		B_life[bi] = life;
		B_hp[bi] = d.bulletHP * (spec.hpMul || 1);
		B_dmg[bi] = d.bulletDamage * (spec.damageMul || 1);
		B_pvpDmgMul[bi] = pvpDmgMul;
		B_pvpHpMul[bi] = pvpHpMul;
		B_r[bi] = bR;
		B_team[bi] = t.teamIdx | 0;
		B_dead[bi] = 0;
		B_dying[bi] = 0;
		B_dieT[bi] = 0;
		B_owner[bi] = t.uid | 0;

		const recoilMul = (spec.recoilMul || 1) * (d.recoilMul || 1);
		const K = 0.0085 * recoilMul;
		t.recoilX -= vx * K;
		t.recoilY -= vy * K;
	}

	function updatePlayer(dt: number) {
		if (player.isDead) {
			const hpAnimSpd = 14;
			player.hpVis +=
				(player.hp - player.hpVis) * Math.min(1, hpAnimSpd * dt);
			player.barrelKick *= Math.exp(-12 * dt);
			const [wx, wy] = mouseWorld();
			const mouseAng = Math.atan2(wy - player.y, wx - player.x);
			if (autoSpin) {
				player.barrelAng += SPIN_SPEED * dt;
				if (player.barrelAng > TAU) player.barrelAng -= TAU;
			} else {
				player.barrelAng = mouseAng;
			}
			return;
		}

		ensurePlayerHPInit();
		const d = derived(player);

		player.vx += input.ix * d.accel * dt;
		player.vy += input.iy * d.accel * dt;

		player.vx += player.recoilX;
		player.vy += player.recoilY;
		player.recoilX *= DECAY_RECOIL;
		player.recoilY *= DECAY_RECOIL;
		player.vx *= DECAY_PLAYER_DRAG;
		player.vy *= DECAY_PLAYER_DRAG;
		player.barrelKick *= DECAY_RECOIL;

		const sp = Math.hypot(player.vx, player.vy);
		if (sp > d.maxSpeed) {
			const s = d.maxSpeed / sp;
			player.vx *= s;
			player.vy *= s;
		}

		player.x = constrain(
			player.x + player.vx * dt,
			player.r,
			WORLD.w - player.r,
		);
		player.y = constrain(
			player.y + player.vy * dt,
			player.r,
			WORLD.h - player.r,
		);

		const sinceHit = now - player.lastHit;
		const wasTankHit =
			typeof player.lastDamagedBy === "string" &&
			player.lastDamagedBy.startsWith("tankuid:");
		const inTankCombat = wasTankHit && sinceHit < TANK_COMBAT_COOLDOWN;

		let regenMul = 1;
		if (sinceHit > HYPER_REGEN_AFTER) {
			regenMul = HYPER_REGEN_MULT;
		} else if (inTankCombat) {
			regenMul = 0;
		}

		if (regenMul > 0 && player.hp < d.maxHP) {
			const amt = d.maxHP * d.regenRate * regenMul * dt;
			player.hp = Math.min(player.hp + amt, d.maxHP);
		}
		if (player.hitTimer > 0) player.hitTimer -= dt;

		const hpAnimSpd = 14;
		player.hpVis +=
			(player.hp - player.hpVis) * Math.min(1, hpAnimSpd * dt);

		const [wx, wy] = mouseWorld();
		const mouseAng = Math.atan2(wy - player.y, wx - player.x);
		if (autoSpin) {
			player.barrelAng += SPIN_SPEED * dt;
			if (player.barrelAng > TAU) player.barrelAng -= TAU;
		} else {
			player.barrelAng = mouseAng;
		}

		const idx = neighborIndices(player.x, player.y);
		const maxContacts = Math.min(idx.length, 24);
		for (let n = 0; n < maxContacts; n++) {
			const sh = shapes[idx[n]];
			if (!sh || sh.dead || sh.dying) continue;

			const dx = sh.x - player.x,
				dy = sh.y - player.y;
			const rsum = player.r + sh.r;
			const d2 = dx * dx + dy * dy;
			if (d2 <= 0 || d2 >= rsum * rsum) continue;

			const friendlySupport =
				(sh.ai === "protector" || sh.ai === "drone") &&
				(sh.teamIdx | 0) === (player.teamIdx | 0);
			if (friendlySupport) continue;

			const dist = Math.sqrt(d2);
			const nx = dx / (dist || 1),
				ny = dy / (dist || 1);
			const overlap = rsum - dist;

			const corr = (overlap + 1.5) * 0.6;
			player.x -= nx * corr * 0.5;
			player.y -= ny * corr * 0.5;
			sh.kx += nx * corr * 0.5;
			sh.ky += ny * 0.5 * corr;

			const impulse = (overlap + 1.5) * 40;
			player.vx -= nx * impulse;
			player.vy -= ny * impulse;
			const pvs = Math.hypot(player.vx, player.vy);
			const maxPKnock = d.maxSpeed * 1.3;
			if (pvs > maxPKnock) {
				const s = maxPKnock / pvs;
				player.vx *= s;
				player.vy *= s;
			}

			const mass = sh.type === "hex" ? 0.2 : 1.0;
			sh.kvx += nx * impulse * mass;
			sh.kvy += ny * impulse * mass;
			const kvs = Math.hypot(sh.kvx, sh.kvy);
			if (kvs > MAX_SHAPE_KNOCKBACK_V) {
				const s = MAX_SHAPE_KNOCKBACK_V / kvs;
				sh.kvx *= s;
				sh.kvy *= s;
			}

			if (isSupportShape(sh)) {
				applySupportShapeTankImpact(sh, player);
				continue;
			}

			const key = PLAYER_PAIR_BASE + idx[n];

			if (canPair(key)) {
				if (!sh.invincible && !(sh.spawnGrace && sh.spawnGrace > 0)) {
					sh.hp -= d.bodyHitShape;
					sh.lastHit = now;
					sh.hitTimer = 0.04;
					sh.hitTimer2 = 0.08;
					if (sh.hp <= 0) {
						if (!tryInfectSquare(player, sh)) killShape(sh, player);
					}
				}
				if (!player.invincible) {
					player.hp -= sh.body;
					player.lastDamagedBy =
						sh.ai === "protector" && sh.teamIdx !== undefined
							? "protector:" + sh.teamIdx
							: sh.type;
					player.lastHit = now;
					player.hitTimer = 0.04;
				}
				markPair(key);
			}
		}

		while (
			player.level < LEVEL_CAP &&
			player.xp >= xpToLevel(player.level)
		) {
			player.level++;
			updateTankRadius(player);
			if (player.level <= 28) player.statPoints++;
			else if (player.level === 30) player.statPoints++;
			else if (player.level > 30 && (player.level - 30) % 3 === 0)
				player.statPoints++;
			player.hp = Math.min(player.hp + 10, derived(player).maxHP);
		}
		refreshPendingUpgrade(player);

		if (player.hp <= 0 && !player.isDead)
			onPlayerDeath(player.lastDamagedBy);
	}

	function rvoAdjust(
		sh: any,
		desx: number,
		desy: number,
		opts: {
			enemyDroneWeight?: number;
			enemyProtectorWeight?: number;
		} = {},
	) {
		if (sh.ai === "protector") {
			const eps = 120;
			const len = Math.hypot(desx, desy) || 1;
			_rvoTmp[0] = desx + (desx / len) * eps;
			_rvoTmp[1] = desy + (desy / len) * eps;
			return _rvoTmp;
		}
		let ax = 0,
			ay = 0;
		const vx = desx,
			vy = desy;
		const idx = neighborIndices(sh.x, sh.y);
		for (let n = 0; n < idx.length; n++) {
			const j = idx[n];
			const o = shapes[j];
			if (!o || o === sh || o.dead || o.dying) continue;
			if (!(o.ai === "seek" || o.ai === "protector" || o.ai === "drone" || o.isCrasher))
				continue;
			const dx = o.x - sh.x,
				dy = o.y - sh.y;
			const dist = Math.hypot(dx, dy);
			const same = sh.teamIdx !== undefined && sh.teamIdx === o.teamIdx;
			let weight = 1;
			if (!same && o.ai === "drone") {
				weight = opts.enemyDroneWeight ?? 1;
			} else if (!same && o.ai === "protector") {
				weight = opts.enemyProtectorWeight ?? 1;
			}
			if (weight <= 0.001) continue;
			const rad = sh.r + o.r + (same ? 20 : 40);
			if (dist > rad) continue;
			const rvx = (o.vx || 0) - (sh.vx || 0);
			const rvy = (o.vy || 0) - (sh.vy || 0);
			if (dx * rvx + dy * rvy >= 0) continue;
			const side =
				Math.sign(vx * dy - vy * dx) || (Math.random() < 0.5 ? 1 : -1);
			const mag = ((rad - dist) / rad) * weight;
			ax += -vy * 1200 * mag * side;
			ay += vx * 1200 * mag * side;
		}
		_rvoTmp[0] = desx + ax;
		_rvoTmp[1] = desy + ay;
		return _rvoTmp;
	}

	function handleShooting(dt: number) {
		if (player.isDead) return;
		if (player.invincible && input.firing) player.invincible = false;
		player._fireCmd = input.firing;
		fireFromTank(player, dt);
	}

	function handleTankTankCollisions() {
		for (let i = 0; i < tanks.length; i++) {
			const a = tanks[i];
			if (!a || a.isDead) continue;
			const reach = (a.r || 0) + MAX_TANK_RADIUS;
			_tankBroadphaseBuf.length = 0;
			forEachTankNearAABB(
				a.x - reach,
				a.y - reach,
				a.x + reach,
				a.y + reach,
				(_candidate, j) => {
					if (j > i) _tankBroadphaseBuf.push(j);
				},
			);
			for (let n = 0; n < _tankBroadphaseBuf.length; n++) {
				const j = _tankBroadphaseBuf[n] | 0;
				const b = tanks[j];
				if (!b || b.isDead) continue;
				const dx = b.x - a.x,
					dy = b.y - a.y;
				const rs = (a.r || 0) + (b.r || 0);
				const d2 = dx * dx + dy * dy;
				if (d2 <= 0 || d2 >= rs * rs) continue;
				const d = Math.sqrt(d2) || 1,
					nx = dx / d,
					ny = dy / d;
				const overlap = rs - d;
				const push = (overlap + 1.5) * 0.55;
				a.x -= nx * push * 0.5;
				a.y -= ny * push * 0.5;
				b.x += nx * push * 0.5;
				b.y += ny * push * 0.5;
				maybeUpdateTankGridEntry(i);
				maybeUpdateTankGridEntry(j);
				const imp = (overlap + 1.5) * 36;
				a.vx -= nx * imp;
				a.vy -= ny * imp;
				b.vx += nx * imp;
				b.vy += ny * imp;
				if ((a.teamIdx | 0) !== (b.teamIdx | 0)) {
					const da = derived(a).bodyHitShape,
						db = derived(b).bodyHitShape;
					if (!a.invincible) {
						a.hp -= db;
						a.lastDamagedBy = "tankuid:" + (b.uid | 0);
						a.lastHit = now;
						a.hitTimer = 0.04;
					}
					if (!b.invincible) {
						b.hp -= da;
						b.lastDamagedBy = "tankuid:" + (a.uid | 0);
						b.lastHit = now;
						b.hitTimer = 0.04;
					}
				}
			}
		}
	}

	function collideTankWithShapes(t: any, d: ReturnType<typeof derived>) {
		if (!t || t.isDead) return;
		const idx = neighborIndices(t.x, t.y);
		const maxContacts = Math.min(idx.length, 24);

		for (let n = 0; n < maxContacts; n++) {
			const si = idx[n] | 0;
			if ((S_dead[si] | S_dying[si]) !== 0) continue;

			const sh = shapes[si];
			if (!sh || sh.dead || sh.dying) continue;

			const friendlySupport =
				(sh.ai === "protector" || sh.ai === "drone") &&
				(sh.teamIdx | 0) === (t.teamIdx | 0);
			if (friendlySupport) continue;

			const dx = sh.x - t.x,
				dy = sh.y - t.y;
			const rsum = (t.r || 0) + (sh.r || 0);
			const d2 = dx * dx + dy * dy;
			if (d2 <= 0 || d2 >= rsum * rsum) continue;

			const dist = Math.sqrt(d2) || 1;
			const nx = dx / dist,
				ny = dy / dist;
			const overlap = rsum - dist;

			const corr = (overlap + 1.5) * 0.6;
			t.x -= nx * corr * 0.5;
			t.y -= ny * corr * 0.5;
			sh.kx += nx * corr * 0.5;
			sh.ky += ny * 0.5 * corr;

			const impulse = (overlap + 1.5) * 40;
			t.vx = (t.vx || 0) - nx * impulse;
			t.vy = (t.vy || 0) - ny * impulse;

			const mass = sh.type === "hex" ? 0.2 : 1.0;
			sh.kvx = (sh.kvx || 0) + nx * impulse * mass;
			sh.kvy = (sh.kvy || 0) + ny * impulse * mass;

			const kvs = Math.hypot(sh.kvx, sh.kvy);
			if (kvs > MAX_SHAPE_KNOCKBACK_V) {
				const s = MAX_SHAPE_KNOCKBACK_V / kvs;
				sh.kvx *= s;
				sh.kvy *= s;
			}

			if (isSupportShape(sh)) {
				applySupportShapeTankImpact(sh, t);
				continue;
			}

			if (!friendlySupport) {
				const bodyHitShape = d.bodyHitShape;
				if (!sh.invincible && !(sh.spawnGrace && sh.spawnGrace > 0)) {
					sh.hp -= bodyHitShape;
					sh.lastHit = now;
					sh.hitTimer = 0.04;
					sh.hitTimer2 = 0.08;
					if (sh.hp <= 0) {
						if (!tryInfectSquare(t, sh)) killShape(sh, t);
					}
				}

				if (!t.invincible) {
					t.hp -= sh.body | 0;
					t.lastDamagedBy =
						sh.ai === "protector" && sh.teamIdx !== undefined
							? "protector:" + (sh.teamIdx | 0)
							: sh.type || "shape";
					t.lastHit = now;
					t.hitTimer = 0.04;
				}
			}
		}
	}

	function segmentCircleTOI(
		x0: number,
		y0: number,
		x1: number,
		y1: number,
		cx: number,
		cy: number,
		R: number,
	) {
		const dx = x1 - x0,
			dy = y1 - y0;
		const fx = x0 - cx,
			fy = y0 - cy;
		const a = dx * dx + dy * dy;
		const b = 2 * (fx * dx + fy * dy);
		const c = fx * fx + fy * fy - R * R;
		const disc = b * b - 4 * a * c;
		if (a === 0 || disc < 0) return null;
		const s = Math.sqrt(disc);
		const t1 = (-b - s) / (2 * a);
		if (t1 >= 0 && t1 <= 1) return t1;
		const t2 = (-b + s) / (2 * a);
		if (t2 >= 0 && t2 <= 1) return t2;
		return null;
	}

	function gridMarchSegment(
		x0: number,
		y0: number,
		x1: number,
		y1: number,
		cs: number,
		visit: (cx: number, cy: number) => void,
	) {
		let cx = (x0 / cs) | 0;
		let cy = (y0 / cs) | 0;
		const tx = x1 - x0,
			ty = y1 - y0;
		const stepX = tx > 0 ? 1 : tx < 0 ? -1 : 0;
		const stepY = ty > 0 ? 1 : ty < 0 ? -1 : 0;
		const invTx = tx !== 0 ? 1 / tx : 0;
		const invTy = ty !== 0 ? 1 / ty : 0;
		const nextBoundX = stepX > 0 ? (cx + 1) * cs : cx * cs;
		const nextBoundY = stepY > 0 ? (cy + 1) * cs : cy * cs;
		let tMaxX = stepX !== 0 ? (nextBoundX - x0) * invTx : Infinity;
		let tMaxY = stepY !== 0 ? (nextBoundY - y0) * invTy : Infinity;
		const tDeltaX = stepX !== 0 ? cs * Math.abs(invTx) : Infinity;
		const tDeltaY = stepY !== 0 ? cs * Math.abs(invTy) : Infinity;
		let t = 0;
		_curStamp++;
		let ci = cellIndexClamped(cx, cy);
		if (ci >= 0 && _cellStamp[ci] !== _curStamp) {
			_cellStamp[ci] = _curStamp;
			visit(cx, cy);
		}
		while (t <= 1) {
			if (tMaxX < tMaxY) {
				cx += stepX;
				t = tMaxX;
				tMaxX += tDeltaX;
			} else {
				cy += stepY;
				t = tMaxY;
				tMaxY += tDeltaY;
			}
			ci = cellIndexClamped(cx, cy);
			if (ci >= 0 && _cellStamp[ci] !== _curStamp) {
				_cellStamp[ci] = _curStamp;
				visit(cx, cy);
			}
			if (t > 1) break;
		}
	}

	let _gm_ox = 0,
		_gm_oy = 0,
		_gm_ex = 0,
		_gm_ey = 0,
		_gm_minSegX = 0,
		_gm_maxSegX = 0,
		_gm_minSegY = 0,
		_gm_maxSegY = 0,
		_gm_bestT = Infinity,
		_gm_bestIdx = -1,
		_gm_bi = 0;
	function _gm_visit(gx: number, gy: number) {
		for (let dx = -1; dx <= 1; dx++) {
			for (let dy = -1; dy <= 1; dy++) {
				const ci = cellIndexClamped(gx + dx, gy + dy);
				if (ci < 0) continue;
				let n = cellHead[ci];
				while (n !== -1) {
					const si = nodeShape[n];
					if (!(S_dead[si] | S_dying[si])) {
						const sx = S_x[si],
							sy = S_y[si],
							sr = S_r[si] + B_r[_gm_bi];
						if (
							sx + sr >= _gm_minSegX &&
							sx - sr <= _gm_maxSegX &&
							sy + sr >= _gm_minSegY &&
							sy - sr <= _gm_maxSegY
						) {
							if (
								!(
									shapes[si] &&
									(shapes[si].ai === "protector" || shapes[si].ai === "drone") &&
									S_team[si] === (B_team[_gm_bi] | 0)
								)
							) {
								const R = S_r[si] + B_r[_gm_bi];
								const t = segmentCircleTOI(
									_gm_ox,
									_gm_oy,
									_gm_ex,
									_gm_ey,
									sx,
									sy,
									R,
								);
								if (t !== null && t < _gm_bestT) {
									_gm_bestT = t;
									_gm_bestIdx = si;
								}
							}
						}
					}
					n = nodeNext[n];
				}
			}
		}
	}

	function updateBullets(dt: number) {
		rebuildBulletGrid();

		for (let j = 0; j < bullets.length; j++) {
			const bi = bullets[j]._bi | 0;
			if (B_dead[bi]) continue;

			if (B_dying[bi]) {
				B_dieT[bi] -= dt;
				B_x[bi] += B_vx[bi] * dt;
				B_y[bi] += B_vy[bi] * dt;
				B_vx[bi] *= DECAY_BULLET_DYING;
				B_vy[bi] *= DECAY_BULLET_DYING;
				if (B_dieT[bi] <= 0) {
					B_dead[bi] = 1;
					bulletFree.push(bi);
				}
				maybeUpdateBulletGridEntry(bi);
				continue;
			}

			B_life[bi] -= dt;
			if (B_life[bi] <= 0) {
				B_dying[bi] = 1;
				B_dieT[bi] = 0.18;
				maybeUpdateBulletGridEntry(bi);
				continue;
			}

			const x0 = B_x[bi],
				y0 = B_y[bi];
			const x1 = x0 + B_vx[bi] * dt,
				y1 = y0 + B_vy[bi] * dt;

			let ox = x0,
				oy = y0;
			const vxTot = x1 - x0,
				vyTot = y1 - y0;
			let remaining = 1.0;
			let processed = 0;

			while (remaining > 1e-6 && processed < 6 && !B_dying[bi]) {
				const ex = x0 + vxTot * remaining;
				const ey = y0 + vyTot * remaining;

				const minSegX = Math.min(ox, ex) - B_r[bi];
				const maxSegX = Math.max(ox, ex) + B_r[bi];
				const minSegY = Math.min(oy, ey) - B_r[bi];
				const maxSegY = Math.max(oy, ey) + B_r[bi];

				_gm_bi = bi;
				_gm_ox = ox;
				_gm_oy = oy;
				_gm_ex = ex;
				_gm_ey = ey;
				_gm_minSegX = minSegX;
				_gm_maxSegX = maxSegX;
				_gm_minSegY = minSegY;
				_gm_maxSegY = maxSegY;
				_gm_bestT = Infinity;
				_gm_bestIdx = -1;

				gridMarchSegment(ox, oy, ex, ey, COLL_CELL, _gm_visit);

				let bestTankT = Infinity;
				let bestTankIndex = -1;
				const bTeam = B_team[bi] | 0;
				forEachTankNearAABB(minSegX, minSegY, maxSegX, maxSegY, (tt, ti) => {
					if (!tt || tt.isDead || tt.invincible) return;
					if ((tt.teamIdx | 0) === bTeam) return;
					const R = (tt.r || 0) + B_r[bi];
					if (
						tt.x + R < minSegX ||
						tt.x - R > maxSegX ||
						tt.y + R < minSegY ||
						tt.y - R > maxSegY
					)
						return;
					const tHit = segmentCircleTOI(ox, oy, ex, ey, tt.x, tt.y, R);
					if (tHit !== null && tHit < bestTankT) {
						bestTankT = tHit;
						bestTankIndex = ti;
					}
				});

				const bestShapeT = _gm_bestT;
				const bestShapeIdx = _gm_bestIdx;

				let bestBulletT = Infinity,
					bestBulletIdx = -1;
				forEachBulletNearAABB(minSegX, minSegY, maxSegX, maxSegY, (bj) => {
					if (bj === bi) return;
					if (B_dead[bj] || B_dying[bj]) return;
					if ((B_team[bj] | 0) === (B_team[bi] | 0)) return;
					const R = B_r[bi] + B_r[bj];
					const bx = B_x[bj];
					const by = B_y[bj];
					if (
						bx + R < minSegX ||
						bx - R > maxSegX ||
						by + R < minSegY ||
						by - R > maxSegY
					)
						return;
					const tHit = segmentCircleTOI(
						ox,
						oy,
						ex,
						ey,
						bx,
						by,
						R,
					);
					if (tHit !== null && tHit < bestBulletT) {
						bestBulletT = tHit;
						bestBulletIdx = bj;
					}
				});

				let hitKind = null;
				if (
					bestBulletIdx >= 0 &&
					bestBulletT <= 1 &&
					bestBulletT <= bestShapeT &&
					bestBulletT <= bestTankT
				)
					hitKind = "bullet";
				else if (bestTankIndex >= 0 && bestTankT <= 1 && bestTankT <= bestShapeT)
					hitKind = "tank";
				else if (bestShapeIdx >= 0 && bestShapeT <= 1) hitKind = "shape";

				if (hitKind === "shape") {
					const hx = ox + (ex - ox) * bestShapeT;
					const hy = oy + (ey - oy) * bestShapeT;
					const sh = shapes[bestShapeIdx];
					const dx = hx - sh.x,
						dy = hy - sh.y;
					const dist = Math.hypot(dx, dy) || 1;
					const nx = dx / dist,
						ny = dy / dist;

					const base = S_body[bestShapeIdx] | 0;
					const isDrone = sh.ai === "drone";
					const hpMul = isDrone ? B_pvpHpMul[bi] || 1 : 1;
					const dmgMul = isDrone ? B_pvpDmgMul[bi] || 1 : 1;
					const effMul = Math.min(1, (B_hp[bi] * hpMul) / base);
					const dealt =
						B_dmg[bi] *
						dmgMul *
						effMul *
						(isDrone ? DRONE_BULLET_DAMAGE_TAKEN_MUL : 1);

					if (sh.spawnGrace && sh.spawnGrace > 0) {
						const segLen = Math.hypot(ex - ox, ey - oy) * bestShapeT;
						const f = Math.max(0, 1 - BULLET_DECEL_K * segLen);
						B_vx[bi] *= f;
						B_vy[bi] *= f;

						B_x[bi] = hx;
						B_y[bi] = hy;

						const remFrac = remaining * (1 - bestShapeT);
						remaining = remFrac;
						ox = B_x[bi] + nx * 0.8;
						oy = B_y[bi] + ny * 0.8;
						processed++;
						continue;
					}

					if (!sh.invincible) {
						sh.hp -= dealt;
						sh.lastHit = now;
						sh.hitTimer = 0.04;
						sh.hitTimer2 = 0.08;
					} else {
						if (
							sh.ai === "protector" &&
							sh.teamIdx !== (B_team[bi] ?? -1)
						) {
							sh.lastHit = now;
							sh.hitTimer = 0.04;
							sh.hitTimer2 = 0.08;
						}
					}

					B_hp[bi] -= base / hpMul;

					const mass = sh.type === "hex" ? 0.2 : 1.0;
					const impulse = 28 * mass;
					sh.kvx -= nx * impulse;
					sh.kvy -= ny * impulse;
					const kvs = Math.hypot(sh.kvx, sh.kvy);
					if (kvs > MAX_SHAPE_KNOCKBACK_V) {
						const s = MAX_SHAPE_KNOCKBACK_V / kvs;
						sh.kvx *= s;
						sh.kvy *= s;
					}

					if (!sh.invincible && sh.hp <= 0) {
						const ownerUid = B_owner[bi] | 0;
						const ownerTank = ownerUid ? getTankByUid(ownerUid) : null;
						killShape(sh, ownerTank);
					}

					const segLen = Math.hypot(ex - ox, ey - oy) * bestShapeT;
					const f = Math.max(0, 1 - BULLET_DECEL_K * segLen);
					B_vx[bi] *= f;
					B_vy[bi] *= f;

					B_x[bi] = hx;
					B_y[bi] = hy;

					if (B_hp[bi] <= 0) {
						B_dying[bi] = 1;
						B_dieT[bi] = 0.18;
						break;
					}

					const remFrac = remaining * (1 - bestShapeT);
					remaining = remFrac;
					ox = B_x[bi] + nx * 0.8;
					oy = B_y[bi] + ny * 0.8;

					processed++;
				} else if (hitKind === "tank" && bestTankIndex >= 0) {
					const hx = ox + (ex - ox) * bestTankT;
					const hy = oy + (ey - oy) * bestTankT;
					const tt = tanks[bestTankIndex] as TankEntity;
					const dx = hx - tt.x,
						dy = hy - tt.y;
					const dist = Math.hypot(dx, dy) || 1;
					const nx = dx / dist,
						ny = dy / dist;

					{
						const owner = getTankByUid(B_owner[bi] | 0);
						if (tt.invincible) tt.invincible = false;

						tt.hp -=
							B_dmg[bi] *
							(B_pvpDmgMul[bi] || 1) *
							BULLET_TANK_DAMAGE_MUL;
						tt.lastDamagedBy = owner
							? "tankuid:" + (owner.uid | 0)
							: "bullet";
						tt.lastHit = now;
						tt.hitTimer = 0.04;

						const kvImp = 26;
						tt.vx = (tt.vx || 0) - nx * kvImp;
						tt.vy = (tt.vy || 0) - ny * kvImp;
					}

					B_x[bi] = hx;
					B_y[bi] = hy;
					B_hp[bi] = 0;
					B_dying[bi] = 1;
					B_dieT[bi] = 0.18;

					const remFrac = remaining * (1 - bestTankT);
					remaining = remFrac;
					ox = B_x[bi];
					oy = B_y[bi];
					processed++;
				} else if (hitKind === "bullet") {
					const hx = ox + (ex - ox) * bestBulletT;
					const hy = oy + (ey - oy) * bestBulletT;
					const bj = bestBulletIdx | 0;

					if (canPairBullet(bi, bj)) {
						const hpA = B_hp[bi],
							hpB = B_hp[bj];
						const hpMulA = B_pvpHpMul[bi] || 1;
						const hpMulB = B_pvpHpMul[bj] || 1;
						const effHpA = hpA * hpMulA;
						const effHpB = hpB * hpMulB;

						B_x[bi] = hx;
						B_y[bi] = hy;
						const segLen = Math.hypot(ex - ox, ey - oy) * bestBulletT;
						const f = Math.max(0, 1 - BULLET_DECEL_K * segLen);
						B_vx[bi] *= f;
						B_vy[bi] *= f;

						B_hp[bi] = hpA - effHpB / hpMulA;
						B_hp[bj] = hpB - effHpA / hpMulB;

						if (B_hp[bi] <= 0) {
							B_dying[bi] = 1;
							B_dieT[bi] = 0.18;
						}
						if (B_hp[bj] <= 0) {
							B_dying[bj] = 1;
							B_dieT[bj] = 0.18;
							maybeUpdateBulletGridEntry(bj);
						}

						markPairBullet(bi, bj);
					}

					const remFrac = remaining * (1 - bestBulletT);
					remaining = remFrac;
					ox = B_x[bi];
					oy = B_y[bi];
					processed++;
				} else {
					const segLen = Math.hypot(ex - ox, ey - oy);
					const f = Math.max(0, 1 - BULLET_DECEL_K * segLen);
					B_vx[bi] *= f;
					B_vy[bi] *= f;
					B_x[bi] = ex;
					B_y[bi] = ey;
					remaining = 0;
				}
			}

			if (
				B_x[bi] < 0 ||
				B_y[bi] < 0 ||
				B_x[bi] > WORLD.w ||
				B_y[bi] > WORLD.h
			) {
				B_dying[bi] = 1;
				B_dieT[bi] = 0.18;
			}
			maybeUpdateBulletGridEntry(bi);
		}

		let n = 0;
		for (let j = 0; j < bullets.length; j++) {
			const bi = bullets[j]._bi | 0;
			if (!B_dead[bi]) {
				bullets[n++] = bullets[j];
			} else {
				bulletPool.release(bullets[j]);
			}
		}
		bullets.length = n;
	}

	function addShape(
		kind: keyof typeof SHAPES_DEF,
		x: number,
		y: number,
		opts: ShapeOptions = {},
	) {
		const def = SHAPES_DEF[kind];
		const sides =
			kind === "tri"
				? 3
				: kind === "sqr"
					? 4
					: kind === "pent"
						? 5
						: kind === "hex"
							? 6
							: 4;
		const sh: ShapeEntity = {
			id: nextShapeId++,
			type: kind,
			sides,
			active: 0,
			col: (opts.col || def.color).slice(),
			colBorder: [
				Math.max(0, Math.floor((opts.col || def.color)[0] * 0.72)),
				Math.max(0, Math.floor((opts.col || def.color)[1] * 0.72)),
				Math.max(0, Math.floor((opts.col || def.color)[2] * 0.72)),
			],
			colInner: lighten(opts.col || def.color, 0.12),
			r: opts.r || def.r,
			cx: x,
			cy: y,
			theta: random(TAU),
			orbitSpd: def.orbitSpd,
			orbitR: def.orbitR,
			rot: random(TAU),
			rotSpd: def.rotSpd,
			kx: 0,
			ky: 0,
			kvx: 0,
			kvy: 0,
			hp: def.hp,
			maxHp: def.hp,
			body: def.body,
			xp: def.xp,
			lastHit: -1e9,
			hitTimer: 0,
			hitTimer2: 0,
			dying: false,
			deathTimer: 0,
			dead: false,
			hpVis: def.hp,
			x,
			y,
		};
		if (!opts || !opts.forceNoShiny) {
			if (
				(kind === "sqr" || kind === "tri" || kind === "pent") &&
				Math.random() < SHINY_CHANCE
			) {
				sh.shiny = true;
				sh.col = COLORS.shapeShiny.slice();
				sh.colBorder = [
					Math.max(0, Math.floor(sh.col[0] * 0.72)),
					Math.max(0, Math.floor(sh.col[1] * 0.72)),
					Math.max(0, Math.floor(sh.col[2] * 0.72)),
				];
				sh.colInner = lighten(sh.col, 0.12);
				sh.hp *= SHINY_XP_HP_MULT;
				sh.maxHp *= SHINY_XP_HP_MULT;
				sh.xp *= SHINY_XP_HP_MULT;
			}
		}
		if (opts.spawnBucket) sh.spawnBucket = opts.spawnBucket;
		if (opts.invincible) sh.invincible = true;
		if (opts.ai) {
			sh.ai = opts.ai;
			sh.seekSpd = opts.seekSpd || 200;
			sh.vx = 0;
			sh.vy = 0;
			sh.aiAccel = opts.aiAccel || 1400;
			sh.friction = 6.0;
			sh.state = "idle";
			sh.stateTimer = 0;
			sh.orbitSpd = 0;
			sh.orbitR = 0;
			sh.theta = 0;
			sh.frFactor = Math.exp(-(sh.friction || 6.0) * FIXED_H);
			sh.aiKSeek =
				1 -
				Math.exp(
					(-(sh.aiAccel || 1400) * FIXED_H) / (sh.seekSpd || 200 || 1),
				);
			if (sh.ai === "protector") {
				if (
					opts.baseCenter &&
					opts.homeTheta !== undefined &&
					opts.homeR !== undefined
				) {
					const bc = opts.baseCenter;
					sh.homeX = bc.x + Math.cos(opts.homeTheta) * opts.homeR;
					sh.homeY = bc.y + Math.sin(opts.homeTheta) * opts.homeR;
				}
				const a = sh.aiAccel || 1800;
				sh.aiK1000 = 1 - Math.exp((-a * FIXED_H) / 1000);
				sh.aiK520 = 1 - Math.exp((-a * FIXED_H) / 520);
				sh.aiK320 = 1 - Math.exp((-a * FIXED_H) / 320);
				sh.aiK1 = 1 - Math.exp((-a * FIXED_H) / 1);
			}
		} else {
			sh.wobbleA = def.orbitSpd * random(0.2, 0.9);
			sh.wobbleF = random(0.4, 1.2);
			sh.phase = random(TAU);
			sh.orbitSpd =
				def.orbitSpd * random(0.8, 1.4) * (random() < 0.5 ? -1 : 1);
			sh.jamp = 22;
			sh.jfx = random(0.6, 1.0);
			sh.jfy = random(0.6, 1.0);
			sh.jphx = random(TAU);
			sh.jphy = random(TAU);
		}
		if (opts.teamIdx !== undefined) sh.teamIdx = opts.teamIdx;
		if (opts.baseCenter) sh.baseCenter = opts.baseCenter;
		if (opts.homeTheta !== undefined) sh.homeTheta = opts.homeTheta;
		if (opts.homeR !== undefined) sh.homeR = opts.homeR;
		if (opts.limitR !== undefined) sh.limitR = opts.limitR;
		if (opts.idleOmega !== undefined) sh.idleOmega = opts.idleOmega;
		if (opts.isCrasher) sh.isCrasher = true;
		sh.x = sh.cx + Math.cos(sh.theta) * sh.orbitR;
		sh.y = sh.cy + Math.sin(sh.theta) * sh.orbitR;
		const reg = regionFor(x, y);
		sh.spawnRegion = reg;
		if (
			shouldCount(kind, reg) &&
			!(opts && opts.invincible) &&
			!(opts && opts.ai)
		) {
			if (reg === "outer") liveCounts.outer[kind]++;
			else if (reg === "ring") liveCounts.ring[kind]++;
			else if (reg === "core" && kind === "pent") liveCounts.core.pent++;
		}
		const idx = allocShapeIndex();
		shapes[idx] = sh;
		S_x[idx] = sh.x;
		S_y[idx] = sh.y;
		S_vx[idx] = sh.vx || 0;
		S_vy[idx] = sh.vy || 0;
		S_r[idx] = sh.r;
		S_hp[idx] = sh.hp;
		S_hpVis[idx] = sh.hpVis;
		S_dead[idx] = 0;
		S_dying[idx] = 0;
		S_body[idx] = sh.body | 0;
		S_team[idx] = (sh.teamIdx ?? -1) | 0;
		S_type[idx] = shapeTypeCode(kind);
		S_visStamp[idx] = 0;

		{
			const cr = worldCellRange(sh.x, sh.y, sh.r || 0);
			gridInsertRange(idx, cr[0], cr[1], cr[2], cr[3]);
		}

		sh.spawnAt = now || 0;
		sh.spawnGrace = 0.35;
		sh.hp = Math.max(1, sh.hp | 0);
		sh.maxHp = Math.max(sh.hp, sh.maxHp | 0);
		S_hp[idx] = sh.hp;
		S_hpVis[idx] = sh.hp;
		if (DEBUG) debugShapes.logSpawn(sh);
		return sh;
	}

	function spawnTankAtTeamBase(t: TankEntity) {
		const r = getTeamBaseRect(t.teamIdx);
		const m = t.r + 40;
		t.x = random(r.x + m, r.x + r.w - m);
		t.y = random(r.y + m, r.y + r.h - m);
		const d = derived(t);
		t.hp = d.maxHP;
		t.hpVis = t.hp;
		t._hpInit = true;
		t.isDead = false;
		t.lifeStartTime = now;
		t.lastDamagedBy = null;
		t.deathInfo = null;
		t.lifeKills = 0;
		t.invincible = true;
		t.vx = 0;
		t.vy = 0;
		t.reloadTimer = 0;
		t.recoilX = 0;
		t.recoilY = 0;
		t.barrelKick = 0;
		t._fireCmd = false;
		t._targetInfo = null;
		refreshPendingUpgrade(t);
	}

	function makeBot(teamIdx: number) {
		const t = makePlayer();
		t.uid = nextTankId++;
		t.isBot = true;
		t.teamIdx = teamIdx | 0;
		t.name = takeNextBotName();
		t.ai = createBotAIState(t);
		spawnTankAtTeamBase(t);
		return t;
	}

	const shapeClaims = new Map<number, number>();
	function releaseClaim(bot: any, id?: number) {
		if (id != null) shapeClaims.delete(id);
		else if (bot?.ai?.focusShapeId) shapeClaims.delete(bot.ai.focusShapeId);
	}
	function claimTarget(bot: any, shape: any) {
		if (shape) shapeClaims.set(shape.id, bot.uid | 0);
	}

	function liveBotBuildCount(build: BotBuildKey, excludeUid = 0) {
		let count = 0;
		for (let i = 0; i < tanks.length; i++) {
			const t = tanks[i];
			if (!t || !t.isBot || t.isDead) continue;
			if (excludeUid && (t.uid | 0) === (excludeUid | 0)) continue;
			if (ensureBotAI(t).build === build) count++;
		}
		return count;
	}

	function activeTankClassCount(classId: TankClassId, excludeUid = 0) {
		let count = 0;
		for (let i = 0; i < tanks.length; i++) {
			const t = tanks[i];
			if (!t || t.isDead) continue;
			if (excludeUid && (t.uid | 0) === (excludeUid | 0)) continue;
			if ((t.tankClass || "basic") === classId) count++;
		}
		return count;
	}

	function nearbyAllyClassCount(tank: TankEntity, classId: TankClassId, radius: number) {
		let count = 0;
		const radiusSq = radius * radius;
		for (let i = 0; i < tanks.length; i++) {
			const other = tanks[i];
			if (!other || other.isDead || other === tank) continue;
			if ((other.teamIdx | 0) !== (tank.teamIdx | 0)) continue;
			if ((other.tankClass || "basic") !== classId) continue;
			if (distanceSq(other.x, other.y, tank.x, tank.y) <= radiusSq) count++;
		}
		return count;
	}

	function teamClassCount(teamIdx: number, classId: TankClassId, excludeUid = 0) {
		let count = 0;
		for (let i = 0; i < tanks.length; i++) {
			const t = tanks[i];
			if (!t || t.isDead) continue;
			if ((t.teamIdx | 0) !== (teamIdx | 0)) continue;
			if (excludeUid && (t.uid | 0) === (excludeUid | 0)) continue;
			if ((t.tankClass || "basic") === classId) count++;
		}
		return count;
	}

	function tankClassCanUpgradeInto(source: TankClassId, target: TankClassId): boolean {
		if (source === target) return true;
		const branches = TANK_UPGRADE_TREE[source];
		if (!branches) return false;
		for (let i = 0; i < UPGRADE_LEVELS.length; i++) {
			const choices = branches[UPGRADE_LEVELS[i]];
			if (!choices?.length) continue;
			for (let j = 0; j < choices.length; j++) {
				if (tankClassCanUpgradeInto(choices[j], target)) return true;
			}
		}
		return false;
	}

	function tankClassesShareUpgradeLine(a: TankClassId, b: TankClassId) {
		return tankClassCanUpgradeInto(a, b) || tankClassCanUpgradeInto(b, a);
	}

	function teamUpgradeLineCount(teamIdx: number, classId: TankClassId, excludeUid = 0) {
		let count = 0;
		for (let i = 0; i < tanks.length; i++) {
			const t = tanks[i];
			if (!t || t.isDead) continue;
			if ((t.teamIdx | 0) !== (teamIdx | 0)) continue;
			if (excludeUid && (t.uid | 0) === (excludeUid | 0)) continue;
			if (tankClassesShareUpgradeLine(classId, t.tankClass || "basic")) count++;
		}
		return count;
	}

	function teamHasSpecialMeleeTank(teamIdx: number, excludeUid = 0) {
		return (
			teamClassCount(teamIdx, "fracas", excludeUid) > 0 ||
			teamClassCount(teamIdx, "pointe", excludeUid) > 0
		);
	}

	function chooseSpawnBotBuild() {
		const builds = Object.keys(BOT_BUILD_CONFIGS) as BotBuildKey[];
		let best = builds[0];
		let bestScore = -1e9;
		for (let i = 0; i < builds.length; i++) {
			const build = builds[i];
			const count = liveBotBuildCount(build);
			const cfg = BOT_BUILD_CONFIGS[build];
			const score =
				0.9 -
				count * 0.34 +
				cfg.aggression * 0.08 +
				cfg.farmBias * 0.05 +
				Math.random() * 0.45;
			if (score > bestScore) {
				bestScore = score;
				best = build;
			}
		}
		return best;
	}

	function approachAngle(a: number, target: number, maxStep: number) {
		let d = ((target - a + Math.PI) % (2 * Math.PI)) - Math.PI;
		if (d > maxStep) d = maxStep;
		else if (d < -maxStep) d = -maxStep;
		a += d;
		if (a > Math.PI) a -= 2 * Math.PI;
		else if (a < -Math.PI) a += 2 * Math.PI;
		return a;
	}

	function createBotAIState(bot: TankEntity): BotAIState {
		const base = getTeamBaseCenter(bot.teamIdx | 0);
		const build = chooseSpawnBotBuild();
		return {
			build,
			mode: "patrol",
			confidence: 0,
			pressure: 0,
			caution: 0.18,
			aggressionJitter: randf(-0.12, 0.16),
			farmJitter: randf(-0.16, 0.18),
			retreatJitter: randf(-0.07, 0.08),
			strafeJitter: randf(-0.18, 0.22),
			roamJitter: randf(-0.12, 0.12),
			focusJitter: randf(-0.18, 0.22),
			strafeDir: Math.random() < 0.5 ? -1 : 1,
			strafeSwapAt: now + randf(1.2, 2.4),
			roamX: base.x,
			roamY: base.y,
			roamUntil: 0,
			focusTankUid: 0,
			focusShapeId: 0,
			focusUntil: 0,
			lastThreatUid: 0,
			lastDamageAt: -1e9,
			lastKillAt: -1e9,
			lastModeChangeAt: now,
			retreatUntil: 0,
			recoverUntil: 0,
			burstUntil: 0,
			aimX: base.x,
			aimY: base.y,
			lastHp: 0,
			kills: 0,
			deaths: 0,
		};
	}

	function ensureBotAI(bot: TankEntity): BotAIState {
		if (!bot.ai || typeof bot.ai !== "object" || !("build" in bot.ai)) {
			bot.ai = createBotAIState(bot);
		}
		return bot.ai as BotAIState;
	}

	function resetBotTacticalState(bot: TankEntity) {
		const ai = ensureBotAI(bot);
		const base = getTeamBaseCenter(bot.teamIdx | 0);
		ai.mode = "patrol";
		ai.pressure = 0;
		ai.focusTankUid = 0;
		if (ai.focusShapeId) releaseClaim(bot, ai.focusShapeId);
		ai.focusShapeId = 0;
		ai.focusUntil = 0;
		ai.retreatUntil = 0;
		ai.recoverUntil = 0;
		ai.burstUntil = 0;
		ai.roamX = base.x;
		ai.roamY = base.y;
		ai.roamUntil = 0;
		ai.aimX = base.x;
		ai.aimY = base.y;
		ai.lastHp = Math.max(1, bot.hp || derived(bot).maxHP);
	}

	function maybeAdaptBotBuild(bot: TankEntity) {
		const ai = ensureBotAI(bot);
		if (ai.deaths < 2) return;
		if (ai.kills * 2 >= ai.deaths) return;
		if (ai.build === "brawler") ai.build = "bulwark";
		else if (ai.build === "sniper") ai.build = "skirmisher";
		else if (ai.build === "raider") ai.build = "bulwark";
	}

	function tuneBotBuildForTankClass(bot: TankEntity, classId: TankClassId) {
		if (!bot.isBot) return;
		if (!tankClassUsesDrones(classId)) return;
		const ai = ensureBotAI(bot);
		if (classId === "gamme") {
			if (ai.build !== "sniper" && ai.build !== "skirmisher") ai.build = "sniper";
			return;
		}
		if (ai.build !== "bulwark" && ai.build !== "sniper") ai.build = "bulwark";
	}

	function registerBotKill(killer: TankEntity, victim: any) {
		if (!killer?.isBot) return;
		const ai = ensureBotAI(killer);
		ai.kills = (ai.kills | 0) + 1;
		ai.lastKillAt = now;
		ai.confidence = constrain(ai.confidence + 0.18, -1, 1);
		ai.caution = constrain(ai.caution - 0.04, 0.08, 0.9);
		ai.pressure = Math.max(0, ai.pressure - 0.2);
		if (
			victim &&
			typeof victim === "object" &&
			typeof victim.uid === "number"
		) {
			ai.focusTankUid = victim.uid | 0;
			ai.focusUntil = now + 0.8;
		}
	}

	function spendBotStat(t: TankEntity) {
		const ai = ensureBotAI(t);
		const cfg = BOT_BUILD_CONFIGS[ai.build];
		while (t.statPoints > 0) {
			let spent = false;
			const stageCap = t.level < 12 ? 4 : t.level < 24 ? 5 : MELEE_STAT_CAP;
			for (let i = 0; i < cfg.statPlan.length; i++) {
				const key = cfg.statPlan[i];
				const hardCap = maxStatLevelForTank(t, key);
				if (hardCap <= 0) continue;
				const softCap = i < 10 ? Math.min(stageCap, hardCap) : hardCap;
				if ((t.stats[key] | 0) >= softCap) continue;
				t.stats[key]++;
				t.statPoints--;
				spent = true;
				break;
			}
			if (spent) continue;
			for (let i = 0; i < cfg.fallbackPriority.length; i++) {
				const key = cfg.fallbackPriority[i];
				const hardCap = maxStatLevelForTank(t, key);
				if (hardCap <= 0 || (t.stats[key] | 0) >= hardCap) continue;
				t.stats[key]++;
				t.statPoints--;
				spent = true;
				break;
			}
			if (!spent) break;
		}
	}

	function chooseBotUpgrade(t: TankEntity, choices: TankClassId[]) {
		const ai = ensureBotAI(t);
		const uniqueTeamChoiceExists = choices.some(
			(id) => teamClassCount(t.teamIdx | 0, id, t.uid | 0) <= 0,
		);
		const priorClass = (t.lastLifeTankClass || "") as TankClassId | "";
		const alternateFromPriorExists = choices.some((id) => id !== priorClass);
		let bestId = choices[0] || null;
		let bestScore = -1e9;
		for (let i = 0; i < choices.length; i++) {
			const id = choices[i];
			const def = getTankClassDef(id);
			const pref = def.botPreference?.[ai.build] ?? 0.1;
			const globalPenalty = activeTankClassCount(id, t.uid | 0) * 0.14;
			const localPenalty = nearbyAllyClassCount(t, id, 960) * 0.22;
			const teamCount = teamClassCount(t.teamIdx | 0, id, t.uid | 0);
			const lineCount = teamUpgradeLineCount(t.teamIdx | 0, id, t.uid | 0);
			const teamPenalty =
				uniqueTeamChoiceExists && teamCount > 0
					? 3.2 + (teamCount - 1) * 1.35
					: teamCount * 0.4;
			const linePenalty =
				uniqueTeamChoiceExists && lineCount > 0
					? 1.5 + (lineCount - 1) * 0.8
					: lineCount * 0.12;
			const repeatPenalty =
				alternateFromPriorExists && priorClass && id === priorClass ? 3.4 : 0;
			const score =
				pref -
				globalPenalty -
				localPenalty -
				teamPenalty -
				linePenalty -
				repeatPenalty +
				ai.focusJitter * 0.08 +
				Math.random() * 0.08;
			if (score > bestScore) {
				bestScore = score;
				bestId = id;
			}
		}
		return bestId;
	}

	function shouldBotDelayBasicUpgrade(t: TankEntity) {
		const ai = ensureBotAI(t);
		return (
			(t.tankClass || "basic") === "basic" &&
			!t.upgradeSelections[15] &&
			(t.level | 0) < 30 &&
			ai.build === "brawler" &&
			!teamHasSpecialMeleeTank(t.teamIdx | 0, t.uid | 0)
		);
	}

	function activateBotPendingUpgrades(t: TankEntity) {
		refreshPendingUpgrade(t);
		while (t.pendingUpgradeLevel) {
			if (t.pendingUpgradeLevel === 15 && shouldBotDelayBasicUpgrade(t)) break;
			const choices = upgradeChoicesForLevel(t, t.pendingUpgradeLevel);
			if (!choices.length) break;
			const choice = chooseBotUpgrade(t, choices);
			if (!choice) break;
			if (!selectTankUpgrade(t, choice, false)) break;
		}
	}

	function clamp01(value: number) {
		return constrain(value, 0, 1);
	}

	function pointSegmentDistanceSq(
		px: number,
		py: number,
		ax: number,
		ay: number,
		bx: number,
		by: number,
	) {
		const abx = bx - ax;
		const aby = by - ay;
		const apx = px - ax;
		const apy = py - ay;
		const ab2 = abx * abx + aby * aby;
		if (ab2 <= 1e-9) return apx * apx + apy * apy;
		const t = constrain((apx * abx + apy * aby) / ab2, 0, 1);
		const qx = ax + abx * t;
		const qy = ay + aby * t;
		const dx = px - qx;
		const dy = py - qy;
		return dx * dx + dy * dy;
	}

	function interceptAimPoint(
		ax: number,
		ay: number,
		projectileSpeed: number,
		tx: number,
		ty: number,
		tvx: number,
		tvy: number,
	) {
		const rx = tx - ax;
		const ry = ty - ay;
		const a = tvx * tvx + tvy * tvy - projectileSpeed * projectileSpeed;
		const b = 2 * (rx * tvx + ry * tvy);
		const c = rx * rx + ry * ry;
		let t = 0;
		if (Math.abs(a) < 1e-6) {
			if (Math.abs(b) > 1e-6) t = Math.max(0, -c / b);
		} else {
			const disc = b * b - 4 * a * c;
			if (disc >= 0) {
				const s = Math.sqrt(disc);
				const t1 = (-b - s) / (2 * a);
				const t2 = (-b + s) / (2 * a);
				const best = Math.min(
					t1 > 0 ? t1 : Infinity,
					t2 > 0 ? t2 : Infinity,
				);
				t = Number.isFinite(best) ? best : 0;
			}
		}
		t = constrain(t, 0, 1.25);
		return { x: tx + tvx * t, y: ty + tvy * t, t };
	}

	function estimateTankPower(t: TankEntity) {
		const d = derived(t);
		const hpRatio = d.maxHP > 0 ? clamp01(t.hp / d.maxHP) : 1;
		const isMeleeOnly = isMeleeTankClass(t.tankClass || "basic");
		const dps = isMeleeOnly ? 0 : d.bulletDamage / Math.max(0.25, d.reload);
		return (
			d.maxHP * 0.75 * (0.55 + hpRatio * 0.45) +
			dps * 7 +
			(isMeleeOnly ? 0 : d.bulletHP * 5) +
			d.bodyHitShape * 1.5 +
			d.maxSpeed * 0.1 +
			(t.level | 0) * 12
		);
	}

	function nearbyTeamPower(
		x: number,
		y: number,
		teamIdx: number,
		radius: number,
		excludeUid?: number,
	) {
		let total = 0;
		const radiusSq = radius * radius;
		for (let i = 0; i < tanks.length; i++) {
			const t = tanks[i];
			if (!t || t.isDead) continue;
			if ((t.teamIdx | 0) !== (teamIdx | 0)) continue;
			if (excludeUid && (t.uid | 0) === (excludeUid | 0)) continue;
			const dx = t.x - x;
			const dy = t.y - y;
			const distSq = dx * dx + dy * dy;
			if (distSq > radiusSq) continue;
			const dist = Math.sqrt(distSq);
			if (dist > radius) continue;
			const falloff = 1 - dist / radius;
			total += estimateTankPower(t) * (0.45 + 0.55 * falloff);
		}
		return total;
	}

	function enemyBasePressure(teamIdx: number, x: number, y: number) {
		const c = getTeamBaseCenter(teamIdx);
		const limit = (TEAM_LIMIT_R[teamIdx] || 900) + 200;
		const dist = distance(x, y, c.x, c.y);
		return clamp01(1 - dist / limit);
	}

	function enemyBaseAvoidance(bot: TankEntity) {
		let ax = 0;
		let ay = 0;
		let danger = 0;
		for (let i = 0; i < TEAMS.length; i++) {
			if (i === (bot.teamIdx | 0)) continue;
			const c = getTeamBaseCenter(i);
			const dx = bot.x - c.x;
			const dy = bot.y - c.y;
			const dist = Math.hypot(dx, dy) || 1;
			const limit = (TEAM_LIMIT_R[i] || 900) + 240;
			if (dist >= limit) continue;
			const mag = 1 - dist / limit;
			ax += (dx / dist) * mag * 2.4;
			ay += (dy / dist) * mag * 2.4;
			danger = Math.max(danger, mag);
		}
		return { ax, ay, danger };
	}

	function friendlySupportAvoidance(bot: TankEntity) {
		let ax = 0;
		let ay = 0;
		let congestion = 0;
		const idx = neighborIndices(bot.x, bot.y);
		for (let i = 0; i < idx.length; i++) {
			const sh = shapes[idx[i]];
			if (!sh || sh.dead || sh.dying) continue;
			if (!isFriendlySupportShape(sh, bot.teamIdx | 0)) continue;
			const dx = bot.x - sh.x;
			const dy = bot.y - sh.y;
			const dist = Math.hypot(dx, dy) || 1;
			const sep = bot.r + sh.r + 18;
			if (dist >= sep) continue;
			const mag = 1 - dist / sep;
			ax += (dx / dist) * mag * 1.5;
			ay += (dy / dist) * mag * 1.5;
			congestion = Math.max(congestion, mag);
		}
		return { ax, ay, congestion };
	}

	function nearbyTeamTankCount(
		x: number,
		y: number,
		teamIdx: number,
		radius: number,
		excludeUid = 0,
	) {
		let count = 0;
		const radiusSq = radius * radius;
		for (let i = 0; i < tanks.length; i++) {
			const t = tanks[i];
			if (!t || t.isDead) continue;
			if (excludeUid && (t.uid | 0) === (excludeUid | 0)) continue;
			if ((t.teamIdx | 0) !== (teamIdx | 0)) continue;
			if (distanceSq(x, y, t.x, t.y) <= radiusSq) count++;
		}
		return count;
	}

	function tankTrafficAvoidance(bot: TankEntity, targetInfo: BotTargetInfo) {
		let ax = 0;
		let ay = 0;
		let congestion = 0;
		let enemyPack = 0;
		for (let i = 0; i < tanks.length; i++) {
			const other = tanks[i];
			if (!other || other === bot || other.isDead) continue;
			const dx = bot.x - other.x;
			const dy = bot.y - other.y;
			const dist = Math.hypot(dx, dy) || 1;
			const sameTeam = (other.teamIdx | 0) === (bot.teamIdx | 0);
			if (
				targetInfo.shouldRam &&
				!sameTeam &&
				targetInfo.type === "tank" &&
				other === targetInfo.target
			) {
				continue;
			}
			const sep = bot.r + other.r + (sameTeam ? 84 : 68);
			if (dist >= sep) continue;
			let weight = sameTeam ? 1.35 : 0.78;
			if (!sameTeam && targetInfo.type === "tank" && other === targetInfo.target) {
				weight *= 0.35;
			}
			if (!sameTeam) enemyPack++;
			const mag = (1 - dist / sep) * weight;
			ax += (dx / dist) * mag;
			ay += (dy / dist) * mag;
			congestion = Math.max(congestion, mag);
		}
		return { ax, ay, congestion, enemyPack };
	}

	function worldAvoidance(bot: TankEntity) {
		const margin = 260;
		let ax = 0;
		let ay = 0;
		if (bot.x < margin) ax += (margin - bot.x) / margin;
		else if (bot.x > WORLD.w - margin)
			ax -= (bot.x - (WORLD.w - margin)) / margin;
		if (bot.y < margin) ay += (margin - bot.y) / margin;
		else if (bot.y > WORLD.h - margin)
			ay -= (bot.y - (WORLD.h - margin)) / margin;
		return { ax, ay };
	}

	function bulletAvoidance(
		bot: TankEntity,
		targetInfo?: BotTargetInfo,
		profile?: ReturnType<typeof botProfile>,
	) {
		let ax = 0;
		let ay = 0;
		let risk = 0;
		const targetTank =
			targetInfo?.type === "tank" && targetInfo.target
				? (targetInfo.target as TankEntity)
				: null;
		const committedPush =
			!!targetTank &&
			(targetInfo?.shouldRam ||
				targetInfo!.killConfirm > 0.76 ||
				targetInfo!.duelEdge > 0.2 ||
				targetInfo!.dist < targetInfo!.desiredRange + 90);
		const immediateCommit =
			!!targetTank &&
			(targetInfo?.shouldRam ||
				targetInfo!.dist <
				bot.r + (targetTank.r || 0) + (profile?.meleeOnly ? 96 : 56));
		const safeRadius =
			bot.r +
			(immediateCommit ? 18 : committedPush ? 26 : 38) +
			(profile?.meleeOnly ? 6 : 0);
		const responseRange = immediateCommit ? 70 : committedPush ? 105 : 155;
		const horizon = immediateCommit ? 0.34 : committedPush ? 0.48 : 0.78;
		for (let i = 0; i < bullets.length; i++) {
			const bi = bullets[i]?._bi | 0;
			if (bi < 0 || B_dead[bi] || B_dying[bi]) continue;
			if ((B_team[bi] | 0) === (bot.teamIdx | 0)) continue;
			const rx = B_x[bi] - bot.x;
			const ry = B_y[bi] - bot.y;
			const vx = B_vx[bi];
			const vy = B_vy[bi];
			const vv = vx * vx + vy * vy;
			if (vv <= 1e-6) continue;
			const distNow = Math.hypot(rx, ry);
			const along = rx * vx + ry * vy;
			if (along > 0 && distNow > safeRadius + responseRange * 0.8) continue;
			const t = constrain(-along / vv, 0, horizon);
			const cx = rx + vx * t;
			const cy = ry + vy * t;
			const dist = Math.hypot(cx, cy);
			const impactRadius = safeRadius + (B_r[bi] || 0) * 1.35;
			if (dist > impactRadius + responseRange) continue;
			const timeWeight = 1 - t / Math.max(0.001, horizon);
			const mag =
				clamp01(1 - (dist - impactRadius) / responseRange) *
				(0.45 + timeWeight * 0.55);
			if (mag <= 0.01) continue;
			ax -= (cx / (dist || 1)) * mag * 1.08;
			ay -= (cy / (dist || 1)) * mag * 1.08;
			const vlen = Math.hypot(vx, vy) || 1;
			let side = ((bot.uid | 0) + (bi | 0)) & 1 ? 1 : -1;
			if (targetTank) {
				const tdx = targetTank.x - bot.x;
				const tdy = targetTank.y - bot.y;
				const guidedSide = Math.sign(vx * tdy - vy * tdx);
				if (guidedSide) side = guidedSide;
			}
			ax += (-vy / vlen) * mag * 0.42 * side;
			ay += (vx / vlen) * mag * 0.42 * side;
			risk = Math.max(risk, mag * (along <= 0 ? 1 : 0.72));
		}
		return { ax, ay, risk };
	}

	function shotObstructionScore(
		bot: TankEntity,
		target: TankEntity | ShapeEntity,
		aimX: number,
		aimY: number,
	) {
		const segLen = Math.hypot(aimX - bot.x, aimY - bot.y);
		if (segLen < 8) return 0;
		const steps = Math.max(1, Math.min(6, Math.ceil(segLen / 180)));
		_shotSeenSeq++;
		if (_shotSeenSeq === 0) {
			_shotSeenStamp.fill(0);
			_shotSeenSeq = 1;
		}
		const seenStamp = _shotSeenSeq;
		let blocked = 0;
		for (let s = 1; s <= steps; s++) {
			const px = bot.x + ((aimX - bot.x) * s) / steps;
			const py = bot.y + ((aimY - bot.y) * s) / steps;
			const idx = neighborIndices(px, py);
			for (let n = 0; n < idx.length; n++) {
				const si = idx[n] | 0;
				if (_shotSeenStamp[si] === seenStamp) continue;
				_shotSeenStamp[si] = seenStamp;
				const sh = shapes[si];
				if (!sh || sh === target || sh.dead || sh.dying || sh.invincible)
					continue;
				if (sh.ai === "protector" && (sh.teamIdx | 0) === (bot.teamIdx | 0))
					continue;
				const hitR = sh.r + 8;
				if (
					pointSegmentDistanceSq(
						sh.x,
						sh.y,
						bot.x,
						bot.y,
						aimX,
						aimY,
					) <=
					hitR * hitR
				) {
					blocked += sh.type === "pent" ? 0.55 : sh.type === "tri" ? 0.3 : 0.2;
				}
			}
		}
		return Math.min(1.3, blocked);
	}

	function botProfile(bot: TankEntity) {
		const ai = ensureBotAI(bot);
		const cfg = BOT_BUILD_CONFIGS[ai.build];
		const d = derived(bot);
		const meleeOnly = isMeleeTankClass(bot.tankClass || "basic");
		const hpRatio = d.maxHP > 0 ? clamp01(bot.hp / d.maxHP) : 1;
		const bodyBias =
			bot.stats.bodyDmg * 1.35 +
			bot.stats.maxHP * 0.95 +
			bot.stats.moveSpd * 0.8 +
			bot.stats.regen * 0.55;
		const rangedBias = meleeOnly
			? 0
			: bot.stats.bulletSpd * 1.15 +
			bot.stats.bulletDmg * 1.15 +
			bot.stats.penetration * 0.85 +
			bot.stats.reload * 1.15;
		const preferredRange = meleeOnly
			? Math.max(40, bot.r + 14 + ai.roamJitter * 18)
			: constrain(
				cfg.preferredRange +
				(bot.stats.bulletSpd - bot.stats.bodyDmg) * 26 +
				(bot.stats.moveSpd - bot.stats.maxHP) * 8 +
				ai.roamJitter * 120,
				cfg.minRange,
				cfg.maxRange,
			);
		const retreatHP = constrain(cfg.retreatHP + ai.retreatJitter, 0.18, 0.58);
		const farmBias = constrain(cfg.farmBias + ai.farmJitter, 0.08, 1.18);
		const strafeBias = constrain(cfg.strafeBias + ai.strafeJitter, 0.18, 1.4);
		const shouldRam =
			meleeOnly ||
			(cfg.ramBias + (bodyBias - rangedBias) * 0.1 > 0.62 &&
				hpRatio > Math.max(0.26, retreatHP - 0.06));
		const aggression = constrain(
			cfg.aggression +
			ai.aggressionJitter +
			ai.confidence * 0.35 -
			ai.caution * 0.12 +
			(bodyBias - rangedBias) * 0.022 +
			(hpRatio - 0.6) * 0.3,
			0.08,
			1.22,
		);
		return {
			ai,
			cfg,
			d,
			meleeOnly,
			hpRatio,
			bodyBias,
			rangedBias,
			preferredRange,
			farmBias,
			retreatHP,
			strafeBias,
			shouldRam,
			aggression,
		};
	}

	function updateBotTacticalFeedback(bot: TankEntity, dt: number) {
		const profile = botProfile(bot);
		const { ai, d } = profile;
		if (!ai.lastHp) ai.lastHp = bot.hp > 0 ? bot.hp : d.maxHP;
		const hpLoss = Math.max(0, ai.lastHp - bot.hp);
		if (hpLoss > 0.05) {
			ai.lastDamageAt = now;
			ai.pressure = Math.min(
				1.35,
				ai.pressure + (hpLoss / Math.max(16, d.maxHP)) * 2.6,
			);
			ai.confidence = constrain(
				ai.confidence - (hpLoss / Math.max(18, d.maxHP)) * 1.2,
				-1,
				1,
			);
		} else {
			ai.pressure = Math.max(0, ai.pressure - dt * 0.28);
			const recover = bot.hp > d.maxHP * 0.85 ? 0.024 : 0.008;
			ai.confidence = constrain(ai.confidence + dt * recover, -1, 1);
		}
		if (
			typeof bot.lastDamagedBy === "string" &&
			bot.lastDamagedBy.startsWith("tankuid:")
		) {
			ai.lastThreatUid = +bot.lastDamagedBy.split(":")[1] | 0;
		}
		ai.lastHp = bot.hp;
		return profile;
	}

	function emptyBotTarget(
		bot: TankEntity,
		profile: ReturnType<typeof botProfile>,
	): BotTargetInfo {
		return {
			type: "none",
			target: null,
			score: -1e9,
			dist: Infinity,
			desiredRange: profile.preferredRange,
			shouldRam: false,
			aimX: bot.x,
			aimY: bot.y,
			blocked: 0,
			threat: 0,
			killConfirm: 0,
			duelEdge: 0,
			baseDanger: 0,
		};
	}

	function shouldRefreshBotTarget(
		bot: TankEntity,
		targetInfo: BotTargetInfo | null | undefined,
	) {
		if (!targetInfo) return true;
		if (((physicsFrame + (bot.uid | 0)) % BOT_TARGET_REFRESH_FRAMES) === 0) {
			return true;
		}
		if (targetInfo.type === "tank") {
			const target = targetInfo.target as TankEntity | null;
			if (!target || target.isDead || target.invincible) return true;
			if ((target.teamIdx | 0) === (bot.teamIdx | 0)) return true;
			const maxDist = fovForTank(bot) + 220;
			return distanceSq(bot.x, bot.y, target.x, target.y) > maxDist * maxDist;
		}
		if (targetInfo.type === "shape") {
			const target = targetInfo.target as ShapeEntity | null;
			if (!target || target.dead || target.dying || target.invincible) return true;
			if (target.type === "hex" || !!target.ai) return true;
			const maxDist = Math.min(fovForTank(bot) + 180, 2200);
			return distanceSq(bot.x, bot.y, target.x, target.y) > maxDist * maxDist;
		}
		return false;
	}

	function meleeShapeEngageRisk(
		bot: TankEntity,
		profile: ReturnType<typeof botProfile>,
		shape: ShapeEntity,
	) {
		if (!profile.meleeOnly) return 0;
		const recentHit = now - (bot.lastHit || -1e9) < 1.35 ? 1 : 0;
		const bodyPressure = (shape.body || 0) / Math.max(1, profile.d.bodyHitShape);
		const attrition = (shape.hp || 1) / Math.max(1, profile.d.bodyHitShape * 2.15);
		let risk =
			Math.max(0, 0.7 - profile.hpRatio) * 2.1 +
			Math.max(0, bodyPressure - 0.82) * 0.24 +
			Math.max(0, attrition - 1.7) * 0.12 +
			recentHit * 0.16;
		if (shape.type === "pent") {
			risk += 0.28;
			if (profile.hpRatio < 0.8) risk += 0.34;
		} else if (shape.type === "tri") {
			risk += 0.1;
		} else if (shape.type === "dia") {
			risk += 0.07;
		}
		return constrain(risk, 0, 1.35);
	}

	function chooseFarmTarget(
		bot: TankEntity,
		profile: ReturnType<typeof botProfile>,
	): BotTargetInfo {
		const ai = profile.ai;
		const droneDef = tankDroneConfig(bot);
		const droneCount = droneDef ? ownedDroneCount(bot) : 0;
		const needsSquareFeed =
			!!droneDef?.infectSquares &&
			droneCount < Math.max(1, droneDef.droneCapacity || 0);
		const ownBase = getTeamBaseCenter(bot.teamIdx);
		let best: ShapeEntity | null = null;
		let bestScore = -1e9;
		let bestDist = Infinity;
		let bestThreat = 0;
		let desiredRange = profile.shouldRam ? 12 : 110;
		const maxTargetDist = Math.min(fovForTank(bot) + 120, 2200);
		const maxTargetDistSq = maxTargetDist * maxTargetDist;
		for (let i = 0; i < shapes.length; i++) {
			const s = shapes[i];
			if (!s || s.dead || s.dying || s.invincible || s.type === "hex" || s.ai)
				continue;
			const claimed = shapeClaims.get(s.id);
			if (claimed && claimed !== (bot.uid | 0)) continue;
			const dx = s.x - bot.x;
			const dy = s.y - bot.y;
			const distSq = dx * dx + dy * dy;
			if (distSq > maxTargetDistSq) continue;
			const dist = Math.sqrt(distSq);

			const focusBonus =
				ai.focusShapeId === (s.id | 0) && now < ai.focusUntil ? 70 : 0;
			const enemyPressure =
				nearbyTeamPower(s.x, s.y, (bot.teamIdx + 1) % TEAMS.length, 720) * 0.01 +
				nearbyTeamPower(s.x, s.y, (bot.teamIdx + 2) % TEAMS.length, 720) * 0.01 +
				nearbyTeamPower(s.x, s.y, (bot.teamIdx + 3) % TEAMS.length, 720) * 0.01;
			const safeBonus =
				Math.max(
					0,
					1 - distance(s.x, s.y, ownBase.x, ownBase.y) / 2600,
				) * 55;
			const squareFeedBonus =
				needsSquareFeed && s.type === "sqr"
					? 520 + (droneCount <= 0 ? 360 : droneCount <= 3 ? 120 : 0)
					: needsSquareFeed
						? droneCount <= 0
							? -340
							: -180
						: 0;
			const shapeWeight =
				s.type === "pent" ? 240 : s.type === "tri" ? 95 : s.type === "dia" ? 40 : 28;
			const meleeShapeThreat = meleeShapeEngageRisk(bot, profile, s);
			const damageRate = profile.shouldRam
				? profile.d.bodyHitShape * 1.2
				: profile.d.bulletDamage / Math.max(0.25, profile.d.reload);
			const ttk = (s.hp || 1) / Math.max(1, damageRate);
			if (profile.meleeOnly && meleeShapeThreat > 0.98 && s.type === "pent") continue;
			const score =
				shapeWeight +
				(s.xp || 1) * 1.8 -
				dist * 0.075 -
				ttk * 16 +
				(profile.meleeOnly ? meleeShapeThreat * -520 : 0) +
				squareFeedBonus -
				enemyPressure * (1.2 - profile.aggression * 0.45) +
				safeBonus +
				focusBonus;
			if (score > bestScore) {
				bestScore = score;
				best = s;
				bestDist = dist;
				bestThreat = meleeShapeThreat;
				desiredRange =
					(profile.shouldRam || (needsSquareFeed && s.type === "sqr")) &&
						meleeShapeThreat < 0.56
						? Math.max(0, s.r - 6)
						: s.r + bot.r + 60 + meleeShapeThreat * 80;
			}
		}
		if (!best) {
			return emptyBotTarget(bot, profile);
		}
		return {
			type: "shape",
			target: best,
			score: bestScore + profile.farmBias * 80,
			dist: bestDist,
			desiredRange,
			shouldRam:
				(needsSquareFeed && best.type === "sqr") ||
				(profile.shouldRam &&
					bestThreat < 0.56 &&
					(best.body || 0) * 2.4 <
					Math.max(30, profile.d.maxHP * profile.hpRatio)),
			aimX: best.x,
			aimY: best.y,
			blocked: 0,
			threat: profile.meleeOnly ? bestThreat : 0.1,
			killConfirm: 0,
			duelEdge: 0,
			baseDanger: 0,
		};
	}

	function chooseEnemyTarget(
		bot: TankEntity,
		profile: ReturnType<typeof botProfile>,
	): BotTargetInfo {
		const ai = profile.ai;
		let best: TankEntity | null = null;
		let bestScore = -1e9;
		let bestDist = Infinity;
		let bestAimX = bot.x;
		let bestAimY = bot.y;
		let bestBlocked = 0;
		let bestShouldRam = false;
		let bestThreat = 0;
		let bestKillConfirm = 0;
		let bestDuelEdge = 0;
		let bestBaseDanger = 0;
		const selfPower = estimateTankPower(bot);
		const ownBase = getTeamBaseCenter(bot.teamIdx);
		const maxTargetDist = fovForTank(bot) + 120;
		const maxTargetDistSq = maxTargetDist * maxTargetDist;
		const localEnemyPressureByTeam = new Array(TEAMS.length).fill(-1);
		const localEnemyPressureRadius = 280;
		const localEnemyPressureRadiusSq =
			localEnemyPressureRadius * localEnemyPressureRadius;
		const selfDps =
			(profile.meleeOnly
				? 0
				: profile.d.bulletDamage / Math.max(0.25, profile.d.reload)) +
			(profile.shouldRam ? profile.d.bodyHitShape * 0.08 : 0);
		for (let i = 0; i < tanks.length; i++) {
			const t = tanks[i];
			if (!t || t === bot || t.isDead || t.invincible) continue;
			if ((t.teamIdx | 0) === (bot.teamIdx | 0)) continue;
			const dx = t.x - bot.x;
			const dy = t.y - bot.y;
			const distSq = dx * dx + dy * dy;
			if (distSq > maxTargetDistSq) continue;
			const dist = Math.sqrt(distSq);

			const enemyPower = estimateTankPower(t);
			const duelRatio = selfPower / Math.max(1, enemyPower);
			const td = derived(t);
			const enemyHpRatio = td.maxHP > 0 ? clamp01(t.hp / td.maxHP) : 1;
			const enemyDps =
				(isMeleeTankClass(t.tankClass || "basic")
					? 0
					: td.bulletDamage / Math.max(0.25, td.reload)) +
				td.bodyHitShape * 0.08;
			const selfTTK = (td.maxHP * enemyHpRatio) / Math.max(1, selfDps);
			const enemyTTK =
				(profile.d.maxHP * profile.hpRatio) / Math.max(1, enemyDps);
			const duelEdge = constrain(
				(enemyTTK - selfTTK) /
				Math.max(0.75, Math.max(enemyTTK, selfTTK)),
				-1,
				1,
			);
			const supportScore = constrain(
				(nearbyTeamPower(t.x, t.y, bot.teamIdx, 900, bot.uid) -
					nearbyTeamPower(t.x, t.y, t.teamIdx, 900, t.uid)) *
				0.06,
				-160,
				160,
			);
			const enemyPack = nearbyTeamTankCount(t.x, t.y, t.teamIdx, 340, t.uid);
			const enemyTeamIdx = t.teamIdx | 0;
			if (localEnemyPressureByTeam[enemyTeamIdx] < 0) {
				localEnemyPressureByTeam[enemyTeamIdx] = nearbyTeamTankCount(
					bot.x,
					bot.y,
					enemyTeamIdx,
					localEnemyPressureRadius,
				);
			}
			const localEnemyPressure = Math.max(
				0,
				localEnemyPressureByTeam[enemyTeamIdx] -
				(distSq <= localEnemyPressureRadiusSq ? 1 : 0),
			);
			const focusBonus =
				ai.focusTankUid === (t.uid | 0) && now < ai.focusUntil ? 130 : 0;
			const revengeBonus = ai.lastThreatUid === (t.uid | 0) ? 160 : 0;
			const weakBonus = (1 - enemyHpRatio) * 260;
			const preferredDistPenalty =
				Math.abs(dist - profile.preferredRange) *
				(profile.shouldRam ? 0.035 : 0.08);
			const duelScore = constrain((duelRatio - 1) * 165, -220, 220);
			const aim = profile.meleeOnly
				? { x: t.x, y: t.y, t: 0 }
				: interceptAimPoint(
					bot.x,
					bot.y,
					profile.d.bulletSpeed,
					t.x,
					t.y,
					t.vx || 0,
					t.vy || 0,
				);
			const blocked = profile.meleeOnly
				? 0
				: shotObstructionScore(bot, t, aim.x, aim.y);
			const killConfirm = clamp01(
				(1 - enemyHpRatio) * 0.78 +
				Math.max(-0.16, (duelRatio - 0.92) * 0.42) +
				Math.max(0, duelEdge + 0.14) * 0.38 +
				(dist < profile.preferredRange + 180 ? 0.16 : 0) +
				(blocked < 0.28 ? 0.08 : 0),
			);
			const executeBonus =
				killConfirm * 220 + (enemyHpRatio < 0.16 ? 120 : 0);
			const baseDanger = enemyBasePressure(t.teamIdx, t.x, t.y);
			const nearOwnBaseBonus =
				Math.max(0, 1 - distance(t.x, t.y, ownBase.x, ownBase.y) / 1500) * 110;
			const sameLevelPressure =
				Math.max(0, (t.level | 0) - (bot.level | 0)) * 6;
			const shouldRam =
				profile.shouldRam &&
				duelRatio > 0.9 &&
				enemyHpRatio < 0.82 &&
				dist < profile.preferredRange + 320;
			const threat = clamp01((enemyPower / Math.max(1, selfPower)) * 0.65);
			const closePressure = clamp01(
				1 - dist / (profile.shouldRam ? 460 : 340),
			);
			const immediateCombatBonus =
				closePressure * (180 + threat * 120 + localEnemyPressure * 34);
			const playerTunnelPenalty =
				t === player && localEnemyPressure > 0
					? localEnemyPressure * (dist > 220 ? 92 : 54)
					: 0;
			const score =
				280 +
				duelScore +
				weakBonus +
				executeBonus +
				immediateCombatBonus +
				supportScore +
				focusBonus +
				revengeBonus +
				nearOwnBaseBonus -
				enemyPack * (profile.aggression > 0.86 ? 42 : 86) -
				preferredDistPenalty -
				playerTunnelPenalty -
				(baseDanger * baseDanger) *
				(killConfirm > 0.9 ? 180 : profile.aggression < 0.78 ? 520 : 360) -
				(baseDanger > 0.55 &&
					dist > profile.preferredRange + 30 &&
					!shouldRam
					? (baseDanger - 0.55) * 260
					: 0) -
				sameLevelPressure -
				blocked * 120 +
				duelEdge * 120 +
				(shouldRam ? 80 : 0);
			if (score > bestScore) {
				bestScore = score;
				best = t;
				bestDist = dist;
				bestAimX = aim.x;
				bestAimY = aim.y;
				bestBlocked = blocked;
				bestShouldRam = shouldRam;
				bestThreat = threat;
				bestKillConfirm = killConfirm;
				bestDuelEdge = duelEdge;
				bestBaseDanger = baseDanger;
			}
		}
		if (!best) return emptyBotTarget(bot, profile);
		return {
			type: "tank",
			target: best,
			score: bestScore,
			dist: bestDist,
			desiredRange: bestShouldRam
				? Math.max(0, bot.r + best.r - 12)
				: profile.preferredRange,
			shouldRam: bestShouldRam,
			aimX: bestAimX,
			aimY: bestAimY,
			blocked: bestBlocked,
			threat: bestThreat,
			killConfirm: bestKillConfirm,
			duelEdge: bestDuelEdge,
			baseDanger: bestBaseDanger,
		};
	}

	function refreshBotRoamTarget(
		bot: TankEntity,
		profile: ReturnType<typeof botProfile>,
		force = false,
	) {
		const ai = profile.ai;
		if (!force && now < ai.roamUntil) return;
		const own = getTeamBaseCenter(bot.teamIdx);
		const center = { x: WORLD.w / 2, y: WORLD.h / 2 };
		const roamBias = constrain(
			0.24 +
			(bot.level | 0) / LEVEL_CAP * 0.34 +
			profile.aggression * 0.18 +
			ai.confidence * 0.12 +
			ai.roamJitter,
			0.18,
			0.8,
		);
		const anchorX = own.x + (center.x - own.x) * roamBias;
		const anchorY = own.y + (center.y - own.y) * roamBias;
		const jitter = 260 + 480 * (0.5 + roamBias);
		ai.roamX = constrain(anchorX + random(-jitter, jitter), 220, WORLD.w - 220);
		ai.roamY = constrain(anchorY + random(-jitter, jitter), 220, WORLD.h - 220);
		ai.roamUntil = now + randf(1.6, 4.2);
	}

	function botChooseTargets(
		bot: TankEntity,
		profile: ReturnType<typeof botProfile>,
	): BotTargetInfo {
		const ai = profile.ai;
		const enemy = chooseEnemyTarget(bot, profile);
		const farm = chooseFarmTarget(bot, profile);
		const bulletRisk = bulletAvoidance(
			bot,
			enemy.type === "tank" ? enemy : undefined,
			profile,
		).risk;
		const droneDef = tankDroneConfig(bot);
		const needsSeedSquare =
			!!droneDef?.infectSquares &&
			ownedDroneCount(bot) <= 0 &&
			farm.type === "shape" &&
			farm.target?.type === "sqr";
		const recentNonTankHit =
			now - (bot.lastHit || -1e9) < 1.35 &&
			!(
				typeof bot.lastDamagedBy === "string" &&
				bot.lastDamagedBy.startsWith("tankuid:")
			);
		const shouldRecoverForContactFarm =
			profile.meleeOnly &&
			((farm.type === "shape" &&
				farm.threat > 0.56 &&
				(profile.hpRatio < 0.74 ||
					(recentNonTankHit && profile.hpRatio < 0.9))) ||
				(profile.hpRatio < 0.56 && recentNonTankHit));
		const canPressEnemy =
			enemy.type === "tank" &&
			(enemy.killConfirm > 0.9 ||
				(enemy.baseDanger < 0.72 &&
					(enemy.killConfirm > 0.68 ||
						enemy.duelEdge > 0.22 ||
						(profile.aggression > 0.84 &&
							enemy.duelEdge > 0.05 &&
							enemy.baseDanger < 0.42))));

		if (
			(profile.hpRatio < profile.retreatHP && !canPressEnemy) ||
			shouldRecoverForContactFarm ||
			ai.pressure + bulletRisk > 0.98 ||
			(enemy.type === "tank" &&
				enemy.threat > 0.72 &&
				profile.hpRatio < profile.retreatHP + 0.14 &&
				!canPressEnemy)
		) {
			ai.retreatUntil = Math.max(ai.retreatUntil, now + 1.1);
			if (shouldRecoverForContactFarm) {
				ai.recoverUntil = Math.max(
					ai.recoverUntil,
					now + (recentNonTankHit ? 2.4 : 1.65),
				);
			}
			if (profile.hpRatio < profile.retreatHP * 0.72)
				ai.recoverUntil = Math.max(ai.recoverUntil, now + 1.8);
		}

		let mode: BotMode = ai.mode;
		let active = enemy.type !== "none" ? enemy : farm;
		if (now < ai.recoverUntil) {
			mode = "recover";
			active =
				enemy.type !== "none"
					? enemy
					: profile.meleeOnly
						? emptyBotTarget(bot, profile)
						: farm;
		} else if (now < ai.retreatUntil) {
			mode = "retreat";
			active = enemy.type !== "none" ? enemy : farm;
		} else if (needsSeedSquare && (!canPressEnemy || enemy.killConfirm < 0.74)) {
			mode = "farm";
			active = farm;
		} else if (
			enemy.type === "tank" &&
			(enemy.baseDanger < 0.72 || enemy.killConfirm > 0.9) &&
			(enemy.killConfirm > 0.86 ||
				enemy.score > farm.score + 35 ||
				profile.aggression > 0.58)
		) {
			mode =
				enemy.dist > enemy.desiredRange + 100 &&
					(enemy.shouldRam || enemy.score > 360)
					? "chase"
					: "engage";
			active = enemy;
		} else if (farm.type === "shape") {
			mode = "farm";
			active = farm;
		} else {
			mode = "patrol";
			active = enemy.type === "tank" ? enemy : farm;
		}

		if (ai.mode !== mode) {
			ai.mode = mode;
			ai.lastModeChangeAt = now;
		}

		if (active.type === "tank" && active.target) {
			ai.focusTankUid = active.target.uid | 0;
			ai.focusUntil = now + 1.2;
			if (ai.focusShapeId) releaseClaim(bot, ai.focusShapeId);
			ai.focusShapeId = 0;
		} else if (active.type === "shape" && active.target) {
			ai.focusTankUid = 0;
			ai.focusShapeId = active.target.id | 0;
			ai.focusUntil = now + 1.1;
			claimTarget(bot, active.target);
		} else {
			ai.focusTankUid = 0;
			if (ai.focusShapeId) releaseClaim(bot, ai.focusShapeId);
			ai.focusShapeId = 0;
		}

		return active;
	}

	function botAim(bot: TankEntity, targetInfo: BotTargetInfo, dt: number) {
		const ai = ensureBotAI(bot);
		let aimX = ai.roamX;
		let aimY = ai.roamY;
		if (targetInfo.target) {
			aimX = targetInfo.aimX;
			aimY = targetInfo.aimY;
		} else if (Math.hypot(bot.vx || 0, bot.vy || 0) > 16) {
			aimX = bot.x + (bot.vx || 0) * 0.35;
			aimY = bot.y + (bot.vy || 0) * 0.35;
		}
		ai.aimX = aimX;
		ai.aimY = aimY;
		const maxTurn = (ai.mode === "chase" ? 6.8 : 5.4) * dt;
		let desired = Math.atan2(aimY - bot.y, aimX - bot.x);
		if (
			targetInfo.target &&
			hasRearFiringBarrel(bot) &&
			(ai.mode === "retreat" || ai.mode === "recover")
		) {
			desired += Math.PI;
		}
		bot.barrelAng = approachAngle(bot.barrelAng || 0, desired, maxTurn);
	}

	function botMove(
		bot: TankEntity,
		targetInfo: BotTargetInfo,
		profile: ReturnType<typeof botProfile>,
		dt: number,
	) {
		const ai = profile.ai;
		if (now >= ai.strafeSwapAt) {
			ai.strafeDir *= -1;
			ai.strafeSwapAt = now + randf(1.4, 2.8);
		}
		refreshBotRoamTarget(bot, profile);

		let moveX = 0;
		let moveY = 0;
		let speedMul = 1;
		const ownBase = getTeamBaseCenter(bot.teamIdx);
		const dodge = bulletAvoidance(bot, targetInfo, profile);
		const edge = worldAvoidance(bot);
		const baseAvoid = enemyBaseAvoidance(bot);
		const supportAvoid = friendlySupportAvoidance(bot);
		const trafficAvoid = tankTrafficAvoidance(bot, targetInfo);
		const holdGround =
			targetInfo.type === "tank" &&
			(targetInfo.killConfirm > 0.72 || targetInfo.duelEdge > 0.24);
		const droneWallPressure =
			targetInfo.type === "tank"
				? targetInfo.shouldRam || holdGround
					? 0.14
					: ai.mode === "chase"
						? 0.32
						: 0.52
				: 1;
		const protectorWallPressure =
			targetInfo.type === "tank"
				? targetInfo.shouldRam || holdGround
					? 0.2
					: ai.mode === "chase"
						? 0.38
						: 0.62
				: 1;
		const dodgeWeight =
			ai.mode === "recover" || ai.mode === "retreat"
				? 1.4
				: targetInfo.type === "tank" && (targetInfo.shouldRam || holdGround)
					? 0.62
					: ai.mode === "chase"
						? 0.88
						: ai.mode === "engage"
							? 1.05
							: 1.22;
		const dodgeWindow = ((physicsFrame / BOT_DODGE_WINDOW_FRAMES) | 0) + (bot.uid | 0) * 131;
		const shouldCommitDodge =
			dodge.risk < 0.12 || hashUnit(dodgeWindow) < BOT_DODGE_TRIGGER_CHANCE;
		const effectiveDodgeWeight = shouldCommitDodge ? dodgeWeight : dodgeWeight * 0.22;

		if (targetInfo.target) {
			const dx = targetInfo.target.x - bot.x;
			const dy = targetInfo.target.y - bot.y;
			const dist = Math.hypot(dx, dy) || 1;
			const ux = dx / dist;
			const uy = dy / dist;
			const tx = -uy * ai.strafeDir;
			const ty = ux * ai.strafeDir;
			if (ai.mode === "recover" || ai.mode === "retreat") {
				const backpedal = holdGround ? 0.55 : 1.35;
				const strafe = holdGround ? 0.8 : 0.25;
				moveX += -ux * backpedal + tx * strafe;
				moveY += -uy * backpedal + ty * strafe;
				speedMul = 1;
			} else if (ai.mode === "chase") {
				if (targetInfo.shouldRam) {
					moveX += ux * 1.85;
					moveY += uy * 1.85;
					speedMul = 1.12;
				} else {
					const crowdedAdvance =
						trafficAvoid.enemyPack >= 2 &&
						targetInfo.killConfirm < 0.78 &&
						!targetInfo.shouldRam;
					moveX +=
						ux * (targetInfo.shouldRam ? 1.45 : crowdedAdvance ? 0.66 : 1.0) +
						tx * (crowdedAdvance ? 0.56 : 0.22);
					moveY +=
						uy * (targetInfo.shouldRam ? 1.45 : crowdedAdvance ? 0.66 : 1.0) +
						ty * (crowdedAdvance ? 0.56 : 0.22);
					speedMul = crowdedAdvance ? 0.82 : 1;
				}
			} else if (ai.mode === "engage") {
				if (targetInfo.shouldRam) {
					const close = dist <= targetInfo.desiredRange + 10;
					moveX += ux * (close ? 1.28 : 1.62);
					moveY += uy * (close ? 1.28 : 1.62);
					speedMul = close ? 1.04 : 1.12;
				} else {
					const rangeError =
						(dist - targetInfo.desiredRange) /
						Math.max(90, targetInfo.desiredRange);
					moveX +=
						ux *
						constrain(rangeError * 1.35, -1.08, 1.08) +
						tx *
						(profile.strafeBias *
							(0.42 + 0.55 * (1 - clamp01(Math.abs(rangeError)))));
					moveY +=
						uy *
						constrain(rangeError * 1.35, -1.08, 1.08) +
						ty *
						(profile.strafeBias *
							(0.42 + 0.55 * (1 - clamp01(Math.abs(rangeError)))));
					if (targetInfo.blocked > 0.3) {
						moveX += tx * 0.6;
						moveY += ty * 0.6;
					}
					speedMul = targetInfo.shouldRam ? 1 : 0.94;
				}
			} else if (ai.mode === "farm") {
				const closeEnough = dist <= targetInfo.desiredRange + 18;
				const radial = closeEnough ? (targetInfo.shouldRam ? 0.95 : -0.32) : 0.9;
				moveX += ux * radial + tx * (targetInfo.shouldRam ? 0.12 : 0.24);
				moveY += uy * radial + ty * (targetInfo.shouldRam ? 0.12 : 0.24);
				speedMul = 0.86;
			}
		}

		if (ai.mode === "patrol" || (!targetInfo.target && ai.mode === "farm")) {
			const dx = ai.roamX - bot.x;
			const dy = ai.roamY - bot.y;
			const dist = Math.hypot(dx, dy) || 1;
			moveX += dx / dist;
			moveY += dy / dist;
			speedMul = 0.82;
			if (dist < 80) refreshBotRoamTarget(bot, profile, true);
		}

		if (ai.mode === "retreat" || ai.mode === "recover") {
			const dx = ownBase.x - bot.x;
			const dy = ownBase.y - bot.y;
			const dist = Math.hypot(dx, dy) || 1;
			const homePull = holdGround ? 0.55 : ai.mode === "recover" ? 1.9 : 1.4;
			moveX += (dx / dist) * homePull;
			moveY += (dy / dist) * homePull;
		}

		moveX +=
			dodge.ax * effectiveDodgeWeight +
			edge.ax * 1.8 +
			baseAvoid.ax * 2.2 +
			supportAvoid.ax * 1.35 +
			trafficAvoid.ax * 1.55;
		moveY +=
			dodge.ay * effectiveDodgeWeight +
			edge.ay * 1.8 +
			baseAvoid.ay * 2.2 +
			supportAvoid.ay * 1.35 +
			trafficAvoid.ay * 1.55;

		const desiredSpeed = Math.max(
			150,
			profile.d.maxSpeed *
			speedMul *
			(trafficAvoid.congestion > 0.42 ? 0.84 : 1),
		);
		const [adjX, adjY] = rvoAdjust(
			{
				x: bot.x,
				y: bot.y,
				vx: bot.vx || 0,
				vy: bot.vy || 0,
				r: bot.r,
				teamIdx: bot.teamIdx,
			},
			moveX * desiredSpeed,
			moveY * desiredSpeed,
			{
				enemyDroneWeight: droneWallPressure,
				enemyProtectorWeight: protectorWallPressure,
			},
		);
		const L = Math.hypot(adjX, adjY) || 1;
		bot.accelMul = ai.mode === "recover" ? 0.96 : 1;
		bot.maxSpeedMul =
			ai.mode === "engage" && !targetInfo.shouldRam && baseAvoid.danger < 0.15
				? 0.95
				: 1;
		updateTankPhysicsCore(bot, dt, adjX / L, adjY / L);
	}

	function botFireDecision(
		bot: TankEntity,
		targetInfo: BotTargetInfo,
		profile: ReturnType<typeof botProfile>,
		dt: number,
	) {
		const ai = profile.ai;
		bot._fireCmd = false;
		if (profile.meleeOnly) return;

		if (!targetInfo.target) {
			fireFromTank(bot, dt);
			return;
		}

		const dx = targetInfo.aimX - bot.x;
		const dy = targetInfo.aimY - bot.y;
		const dist = Math.hypot(dx, dy);
		if (dist > Math.min(fovForTank(bot) + 180, 1350)) {
			fireFromTank(bot, dt);
			return;
		}

		const tgtAng = Math.atan2(dy, dx);
		const dang = tankAimDelta(bot, tgtAng);
		let threshold =
			(targetInfo.type === "tank" ? 0.14 : 0.18) +
			Math.max(0, dist - 420) / 2600;
		if (targetInfo.shouldRam) threshold += 0.08;
		if (targetInfo.blocked > 0.32 && targetInfo.type === "tank")
			threshold *= 0.58;
		const inRange =
			dist <=
			targetInfo.desiredRange +
			(targetInfo.type === "tank"
				? profile.cfg.maxRange * profile.cfg.chaseWindow
				: 260);
		let shouldFire = inRange && dang < threshold;
		if (ai.mode === "recover" && targetInfo.killConfirm < 0.68) {
			shouldFire = shouldFire && dist < 420;
		}
		if (
			targetInfo.type === "tank" &&
			targetInfo.score > 320 &&
			targetInfo.blocked < 0.45 &&
			dang < threshold * 1.35
		) {
			ai.burstUntil = Math.max(
				ai.burstUntil,
				now + 0.16 + profile.cfg.aggression * 0.24,
			);
		}
		if (now < ai.burstUntil && inRange && dang < threshold * 1.45) {
			shouldFire = true;
		}
		if (
			targetInfo.type === "tank" &&
			(targetInfo.killConfirm > 0.72 || targetInfo.duelEdge > 0.2) &&
			inRange &&
			dang < threshold * 1.25
		) {
			shouldFire = true;
		}
		if (
			targetInfo.type === "shape" &&
			targetInfo.shouldRam &&
			dist < (targetInfo.target.r || 20) + bot.r + 12
		) {
			shouldFire = false;
		}
		bot._fireCmd = shouldFire;
		fireFromTank(bot, dt);
	}

	function fireFromTank(t: TankEntity, dt: number) {
		if (t.isDead) return;
		const d = derived(t);
		t.reloadTimer -= dt;
		if (!t._fireCmd || t.reloadTimer > 0) return;

		const baseAng = t.barrelAng || 0;
		const spread = random(-0.08, 0.08);
		const volley = tankVolleyBarrels(t);
		if (!volley.length) return;
		for (let i = 0; i < volley.length; i++) {
			spawnBulletFromTankBarrel(t, d, volley[i], baseAng, spread);
		}
		t.barrelKick = Math.min(1, (t.barrelKick || 0) + 0.7);
		t.reloadTimer = d.reload;
	}

	function updateTankPhysicsCore(t: TankEntity, dt: number, ix: number, iy: number) {
		const d = derived(t);

		if (t.invincible && (ix !== 0 || iy !== 0 || t._fireCmd)) {
			t.invincible = false;
		}

		const accelMul = t.accelMul ?? 1;
		const maxSpdMul = Math.min(1, t.maxSpeedMul ?? 1);

		const effAccel = d.accel * accelMul;
		const effMaxSpd = d.maxSpeed * maxSpdMul;

		t.vx = (t.vx || 0) + ix * effAccel * dt;
		t.vy = (t.vy || 0) + iy * effAccel * dt;

		t.vx += t.recoilX || 0;
		t.vy += t.recoilY || 0;
		t.recoilX = (t.recoilX || 0) * DECAY_RECOIL;
		t.recoilY = (t.recoilY || 0) * DECAY_RECOIL;
		t.vx *= DECAY_PLAYER_DRAG;
		t.vy *= DECAY_PLAYER_DRAG;
		t.barrelKick = (t.barrelKick || 0) * DECAY_RECOIL;

		const sp = Math.hypot(t.vx, t.vy);
		if (sp > effMaxSpd) {
			const s = effMaxSpd / sp;
			t.vx *= s;
			t.vy *= s;
		}

		t.x = constrain(t.x + t.vx * dt, t.r, WORLD.w - t.r);
		t.y = constrain(t.y + t.vy * dt, t.r, WORLD.h - t.r);

		const sinceHit = now - (t.lastHit || -1e9);
		const wasTankHit =
			typeof t.lastDamagedBy === "string" &&
			t.lastDamagedBy.startsWith("tankuid:");
		const inTankCombat = wasTankHit && sinceHit < TANK_COMBAT_COOLDOWN;

		let regenMul = 1;
		if (sinceHit > HYPER_REGEN_AFTER) {
			regenMul = HYPER_REGEN_MULT;
		} else if (inTankCombat) {
			regenMul = 0;
		}

		if (regenMul > 0 && t.hp < d.maxHP) {
			const amt = d.maxHP * d.regenRate * regenMul * dt;
			t.hp = Math.min(t.hp + amt, d.maxHP);
		}
		const hpAnimSpd = 14;
		t.hpVis += (t.hp - t.hpVis) * Math.min(1, hpAnimSpd * dt);
		if (t.hitTimer > 0) t.hitTimer -= dt;
	}

	function isTankVisibleInView(
		t: TankEntity,
		minX: number,
		minY: number,
		maxX: number,
		maxY: number,
		margin = 0,
	) {
		const r = (t.r || 0) + margin;
		return !(
			t.x + r < minX ||
			t.x - r > maxX ||
			t.y + r < minY ||
			t.y - r > maxY
		);
	}

	function botActivityTier(bot: TankEntity) {
		const z = cam.zoom || 1;
		const halfW = width / (2 * z);
		const halfH = height / (2 * z);
		const dx = Math.abs(bot.x - cam.x);
		const dy = Math.abs(bot.y - cam.y);
		const r = bot.r || 0;
		if (dx <= halfW + r + BOT_RENDER_MARGIN && dy <= halfH + r + BOT_RENDER_MARGIN) {
			return 0;
		}
		if (dx <= halfW + ACTIVE_PAD && dy <= halfH + ACTIVE_PAD) return 1;
		if (dx <= halfW + ACTIVE_PAD * 2 && dy <= halfH + ACTIVE_PAD * 2) return 2;
		return 3;
	}

	function botThinkStride(ai: BotAIState, tier: number) {
		if (tier <= 1) return 1;
		if (tier === 2) return BOT_AI_THINK_MID_FRAMES;
		if (
			ai.mode === "engage" ||
			ai.mode === "chase" ||
			ai.mode === "retreat" ||
			ai.mode === "recover" ||
			now - ai.lastDamageAt < 1.2
		) {
			return BOT_AI_THINK_MID_FRAMES;
		}
		return BOT_AI_THINK_FAR_FRAMES;
	}

	function drawTank(t: TankEntity) {
		const d = derived(t);
		const teamName = TEAMS[t.teamIdx].name;
		const baseBody = TEAM_TANK_COLORS[teamName];
		const darker = TEAM_TANK_COLORS_STROKE[teamName];

		const flashOn = t.invincible && (now * 4) % 1 < 0.5;
		const bodyFlash = getBodyFlash(teamName);
		const barrelFlash = getBarrelFlash();

		const bodyFill =
			t.hitTimer > 0 ? [255, 110, 110] : flashOn ? bodyFlash : baseBody;
		const barrelFill = flashOn ? barrelFlash : COLORS.playerBarrel;
		const borderCol = t.hitTimer > 0 ? [255, 110, 110] : darker;
		drawTankEntity(t, bodyFill, borderCol, barrelFill);

		if (t.hp < d.maxHP) {
			const w = 64,
				h = 6;
			drawBar(
				t.x - w / 2,
				t.y + t.r + 10,
				w,
				h,
				Math.max(0, t.hpVis) / d.maxHP,
				COLORS.hpFill,
				"",
				false,
				true,
				COLORS.barBg,
				UI.hpBarPad,
			);
		}
	}

	function botRegenLevelAndHPVis(bot: TankEntity) {
		while (
			(bot.level | 0) < LEVEL_CAP &&
			(bot.xp | 0) >= xpToLevel(bot.level | 0)
		) {
			bot.level++;
			updateTankRadius(bot);
			bot.hp = Math.min(bot.hp + 10, derived(bot).maxHP);
			bot.statPoints = (bot.statPoints | 0) + 1;
			spendBotStat(bot);
		}
		refreshPendingUpgrade(bot);
	}

	const bots: TankEntity[] = [];
	function updateBots(dt: number) {
		for (let i = 0; i < bots.length; i++) {
			const t = bots[i];
			if (!t) continue;
			if (t.isDead) continue;

			if (!t._hpInit) {
				const d = derived(t);
				t.hp = d.maxHP;
				t.hpVis = t.hp;
				t._hpInit = true;
				t.lifeStartTime = now;
				resetBotTacticalState(t);
			}
			if ((t.statPoints | 0) > 0) spendBotStat(t);
			activateBotPendingUpgrades(t);

			const ai = ensureBotAI(t);
			const tier = botActivityTier(t);
			const thinkStride = botThinkStride(ai, tier);
			const allowThink =
				thinkStride <= 1 ||
				((physicsFrame + (t.uid | 0)) % thinkStride) === 0;
			const profile = updateBotTacticalFeedback(t, dt);
			let tgtInfo = t._targetInfo as BotTargetInfo | null | undefined;
			if (!tgtInfo || (allowThink && shouldRefreshBotTarget(t, tgtInfo))) {
				tgtInfo = botChooseTargets(t, profile);
				t._targetInfo = tgtInfo;
			}
			if (!tgtInfo) tgtInfo = emptyBotTarget(t, profile);

			botAim(t, tgtInfo, dt);
			botMove(t, tgtInfo, profile, dt);
			botFireDecision(t, tgtInfo, profile, dt);
			botRegenLevelAndHPVis(t);

			const d = derived(t);
			collideTankWithShapes(t, d);
			if (t.hp <= 0 && !t.isDead) onBotDeath(t);
		}
	}

	function drawBots(minX: number, minY: number, maxX: number, maxY: number) {
		const scale = screenScale();
		const labelS = Math.round(14 * scale);
		const scoreS = Math.round(12 * scale);
		const labelYOffset = 17 * scale;
		const scoreYOffset = 12 * scale;
		for (let i = 0; i < bots.length; i++) {
			const t = bots[i];
			if (!t) continue;
			if (!isTankVisibleInView(t, minX, minY, maxX, maxY, BOT_RENDER_MARGIN)) continue;

			drawTank(t);

			if (distanceSq(t.x, t.y, cam.x, cam.y) > BOT_LABEL_MAX_DIST_SQ) continue;

			const yName = t.y - t.r - 32;
			const yScore = yName + 12;

			drawOutlinedText(
				t.name || "Bot",
				t.x,
				yName + t.r - labelYOffset,
				CENTER,
				BASELINE,
				labelS,
				true,
			);
			drawOutlinedText(
				formatShort(Math.floor(t.xp || 0)),
				t.x,
				yScore + t.r - scoreYOffset,
				CENTER,
				BASELINE,
				scoreS,
				true,
			);
		}
	}

	function spawnBotsToFillTeams() {
		const playerTeam = player.teamIdx | 0;
		const wantPerTeam = 4;

		const counts = new Array(TEAMS.length).fill(0);
		for (const t of tanks) if (t && !t.isDead) counts[t.teamIdx]++;

		for (let ti = 0; ti < TEAMS.length; ti++) {
			const have = counts[ti] + (ti === playerTeam ? 0 : 0);
			const need =
				ti === playerTeam
					? Math.max(0, wantPerTeam - 1)
					: Math.max(0, wantPerTeam);
			const toMake = need - (have - (ti === playerTeam ? 1 : 0));
			for (let k = 0; k < toMake; k++) {
				const b = makeBot(ti);
				bots.push(b);
				tanks.push(b);
			}
		}
	}

	function initBaseProtectors() {
		TEAM_PROTECTORS = [];
		TEAM_LIMIT_R = [];
		for (let i = 0; i < TEAMS.length; i++) {
			const bc = getTeamBaseCenter(i);
			const col = TEAM_TANK_COLORS[TEAMS[i].name];
			const rct = getTeamBaseRect(i);
			const limitR = Math.hypot(rct.w, rct.h) / 2 + 640;
			const homeR = 180;
			const idleOmega = 1.2;
			TEAM_LIMIT_R[i] = limitR;
			TEAM_PROTECTORS[i] = [];
			for (let k = 0; k < 9; k++) {
				const th = (k / 9) * TAU;
				const sh = addShape("dia", bc.x, bc.y, {
					r: 14,
					col,
					invincible: true,
					ai: "protector",
					rvo: true,
					seekSpd: 1420,
					aiAccel: 4200,
					friction: 4.2,
					teamIdx: i,
					baseCenter: bc,
					homeTheta: th,
					homeR,
					limitR,
					idleOmega,
				});
				TEAM_PROTECTORS[i].push(sh);
				sh.cx = bc.x + Math.cos(th) * homeR;
				sh.cy = bc.y + Math.sin(th) * homeR;
				sh.x = sh.cx;
				sh.y = sh.cy;
				sh.rotSpd = 2.8;
				const idx = shapes.indexOf(sh);
				if (idx >= 0) {
					S_x[idx] = sh.x;
					S_y[idx] = sh.y;
					gridMaybeUpdateShape(idx);
				}
			}
		}
	}

	function killShape(sh: ShapeEntity, awardTo: TankEntity | null = null) {
		shapeClaims.delete(sh.id);
		if (DEBUG) debugShapes.logKill(sh, "killShape()");
		if (spawner && spawner.onShapeDied && sh.ai !== "drone") spawner.onShapeDied(sh);
		if (!sh.dying) {
			const reg = sh.spawnRegion || regionFor(sh.cx, sh.cy);
			if (!sh.ai && shouldCount(sh.type, reg)) {
				if (reg === "outer") liveCounts.outer[sh.type]--;
				else if (reg === "ring") liveCounts.ring[sh.type]--;
				else if (reg === "core" && sh.type === "pent")
					liveCounts.core.pent--;
			}
			const receiver = awardTo && !awardTo.isDead ? awardTo : player;
			receiver.xp += sh.xp * XP_GAIN_MULT;
			sh.dying = true;
			sh.deathTimer = 0.28;
		}
	}

	function regionFor(x: number, y: number) {
		const cx = WORLD.w / 2,
			cy = WORLD.h / 2;
		const d = dist(x, y, cx, cy);
		if (d <= CENTER_CORE_R) return "core";
		if (d <= CENTER_RING_R) return "ring";
		return "outer";
	}
	function shouldCount(kind: string, region: string) {
		if (kind === "pent") return true;
		if (kind === "sqr" || kind === "tri")
			return region === "ring" || region === "outer";
		return false;
	}

	function getTankByUid(uid: number): TankEntity | null {
		for (const t of tanks) {
			if (t && t.uid === uid) return t;
		}
		return null;
	}

	function protectorAssignmentCount(target: TankEntity) {
		const d = derived(target);
		const targetSpeed = Math.max(d.maxSpeed, Math.hypot(target.vx || 0, target.vy || 0));
		return isMeleeTankClass(target.tankClass || "basic") || targetSpeed >= 520 ? 4 : 3;
	}

	function chooseProtectorInvader(teamIdx: number) {
		const bc = getTeamBaseCenter(teamIdx);
		const limit = TEAM_LIMIT_R[teamIdx] || 0;
		let best: TankEntity | null = null;
		let bestScore = -1e9;
		for (let i = 0; i < tanks.length; i++) {
			const t = tanks[i];
			if (!t || t.isDead) continue;
			if ((t.teamIdx | 0) === teamIdx) continue;
			const dx = t.x - bc.x;
			const dy = t.y - bc.y;
			const dist = Math.hypot(dx, dy);
			if (dist > limit) continue;
			const depth = clamp01(1 - dist / Math.max(1, limit));
			const d = derived(t);
			const speed = Math.max(d.maxSpeed, Math.hypot(t.vx || 0, t.vy || 0));
			const outwardSpeed =
				dist > 1 ? (dx * (t.vx || 0) + dy * (t.vy || 0)) / dist : 0;
			const score =
				depth * 340 +
				speed * 0.42 +
				(isMeleeTankClass(t.tankClass || "basic") ? 140 : 0) +
				(t.level | 0) * 4 +
				Math.max(0, outwardSpeed) * 0.32;
			if (score > bestScore) {
				bestScore = score;
				best = t;
			}
		}
		return best;
	}

	function updateProtectorAssignments() {
		const nowT = now;
		for (let teamIdx = 0; teamIdx < TEAMS.length; teamIdx++) {
			const invader = chooseProtectorInvader(teamIdx);
			const locks =
				protectorLocks[teamIdx] || (protectorLocks[teamIdx] = {});
			for (const k in locks) {
				if (locks[k].until < nowT) delete locks[k];
			}

			if (!invader) continue;

			const tid = String(invader.uid || 0);
			const requiredCount = protectorAssignmentCount(invader);
			const entry = locks[tid];
			if (entry && entry.chosenIds && entry.chosenIds.length >= requiredCount) {
				entry.requiredCount = requiredCount;
				entry.until = nowT + PROTECTOR_STICKY_SEC;
				continue;
			}

			const used: Record<number, number> = {};
			for (const k in locks) {
				const e = locks[k];
				const a = e.chosenIds || [];
				for (let j = 0; j < a.length; j++) used[a[j]] = 1;
			}

			const arr = TEAM_PROTECTORS[teamIdx] || [];
			const candidates: Array<{ id: number; dist2: number }> = [];
			for (let i = 0; i < arr.length; i++) {
				const sh = arr[i];
				if (!sh || sh.dead || sh.dying) continue;
				if (used[sh.id]) continue;
				const dx = sh.x - invader.x;
				const dy = sh.y - invader.y;
				candidates.push({ id: sh.id, dist2: dx * dx + dy * dy });
			}
			candidates.sort((a, b) => a.dist2 - b.dist2);
			const chosen = candidates
				.slice(0, requiredCount)
				.map((candidate) => candidate.id);
			if (chosen.length)
				locks[tid] = {
					chosenIds: chosen,
					until: nowT + PROTECTOR_STICKY_SEC,
					requiredCount,
				};
		}
	}

	function assignedTargetForProtector(sh: ShapeEntity) {
		const locks = protectorLocks[sh.teamIdx] || {};
		for (const key of Object.keys(locks)) {
			const entry = locks[key];
			if (entry.until < now) continue;
			if (entry.chosenIds && entry.chosenIds.indexOf(sh.id) !== -1) {
				const uid = +key;
				return getTankByUid(uid);
			}
		}
		return null;
	}

	function updateShapes(dt: number) {
		tickSpawnGrace(dt);
		if ((physicsFrame & 7) === 0) updateProtectorAssignments();

		const pad = ACTIVE_PAD;
		const actMinX = cam.x - width / 2 - pad;
		const actMaxX = cam.x + width / 2 + pad;
		const actMinY = cam.y - height / 2 - pad;
		const actMaxY = cam.y + height / 2 + pad;

		const velDecay = DECAY_SHAPE_VEL;

		for (let i = 0; i < shapes.length; i++) {
			const sh = shapes[i];
			if (!sh) continue;
			const prevX = sh.x;
			const prevY = sh.y;

			if (sh.hitTimer > 0) sh.hitTimer -= dt;
			if (sh.hitTimer2 > 0) sh.hitTimer2 -= dt;

			if (sh.dying) {
				sh.deathTimer -= dt;
				if (sh.deathTimer <= 0) {
					sh.dead = true;
					gridRemoveShape(i);
					shapeFree.push(i);
					sh._freed = true;
				}
			}
			if (sh.dead) {
				S_dead[i] = 1;
				continue;
			}

			const active =
				(sh.x >= actMinX &&
					sh.x <= actMaxX &&
					sh.y >= actMinY &&
					sh.y <= actMaxY) ||
				sh.ai;
			const wasActive = sh.active | 0;
			sh.active = active ? 1 : 0;

			if (!active) {
				sh.rot += sh.rotSpd * dt;
				const sinceHit0 = now - sh.lastHit;
				if (sinceHit0 > shapeRegenDelay(sh) && sh.hp < sh.maxHp) {
					const rate0 = shapeRegenRate(sh);
					sh.hp = Math.min(sh.hp + sh.maxHp * rate0 * dt, sh.maxHp);
				}
				const hpAnimSpd0 = 16;
				sh.hpVis += (sh.hp - sh.hpVis) * Math.min(1, hpAnimSpd0 * dt);
				continue;
			}

			if (!sh.dying) {
				if (sh.ai === "seek") {
					if (sh.isCrasher && player.isDead) {
						sh.dying = true;
						sh.deathTimer = 0.18;
					} else {
						const pvx = player.vx || 0,
							pvy = player.vy || 0;
						const dx0 = player.x - sh.x,
							dy0 = player.y - sh.y;
						const d0 = Math.hypot(dx0, dy0) || 1;
						const lead = Math.min(0.35, d0 / 900);
						const px = player.x + pvx * lead,
							py = player.y + pvy * lead;
						const tx = px - sh.x,
							ty = py - sh.y;
						const td = Math.hypot(tx, ty) || 1;
						const ux = tx / td,
							uy = ty / td;

						const sp = sh.seekSpd || 200;
						let desx = ux * sp,
							desy = uy * sp;

						const tackleR = sh.r + player.r + 24;
						const useRVO = sh.rvo && d0 > tackleR;

						if (useRVO) {
							const adj = rvoAdjust(sh, desx, desy);
							const ds2 = Math.hypot(adj[0], adj[1]);
							if (ds2 > sp) {
								desx = (adj[0] / ds2) * sp;
								desy = (adj[1] / ds2) * sp;
							} else {
								desx = adj[0];
								desy = adj[1];
							}
						} else {
							desx += ux * 240;
							desy += uy * 240;
							const tnx = -uy,
								tny = ux;
							const tang = (sh.vx || 0) * tnx + (sh.vy || 0) * tny;
							sh.vx -= tnx * tang * 0.6;
							sh.vy -= tny * tang * 0.6;
						}

						const ds = Math.hypot(desx, desy);
						if (ds > sp) {
							desx = (desx / ds) * sp;
							desy = (desy / ds) * sp;
						}
						const k = sh.aiKSeek || 0.2;
						sh.vx = (sh.vx || 0) + (desx - (sh.vx || 0)) * k;
						sh.vy = (sh.vy || 0) + (desy - (sh.vy || 0)) * k;
						const fr = sh.frFactor || DECAY_SHAPE_VEL;
						sh.vx *= fr;
						sh.vy *= fr;
						sh.cx += sh.vx * dt;
						sh.cy += sh.vy * dt;
						sh.rot += sh.rotSpd * dt;
					}
				} else if (sh.ai === "drone") {
					const owner = sh.ownerUid ? getTankByUid(sh.ownerUid | 0) : null;
					const ownerDef = owner ? tankDroneConfig(owner) : null;
					if (!owner || owner.isDead || !ownerDef) {
						sh.dying = true;
						sh.deathTimer = 0.14;
						sh.xp = 0;
					} else {
						const tx = (sh.targetX ?? owner.x) - sh.x;
						const ty = (sh.targetY ?? owner.y) - sh.y;
						const td = Math.hypot(tx, ty) || 1;
						const sp = sh.seekSpd || ownerDef.droneSpeed || 320;
						const slowR = Math.max(36, sh.r * 4.5);
						const arriveMul =
							td < slowR ? 0.18 + 0.82 * (td / slowR) : 1;
						const desx = (tx / td) * sp * arriveMul;
						const desy = (ty / td) * sp * arriveMul;
						const steer = Math.min(
							1,
							((sh.aiAccel || 2600) * dt) / Math.max(1, sp),
						);
						sh.vx = (sh.vx || 0) + (desx - (sh.vx || 0)) * steer;
						sh.vy = (sh.vy || 0) + (desy - (sh.vy || 0)) * steer;
						const nidx = neighborIndices(sh.x, sh.y);
						for (let ni = 0; ni < nidx.length; ni++) {
							const other = shapes[nidx[ni]];
							if (!other || other === sh || other.dead || other.dying) continue;
							if (other.ai !== "drone" || (other.teamIdx | 0) !== (sh.teamIdx | 0))
								continue;
							const ddx = sh.x - other.x;
							const ddy = sh.y - other.y;
							const sep = sh.r + other.r + 8;
							const d2 = ddx * ddx + ddy * ddy;
							if (d2 <= 0 || d2 >= sep * sep) continue;
							const dist = Math.sqrt(d2);
							const push = (sep - dist) / sep;
							sh.vx += (ddx / dist) * push * 90;
							sh.vy += (ddy / dist) * push * 90;
						}
						const vsp = Math.hypot(sh.vx || 0, sh.vy || 0);
						if (vsp > sp) {
							const s = sp / vsp;
							sh.vx *= s;
							sh.vy *= s;
						}
						const fr = td < 28 ? 0.8 : 0.92;
						sh.vx *= fr;
						sh.vy *= fr;
						sh.cx += sh.vx * dt;
						sh.cy += sh.vy * dt;
						if (Math.abs(sh.vx || 0) + Math.abs(sh.vy || 0) > 1) {
							sh.rot = Math.atan2(sh.vy || 0, sh.vx || 0) + HALF_PI;
						}
					}
				} else if (sh.ai === "protector") {
					const bc = sh.baseCenter;
					const tgt = assignedTargetForProtector(sh);
					const enemy = !!tgt && tgt.teamIdx !== sh.teamIdx;
					const dToBase = enemy
						? Math.hypot(tgt.x - bc.x, tgt.y - bc.y)
						: Infinity;
					const canChase = enemy && dToBase <= sh.limitR;

					let targetX = bc.x;
					let targetY = bc.y;
					let targetSpd = 320;
					let useRVO = false;

					if (canChase && tgt) {
						sh.state = "chase";
						const pvx = tgt.vx || 0;
						const pvy = tgt.vy || 0;
						const tDer = derived(tgt);
						const targetSpeed = Math.max(tDer.maxSpeed, Math.hypot(pvx, pvy));
						const outwardSpeed =
							dToBase > 1
								? ((tgt.x - bc.x) * pvx + (tgt.y - bc.y) * pvy) / dToBase
								: 0;
						const catchSpeed = Math.min(
							3200,
							Math.max(
								sh.seekSpd || 700,
								targetSpeed * 1.85 +
								Math.max(280, Math.max(0, outwardSpeed) * 1.35) +
								340,
							),
						);
						const dxp = tgt.x - sh.x;
						const dyp = tgt.y - sh.y;
						const dp = Math.hypot(dxp, dyp) || 1;
						const lead = Math.min(
							0.55,
							dp / Math.max(220, catchSpeed - Math.min(targetSpeed, catchSpeed - 40)),
						);
						const px = tgt.x + pvx * lead;
						const py = tgt.y + pvy * lead;
						const trackDx = px - sh.x;
						const trackDy = py - sh.y;
						const trackD = Math.hypot(trackDx, trackDy) || 1;
						const ux = trackDx / trackD;
						const uy = trackDy / trackD;
						const flank = ((sh.id % 3) - 1) * Math.min(26, (tgt.r || 22) * 0.8);
						const contactR = Math.max(6, (tgt.r || 22) * 0.16);
						targetX = px - ux * contactR - uy * flank;
						targetY = py - uy * contactR + ux * flank;
						targetSpd = catchSpeed;
						useRVO =
							sh.rvo &&
							trackD > sh.r + tgt.r + 48 &&
							targetSpeed < targetSpd * 0.9;
					} else {
						sh.state = "idle";
						const orbitAng = (sh.homeTheta || 0) + now * (sh.idleOmega || 1.0);
						targetX = bc.x + Math.cos(orbitAng) * sh.homeR;
						targetY = bc.y + Math.sin(orbitAng) * sh.homeR;
						const homeDist = Math.hypot(targetX - sh.x, targetY - sh.y);
						targetSpd = homeDist > 40 ? 440 : 320;
					}

					const tx = targetX - sh.x;
					const ty = targetY - sh.y;
					const td = Math.hypot(tx, ty) || 1;
					let desx = (tx / td) * targetSpd;
					let desy = (ty / td) * targetSpd;

					if (useRVO) {
						const adj = rvoAdjust(sh, desx, desy);
						const ds2 = Math.hypot(adj[0], adj[1]);
						if (ds2 > targetSpd) {
							desx = (adj[0] / ds2) * targetSpd;
							desy = (adj[1] / ds2) * targetSpd;
						} else {
							desx = adj[0];
							desy = adj[1];
						}
					}

					const steer = Math.min(
						1,
						((sh.aiAccel || 2600) * dt) / Math.max(1, targetSpd),
					);
					sh.vx = (sh.vx || 0) + (desx - (sh.vx || 0)) * steer;
					sh.vy = (sh.vy || 0) + (desy - (sh.vy || 0)) * steer;
					if (!canChase) {
						const nidx = neighborIndices(sh.x, sh.y);
						for (let ni = 0; ni < nidx.length; ni++) {
							const other = shapes[nidx[ni]];
							if (!other || other === sh || other.dead || other.dying) continue;
							if (other.ai !== "protector" || (other.teamIdx | 0) !== (sh.teamIdx | 0))
								continue;
							const ddx = sh.x - other.x;
							const ddy = sh.y - other.y;
							const sep = sh.r + other.r + 14;
							const d2 = ddx * ddx + ddy * ddy;
							if (d2 <= 0 || d2 >= sep * sep) continue;
							const dist = Math.sqrt(d2);
							const push = (sep - dist) / sep;
							sh.vx += (ddx / dist) * push * 120;
							sh.vy += (ddy / dist) * push * 120;
						}
					}
					const fr = canChase ? sh.frFactor || DECAY_SHAPE_VEL : 0.92;
					sh.vx *= fr;
					sh.vy *= fr;
					sh.cx += sh.vx * dt;
					sh.cy += sh.vy * dt;
					sh.rot += Math.abs(sh.rotSpd || 2.6) * dt;
					sh.theta = 0;
				} else {
					const wobA = sh.wobbleA || 0,
						wobF = sh.wobbleF || 1,
						ph = sh.phase || 0;
					sh.theta +=
						(sh.orbitSpd + wobA * Math.sin(now * wobF + ph)) * dt;
					sh.rot += sh.rotSpd * dt;
				}

				sh.kvx *= velDecay;
				sh.kvy *= velDecay;
				if (!sh.ai) {
					sh.kvx += Math.cos(now * sh.jfx + sh.jphx) * sh.jamp * dt;
					sh.kvy += Math.sin(now * sh.jfy + sh.jphy) * sh.jamp * dt;
				}
				sh.kx += sh.kvx * dt;
				sh.ky += sh.kvy * dt;

				const ox = Math.cos(sh.theta || 0) * sh.orbitR,
					oy = Math.sin(sh.theta || 0) * sh.orbitR;
				let nx = sh.cx + ox + sh.kx,
					ny = sh.cy + oy + sh.ky;

				if (nx < sh.r) {
					nx = sh.r;
					sh.kvx *= -0.6;
				}
				if (ny < sh.r) {
					ny = sh.r;
					sh.kvy *= -0.6;
				}
				if (nx > WORLD.w - sh.r) {
					nx = WORLD.w - sh.r;
					sh.kvx *= -0.6;
				}
				if (ny > WORLD.h - sh.r) {
					ny = WORLD.h - sh.r;
					sh.kvy *= -0.6;
				}

				sh.kx = nx - (sh.cx + ox);
				sh.ky = ny - (sh.cy + oy);
				sh.x = nx;
				sh.y = ny;
				if (isSupportShape(sh) && !sh.dying)
					handleSupportShapeTankContacts(sh, prevX, prevY);
				if (sh.ai === "drone" && !sh.dying)
					handleDroneShapeContacts(sh, prevX, prevY);
				if (
					wasActive &&
					!sh.ai &&
					((physicsFrame + i) & 3) === 0 &&
					sh.x >= actMinX &&
					sh.x <= actMaxX &&
					sh.y >= actMinY &&
					sh.y <= actMaxY
				)
					relaxOverlapSingle(sh, 1);
			}

			const sinceHit = now - sh.lastHit;
			if (sinceHit > shapeRegenDelay(sh) && sh.hp < sh.maxHp) {
				const rate = shapeRegenRate(sh);
				sh.hp = Math.min(sh.hp + sh.maxHp * rate * dt, sh.maxHp);
			}
			const hpAnimSpd = 16;
			sh.hpVis += (sh.hp - sh.hpVis) * Math.min(1, hpAnimSpd * dt);

			S_x[i] = sh.x;
			S_y[i] = sh.y;
			S_vx[i] = sh.vx || 0;
			S_vy[i] = sh.vy || 0;
			S_r[i] = sh.r;
			S_hp[i] = sh.hp;
			S_hpVis[i] = sh.hpVis;
			S_dead[i] = 0;
			S_dying[i] = sh.dying ? 1 : 0;

			if (sh.dead) {
				gridRemoveShape(i);
			} else {
				const needGrid =
					(sh.active | 0) === 1 &&
					(sh.ai || ((physicsFrame + i) & 1) === 0);
				if (needGrid) gridMaybeUpdateShape(i);
			}
		}
	}

	function drawTankEntity(
		t: TankEntity,
		bodyFill: number[],
		borderCol: number[],
		barrelFill: number[],
	) {
		const def = getTankClassDef(t.tankClass || "basic");
		const d = derived(t);
		push();
		translate(t.x, t.y);
		drawTankDecoration(
			def,
			t.r,
			(def.bodyDecoration?.previewAngle || 0) +
			now * (def.bodyDecoration?.spinSpeed || 0),
		);
		drawTankBarrels(t, t.barrelAng || 0, barrelFill, d.recoilMul || 1);
		if ((def.bodyShape || "circle") === "square") {
			rotate(t.barrelAng || 0);
		}
		drawTankBodyShape(
			def.bodyShape || "circle",
			t.r,
			bodyFill,
			borderCol,
			def.bodyScale || 1,
		);
		pop();
	}

	function drawLeaderboardTankIcon(t: TankEntity, x: number, y: number) {
		const def = getTankClassDef(t.tankClass || "basic");
		const iconAng = tankClassUsesDrones(t.tankClass || "basic")
			? def.previewAngle ?? -PI / 2 + 0.12
			: 0;
		const teamName = TEAMS[t.teamIdx].name;
		const body = TEAM_TANK_COLORS[teamName];
		const border = TEAM_TANK_COLORS_STROKE[teamName];
		const preview = {
			r: 18,
			barrelKick: 0,
			barrelAng: iconAng,
			tankClass: t.tankClass || "basic",
		} as TankEntity;
		push();
		translate(x, y);
		scale(0.46);
		drawTankDecoration(def, preview.r, def.bodyDecoration?.previewAngle || 0);
		drawTankBarrels(
			preview,
			iconAng,
			COLORS.playerBarrel,
			def.stats?.recoilMul || 1,
		);
		if ((def.bodyShape || "circle") === "square") {
			rotate(iconAng);
		}
		drawTankBodyShape(
			def.bodyShape || "circle",
			preview.r,
			body,
			border,
			def.bodyScale || 1,
		);
		pop();
	}

	function drawPlayer() {
		const d = dFrame;
		const teamName = TEAMS[player.teamIdx].name;
		const baseBody = TEAM_TANK_COLORS[teamName];
		const darker = TEAM_TANK_COLORS_STROKE[teamName];

		const flashOn = player.invincible && (now * 4) % 1 < 0.5;
		const bodyFlash = getBodyFlash(teamName);
		const barrelFlash = getBarrelFlash();

		const bodyFill =
			player.hitTimer > 0
				? [255, 110, 110]
				: flashOn
					? bodyFlash
					: baseBody;
		const barrelFill = flashOn ? barrelFlash : COLORS.playerBarrel;
		const borderCol = player.hitTimer > 0 ? [255, 110, 110] : darker;
		drawTankEntity(player, bodyFill, borderCol, barrelFill);

		if (player.hp < d.maxHP) {
			const w = 64,
				h = 6;
			drawBar(
				player.x - w / 2,
				player.y + player.r + 10,
				w,
				h,
				Math.max(0, player.hpVis) / d.maxHP,
				COLORS.hpFill,
				"",
				false,
				true,
				COLORS.barBg,
				UI.hpBarPad,
			);
		}
	}

	function drawBullets(minX: number, minY: number, maxX: number, maxY: number) {
		for (let j = 0; j < bullets.length; j++) {
			const i = bullets[j]._bi | 0;
			if (B_dead[i]) continue;

			const x = B_x[i],
				y = B_y[i],
				r = B_r[i];
			if (!B_dying[i] && (x < minX || x > maxX || y < minY || y > maxY))
				continue;

			const teamIdx =
				B_team[i] >= 0 && B_team[i] < TEAMS.length
					? B_team[i]
					: player.teamIdx;
			const teamName = TEAMS[teamIdx].name;
			const body = TEAM_TANK_COLORS[teamName];
			const darker = TEAM_TANK_COLORS_STROKE[teamName];

			if (!B_dying[i]) {
				fill(...body);
				stroke(...darker);
				strokeWeight(4);
				circle(x, y, r * 2);
			} else {
				const t = Math.max(0, B_dieT[i]) / 0.18;
				const alpha = Math.floor(255 * t);
				const grow = 1 + (1 - t) * 0.35;
				noStroke();
				fill(body[0], body[1], body[2], alpha);
				circle(x, y, r * 2 * grow);
				noFill();
				stroke(darker[0], darker[1], darker[2], alpha);
				strokeWeight(4);
				circle(x, y, r * 2 * grow - 1.5);
			}
		}
	}

	function drawWorld(minX: number, minY: number, maxX: number, maxY: number) {
		const x0 = Math.max(0, minX | 0);
		const y0 = Math.max(0, minY | 0);
		const x1 = Math.min(WORLD.w, maxX | 0);
		const y1 = Math.min(WORLD.h, maxY | 0);

		const ctx = drawingContext;
		_ensureGridTile();

		ctx.save();
		ctx.fillStyle = WORLD_FILL_CSS;
		ctx.fillRect(x0 - 2, y0 - 2, x1 - x0 + 4, y1 - y0 + 4);
		if (!_gridPattern && _gridTile) {
			_gridPattern = ctx.createPattern(_gridTile, "repeat");
		}
		ctx.fillStyle = _gridPattern ?? WORLD_FILL_CSS;
		ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
		ctx.restore();

		if (minX <= 0 || minY <= 0 || maxX >= WORLD.w || maxY >= WORLD.h) {
			noFill();
			stroke(COLORS.bounds);
			strokeWeight(4);
			rect(0.5, 0.5, WORLD.w - 1, WORLD.h - 1, 8);
		}

		for (let i = 0; i < TEAMS.length; i++) {
			const r = getTeamBaseRect(i);
			const c = TEAMS[i].color;
			noStroke();
			fill(c[0], c[1], c[2], 70);
			rect(r.x, r.y, r.w, r.h, 8);
		}
	}

	function drawShapes(minX: number, minY: number, maxX: number, maxY: number) {
		const vis = collectVisibleIndices(minX, minY, maxX, maxY);
		_ensureBinCapacity(vis.length);

		let nS = 0,
			nT = 0,
			nP = 0,
			nD = 0,
			nH = 0;

		for (let ii = 0; ii < vis.length; ii++) {
			const i = vis[ii];
			const sh = shapes[i];
			if (!sh || sh.dead) continue;
			if (
				sh.x + sh.r < minX ||
				sh.x - sh.r > maxX ||
				sh.y + sh.r < minY ||
				sh.y - sh.r > maxY
			)
				continue;
			if (sh.type === "sqr") _binSqr[nS++] = i;
			else if (sh.type === "tri") _binTri[nT++] = i;
			else if (sh.type === "pent") _binPent[nP++] = i;
			else if (sh.type === "dia") _binDia[nD++] = i;
			else if (sh.type === "hex") _binHex[nH++] = i;
		}

		function drawOne(sh: ShapeEntity) {
			const baseCol = sh.col;
			const darkerBase = sh.colBorder;

			if (sh.dying) {
				const t = Math.max(0, sh.deathTimer) / 0.28;
				const alpha = Math.floor(255 * t);
				const grow = 1 + (1 - t) * 0.4;
				let col, colDark;
				if (sh.hitTimer > 0) {
					col = HIT_R;
					colDark = HIT_R_DARK;
				} else if (sh.hitTimer2 > 0) {
					col = HIT_W;
					colDark = HIT_W_DARK;
				} else {
					col = baseCol;
					colDark = darkerBase;
				}
				push();
				translate(sh.x, sh.y);
				rotate(sh.rot);
				noStroke();
				fill(col[0], col[1], col[2], alpha);
				if (sh.type === "dia") {
					drawRhombus(0, 0, sh.r * grow, 0.62);
					noFill();
					stroke(colDark[0], colDark[1], colDark[2], alpha);
					strokeWeight(4);
					strokeJoin(ROUND);
					drawRhombus(0, 0, sh.r * grow - 1.5, 0.62);
				} else {
					drawShapePath(0, 0, sh.sides, sh.r * grow, true);
					noFill();
					stroke(colDark[0], colDark[1], colDark[2], alpha);
					strokeWeight(4);
					strokeJoin(ROUND);
					drawShapePath(0, 0, sh.sides, sh.r * grow - 1.5, true);
				}
				pop();
				return;
			}

			let useCol, useDark, innerCol;
			if (sh.hitTimer > 0) {
				useCol = HIT_R;
				useDark = HIT_R_DARK;
				innerCol = HIT_R_INNER;
			} else if (sh.hitTimer2 > 0) {
				useCol = HIT_W;
				useDark = HIT_W_DARK;
				innerCol = HIT_W_INNER;
			} else {
				useCol = baseCol;
				useDark = darkerBase;
				innerCol = sh.colInner;
			}

			push();
			translate(sh.x, sh.y);
			rotate(sh.rot);
			noStroke();
			drawShapeFilledWithCenter(
				0,
				0,
				sh.sides,
				sh.r,
				useCol,
				sh.type,
				innerCol,
			);
			noFill();
			stroke(useDark[0], useDark[1], useDark[2]);
			strokeWeight(4);
			strokeJoin(ROUND);
			if (sh.type === "dia") drawRhombus(0, 0, sh.r - 1.5, 0.62);
			else drawShapePath(0, 0, sh.sides, sh.r - 1.5, true);
			pop();

			if (sh.ai !== "drone" && sh.hp < sh.maxHp) {
				const w = Math.max(50, sh.r * 1.8),
					h = 6;
				drawBar(
					sh.x - w / 2,
					sh.y + sh.r + 8,
					w,
					h,
					Math.max(0, sh.hpVis) / sh.maxHp,
					COLORS.hpFill,
					"",
					false,
					true,
					COLORS.barBg,
					UI.hpBarPad,
				);
			}
		}

		for (let k = 0; k < nS; k++) drawOne(shapes[_binSqr[k]]);
		for (let k = 0; k < nT; k++) drawOne(shapes[_binTri[k]]);
		for (let k = 0; k < nP; k++) drawOne(shapes[_binPent[k]]);
		for (let k = 0; k < nD; k++) drawOne(shapes[_binDia[k]]);
		for (let k = 0; k < nH; k++) drawOne(shapes[_binHex[k]]);
	}

	function drawShapeFilledWithCenter(
		x: number,
		y: number,
		sides: number,
		r: number,
		baseCol: number[],
		kind: string,
		innerCol?: number[],
	) {
		if (kind === "dia") {
			noStroke();
			fill(...baseCol);
			drawRhombus(x, y, r, 0.62);
			const c = innerCol || baseCol;
			noStroke();
			fill(c[0], c[1], c[2], 140);
			drawRhombus(x, y, r * 0.62, 0.62);
			return;
		}
		noStroke();
		if (sides === 4) {
			rectMode(CENTER);
			fill(...baseCol);
			rect(x, y, r * 2, r * 2, 2);
		} else {
			fill(...baseCol);
			drawShapePath(x, y, sides, r, true);
		}
		if (kind === "tri" || kind === "sqr") {
			const c = innerCol || baseCol;
			noStroke();
			fill(c[0], c[1], c[2], 140);
			const rr = r * 0.62;
			if (sides === 4) {
				rectMode(CENTER);
				rect(x, y, rr * 2, rr * 2, 1);
			} else {
				drawShapePath(x, y, sides, rr, true);
			}
		}
	}

	function drawShapePath(x: number, y: number, sides: number, r: number, rounded = false) {
		if (sides === 4 && rounded) {
			rectMode(CENTER);
			rect(x, y, r * 2, r * 2, 2);
			return;
		}
		const v = unitPoly(sides);
		push();
		translate(x, y);
		scale(r, r);
		strokeWeight(4 / r);
		beginShape();
		for (let i = 0; i < v.length; i++) {
			vertex(v[i][0], v[i][1]);
		}
		endShape(CLOSE);
		pop();
	}

	function drawRhombus(x: number, y: number, r: number, ratio: number) {
		const rx = r * ratio,
			ry = r;
		beginShape();
		vertex(x, y - ry);
		vertex(x + rx, y);
		vertex(x, y + ry);
		vertex(x - rx, y);
		endShape(CLOSE);
	}

	function lighten(c: number[], amt: number): number[] {
		return [
			c[0] + (255 - c[0]) * amt,
			c[1] + (255 - c[1]) * amt,
			c[2] + (255 - c[2]) * amt,
		];
	}

	function drawTextWithOutline(
		label: string,
		x: number,
		y: number,
		opts: DrawTextOptions = {},
	) {
		const {
			size = 16,
			bold = true,
			alignX = CENTER,
			alignY = CENTER,
		} = opts;
		push();
		textAlign(alignX, alignY);
		textSize(size);
		textStyle(bold ? BOLD : NORMAL);
		stroke(0, 0, 0, 220);
		strokeJoin(ROUND);
		strokeWeight(3);
		fill(...COLORS.barText);
		syncDrawState();
		if (drawingContext) {
			drawingContext.strokeText(label, x, y);
			drawingContext.fillText(label, x, y);
		} else {
			text(label, x, y);
		}
		pop();
	}

	function titleCaseLabel(label: string) {
		return label ? label.charAt(0).toUpperCase() + label.slice(1) : label;
	}

	function drawDeathKillerPreview(
		info: DeathInfo | null | undefined,
		x: number,
		y: number,
	) {
		if (!info) return "";
		if (
			info.killerTankClass &&
			info.killerTankTeamIdx !== null &&
			info.killerTankTeamIdx !== undefined
		) {
			const killerPreviewBaseAngle =
				getTankClassDef(info.killerTankClass).previewAngle ??
				(tankClassUsesDrones(info.killerTankClass) ? -PI / 2 + 0.12 : 0);
			const killerPreviewTank = {
				...player,
				x,
				y,
				r: 30,
				barrelKick: 0,
				barrelAng: killerPreviewBaseAngle + now * 1.35,
				tankClass: info.killerTankClass,
				teamIdx: info.killerTankTeamIdx,
			} as TankEntity;
			drawTankEntity(
				killerPreviewTank,
				TEAM_TANK_COLORS[TEAMS[info.killerTankTeamIdx].name],
				TEAM_TANK_COLORS_STROKE[TEAMS[info.killerTankTeamIdx].name],
				COLORS.playerBarrel,
			);
			return tankClassName(info.killerTankClass);
		}

		if (info.killerPreviewKind === "bullet") {
			const body = [150, 150, 150];
			const border = [108, 108, 108];
			fill(...body);
			stroke(...border);
			strokeWeight(4);
			circle(x, y, 34);
			return "Bullet";
		}

		if (
			(info.killerPreviewKind === "shape" ||
				info.killerPreviewKind === "protector") &&
			info.killerPreviewShape
		) {
			const kind = info.killerPreviewShape;
			const previewTeamIdx =
				info.killerPreviewTeamIdx !== undefined
					? info.killerPreviewTeamIdx
					: null;
			const hasTeamColor =
				info.killerPreviewKind === "protector" &&
				previewTeamIdx !== null &&
				previewTeamIdx >= 0 &&
				previewTeamIdx < TEAMS.length;
			const baseCol = hasTeamColor
				? TEAM_TANK_COLORS[TEAMS[previewTeamIdx].name]
				: SHAPES_DEF[kind].color;
			const borderCol = hasTeamColor
				? TEAM_TANK_COLORS_STROKE[TEAMS[previewTeamIdx].name]
				: [
					Math.max(0, Math.floor(baseCol[0] * 0.72)),
					Math.max(0, Math.floor(baseCol[1] * 0.72)),
					Math.max(0, Math.floor(baseCol[2] * 0.72)),
				];
			const innerCol = lighten(baseCol, 0.12);
			const sides =
				kind === "tri"
					? 3
					: kind === "sqr"
						? 4
						: kind === "pent"
							? 5
							: kind === "hex"
								? 6
								: 4;
			push();
			translate(x, y);
			rotate(now * (kind === "dia" ? 1.3 : 0.6));
			drawShapeFilledWithCenter(0, 0, sides, 30, baseCol, kind, innerCol);
			noFill();
			stroke(...borderCol);
			strokeWeight(4);
			strokeJoin(ROUND);
			if (kind === "dia") drawRhombus(0, 0, 28.5, 0.62);
			else drawShapePath(0, 0, sides, 28.5, true);
			pop();
			return info.killerPreviewKind === "protector"
				? "Protector"
				: titleCaseLabel(killerLabel(kind));
		}

		return "";
	}

	function upgradeMenuCardRects(count: number) {
		const cardW = 132;
		const cardH = 132;
		const gap = 10;
		const x0 = 14;
		const y0 = 62;
		if (count <= 1) return [{ x: x0, y: y0, w: cardW, h: cardH }];
		if (count === 2) {
			return [
				{ x: x0, y: y0, w: cardW, h: cardH },
				{ x: x0 + cardW + gap, y: y0, w: cardW, h: cardH },
			];
		}
		if (count === 4) {
			return [
				{ x: x0, y: y0, w: cardW, h: cardH },
				{ x: x0 + cardW + gap, y: y0, w: cardW, h: cardH },
				{ x: x0, y: y0 + cardH + gap, w: cardW, h: cardH },
				{ x: x0 + cardW + gap, y: y0 + cardH + gap, w: cardW, h: cardH },
			];
		}
		return [
			{ x: x0, y: y0, w: cardW, h: cardH },
			{ x: x0 + cardW + gap, y: y0, w: cardW, h: cardH },
			{ x: x0 + (cardW + gap) * 0.5, y: y0 + cardH + gap, w: cardW, h: cardH },
		];
	}

	function rotateLocalPoint(x: number, y: number, ang: number) {
		const ca = Math.cos(ang);
		const sa = Math.sin(ang);
		return {
			x: x * ca - y * sa,
			y: x * sa + y * ca,
		};
	}

	function tankDecorationRadius(def: TankClassDef, r: number) {
		return r * (def.bodyDecoration?.radiusMul || 1.5);
	}

	function drawTankDecoration(
		def: TankClassDef,
		r: number,
		rotation: number,
	) {
		const decor = def.bodyDecoration;
		if (!decor) return;
		const fillCol = decor.color || [56, 56, 56];
		const outerR = tankDecorationRadius(def, r);
		push();
		rotate(rotation);
		noStroke();
		fill(...fillCol);
		if (decor.kind === "hex") {
			drawShapePath(0, 0, 6, outerR, true);
			fill(80, 80, 80, 95);
			drawShapePath(0, 0, 6, outerR * 0.72, true);
		} else {
			const count = decor.count || 12;
			const innerR = r * (decor.innerRadiusMul || 1.16);
			beginShape();
			for (let i = 0; i < count * 2; i++) {
				const ang = -HALF_PI + (i * Math.PI) / count;
				const rad = i % 2 === 0 ? outerR : innerR;
				vertex(Math.cos(ang) * rad, Math.sin(ang) * rad);
			}
			endShape(CLOSE);
			fill(82, 82, 82, 92);
			beginShape();
			for (let i = 0; i < count * 2; i++) {
				const ang = -HALF_PI + (i * Math.PI) / count;
				const rad = i % 2 === 0 ? outerR * 0.76 : innerR * 0.76;
				vertex(Math.cos(ang) * rad, Math.sin(ang) * rad);
			}
			endShape(CLOSE);
		}
		pop();
	}

	function tankPreviewBounds(classId: TankClassId, r: number) {
		const def = getTankClassDef(classId);
		const baseAng = def.previewAngle ?? -PI / 2 + 0.12;
		let minX = Infinity;
		let minY = Infinity;
		let maxX = -Infinity;
		let maxY = -Infinity;
		const addPoint = (px: number, py: number) => {
			minX = Math.min(minX, px);
			minY = Math.min(minY, py);
			maxX = Math.max(maxX, px);
			maxY = Math.max(maxY, py);
		};

		const bodyR = r * (def.bodyScale || 1);
		if (def.bodyDecoration) {
			const decorR = tankDecorationRadius(def, r);
			addPoint(-decorR, -decorR);
			addPoint(decorR, decorR);
		}
		if ((def.bodyShape || "circle") === "square") {
			const squarePts = [
				rotateLocalPoint(-bodyR, -bodyR, baseAng),
				rotateLocalPoint(bodyR, -bodyR, baseAng),
				rotateLocalPoint(bodyR, bodyR, baseAng),
				rotateLocalPoint(-bodyR, bodyR, baseAng),
			];
			for (let i = 0; i < squarePts.length; i++) {
				addPoint(squarePts[i].x, squarePts[i].y);
			}
		} else {
			addPoint(-bodyR, -bodyR);
			addPoint(bodyR, bodyR);
		}

		for (let i = 0; i < def.renderBarrels.length; i++) {
			const spec = def.renderBarrels[i];
			const inner = r * (spec.baseOffsetMul ?? 0.12);
			const len = r * (spec.lengthMul || 1.7);
			const width = r * (spec.widthMul || 0.74);
			const corners =
				spec.weaponKind === "spawner"
					? [
						{ x: inner, y: -width * 0.28 },
						{ x: inner, y: width * 0.28 },
						{ x: inner + len, y: width * 0.46 },
						{ x: inner + len, y: -width * 0.46 },
					]
					: [
						{ x: inner, y: -width * 0.5 },
						{ x: inner, y: width * 0.5 },
						{ x: inner + len, y: width * 0.5 },
						{ x: inner + len, y: -width * 0.5 },
					];
			for (let c = 0; c < corners.length; c++) {
				const p0 = rotateLocalPoint(corners[c].x, corners[c].y, spec.angle || 0);
				const p1 = rotateLocalPoint(
					p0.x + r * (spec.mountX || 0),
					p0.y + r * (spec.mountY || 0),
					baseAng,
				);
				addPoint(p1.x, p1.y);
			}
		}

		return {
			cx: (minX + maxX) * 0.5,
			cy: (minY + maxY) * 0.5,
			w: maxX - minX,
			h: maxY - minY,
		};
	}

	function drawUpgradeTankPreview(
		classId: TankClassId,
		x: number,
		y: number,
		boxW: number,
		boxH: number,
	) {
		const def = getTankClassDef(classId);
		const previewR = 26;
		const bounds = tankPreviewBounds(classId, previewR);
		const fitScale = Math.min(
			(boxW - 10) / Math.max(1, bounds.w),
			(boxH - 10) / Math.max(1, bounds.h),
			1,
		);
		const previewTank = {
			r: previewR,
			barrelKick: 0,
			tankClass: classId,
		} as TankEntity;
		push();
		translate(x - bounds.cx * fitScale, y - bounds.cy * fitScale);
		scale(fitScale);
		drawTankDecoration(
			def,
			previewR,
			def.bodyDecoration?.previewAngle || 0,
		);
		drawTankBarrels(
			previewTank,
			def.previewAngle ?? -PI / 2 + 0.12,
			COLORS.playerBarrel,
			def.stats?.recoilMul || 1,
		);
		if ((def.bodyShape || "circle") === "square") {
			rotate(def.previewAngle ?? -PI / 2 + 0.12);
		}
		drawTankBodyShape(
			def.bodyShape || "circle",
			previewR,
			MENU_TANK_BODY,
			MENU_TANK_BODY_BORDER,
			def.bodyScale || 1,
		);
		pop();
	}

	function drawUpgradeMenu() {
		upgradeCardRects = [];
		upgradeIgnoreRect = null;
		hoveredUpgradeChoice = null;
		hoveredUpgradeMenuAction = false;
		if (!player || player.isDead) return;
		refreshPendingUpgrade(player);
		const level = player.pendingUpgradeLevel;
		if (!level) {
			clearPlayerUpgradeMenuSuppression();
			return;
		}
		if (
			suppressPlayerUpgradeMenu &&
			suppressPlayerUpgradeLevel &&
			suppressPlayerUpgradeLevel !== level
		) {
			clearPlayerUpgradeMenuSuppression();
		}
		const choices = upgradeChoicesForLevel(player, level);
		if (!choices.length) return;
		const rects = upgradeMenuCardRects(choices.length);
		const menuLeft = Math.min(...rects.map((rect) => rect.x));
		const menuRight = Math.max(...rects.map((rect) => rect.x + rect.w));
		const menuBottom = Math.max(...rects.map((rect) => rect.y + rect.h));
		const ignoreW = 78;
		const ignoreH = 22;
		const ignoreRect = {
			x: menuLeft + (menuRight - menuLeft - ignoreW) / 2,
			y: menuBottom + 10,
			w: ignoreW,
			h: ignoreH,
		};
		const panelTop = 6;
		const panelBottom = ignoreRect.y + ignoreRect.h + 4;
		const panelRect = {
			x: menuLeft - 8,
			y: panelTop,
			w: menuRight - menuLeft + 16,
			h: panelBottom - panelTop,
		};
		const tabRect = {
			x: 8,
			y: rects[0].y + 12,
			w: 24,
			h: Math.max(64, panelRect.h - 24),
		};
		const hoveringTab =
			mouseX >= tabRect.x &&
			mouseX <= tabRect.x + tabRect.w &&
			mouseY >= tabRect.y &&
			mouseY <= tabRect.y + tabRect.h;
		const hoveringPanel =
			mouseX >= panelRect.x &&
			mouseX <= panelRect.x + panelRect.w &&
			mouseY >= panelRect.y &&
			mouseY <= panelRect.y + panelRect.h;
		const showPanel =
			!suppressPlayerUpgradeMenu || hoveringTab || hoveringPanel;
		if (!showPanel) {
			push();
			noStroke();
			fill(58, 58, 58, 190);
			rect(tabRect.x, tabRect.y, tabRect.w, tabRect.h, 8);
			fill(230, 230, 230, 220);
			textAlign(CENTER, CENTER);
			textStyle(BOLD);
			textSize(12);
			translate(tabRect.x + tabRect.w / 2, tabRect.y + tabRect.h / 2);
			rotate(-HALF_PI);
			text("UPGRADE", 0, 0);
			pop();
			if (hoveringTab) hoveredUpgradeMenuAction = true;
			return;
		}
		if (hoveringTab) hoveredUpgradeMenuAction = true;

		upgradeCardRects = rects.map((rect, index) => ({
			id: choices[index],
			rect,
		}));
		upgradeIgnoreRect = ignoreRect;

		const headerX = rects[0].x;
		const headerY = 22;
		drawTextWithOutline("Tank Upgrade", headerX, headerY, {
			size: 18,
			bold: true,
			alignX: LEFT,
			alignY: CENTER,
		});
		drawTextWithOutline(
			`Level ${level} - click or press F1-F${choices.length}`,
			headerX,
			headerY + 18,
			{
				size: 12,
				bold: true,
				alignX: LEFT,
				alignY: CENTER,
			},
		);

		for (let i = 0; i < upgradeCardRects.length; i++) {
			const entry = upgradeCardRects[i];
			const def = getTankClassDef(entry.id);
			const cardRect = entry.rect;
			const hover =
				mouseX >= cardRect.x &&
				mouseX <= cardRect.x + cardRect.w &&
				mouseY >= cardRect.y &&
				mouseY <= cardRect.y + cardRect.h;
			if (hover) hoveredUpgradeChoice = entry.id;

			noStroke();
			fill(...UPGRADE_CARD_BG);
			rect(cardRect.x - 4, cardRect.y - 4, cardRect.w + 8, cardRect.h + 8, 10);
			fill(...def.uiTop);
			rect(cardRect.x, cardRect.y, cardRect.w, cardRect.h * 0.52, 6);
			fill(...def.uiBottom);
			rect(cardRect.x, cardRect.y + cardRect.h * 0.52, cardRect.w, cardRect.h * 0.48, 6);
			noFill();
			stroke(hover ? 255 : 70, hover ? 255 : 70, hover ? 255 : 70, hover ? 255 : 210);
			strokeWeight(hover ? 4 : 3);
			rect(cardRect.x + 0.5, cardRect.y + 0.5, cardRect.w - 1, cardRect.h - 1, 6);

			drawUpgradeTankPreview(
				entry.id,
				cardRect.x + cardRect.w / 2,
				cardRect.y + cardRect.h * 0.52,
				92,
				72,
			);
			drawTextWithOutline(`[F${i + 1}]`, cardRect.x + 18, cardRect.y + 16, {
				size: 14,
				bold: true,
				alignX: LEFT,
				alignY: CENTER,
			});
			drawTextWithOutline(
				tankClassName(entry.id),
				cardRect.x + cardRect.w / 2,
				cardRect.y + cardRect.h - 18,
				{
					size: 16,
					bold: true,
					alignX: CENTER,
					alignY: CENTER,
				},
			);
		}

		const ignoreHover =
			mouseX >= ignoreRect.x &&
			mouseX <= ignoreRect.x + ignoreRect.w &&
			mouseY >= ignoreRect.y &&
			mouseY <= ignoreRect.y + ignoreRect.h;
		if (ignoreHover) hoveredUpgradeMenuAction = true;
		noStroke();
		fill(ignoreHover ? 82 : 68, ignoreHover ? 82 : 68, ignoreHover ? 82 : 68, 215);
		rect(ignoreRect.x, ignoreRect.y, ignoreRect.w, ignoreRect.h, 7);
		noFill();
		stroke(ignoreHover ? 248 : 210, ignoreHover ? 248 : 210, ignoreHover ? 248 : 210, 220);
		strokeWeight(ignoreHover ? 3 : 2);
		rect(ignoreRect.x + 0.5, ignoreRect.y + 0.5, ignoreRect.w - 1, ignoreRect.h - 1, 7);
		drawTextWithOutline("Ignore", ignoreRect.x + ignoreRect.w / 2, ignoreRect.y + ignoreRect.h / 2 + 1, {
			size: 12,
			bold: true,
			alignX: CENTER,
			alignY: CENTER,
		});
	}

	function drawMinimap() {
		const size = MINIMAP.size;
		const x = width - MINIMAP.margin - size;
		const y = height - MINIMAP.margin - size;

		push();
		noStroke();
		fill(...COLORS.miniBg);
		rect(x, y, size, size, 3);

		const s = size / WORLD.w,
			ox = x,
			oy = y;

		for (let i = 0; i < TEAMS.length; i++) {
			const r = getTeamBaseRect(i);
			const c = TEAMS[i].color;
			const rx = ox + r.x * s,
				ry = oy + r.y * s,
				rw = r.w * s,
				rh = r.h * s;
			noStroke();
			fill(c[0], c[1], c[2], 120);
			rect(rx, ry, rw, rh, 0);
		}

		const px = ox + player.x * s,
			py = oy + player.y * s;
		const ang = player.barrelAng;
		const L = 7,
			B = 4;
		push();
		translate(px, py);
		rotate(ang);
		noStroke();
		fill(60, 60, 60);
		beginShape();
		vertex(L, 0);
		vertex(-L * 0.6, -B);
		vertex(-L * 0.6, B);
		endShape(CLOSE);
		pop();

		noFill();
		stroke(...COLORS.miniBorder);
		strokeWeight(4);
		rect(x + 0.5, y + 0.5, size - 1, size - 1, 3);
		pop();
	}

	function drawScoreBar() {
		const pct =
			TOTAL_TO_MAX > 0 ? constrain(player.xp / TOTAL_TO_MAX, 0, 1) : 1;
		const barW = Math.min(340, width - 40),
			barH = 20;
		const x = (width - barW) / 2,
			y = height - 56;
		drawTextWithOutline(
			tankClassName(player.tankClass || "basic"),
			width / 2,
			y - 14,
			{ size: 14, bold: true, alignX: CENTER, alignY: CENTER },
		);
		drawBar(
			x,
			y,
			barW,
			barH,
			pct,
			COLORS.scoreFill,
			`Score: ${Math.floor(player.xp)}`,
			true,
			false,
			COLORS.barBg,
			null,
			UI.barOuterR,
			UI.barInnerR,
			true,
		);
	}

	function drawXPBar() {
		const lvl = player.level;
		const curr = player.xp - xpToLevel(lvl - 1);
		const next =
			lvl < LEVEL_CAP ? xpToLevel(lvl) - xpToLevel(lvl - 1) : 1;
		const pct = lvl < LEVEL_CAP ? constrain(curr / next, 0, 1) : 1;

		const barW = Math.min(420, width - 40),
			barH = 24;
		const x = (width - barW) / 2,
			y = height - 30;
		drawBar(
			x,
			y,
			barW,
			barH,
			pct,
			COLORS.xpFill,
			`Level ${lvl} ${Math.floor(curr)}/${Math.max(1, Math.floor(next))}`,
			true,
			false,
			COLORS.barBg,
			null,
			UI.barOuterR,
			UI.barInnerR,
			true,
		);
	}

	function drawStatsPanel() {
		const keys = availableStatKeysForTank(player);
		const names = statPanelNamesForTank(player);

		const leftX = 140;
		const blockH = names.length * UI.statRowH + 12;
		const baseY0 = height - 10 - blockH;
		let y = baseY0;

		const labelColW = 120;
		const barX = leftX - labelColW;
		const barRight = barX + UI.statBarW;
		const panelX = barX - 8;
		const panelY = baseY0 - 4;
		const panelW = UI.statBarW + 16;
		const panelH = blockH + 8;
		const tabX = 8;
		const tabY = baseY0 + 8;
		const tabW = 24;
		const tabH = blockH - 16;
		const hoveringPanel =
			mouseX >= panelX &&
			mouseX <= panelX + panelW &&
			mouseY >= panelY &&
			mouseY <= panelY + panelH;
		const hoveringTab =
			mouseX >= tabX &&
			mouseX <= tabX + tabW &&
			mouseY >= tabY &&
			mouseY <= tabY + tabH;
		const showPanel = player.statPoints > 0 || hoveringPanel || hoveringTab;

		if (!showPanel) {
			push();
			noStroke();
			fill(58, 58, 58, 190);
			rect(tabX, tabY, tabW, tabH, 8);
			fill(230, 230, 230, 220);
			textAlign(CENTER, CENTER);
			textStyle(BOLD);
			textSize(12);
			translate(tabX + tabW / 2, tabY + tabH / 2);
			rotate(-HALF_PI);
			text("STATS", 0, 0);
			pop();
			return;
		}

		y += 8;

		for (let i = 0; i < names.length; i++) {
			const val = player.stats[keys[i]];
			const maxVal = maxStatLevelForTank(player, keys[i]);
			const fillCol = COLORS.statFills[STAT_KEYS.indexOf(keys[i])];
			const stepW = UI.statBarW / maxVal;

			noStroke();
			fill(...COLORS.barBg);
			rect(barX, y + 3, UI.statBarW, UI.statBarH, UI.statOuterR);

			const pad = UI.barPad;
			const ix = barX + pad,
				iy = y + 3 + pad;
			const iw = UI.statBarW - pad * 2,
				ih = UI.statBarH - pad * 2;

			const gap = 2;
			const segW = iw / maxVal;
			noStroke();
			fill(...fillCol);
			for (let s = 0; s < val; s++) {
				const sx = ix + s * segW + gap * 0.5;
				const sw = Math.max(0, segW - gap);
				rect(sx, iy, sw, ih, 0);
			}

			drawTextWithOutline(
				names[i],
				barX + UI.statBarW / 2,
				y + 3 + UI.statBarH / 2 + 1,
				{ size: 12, bold: true, alignX: CENTER, alignY: CENTER },
			);

			const scX = barX + stepW * (maxVal - 0.5);
			drawTextWithOutline(
				`[${STAT_PANEL_SHORTCUTS[i]}]`,
				scX,
				y + 3 + UI.statBarH / 2 + 1,
				{ size: 12, bold: true, alignX: CENTER, alignY: CENTER },
			);

			y += UI.statRowH;
		}
		if (player.statPoints > 0) {
			push();
			translate(barRight + 10, baseY0 + 20);
			rotate(PI / 15);
			drawTextWithOutline(`x${player.statPoints}`, 0, 0, {
				size: 18,
				bold: true,
				alignX: LEFT,
				alignY: BASELINE,
			});
			pop();
		}
		textAlign(LEFT, BASELINE);
	}

	function drawBar(
		x: number,
		y: number,
		w: number,
		h: number,
		pct: number,
		fillColor: number[],
		label: string,
		thickText = false,
		border = false,
		bgColor: number[] | null = null,
		padOverride: number | null = null,
		outerR = UI.barOuterR,
		innerR = UI.barInnerR,
		textOutline = false,
	) {
		const bg = bgColor || COLORS.barBg;

		noStroke();
		fill(...bg);
		rect(x, y, w, h, outerR);
		if (border) {
			noFill();
			stroke(bg[0], bg[1], bg[2], bg[3] !== undefined ? bg[3] : 255);
			strokeWeight(4);
			rect(x + 0.5, y + 0.5, w - 1, h - 1, outerR);
		}

		const pad =
			padOverride !== null && padOverride !== undefined
				? padOverride
				: UI.barPad;
		const ix = x + pad,
			iy = y + pad;
		const iw = w - pad * 2,
			ih = h - pad * 2;
		noStroke();
		fill(...fillColor);
		rect(ix, iy, iw * pct, ih, innerR);

		if (label) {
			const size = thickText ? 16 : 12;
			if (textOutline) {
				drawTextWithOutline(label, x + w / 2, y + h / 2 + 1, {
					size,
					bold: thickText,
				});
			} else {
				push();
				fill(...COLORS.barText);
				textAlign(CENTER, CENTER);
				if (thickText) {
					textStyle(BOLD);
					textSize(size);
				} else {
					textSize(size);
				}
				text(label, x + w / 2, y + h / 2 + 1);
				pop();
			}
		}
	}

	function drawDeathScreen() {
		push();
		noStroke();
		fill(120, 120, 120, 170);
		rect(0, 0, width, height);

		const topY = height * 0.25;
		drawTextWithOutline("You were killed by", width / 2, topY, {
			size: 26,
			bold: true,
			alignX: CENTER,
			alignY: CENTER,
		});
		const killer = player.deathInfo?.killer || "unknown";
		drawTextWithOutline(killer, width / 2, topY + 36, {
			size: 32,
			bold: true,
			alignX: CENTER,
			alignY: CENTER,
		});

		const playerDeathClass =
			player.deathInfo?.tankClass ||
			(player.lastLifeTankClass as TankClassId) ||
			(player.tankClass || "basic");
		const playerPreviewBaseAngle =
			getTankClassDef(playerDeathClass).previewAngle ??
			(tankClassUsesDrones(playerDeathClass) ? -PI / 2 + 0.12 : 0);
		const killerPreviewY = topY + 98;
		const killerPreviewLabel = drawDeathKillerPreview(
			player.deathInfo,
			width / 2,
			killerPreviewY,
		);
		if (killerPreviewLabel) {
			drawTextWithOutline(
				killerPreviewLabel,
				width / 2,
				killerPreviewY + 44,
				{
					size: 18,
					bold: true,
					alignX: CENTER,
					alignY: CENTER,
				},
			);
		}

		const yourInfoY = killerPreviewLabel ? killerPreviewY + 82 : topY + 92;
		drawTextWithOutline("Your info", width / 2, yourInfoY, {
			size: 18,
			bold: true,
			alignX: CENTER,
			alignY: CENTER,
		});
		const infoStartY = yourInfoY + 36;
		const sc = player.deathInfo
			? player.deathInfo.score
			: Math.floor(player.xp);
		const lvl = player.deathInfo ? player.deathInfo.level : player.level;
		const tsec = player.deathInfo ? Math.floor(player.deathInfo.time) : 0;
		const kills = player.deathInfo ? player.deathInfo.kills : player.lifeKills | 0;
		const mm = Math.floor(tsec / 60);
		const ss = tsec % 60;

		drawTextWithOutline(`Score: ${sc}`, width / 2, infoStartY, {
			size: 22,
			bold: true,
			alignX: CENTER,
			alignY: CENTER,
		});
		drawTextWithOutline(`Level: ${lvl}`, width / 2, infoStartY + 24, {
			size: 22,
			bold: true,
			alignX: CENTER,
			alignY: CENTER,
		});
		drawTextWithOutline(`Kills: ${kills}`, width / 2, infoStartY + 48, {
			size: 22,
			bold: true,
			alignX: CENTER,
			alignY: CENTER,
		});
		drawTextWithOutline(
			`Time alive: ${mm}m ${ss}s`,
			width / 2,
			infoStartY + 72,
			{ size: 22, bold: true, alignX: CENTER, alignY: CENTER },
		);
		const playerPreviewY = infoStartY + 142;
		const cursorDx = mouseX - width / 2;
		const cursorDy = mouseY - playerPreviewY;
		const playerPreviewAngle =
			cursorDx * cursorDx + cursorDy * cursorDy > 4
				? Math.atan2(cursorDy, cursorDx)
				: playerPreviewBaseAngle;
		const playerPreviewTank = {
			...player,
			x: width / 2,
			y: playerPreviewY,
			r: 30,
			barrelKick: 0,
			barrelAng: playerPreviewAngle,
			tankClass: playerDeathClass,
		} as TankEntity;
		drawTankEntity(
			playerPreviewTank,
			TEAM_TANK_COLORS[TEAMS[player.teamIdx].name],
			TEAM_TANK_COLORS_STROKE[TEAMS[player.teamIdx].name],
			COLORS.playerBarrel,
		);
		drawTextWithOutline(
			tankClassName(playerDeathClass),
			width / 2,
			playerPreviewY + 44,
			{
				size: 18,
				bold: true,
				alignX: CENTER,
				alignY: CENTER,
			},
		);

		const bw = 260,
			bh = 60;
		const bx = (width - bw) / 2,
			by = Math.min(
				height - bh - 18,
				Math.max(height * 0.84 - bh / 2, playerPreviewY + 84),
			);
		const fillBase = COLORS.shapePent;
		const fillInner = [
			Math.floor(COLORS.shapePent[0] * 0.9),
			Math.floor(COLORS.shapePent[1] * 0.9),
			Math.floor(COLORS.shapePent[2] * 0.9),
		];
		const border = [
			Math.floor(COLORS.shapePent[0] * 0.72),
			Math.floor(COLORS.shapePent[1] * 0.72),
			Math.floor(COLORS.shapePent[2] * 0.72),
		];

		noStroke();
		fill(fillBase[0], fillBase[1], fillBase[2]);
		rect(bx, by, bw, bh / 2, 10);
		fill(fillInner[0], fillInner[1], fillInner[2]);
		rect(bx, by + bh / 2, bw, bh / 2, 10);
		noFill();
		stroke(border[0], border[1], border[2]);
		strokeWeight(4);
		rect(bx + 0.5, by + 0.5, bw - 1, bh - 1, 10);

		push();
		noStroke();
		fill(244, 249, 255);
		textAlign(CENTER, CENTER);
		textStyle(BOLD);
		textSize(22);
		text("Continue", width / 2, by + bh / 2 + 1);
		pop();
		pop();

		deathBtnRect = { x: bx, y: by, w: bw, h: bh };

		if (
			mouseX >= bx &&
			mouseX <= bx + bw &&
			mouseY >= by &&
			mouseY <= by + bh
		)
			cursor(HAND);
		else cursor(ARROW);
	}

	function drawFPS() {
		const s = `FPS: ${fpsShown}`;
		const tw = textWidth(s) + 16,
			th = 20;
		const x = (width - tw) / 2,
			y = 8;
		push();
		noStroke();
		fill(...COLORS.fpsPanelBg);
		rect(x, y, tw, th, 6);
		fill(...COLORS.fpsText);
		textAlign(CENTER, CENTER);
		textStyle(BOLD);
		text(s, x + tw / 2, y + th / 2 + 1);
		textStyle(NORMAL);
		textAlign(LEFT, BASELINE);
		pop();
	}

	function drawTopLeaderIndicator() {
		if (!player || player.isDead) return;
		const leader = topTank();
		if (!leader || leader === player) return;

		const z = cam.zoom || 1;
		const sx = (leader.x - cam.x) * z + width / 2;
		const sy = (leader.y - cam.y) * z + height / 2;
		const visibleMargin = (leader.r || 26) * z;
		if (
			sx >= -visibleMargin &&
			sx <= width + visibleMargin &&
			sy >= -visibleMargin &&
			sy <= height + visibleMargin
		) {
			return;
		}

		const dx = leader.x - player.x;
		const dy = leader.y - player.y;
		const ang = Math.atan2(dy, dx);
		const ux = Math.cos(ang);
		const uy = Math.sin(ang);
		const trackRadius = Math.max(120, Math.min(width, height) * 0.5 - 112);
		const px = width / 2 + ux * trackRadius;
		const py = height / 2 + uy * trackRadius;
		const col = TEAM_TANK_COLORS[TEAMS[leader.teamIdx].name];
		const labelX = px - ux * 30;
		const labelY = py - uy * 30;

		push();
		translate(px, py);
		rotate(ang + HALF_PI);
		fill(col[0], col[1], col[2], 230);
		stroke(22, 22, 22, 220);
		strokeWeight(3);
		triangle(0, -14, -10, 10, 10, 10);
		pop();

		drawTextWithOutline(`#1 ${tankDisplayName(leader)}`, labelX, labelY, {
			size: 12,
			bold: true,
			alignX: CENTER,
			alignY: CENTER,
		});
	}

	function updateCamera(h?: number) {
		const step = typeof h === "number" ? h : FIXED_H;
		const tx =
			width >= WORLD.w
				? WORLD.w / 2
				: constrain(player.x, width / 2, WORLD.w - width / 2);
		const ty =
			height >= WORLD.h
				? WORLD.h / 2
				: constrain(player.y, height / 2, WORLD.h - height / 2);
		const d = dFrame;
		const sp = Math.hypot(player.vx, player.vy);
		const moveRatio = Math.min(1, sp / (d.maxSpeed * 0.5));
		const k = 2 + (7 - 2) * moveRatio;
		cam.x = expLerp(cam.x, tx, k, h);
		cam.y = expLerp(cam.y, ty, k, h);
		cam.x =
			width >= WORLD.w
				? WORLD.w / 2
				: constrain(cam.x, width / 2, WORLD.w - width / 2);
		cam.y =
			height >= WORLD.h
				? WORLD.h / 2
				: constrain(cam.y, height / 2, WORLD.h - height / 2);
		cam.vx = 0;
		cam.vy = 0;
		const targetZoom = Math.max(
			0.65,
			Math.min(1.6, BASE_FOV / fovForTank(player)),
		);
		const z0 = cam.zoom ?? targetZoom;
		const kZoom = 1 - Math.exp(-8 * step);
		const kPos = 1 - Math.exp(-6 * step);

		cam.zoom = z0 + (targetZoom - z0) * kZoom;
		cam.x += (player.x - cam.x) * kPos;
		cam.y += (player.y - cam.y) * kPos;

		const z = cam.zoom || 1;
		const hw = width / (2 * z);
		const hh = height / (2 * z);

		const eps = 0.5 / z;
		cam.x = constrain(cam.x, hw - eps, WORLD.w - hw + eps);
		cam.y = constrain(cam.y, hh - eps, WORLD.h - hh + eps);
	}

	function mousePressed() {
		if (player && !player.isDead && upgradeIgnoreRect) {
			if (
				mouseX >= upgradeIgnoreRect.x &&
				mouseX <= upgradeIgnoreRect.x + upgradeIgnoreRect.w &&
				mouseY >= upgradeIgnoreRect.y &&
				mouseY <= upgradeIgnoreRect.y + upgradeIgnoreRect.h
			) {
				suppressPlayerUpgradeMenu = true;
				suppressPlayerUpgradeLevel = player.pendingUpgradeLevel;
				blockShootUntilRelease = true;
				input.firing = false;
				return;
			}
		}

		if (player && !player.isDead && upgradeCardRects.length) {
			for (let i = 0; i < upgradeCardRects.length; i++) {
				const entry = upgradeCardRects[i];
				const rect = entry.rect;
				if (
					mouseX >= rect.x &&
					mouseX <= rect.x + rect.w &&
					mouseY >= rect.y &&
					mouseY <= rect.y + rect.h
				) {
					if (selectTankUpgrade(player, entry.id, true)) {
						blockShootUntilRelease = true;
						input.firing = false;
						return;
					}
				}
			}
		}

		if (player && player.isDead && deathBtnRect) {
			if (
				mouseX >= deathBtnRect.x &&
				mouseX <= deathBtnRect.x + deathBtnRect.w &&
				mouseY >= deathBtnRect.y &&
				mouseY <= deathBtnRect.y + deathBtnRect.h
			) {
				respawnTankCommon(player);
				blockShootUntilRelease = true;
				return;
			}
		}
	}

	function mouseReleased() {
		blockShootUntilRelease = false;
	}

	function keyPressed() {
		// Key toggles and upgrades are handled once per frame in handleInput().
	}

	const handleFullscreenChange = () => {
		windowResized();
		try {
			canvasEl.focus();
		} catch { }
	};

	scene = new PhaserLib.Scene("tank-shooter");
	scene.create = () => {
		canvasEl = scene.game.canvas as HTMLCanvasElement;
		drawingContext = (scene.game.context || canvasEl.getContext("2d")) as CanvasRenderingContext2D;
		canvasEl.tabIndex = 0;
		canvasEl.style.outline = "none";
		canvasEl.style.userSelect = "none";
		canvasEl.style.caretColor = "transparent";
		canvasEl.style.touchAction = "none";
		setup();
		document.addEventListener("fullscreenchange", handleFullscreenChange);
		onCleanup(() => {
			document.removeEventListener("fullscreenchange", handleFullscreenChange);
		});
		const renderFrame = (_renderer: unknown, _time: number, delta: number) => {
			lastDelta = delta || lastDelta;
			deltaTime = lastDelta;
			resetDrawState();
			draw();
		};
		scene.game.events.on(PhaserLib.Core.Events.POST_RENDER, renderFrame);
		onCleanup(() => {
			scene.game.events.off(PhaserLib.Core.Events.POST_RENDER, renderFrame);
		});
	};
	scene.update = (_time: number, delta: number) => {
		lastDelta = delta || lastDelta;
	};

	const initialSize = hostSize();
	game = new PhaserLib.Game({
		type: PhaserLib.CANVAS,
		parent: host,
		width: initialSize.w,
		height: initialSize.h,
		backgroundColor: "#a0a0a0",
		scene,
		banner: false,
		disableContextMenu: true,
		audio: { noAudio: true },
	});

	return () => {
		for (let i = cleanupCallbacks.length - 1; i >= 0; i--) {
			try {
				cleanupCallbacks[i]();
			} catch { }
		}
		try {
			ro?.disconnect();
		} catch { }
		try {
			game?.destroy(true);
		} catch { }
	};
};

export default function GameSketch() {
	const hostRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		let cleanup: (() => void) | null = null;
		let cancelled = false;

		(async () => {
			if (!hostRef.current) return;
			const phaserModule = await import("phaser");
			if (cancelled || !hostRef.current) return;
			const PhaserLib = ("default" in phaserModule
				? phaserModule.default
				: phaserModule) as any;
			cleanup = mountGame(hostRef.current, PhaserLib);
		})();

		return () => {
			cancelled = true;
			cleanup?.();
		};
	}, []);

	return (
		<div
			ref={hostRef}
			style={{
				width: "100%",
				height: "100%",
				position: "relative",
				overflow: "hidden",
				contain: "strict",
				isolation: "isolate",
			}}
		/>
	);
}
