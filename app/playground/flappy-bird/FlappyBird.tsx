"use client";

import { type MutableRefObject, useEffect, useRef, useState } from "react";

type PhaserModule = typeof import("phaser");
type PhaserGame = import("phaser").Game;
type PhaserScene = import("phaser").Scene;
type PhaserGraphics = import("phaser").GameObjects.Graphics;
type PhaserText = import("phaser").GameObjects.Text;

type Phase = "ready" | "running" | "gameOver";

type PipeState = {
	x: number;
	gapY: number;
	gapSize: number;
	scored: boolean;
};

type RuntimeState = {
	phase: Phase;
	paused: boolean;
	score: number;
	best: number;
	viewportPaddingX: number;
	birdY: number;
	birdVelocity: number;
	birdRotation: number;
	floatTime: number;
	wingTime: number;
	scrollDistance: number;
	groundOffset: number;
	spawnTimer: number;
	lastGapY: number;
	flashAlpha: number;
	pipes: PipeState[];
};

type UiState = {
	phase: Phase;
	paused: boolean;
	score: number;
	best: number;
};

type FlappyBirdControls = {
	primaryAction: () => void;
	restart: () => void;
	togglePause: () => void;
};

type Bridge = {
	controlsRef: MutableRefObject<FlappyBirdControls | null>;
	onReady: () => void;
	onUiState: (state: UiState) => void;
};

type Layout = {
	x: number;
	y: number;
	width: number;
	height: number;
	scale: number;
	viewWidth: number;
	gameplayOffsetX: number;
};

const FONT_STACK =
	'"Azeret Mono", "JetBrains Mono", "SFMono-Regular", Consolas, monospace';
const STORAGE_KEY = "flappy-bird-phaser-best";
const WORLD_WIDTH = 420;
const WORLD_HEIGHT = 720;
const GROUND_HEIGHT = 124;
const PLAY_HEIGHT = WORLD_HEIGHT - GROUND_HEIGHT;
const BIRD_X = 136;
const BIRD_RADIUS_X = 18;
const BIRD_RADIUS_Y = 16;
const READY_BIRD_Y = 294;
const PIPE_WIDTH = 84;
const PIPE_CAP_HEIGHT = 24;
const PIPE_SPAWN_OFFSET = 56;
const PIPE_GAP_START = 196;
const PIPE_GAP_MIN = 164;
const PIPE_INTERVAL_START = 1.48;
const PIPE_INTERVAL_MIN = 1.3;
const PIPE_SPEED_START = 188;
const PIPE_SPEED_MAX = 228;
const PIPE_MARGIN_TOP = 92;
const PIPE_MARGIN_BOTTOM = 84;
const GRAVITY = 1_580;
const FLAP_VELOCITY = -420;
const TERMINAL_VELOCITY = 760;
const FIXED_STEP = 1 / 120;
const MAX_CATCHUP = 0.18;
const MAX_DELTA_SECONDS = 0.05;
const GROUND_PATTERN = 52;
const CLOUDS = [
	{ x: 72, y: 84, scale: 1, speed: 0.08 },
	{ x: 248, y: 144, scale: 1.2, speed: 0.12 },
	{ x: 372, y: 102, scale: 0.78, speed: 0.18 },
	{ x: 520, y: 188, scale: 0.96, speed: 0.1 },
] as const;

const EMPTY_UI_STATE: UiState = {
	phase: "ready",
	paused: false,
	score: 0,
	best: 0,
};

function clamp(value: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, value));
}

function lerp(from: number, to: number, alpha: number): number {
	return from + (to - from) * alpha;
}

function wrapOffset(value: number, span: number): number {
	const result = value % span;
	return result < 0 ? result + span : result;
}

function isEditableTarget(target: EventTarget | null): boolean {
	if (!(target instanceof HTMLElement)) return false;
	return (
		target.isContentEditable ||
		target.tagName === "INPUT" ||
		target.tagName === "TEXTAREA" ||
		target.tagName === "SELECT"
	);
}

function resolveHostSize(host: HTMLDivElement): { width: number; height: number } {
	return {
		width: Math.max(320, Math.floor(host.clientWidth || 0)),
		height: Math.max(480, Math.floor(host.clientHeight || 0)),
	};
}

function resolveLayout(scene: PhaserScene): Layout {
	const width = scene.scale.width;
	const height = scene.scale.height;
	const scale = Math.min(width / WORLD_WIDTH, height / WORLD_HEIGHT);
	const worldWidth = width;
	const worldHeight = WORLD_HEIGHT * scale;
	const viewWidth = width / scale;
	const gameplayOffsetX = (viewWidth - WORLD_WIDTH) / 2;

	return {
		x: 0,
		y: Math.floor((height - worldHeight) / 2),
		width: worldWidth,
		height: worldHeight,
		scale,
		viewWidth,
		gameplayOffsetX,
	};
}

function loadBestScore(): number {
	if (typeof window === "undefined") return 0;

	try {
		const raw = window.localStorage.getItem(STORAGE_KEY);
		const parsed = raw ? Number.parseInt(raw, 10) : 0;
		return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
	} catch {
		return 0;
	}
}

function saveBestScore(best: number): void {
	if (typeof window === "undefined") return;

	try {
		window.localStorage.setItem(STORAGE_KEY, String(Math.max(0, Math.floor(best))));
	} catch {
	}
}

function createRuntimeState(best: number): RuntimeState {
	return {
		phase: "ready",
		paused: false,
		score: 0,
		best,
		viewportPaddingX: 0,
		birdY: READY_BIRD_Y,
		birdVelocity: 0,
		birdRotation: -0.14,
		floatTime: 0,
		wingTime: 0,
		scrollDistance: 0,
		groundOffset: 0,
		spawnTimer: 0.92,
		lastGapY: PLAY_HEIGHT * 0.48,
		flashAlpha: 0,
		pipes: [],
	};
}

function currentPipeSpeed(score: number): number {
	return Math.min(PIPE_SPEED_MAX, PIPE_SPEED_START + score * 3.2);
}

function currentPipeGap(score: number): number {
	return Math.max(PIPE_GAP_MIN, PIPE_GAP_START - score * 1.6);
}

function currentPipeInterval(score: number): number {
	return Math.max(PIPE_INTERVAL_MIN, PIPE_INTERVAL_START - score * 0.012);
}

function spawnPipe(state: RuntimeState): void {
	const gapSize = currentPipeGap(state.score);
	const minGapY = PIPE_MARGIN_TOP + gapSize / 2;
	const maxGapY = PLAY_HEIGHT - PIPE_MARGIN_BOTTOM - gapSize / 2;
	const range = maxGapY - minGapY;
	const randomCenter = minGapY + Math.random() * range;
	const abruptChance = 0.38;
	const blend = Math.random() < abruptChance ? 1 : 0.68;
	const rawGapY = lerp(state.lastGapY, randomCenter, blend);
	const snappedGapY = Math.round(rawGapY / 6) * 6;
	const gapY = clamp(snappedGapY, minGapY, maxGapY);

	state.lastGapY = gapY;
	state.pipes.push({
		x:
			WORLD_WIDTH +
			state.viewportPaddingX +
			PIPE_WIDTH / 2 +
			PIPE_SPAWN_OFFSET,
		gapY,
		gapSize,
		scored: false,
	});
}

function birdHitsPipe(pipe: PipeState, birdY: number): boolean {
	const horizontalDistance = Math.abs(pipe.x - BIRD_X);
	if (horizontalDistance > PIPE_WIDTH / 2 + BIRD_RADIUS_X) return false;

	const gapTop = pipe.gapY - pipe.gapSize / 2;
	const gapBottom = pipe.gapY + pipe.gapSize / 2;
	return birdY - BIRD_RADIUS_Y < gapTop || birdY + BIRD_RADIUS_Y > gapBottom;
}

function birdHitsWorld(state: RuntimeState): boolean {
	return (
		state.birdY - BIRD_RADIUS_Y <= 0 ||
		state.birdY + BIRD_RADIUS_Y >= PLAY_HEIGHT
	);
}

function syncUi(bridge: Bridge, state: RuntimeState): void {
	bridge.onUiState({
		phase: state.phase,
		paused: state.paused,
		score: state.score,
		best: state.best,
	});
}

function syncViewportPadding(state: RuntimeState, layout: Layout): void {
	state.viewportPaddingX = Math.max(0, layout.gameplayOffsetX);
}

function beginRun(state: RuntimeState): void {
	if (state.phase !== "ready") return;
	state.phase = "running";
	state.paused = false;
}

function flapBird(state: RuntimeState): void {
	state.birdVelocity = FLAP_VELOCITY;
	state.birdRotation = -0.48;
	state.wingTime += 0.06;
}

function updateBestScore(state: RuntimeState): void {
	if (state.score <= state.best) return;
	state.best = state.score;
	saveBestScore(state.best);
}

function triggerGameOver(state: RuntimeState): void {
	if (state.phase === "gameOver") return;
	state.phase = "gameOver";
	state.paused = false;
	state.flashAlpha = 0.72;
	state.birdVelocity = Math.max(state.birdVelocity, 120);
	state.birdRotation = 1.18;
	updateBestScore(state);
}

function restartRound(state: RuntimeState, startImmediately: boolean): RuntimeState {
	const nextState = createRuntimeState(state.best);

	if (startImmediately) {
		beginRun(nextState);
		flapBird(nextState);
	}

	return nextState;
}

function stepReady(state: RuntimeState, dt: number): void {
	state.floatTime += dt;
	state.wingTime += dt * 0.9;
	state.scrollDistance += 30 * dt;
	state.groundOffset = wrapOffset(state.groundOffset + 68 * dt, GROUND_PATTERN);
	state.birdY = READY_BIRD_Y + Math.sin(state.floatTime * 3.4) * 11;
	state.birdRotation = Math.sin(state.floatTime * 2.6) * 0.05 - 0.1;
	state.flashAlpha = Math.max(0, state.flashAlpha - dt * 1.2);
}

function stepRunning(state: RuntimeState, dt: number): void {
	const pipeSpeed = currentPipeSpeed(state.score);

	state.floatTime += dt;
	state.wingTime += dt * 4.35;
	state.scrollDistance += pipeSpeed * dt;
	state.groundOffset = wrapOffset(
		state.groundOffset + pipeSpeed * dt,
		GROUND_PATTERN,
	);
	state.spawnTimer -= dt;
	state.birdVelocity = Math.min(
		TERMINAL_VELOCITY,
		state.birdVelocity + GRAVITY * dt,
	);
	state.birdY += state.birdVelocity * dt;
	state.birdRotation = lerp(
		state.birdRotation,
		clamp(state.birdVelocity / 600, -0.52, 1.28),
		0.18,
	);
	state.flashAlpha = Math.max(0, state.flashAlpha - dt * 2.6);

	while (state.spawnTimer <= 0) {
		spawnPipe(state);
		state.spawnTimer += currentPipeInterval(state.score);
	}

	for (const pipe of state.pipes) {
		pipe.x -= pipeSpeed * dt;
		if (!pipe.scored && pipe.x + PIPE_WIDTH / 2 < BIRD_X) {
			pipe.scored = true;
			state.score += 1;
			updateBestScore(state);
		}
	}

	state.pipes = state.pipes.filter(
		(pipe) =>
			pipe.x + PIPE_WIDTH / 2 >
			-state.viewportPaddingX - PIPE_SPAWN_OFFSET,
	);

	if (birdHitsWorld(state) || state.pipes.some((pipe) => birdHitsPipe(pipe, state.birdY))) {
		triggerGameOver(state);
	}
}

function stepGameOver(state: RuntimeState, dt: number): void {
	const pipeSpeed = currentPipeSpeed(state.score) * 0.45;

	state.floatTime += dt;
	state.wingTime += dt * 1.15;
	state.scrollDistance += pipeSpeed * dt;
	state.groundOffset = wrapOffset(
		state.groundOffset + pipeSpeed * dt,
		GROUND_PATTERN,
	);
	state.flashAlpha = Math.max(0, state.flashAlpha - dt * 1.75);

	for (const pipe of state.pipes) {
		pipe.x -= pipeSpeed * dt;
	}
	state.pipes = state.pipes.filter(
		(pipe) =>
			pipe.x + PIPE_WIDTH / 2 >
			-state.viewportPaddingX - PIPE_SPAWN_OFFSET,
	);

	if (state.birdY + BIRD_RADIUS_Y < PLAY_HEIGHT) {
		state.birdVelocity = Math.min(
			TERMINAL_VELOCITY,
			state.birdVelocity + GRAVITY * dt,
		);
		state.birdY = Math.min(
			PLAY_HEIGHT - BIRD_RADIUS_Y,
			state.birdY + state.birdVelocity * dt,
		);
	}

	state.birdRotation = lerp(state.birdRotation, 1.38, 0.16);
}

function stepGame(state: RuntimeState, dt: number): void {
	if (state.paused) return;

	if (state.phase === "ready") {
		stepReady(state, dt);
		return;
	}

	if (state.phase === "running") {
		stepRunning(state, dt);
		return;
	}

	stepGameOver(state, dt);
}

function drawCloud(
	graphics: PhaserGraphics,
	x: number,
	y: number,
	scale: number,
	alpha: number,
): void {
	graphics.fillStyle(0xffffff, alpha);
	graphics.fillEllipse(x, y, 74 * scale, 34 * scale);
	graphics.fillEllipse(x - 26 * scale, y + 2 * scale, 42 * scale, 26 * scale);
	graphics.fillEllipse(x + 24 * scale, y + 4 * scale, 48 * scale, 28 * scale);
}

function drawHillBand(
	graphics: PhaserGraphics,
	config: {
		width: number;
		baseline: number;
		radius: number;
		speed: number;
		offset: number;
		color: number;
		alpha: number;
	},
): void {
	const spacing = config.radius * 1.5;
	const loopWidth = config.width + spacing * 4;
	const travel = (config.offset * config.speed) % spacing;
	const count = Math.ceil((config.width + spacing * 6) / spacing);

	graphics.fillStyle(config.color, config.alpha);
	for (let index = -3; index < count; index += 1) {
		const x = ((index * spacing - travel) % loopWidth) - spacing;
		graphics.fillCircle(x, config.baseline, config.radius);
	}
	graphics.fillRect(
		-spacing * 2,
		config.baseline,
		config.width + spacing * 4,
		WORLD_HEIGHT - config.baseline,
	);
}

function drawPipe(
	graphics: PhaserGraphics,
	pipe: PipeState,
	offsetX: number,
): void {
	const capInset = 7;
	const bodyInset = 8;
	const left = offsetX + pipe.x - PIPE_WIDTH / 2;
	const bodyLeft = left + bodyInset;
	const bodyWidth = PIPE_WIDTH - bodyInset * 2;
	const capLeft = left - capInset;
	const capWidth = PIPE_WIDTH + capInset * 2;
	const gapTop = pipe.gapY - pipe.gapSize / 2;
	const gapBottom = pipe.gapY + pipe.gapSize / 2;
	const topBodyHeight = Math.max(0, gapTop - PIPE_CAP_HEIGHT);
	const bottomBodyHeight = Math.max(0, PLAY_HEIGHT - gapBottom - PIPE_CAP_HEIGHT);

	graphics.fillStyle(0x1f7a39, 1);
	if (topBodyHeight > 0) {
		graphics.fillRect(bodyLeft, 0, bodyWidth, topBodyHeight);
	}
	graphics.fillRoundedRect(capLeft, gapTop - PIPE_CAP_HEIGHT, capWidth, PIPE_CAP_HEIGHT, 14);
	if (bottomBodyHeight > 0) {
		graphics.fillRect(bodyLeft, gapBottom + PIPE_CAP_HEIGHT, bodyWidth, bottomBodyHeight);
	}
	graphics.fillRoundedRect(capLeft, gapBottom, capWidth, PIPE_CAP_HEIGHT, 14);

	graphics.fillStyle(0x31c45f, 0.88);
	if (topBodyHeight > 0) {
		graphics.fillRect(bodyLeft + 7, 0, 12, topBodyHeight);
	}
	graphics.fillRoundedRect(capLeft + 10, gapTop - PIPE_CAP_HEIGHT + 4, 12, PIPE_CAP_HEIGHT - 8, 6);
	if (bottomBodyHeight > 0) {
		graphics.fillRect(bodyLeft + 7, gapBottom + PIPE_CAP_HEIGHT, 12, bottomBodyHeight);
	}
	graphics.fillRoundedRect(capLeft + 10, gapBottom + 4, 12, PIPE_CAP_HEIGHT - 8, 6);

	graphics.lineStyle(4, 0x0d3d1f, 0.9);
	if (topBodyHeight > 0) {
		graphics.strokeRect(bodyLeft, 0, bodyWidth, topBodyHeight);
	}
	graphics.strokeRoundedRect(capLeft, gapTop - PIPE_CAP_HEIGHT, capWidth, PIPE_CAP_HEIGHT, 14);
	if (bottomBodyHeight > 0) {
		graphics.strokeRect(bodyLeft, gapBottom + PIPE_CAP_HEIGHT, bodyWidth, bottomBodyHeight);
	}
	graphics.strokeRoundedRect(capLeft, gapBottom, capWidth, PIPE_CAP_HEIGHT, 14);
}

function drawGround(
	graphics: PhaserGraphics,
	groundOffset: number,
	viewWidth: number,
): void {
	graphics.fillStyle(0x84cc16, 1);
	graphics.fillRect(0, PLAY_HEIGHT - 8, viewWidth, 12);
	graphics.fillStyle(0xd4a94a, 1);
	graphics.fillRect(0, PLAY_HEIGHT, viewWidth, GROUND_HEIGHT);
	graphics.fillStyle(0xbd8b2d, 0.85);

	for (
		let x = -GROUND_PATTERN - groundOffset;
		x < viewWidth + GROUND_PATTERN;
		x += GROUND_PATTERN
	) {
		graphics.fillRoundedRect(x, PLAY_HEIGHT + 18, GROUND_PATTERN - 8, 22, 8);
		graphics.fillRoundedRect(x + 8, PLAY_HEIGHT + 54, GROUND_PATTERN - 10, 18, 8);
	}

	graphics.lineStyle(4, 0x6b4b10, 0.6);
	graphics.beginPath();
	graphics.moveTo(0, PLAY_HEIGHT);
	graphics.lineTo(viewWidth, PLAY_HEIGHT);
	graphics.strokePath();
}

function drawBird(graphics: PhaserGraphics, phase: Phase, wingTime: number): void {
	const flap = phase === "gameOver" ? 0.08 : 0.5 + Math.sin(wingTime * 10.5) * 0.5;
	const wingLift = lerp(-2, 12, flap);

	graphics.clear();
	graphics.fillStyle(0x000000, 0.18);
	graphics.fillEllipse(-4, 12, 42, 20);

	graphics.fillStyle(0xf59e0b, 1);
	graphics.fillEllipse(0, 0, 38, 28);

	graphics.fillStyle(0xfcd34d, 1);
	graphics.fillEllipse(-6, -3, 26, 20);

	graphics.fillStyle(0xb45309, 1);
	graphics.fillEllipse(-8, wingLift, 22, 14);

	graphics.fillStyle(0xf97316, 1);
	graphics.fillTriangle(11, 1, 27, -4, 27, 6);

	graphics.fillStyle(0xffffff, 1);
	graphics.fillCircle(5, -6, 6);
	graphics.fillStyle(0x111827, 1);
	graphics.fillCircle(7, -6, 2.8);
}

function drawWorld(
	backdropGraphics: PhaserGraphics,
	worldGraphics: PhaserGraphics,
	birdGraphics: PhaserGraphics,
	scene: PhaserScene,
	layout: Layout,
	state: RuntimeState,
): void {
	backdropGraphics.clear();
	backdropGraphics.fillGradientStyle(0x071221, 0x071221, 0x102c4a, 0x102c4a, 1);
	backdropGraphics.fillRect(0, 0, scene.scale.width, scene.scale.height);
	backdropGraphics.fillStyle(0x03101a, 0.14);
	backdropGraphics.fillRect(0, 0, scene.scale.width, scene.scale.height);

	worldGraphics.clear();
	worldGraphics.setPosition(layout.x, layout.y);
	worldGraphics.setScale(layout.scale);
	worldGraphics.fillGradientStyle(0x7dd3fc, 0x7dd3fc, 0xbfe8ff, 0xfef3c7, 1);
	worldGraphics.fillRect(0, 0, layout.viewWidth, PLAY_HEIGHT);
	worldGraphics.fillStyle(0xfde68a, 0.95);
	worldGraphics.fillCircle(layout.viewWidth - 72, 86, 34);

	for (const cloud of CLOUDS) {
		const span = layout.viewWidth + 170;
		const x =
			((cloud.x - state.scrollDistance * cloud.speed) % span + span) % span - 70;
		drawCloud(worldGraphics, x, cloud.y, cloud.scale, 0.75);
	}

	drawHillBand(worldGraphics, {
		width: layout.viewWidth,
		baseline: PLAY_HEIGHT - 148,
		radius: 70,
		speed: 0.18,
		offset: state.scrollDistance,
		color: 0x91c788,
		alpha: 0.9,
	});
	drawHillBand(worldGraphics, {
		width: layout.viewWidth,
		baseline: PLAY_HEIGHT - 106,
		radius: 84,
		speed: 0.32,
		offset: state.scrollDistance,
		color: 0x5a9b55,
		alpha: 0.95,
	});

	for (const pipe of state.pipes) {
		drawPipe(worldGraphics, pipe, layout.gameplayOffsetX);
	}

	drawGround(worldGraphics, state.groundOffset, layout.viewWidth);

	if (state.flashAlpha > 0) {
		worldGraphics.fillStyle(0xffffff, state.flashAlpha * 0.26);
		worldGraphics.fillRect(0, 0, layout.viewWidth, WORLD_HEIGHT);
	}

	birdGraphics.setPosition(
		layout.x + (layout.gameplayOffsetX + BIRD_X) * layout.scale,
		layout.y + state.birdY * layout.scale,
	);
	birdGraphics.setScale(layout.scale);
	birdGraphics.setRotation(state.birdRotation);
	drawBird(birdGraphics, state.phase, state.wingTime);
}

function mountFlappyBird(
	host: HTMLDivElement,
	PhaserLib: PhaserModule,
	bridge: Bridge,
): () => void {
	let game: PhaserGame | null = null;
	let observer: ResizeObserver | null = null;
	let backdropGraphics: PhaserGraphics | null = null;
	let worldGraphics: PhaserGraphics | null = null;
	let birdGraphics: PhaserGraphics | null = null;
	let scoreText: PhaserText | null = null;
	let promptText: PhaserText | null = null;
	let detailText: PhaserText | null = null;
	let state = createRuntimeState(loadBestScore());
	let accumulator = 0;

	const sync = () => {
		syncUi(bridge, state);
	};

	const handlePrimaryAction = () => {
		if (state.paused) return;

		if (state.phase === "ready") {
			beginRun(state);
			flapBird(state);
			sync();
			return;
		}

		if (state.phase === "running") {
			flapBird(state);
			return;
		}

		state = restartRound(state, true);
		sync();
	};

	const handleRestart = () => {
		state = restartRound(state, false);
		accumulator = 0;
		sync();
	};

	const handleTogglePause = () => {
		if (state.phase !== "running") return;
		state.paused = !state.paused;
		sync();
	};

	const renderScene = (scene: PhaserScene) => {
		if (!backdropGraphics || !worldGraphics || !birdGraphics || !scoreText || !promptText || !detailText) {
			return;
		}

		const layout = resolveLayout(scene);
		syncViewportPadding(state, layout);
		drawWorld(backdropGraphics, worldGraphics, birdGraphics, scene, layout, state);

		scoreText
			.setText(String(state.score))
			.setPosition(scene.scale.width / 2, layout.y + 18 * layout.scale)
			.setFontSize(Math.max(34, Math.floor(layout.scale * 36)));

		if (state.paused) {
			promptText
				.setText("PAUSED")
				.setPosition(scene.scale.width / 2, layout.y + layout.height * 0.34)
				.setFontSize(Math.max(18, Math.floor(layout.scale * 28)))
				.setVisible(true);
			detailText
				.setText("Press P or use the pause button to resume")
				.setPosition(scene.scale.width / 2, layout.y + layout.height * 0.41)
				.setFontSize(Math.max(11, Math.floor(layout.scale * 13)))
				.setVisible(true);
			return;
		}

		if (state.phase === "ready") {
			promptText
				.setText("FLAPPY BIRD")
				.setPosition(scene.scale.width / 2, layout.y + layout.height * 0.24)
				.setFontSize(Math.max(22, Math.floor(layout.scale * 34)))
				.setVisible(true);
			detailText
				.setText("Click, tap, or press Space to start")
				.setPosition(scene.scale.width / 2, layout.y + layout.height * 0.31)
				.setFontSize(Math.max(11, Math.floor(layout.scale * 13)))
				.setVisible(true);
			return;
		}

		if (state.phase === "gameOver") {
			promptText
				.setText("CRASH")
				.setPosition(scene.scale.width / 2, layout.y + layout.height * 0.26)
				.setFontSize(Math.max(22, Math.floor(layout.scale * 34)))
				.setVisible(true);
			detailText
				.setText("Tap to retry or press R to reset")
				.setPosition(scene.scale.width / 2, layout.y + layout.height * 0.33)
				.setFontSize(Math.max(11, Math.floor(layout.scale * 13)))
				.setVisible(true);
			return;
		}

		promptText.setVisible(false);
		detailText.setVisible(false);
	};

	class FlappyBirdScene extends PhaserLib.Scene {
		constructor() {
			super("flappy-bird-phaser");
		}

		create() {
			backdropGraphics = this.add.graphics().setDepth(0);
			worldGraphics = this.add.graphics().setDepth(1);
			birdGraphics = this.add.graphics().setDepth(2);

			scoreText = this.add.text(0, 0, "0", {
				fontFamily: FONT_STACK,
				fontStyle: "700",
				color: "#fff8dc",
				align: "center",
			});
			scoreText.setOrigin(0.5, 0).setDepth(5).setStroke("#172033", 8);

			promptText = this.add.text(0, 0, "", {
				fontFamily: FONT_STACK,
				fontStyle: "700",
				color: "#fff8dc",
				align: "center",
			});
			promptText.setOrigin(0.5, 0.5).setDepth(5).setStroke("#172033", 10);

			detailText = this.add.text(0, 0, "", {
				fontFamily: FONT_STACK,
				color: "#e2e8f0",
				align: "center",
			});
			detailText.setOrigin(0.5, 0.5).setDepth(5).setStroke("#172033", 6);

			this.input.on("pointerdown", () => {
				handlePrimaryAction();
			});

			this.scale.on("resize", () => {
				renderScene(this);
			});

			renderScene(this);
			sync();
			bridge.onReady();
		}

		update(_time: number, deltaMs: number) {
			accumulator = Math.min(
				MAX_CATCHUP,
				accumulator + Math.min(MAX_DELTA_SECONDS, deltaMs / 1_000),
			);

			let changed = false;
			while (accumulator >= FIXED_STEP) {
				const scoreBefore = state.score;
				const phaseBefore = state.phase;
				stepGame(state, FIXED_STEP);
				accumulator -= FIXED_STEP;

				if (state.score !== scoreBefore || state.phase !== phaseBefore) {
					changed = true;
				}
			}

			if (changed) {
				sync();
			}

			renderScene(this);
		}
	}

	const handleKeyDown = (event: KeyboardEvent) => {
		if (isEditableTarget(event.target)) return;

		if (
			event.code === "Space" ||
			event.code === "ArrowUp" ||
			event.code === "KeyW"
		) {
			event.preventDefault();
			handlePrimaryAction();
			return;
		}

		if (event.code === "KeyP") {
			event.preventDefault();
			handleTogglePause();
			return;
		}

		if (event.code === "KeyR" || event.code === "Enter") {
			event.preventDefault();
			handleRestart();
		}
	};

	const handleVisibilityChange = () => {
		if (document.hidden && state.phase === "running" && !state.paused) {
			state.paused = true;
			sync();
		}
	};

	host.innerHTML = "";
	bridge.controlsRef.current = {
		primaryAction: handlePrimaryAction,
		restart: handleRestart,
		togglePause: handleTogglePause,
	};

	window.addEventListener("keydown", handleKeyDown, { passive: false });
	document.addEventListener("visibilitychange", handleVisibilityChange);

	const initialSize = resolveHostSize(host);
	game = new PhaserLib.Game({
		type: PhaserLib.CANVAS,
		parent: host,
		width: initialSize.width,
		height: initialSize.height,
		scene: new FlappyBirdScene() as PhaserScene,
		banner: false,
		disableContextMenu: true,
		audio: { noAudio: true },
		backgroundColor: "#071221",
		transparent: false,
		antialias: true,
		pixelArt: false,
	});

	observer = new ResizeObserver(() => {
		if (!game) return;
		const size = resolveHostSize(host);
		game.scale.resize(size.width, size.height);
	});
	observer.observe(host);

	return () => {
		observer?.disconnect();
		window.removeEventListener("keydown", handleKeyDown);
		document.removeEventListener("visibilitychange", handleVisibilityChange);
		bridge.controlsRef.current = null;
		backdropGraphics = null;
		worldGraphics = null;
		birdGraphics = null;
		scoreText = null;
		promptText = null;
		detailText = null;
		game?.destroy(true);
		game = null;
		host.innerHTML = "";
	};
}

function statusLabel(uiState: UiState, status: "loading" | "ready" | "error"): string {
	if (status === "loading") return "Loading";
	if (status === "error") return "Error";
	if (uiState.paused) return "Paused";
	if (uiState.phase === "running") return "Flying";
	if (uiState.phase === "gameOver") return "Crashed";
	return "Ready";
}

function primaryLabel(uiState: UiState): string {
	if (uiState.phase === "running") return "Flap";
	if (uiState.phase === "gameOver") return "Retry";
	return "Start";
}

export default function FlappyBird(): React.JSX.Element {
	const hostRef = useRef<HTMLDivElement | null>(null);
	const controlsRef = useRef<FlappyBirdControls | null>(null);
	const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
	const [uiState, setUiState] = useState<UiState>(EMPTY_UI_STATE);

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

				cleanup = mountFlappyBird(hostRef.current, PhaserLib, {
					controlsRef,
					onReady: () => {
						if (!cancelled) setStatus("ready");
					},
					onUiState: (nextState) => {
						if (!cancelled) setUiState(nextState);
					},
				});
			} catch (error) {
				console.error("Unable to initialize Flappy Bird.", error);
				if (!cancelled) setStatus("error");
			}
		})();

		return () => {
			cancelled = true;
			cleanup?.();
		};
	}, []);

	return (
		<div className="relative flex h-full min-h-0 w-full flex-col overflow-hidden bg-[radial-gradient(circle_at_top,#1f5f8b_0%,#13324f_34%,#08101b_100%)] text-slate-100">
			<div className="border-b border-[#2a4e68] bg-[#08131f]/72 backdrop-blur">
				<div className="flex flex-wrap items-center gap-3 px-4 py-4 sm:px-5">
					<div className="mr-auto font-mono text-xs text-slate-300">
						Space, click, or tap to flap. P pauses. R resets the round.
					</div>
					<div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] uppercase tracking-[0.2em] text-slate-300">
						<span>Score <span className="text-[#fef3c7]">{uiState.score}</span></span>
						<span>Best <span className="text-[#fef3c7]">{uiState.best}</span></span>
						<span className="text-slate-100">{statusLabel(uiState, status)}</span>
					</div>
				</div>

				<div className="flex flex-wrap gap-2 px-4 pb-4 sm:px-5">
					<button
						type="button"
						onClick={() => controlsRef.current?.primaryAction()}
						disabled={status !== "ready"}
						className="rounded-full bg-[#fff3b0] px-4 py-2 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-[#122133] transition hover:bg-[#fff7cb] disabled:cursor-not-allowed disabled:opacity-45"
					>
						{primaryLabel(uiState)}
					</button>
					<button
						type="button"
						onClick={() => controlsRef.current?.togglePause()}
						disabled={status !== "ready" || uiState.phase !== "running"}
						className="rounded-full border border-[#355168] bg-[#0b1825] px-4 py-2 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-slate-100 transition hover:border-[#4c6f8f] hover:bg-[#102133] disabled:cursor-not-allowed disabled:opacity-45"
					>
						{uiState.paused ? "Resume" : "Pause"}
					</button>
					<button
						type="button"
						onClick={() => controlsRef.current?.restart()}
						disabled={status !== "ready"}
						className="rounded-full border border-[#355168] bg-[#0b1825] px-4 py-2 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-slate-100 transition hover:border-[#4c6f8f] hover:bg-[#102133] disabled:cursor-not-allowed disabled:opacity-45"
					>
						Restart
					</button>
				</div>
			</div>

			<div className="min-h-[560px] flex-1 bg-[linear-gradient(180deg,rgba(12,23,36,0.68),rgba(7,15,24,0.9))]">
				<div ref={hostRef} className="h-full w-full" />
			</div>

			{status === "loading" ? (
				<div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-[#06101a]/58 text-sm font-semibold tracking-[0.3em] text-slate-200">
					Loading Phaser...
				</div>
			) : null}

			{status === "error" ? (
				<div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-[#06101a]/78 px-6 text-center text-sm font-medium text-rose-200">
					Unable to load Flappy Bird right now.
				</div>
			) : null}
		</div>
	);
}
