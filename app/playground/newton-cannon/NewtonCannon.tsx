"use client";

import { type MutableRefObject, useEffect, useRef, useState } from "react";

type PhaserModule = typeof import("phaser");
type PhaserGame = import("phaser").Game;
type PhaserScene = import("phaser").Scene;
type PhaserGraphics = import("phaser").GameObjects.Graphics;
type PhaserPointer = import("phaser").Input.Pointer;

type Vector = {
	x: number;
	y: number;
};

type TrajectoryClass = "suborbital" | "orbit" | "escape";

type TrajectorySummary = {
	kind: TrajectoryClass;
	apoapsis: number;
	periapsis: number;
	points: Vector[];
};

type ActiveShot = {
	id: number;
	pos: Vector;
	vel: Vector;
	trail: Vector[];
	traveledAngle: number;
	lastAngle: number;
	orbitCount: number;
	apoapsis: number;
	periapsis: number;
};

type SettledShot = {
	id: number;
	pos: Vector;
};

type ImpactBurst = {
	pos: Vector;
	timer: number;
};

type RuntimeState = {
	paused: boolean;
	aimAngle: number;
	shots: ActiveShot[];
	settledShots: SettledShot[];
	impacts: ImpactBurst[];
	prediction: TrajectorySummary;
	previewSpeedPercent: number;
	previewAimAngle: number;
	drawTime: number;
	launchFlash: number;
	focusShotId: number | null;
	lastResult: TrajectoryClass | null;
	nextShotId: number;
};

type UiState = {
	status: "ready" | "running" | "paused";
	prediction: TrajectoryClass;
	lastResult: TrajectoryClass | null;
	activeShots: number;
	settledShots: number;
	orbitCount: number;
	altitude: number | null;
	apoapsis: number;
	periapsis: number;
	launchSpeed: number;
	circularSpeed: number;
	escapeSpeed: number;
	speedPercent: number;
	timeScale: number;
	aimDegrees: number;
};

type NewtonControls = {
	launch: () => void;
	reset: () => void;
	togglePause: () => void;
};

type Bridge = {
	speedPercentRef: MutableRefObject<number>;
	timeScaleRef: MutableRefObject<number>;
	controlsRef: MutableRefObject<NewtonControls | null>;
	onAdjustSpeed: (delta: number) => void;
	onReady: () => void;
	onUiState: (state: UiState) => void;
};

type Layout = {
	x: number;
	y: number;
	scale: number;
	width: number;
	height: number;
};

type Star = {
	u: number;
	v: number;
	radius: number;
	alpha: number;
	twinkle: number;
	phase: number;
};

const FONT_STACK =
	'"Azeret Mono", "JetBrains Mono", "SFMono-Regular", Consolas, monospace';
const WORLD_WIDTH = 960;
const WORLD_HEIGHT = 720;
const PLANET_CENTER = { x: WORLD_WIDTH * 0.5, y: WORLD_HEIGHT * 0.5 };
const PLANET_RADIUS = 186;
const CANNON_PIVOT = {
	x: PLANET_CENTER.x,
	y: PLANET_CENTER.y - PLANET_RADIUS - 32,
};
const BARREL_LENGTH = 62;
const BARREL_TIP_OFFSET = BARREL_LENGTH;
const GRAVITY_MU = 552_000;
const ORBIT_RADIUS = Math.hypot(BARREL_TIP_OFFSET, PLANET_CENTER.y - CANNON_PIVOT.y);
const CIRCULAR_SPEED = Math.sqrt(GRAVITY_MU / ORBIT_RADIUS);
const ESCAPE_SPEED = Math.sqrt((2 * GRAVITY_MU) / ORBIT_RADIUS);
const ATMOSPHERE_HEIGHT = 52;
const ATMOSPHERE_DRAG = 0.00015;
const FIXED_DT = 1 / 120;
const MAX_FRAME_DT = 1 / 24;
const PREVIEW_STEPS = 5_400;
const PREVIEW_SPACING = 10;
const TRAIL_SPACING = 6;
const MAX_TRAIL_POINTS = 320;
const MAX_ACTIVE_SHOTS = 6;
const MAX_SETTLED_SHOTS = 26;
const MAX_IMPACTS = 6;
const SHOT_DESPAWN_RADIUS = 1_030;
const MIN_SPEED_PERCENT = 40;
const MAX_SPEED_PERCENT = 180;
const DEFAULT_SPEED_PERCENT = 100;
const DEFAULT_TIME_SCALE = 4;
const TIME_SCALE_OPTIONS = [1, 2, 4, 8] as const;
const AIM_LIMIT = Math.PI / 2 - 0.08;
const OUTWARD_ANGLE = -Math.PI / 2;
const AIM_GUIDE_HALF_WIDTH = 324;
const AIM_GUIDE_CENTER_DROP = 102;
const AIM_GUIDE_SIDE_DROP = 118;
const SPEED_SCROLL_STEP = 2;
const DEFAULT_AIM_ANGLE = clampAimAngle(0);
const TAU = Math.PI * 2;

const EMPTY_UI_STATE: UiState = {
	status: "ready",
	prediction: "orbit",
	lastResult: null,
	activeShots: 0,
	settledShots: 0,
	orbitCount: 0,
	altitude: null,
	apoapsis: 0,
	periapsis: 0,
	launchSpeed: CIRCULAR_SPEED,
	circularSpeed: CIRCULAR_SPEED,
	escapeSpeed: ESCAPE_SPEED,
	speedPercent: DEFAULT_SPEED_PERCENT,
	timeScale: DEFAULT_TIME_SCALE,
	aimDegrees: 0,
};

function clamp(value: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, value));
}

function length(vector: Vector): number {
	return Math.hypot(vector.x, vector.y);
}

function distance(a: Vector, b: Vector): number {
	return Math.hypot(a.x - b.x, a.y - b.y);
}

function add(a: Vector, b: Vector): Vector {
	return { x: a.x + b.x, y: a.y + b.y };
}

function sub(a: Vector, b: Vector): Vector {
	return { x: a.x - b.x, y: a.y - b.y };
}

function scale(vector: Vector, scalar: number): Vector {
	return { x: vector.x * scalar, y: vector.y * scalar };
}

function dot(a: Vector, b: Vector): number {
	return a.x * b.x + a.y * b.y;
}

function normalize(vector: Vector): Vector {
	const size = length(vector) || 1;
	return { x: vector.x / size, y: vector.y / size };
}

function perpendicular(vector: Vector): Vector {
	return { x: -vector.y, y: vector.x };
}

function normalizeAngle(angle: number): number {
	let value = angle;
	while (value <= -Math.PI) value += TAU;
	while (value > Math.PI) value -= TAU;
	return value;
}

function clampAimAngle(rawAngle: number): number {
	const relative = clamp(
		normalizeAngle(rawAngle - OUTWARD_ANGLE),
		-AIM_LIMIT,
		AIM_LIMIT,
	);
	return OUTWARD_ANGLE + relative;
}

function directionForAngle(angle: number): Vector {
	return { x: Math.cos(angle), y: Math.sin(angle) };
}

function cannonMuzzle(angle: number): Vector {
	return add(CANNON_PIVOT, scale(directionForAngle(angle), BARREL_LENGTH));
}

function shotStart(angle: number): Vector {
	return add(CANNON_PIVOT, scale(directionForAngle(angle), BARREL_TIP_OFFSET));
}

function resolveLaunchSpeed(speedPercent: number): number {
	return CIRCULAR_SPEED * (clamp(speedPercent, MIN_SPEED_PERCENT, MAX_SPEED_PERCENT) / 100);
}

function resolveTimeScale(value: number): number {
	return TIME_SCALE_OPTIONS.includes(value as (typeof TIME_SCALE_OPTIONS)[number])
		? value
		: DEFAULT_TIME_SCALE;
}

function gravityAccelerationAt(position: Vector): Vector {
	const offset = sub(PLANET_CENTER, position);
	const radius = Math.max(32, length(offset));
	return scale(normalize(offset), GRAVITY_MU / (radius * radius));
}

function atmosphereDensityAt(position: Vector): number {
	const altitude = distance(position, PLANET_CENTER) - PLANET_RADIUS;
	if (altitude >= ATMOSPHERE_HEIGHT) return 0;
	const depth = 1 - Math.max(0, altitude) / ATMOSPHERE_HEIGHT;
	return depth * depth;
}

function totalAccelerationAt(position: Vector, velocity: Vector): Vector {
	const gravity = gravityAccelerationAt(position);
	const density = atmosphereDensityAt(position);
	if (density <= 0) return gravity;

	const speed = length(velocity);
	if (speed <= 1e-6) return gravity;

	const drag = scale(velocity, -ATMOSPHERE_DRAG * density * speed);
	return add(gravity, drag);
}

function specificOrbitalEnergy(position: Vector, velocity: Vector): number {
	const speed = length(velocity);
	return 0.5 * speed * speed - GRAVITY_MU / distance(position, PLANET_CENTER);
}

function isOutbound(position: Vector, velocity: Vector): boolean {
	return dot(sub(position, PLANET_CENTER), velocity) > 0;
}

function integrateOrbit(position: Vector, velocity: Vector, dt: number) {
	const k1Pos = velocity;
	const k1Vel = totalAccelerationAt(position, velocity);

	const k2PosInput = add(position, scale(k1Pos, dt * 0.5));
	const k2VelInput = add(velocity, scale(k1Vel, dt * 0.5));
	const k2Pos = k2VelInput;
	const k2Vel = totalAccelerationAt(k2PosInput, k2VelInput);

	const k3PosInput = add(position, scale(k2Pos, dt * 0.5));
	const k3VelInput = add(velocity, scale(k2Vel, dt * 0.5));
	const k3Pos = k3VelInput;
	const k3Vel = totalAccelerationAt(k3PosInput, k3VelInput);

	const k4PosInput = add(position, scale(k3Pos, dt));
	const k4VelInput = add(velocity, scale(k3Vel, dt));
	const k4Pos = k4VelInput;
	const k4Vel = totalAccelerationAt(k4PosInput, k4VelInput);

	const nextPosition = add(
		position,
		scale(
			add(
				add(k1Pos, scale(add(k2Pos, k3Pos), 2)),
				k4Pos,
			),
			dt / 6,
		),
	);
	const nextVelocity = add(
		velocity,
		scale(
			add(
				add(k1Vel, scale(add(k2Vel, k3Vel), 2)),
				k4Vel,
			),
			dt / 6,
		),
	);

	return {
		pos: nextPosition,
		vel: nextVelocity,
	};
}

function angleAroundPlanet(position: Vector): number {
	return Math.atan2(position.y - PLANET_CENTER.y, position.x - PLANET_CENTER.x);
}

function projectToSurface(position: Vector): Vector {
	return add(PLANET_CENTER, scale(normalize(sub(position, PLANET_CENTER)), PLANET_RADIUS));
}

function aimGuidePoint(t: number): Vector {
	const clamped = clamp(t, -1, 1);
	return {
		x: PLANET_CENTER.x + clamped * AIM_GUIDE_HALF_WIDTH,
		y:
			CANNON_PIVOT.y +
			AIM_GUIDE_CENTER_DROP +
			Math.pow(Math.abs(clamped), 1.6) * AIM_GUIDE_SIDE_DROP,
	};
}

function aimGuideTFromAngle(angle: number): number {
	return clamp(normalizeAngle(angle - OUTWARD_ANGLE) / AIM_LIMIT, -1, 1);
}

function angleFromGuideT(t: number): number {
	return clampAimAngle(OUTWARD_ANGLE + clamp(t, -1, 1) * AIM_LIMIT);
}

function guideTFromPointer(point: Vector): number {
	return clamp((point.x - PLANET_CENTER.x) / AIM_GUIDE_HALF_WIDTH, -1, 1);
}

function shotFromConfig(id: number, speedPercent: number, aimAngle: number): ActiveShot {
	const start = shotStart(aimAngle);
	const velocity = scale(directionForAngle(aimAngle), resolveLaunchSpeed(speedPercent));
	const startRadius = distance(start, PLANET_CENTER);

	return {
		id,
		pos: start,
		vel: velocity,
		trail: [start],
		traveledAngle: 0,
		lastAngle: angleAroundPlanet(start),
		orbitCount: 0,
		apoapsis: startRadius,
		periapsis: startRadius,
	};
}

function simulateTrajectory(speedPercent: number, aimAngle: number): TrajectorySummary {
	let pos = shotStart(aimAngle);
	let vel = scale(directionForAngle(aimAngle), resolveLaunchSpeed(speedPercent));
	let traveledAngle = 0;
	let lastAngle = angleAroundPlanet(pos);
	let apoapsis = distance(pos, PLANET_CENTER);
	let periapsis = apoapsis;
	let kind: TrajectoryClass = "orbit";
	let lastPoint = pos;
	const points: Vector[] = [{ ...pos }];

	for (let step = 0; step < PREVIEW_STEPS; step += 1) {
		const next = integrateOrbit(pos, vel, FIXED_DT);
		pos = next.pos;
		vel = next.vel;

		const radius = distance(pos, PLANET_CENTER);
		apoapsis = Math.max(apoapsis, radius);
		periapsis = Math.min(periapsis, radius);

		const angle = angleAroundPlanet(pos);
		traveledAngle += normalizeAngle(angle - lastAngle);
		lastAngle = angle;

		if (distance(pos, lastPoint) >= PREVIEW_SPACING) {
			points.push({ ...pos });
			lastPoint = pos;
		}

		if (radius <= PLANET_RADIUS) {
			kind = "suborbital";
			points.push(projectToSurface(pos));
			break;
		}

		if (
			specificOrbitalEnergy(pos, vel) > 0 &&
			radius >= SHOT_DESPAWN_RADIUS &&
			isOutbound(pos, vel)
		) {
			kind = "escape";
			points.push({ ...pos });
			break;
		}

		if (Math.abs(traveledAngle) >= TAU) {
			kind = "orbit";
			break;
		}
	}

	return {
		kind,
		apoapsis,
		periapsis: Math.max(PLANET_RADIUS, periapsis),
		points,
	};
}

function createRuntimeState(speedPercent: number): RuntimeState {
	const clampedSpeed = clamp(speedPercent, MIN_SPEED_PERCENT, MAX_SPEED_PERCENT);

	return {
		paused: false,
		aimAngle: DEFAULT_AIM_ANGLE,
		shots: [],
		settledShots: [],
		impacts: [],
		prediction: simulateTrajectory(clampedSpeed, DEFAULT_AIM_ANGLE),
		previewSpeedPercent: clampedSpeed,
		previewAimAngle: DEFAULT_AIM_ANGLE,
		drawTime: 0,
		launchFlash: 0,
		focusShotId: null,
		lastResult: null,
		nextShotId: 1,
	};
}

function resolveHostSize(host: HTMLDivElement): { width: number; height: number } {
	return {
		width: Math.max(320, Math.floor(host.clientWidth || 0)),
		height: Math.max(420, Math.floor(host.clientHeight || 0)),
	};
}

function resolveLayout(scene: PhaserScene): Layout {
	const width = scene.scale.width;
	const height = scene.scale.height;
	const scaleValue = Math.min(width / WORLD_WIDTH, height / WORLD_HEIGHT);

	return {
		x: Math.floor((width - WORLD_WIDTH * scaleValue) / 2),
		y: Math.floor((height - WORLD_HEIGHT * scaleValue) / 2),
		scale: scaleValue,
		width: WORLD_WIDTH * scaleValue,
		height: WORLD_HEIGHT * scaleValue,
	};
}

function toScreen(layout: Layout, point: Vector): Vector {
	return {
		x: layout.x + point.x * layout.scale,
		y: layout.y + point.y * layout.scale,
	};
}

function toScreenValue(layout: Layout, value: number): number {
	return value * layout.scale;
}

function toWorldPoint(layout: Layout, pointer: PhaserPointer): Vector {
	return {
		x: clamp((pointer.x - layout.x) / layout.scale, -220, WORLD_WIDTH + 220),
		y: clamp((pointer.y - layout.y) / layout.scale, -220, WORLD_HEIGHT + 220),
	};
}

function focusShot(state: RuntimeState): ActiveShot | null {
	if (state.focusShotId !== null) {
		const focused = state.shots.find((shot) => shot.id === state.focusShotId);
		if (focused) return focused;
	}

	return state.shots[state.shots.length - 1] ?? null;
}

function buildUiState(state: RuntimeState, bridge: Bridge): UiState {
	const speedPercent = clamp(
		bridge.speedPercentRef.current,
		MIN_SPEED_PERCENT,
		MAX_SPEED_PERCENT,
	);
	const tracked = focusShot(state);
	const altitude = tracked
		? Math.max(0, distance(tracked.pos, PLANET_CENTER) - PLANET_RADIUS)
		: null;
	const apoapsis = tracked ? tracked.apoapsis : state.prediction.apoapsis;
	const periapsis = tracked ? tracked.periapsis : state.prediction.periapsis;
	const tangentDegrees = Math.round((normalizeAngle(state.aimAngle) * 180) / Math.PI);

	return {
		status: state.paused ? "paused" : state.shots.length > 0 ? "running" : "ready",
		prediction: state.prediction.kind,
		lastResult: state.lastResult,
		activeShots: state.shots.length,
		settledShots: state.settledShots.length,
		orbitCount: tracked?.orbitCount ?? 0,
		altitude,
		apoapsis: Math.max(0, apoapsis - PLANET_RADIUS),
		periapsis: Math.max(0, periapsis - PLANET_RADIUS),
		launchSpeed: resolveLaunchSpeed(speedPercent),
		circularSpeed: CIRCULAR_SPEED,
		escapeSpeed: ESCAPE_SPEED,
		speedPercent,
		timeScale: resolveTimeScale(bridge.timeScaleRef.current),
		aimDegrees: tangentDegrees,
	};
}

function createStars(): Star[] {
	let seed = 1_973_261;
	const next = () => {
		seed = (seed * 1_664_525 + 1_013_904_223) >>> 0;
		return seed / 4_294_967_296;
	};

	return Array.from({ length: 180 }, () => ({
		u: next(),
		v: next() * 0.92,
		radius: 0.8 + next() * 2.6,
		alpha: 0.2 + next() * 0.75,
		twinkle: 0.45 + next() * 1.6,
		phase: next() * TAU,
	}));
}

function drawBackdrop(
	graphics: PhaserGraphics,
	stars: readonly Star[],
	drawTime: number,
	canvasWidth: number,
	canvasHeight: number,
): void {
	graphics.clear();
	graphics.fillStyle(0x020611, 1);
	graphics.fillRect(0, 0, canvasWidth, canvasHeight);

	graphics.fillStyle(0x173257, 0.35);
	graphics.fillEllipse(canvasWidth * 0.24, canvasHeight * 0.2, canvasWidth * 0.52, canvasHeight * 0.36);
	graphics.fillStyle(0x311b49, 0.22);
	graphics.fillEllipse(canvasWidth * 0.78, canvasHeight * 0.17, canvasWidth * 0.46, canvasHeight * 0.32);
	graphics.fillStyle(0x0a1630, 0.42);
	graphics.fillEllipse(canvasWidth * 0.52, canvasHeight * 0.45, canvasWidth * 0.95, canvasHeight * 0.72);

	for (const star of stars) {
		const x = star.u * canvasWidth;
		const y = star.v * canvasHeight;
		const twinkle = 0.6 + 0.4 * Math.sin(drawTime * star.twinkle + star.phase);
		const glow = star.radius * 2.8;

		graphics.fillStyle(0xa9d4ff, 0.06 * star.alpha * twinkle);
		graphics.fillCircle(x, y, glow);
		graphics.fillStyle(0xf5fbff, star.alpha * twinkle);
		graphics.fillCircle(x, y, star.radius);
	}
}

function drawPrediction(
	graphics: PhaserGraphics,
	layout: Layout,
	prediction: TrajectorySummary,
	alpha: number,
): void {
	const color =
		prediction.kind === "orbit"
			? 0x69e6ff
			: prediction.kind === "escape"
				? 0xffc65d
				: 0xff8062;

	for (const point of prediction.points) {
		const screen = toScreen(layout, point);
		graphics.fillStyle(color, alpha);
		graphics.fillCircle(screen.x, screen.y, toScreenValue(layout, 2.4));
	}
}

function drawAimGuide(graphics: PhaserGraphics, layout: Layout, aimAngle: number): void {
	const activeT = aimGuideTFromAngle(aimAngle);
	graphics.lineStyle(toScreenValue(layout, 1.3), 0x7dc8ff, 0.16);
	graphics.beginPath();

	for (let index = 0; index <= 28; index += 1) {
		const t = -1 + (index / 28) * 2;
		const screen = toScreen(layout, aimGuidePoint(t));
		if (index === 0) {
			graphics.moveTo(screen.x, screen.y);
		} else {
			graphics.lineTo(screen.x, screen.y);
		}
	}

	graphics.strokePath();

	for (let index = 0; index < 22; index += 1) {
		const t = -1 + (index / 21) * 2;
		const screen = toScreen(layout, aimGuidePoint(t));
		const isActive = Math.abs(t - activeT) < 0.06;
		graphics.fillStyle(isActive ? 0xffd166 : 0x7dc8ff, isActive ? 0.82 : 0.26);
		graphics.fillCircle(
			screen.x,
			screen.y,
			toScreenValue(layout, isActive ? 3.6 : 2.1),
		);
	}
}

function drawTrail(
	graphics: PhaserGraphics,
	layout: Layout,
	trail: readonly Vector[],
	alpha: number,
): void {
	if (trail.length < 2) return;

	graphics.lineStyle(toScreenValue(layout, 2.1), 0xffefb0, alpha);
	graphics.beginPath();
	const first = toScreen(layout, trail[0]);
	graphics.moveTo(first.x, first.y);

	for (let index = 1; index < trail.length; index += 1) {
		const point = toScreen(layout, trail[index]);
		graphics.lineTo(point.x, point.y);
	}

	graphics.strokePath();
}

function drawPlanet(graphics: PhaserGraphics, layout: Layout): void {
	const center = toScreen(layout, PLANET_CENTER);
	const radius = toScreenValue(layout, PLANET_RADIUS);

	graphics.fillStyle(0x7bd6ff, 0.12);
	graphics.fillCircle(center.x, center.y, radius + toScreenValue(layout, 24));
	graphics.fillStyle(0x123554, 1);
	graphics.fillCircle(center.x, center.y, radius);
	graphics.fillStyle(0x1d5888, 0.96);
	graphics.fillCircle(
		center.x - toScreenValue(layout, 28),
		center.y - toScreenValue(layout, 22),
		toScreenValue(layout, 144),
	);
	graphics.fillStyle(0x407f49, 0.84);
	graphics.fillEllipse(
		center.x - toScreenValue(layout, 66),
		center.y + toScreenValue(layout, 20),
		toScreenValue(layout, 156),
		toScreenValue(layout, 58),
	);
	graphics.fillEllipse(
		center.x + toScreenValue(layout, 46),
		center.y - toScreenValue(layout, 6),
		toScreenValue(layout, 126),
		toScreenValue(layout, 42),
	);
	graphics.fillStyle(0x0e2032, 0.45);
	graphics.fillCircle(
		center.x + toScreenValue(layout, 66),
		center.y + toScreenValue(layout, 80),
		toScreenValue(layout, 138),
	);
	graphics.lineStyle(toScreenValue(layout, 2.6), 0xb4efff, 0.18);
	graphics.strokeCircle(center.x, center.y, radius + toScreenValue(layout, 10));
}

function drawSettledShots(
	graphics: PhaserGraphics,
	layout: Layout,
	shots: readonly SettledShot[],
): void {
	for (const shot of shots) {
		const screen = toScreen(layout, shot.pos);
		graphics.fillStyle(0x271911, 0.55);
		graphics.fillCircle(screen.x, screen.y, toScreenValue(layout, 7));
		graphics.fillStyle(0x625041, 1);
		graphics.fillCircle(screen.x, screen.y, toScreenValue(layout, 4.2));
	}
}

function drawMountainAndCannon(
	graphics: PhaserGraphics,
	layout: Layout,
	aimAngle: number,
	launchFlash: number,
): void {
	const barrelDir = directionForAngle(aimAngle);
	const barrelNormal = scale(perpendicular(barrelDir), 9.2);
	const breechCenter = add(CANNON_PIVOT, scale(barrelDir, -16));
	const barrelStart = add(CANNON_PIVOT, scale(barrelDir, -6));
	const barrelEnd = shotStart(aimAngle);
	const muzzleCenter = shotStart(aimAngle);
	const breechLeft = add(breechCenter, scale(barrelNormal, 1.12));
	const breechRight = add(breechCenter, scale(barrelNormal, -1.12));
	const startLeft = add(barrelStart, scale(barrelNormal, 0.94));
	const startRight = add(barrelStart, scale(barrelNormal, -0.94));
	const endLeft = add(barrelEnd, scale(barrelNormal, 0.84));
	const endRight = add(barrelEnd, scale(barrelNormal, -0.84));
	const supportTopLeft = add(CANNON_PIVOT, { x: -12, y: 10 });
	const supportTopRight = add(CANNON_PIVOT, { x: 12, y: 10 });
	const supportBottomLeft = add(CANNON_PIVOT, { x: -20, y: 24 });
	const supportBottomRight = add(CANNON_PIVOT, { x: 20, y: 24 });
	const wheelLeft = toScreen(layout, add(CANNON_PIVOT, { x: -22, y: 28 }));
	const wheelRight = toScreen(layout, add(CANNON_PIVOT, { x: 22, y: 28 }));
	const wheelRadius = toScreenValue(layout, 11.5);
	const carriageFrontTop = toScreen(layout, add(CANNON_PIVOT, { x: 26, y: 10 }));
	const carriageFrontBottom = toScreen(layout, add(CANNON_PIVOT, { x: 34, y: 24 }));
	const carriageBackTop = toScreen(layout, add(CANNON_PIVOT, { x: -28, y: 12 }));
	const carriageBackBottom = toScreen(layout, add(CANNON_PIVOT, { x: -34, y: 26 }));
	const carriageBaseLeft = toScreen(layout, add(CANNON_PIVOT, { x: -42, y: 30 }));
	const carriageBaseRight = toScreen(layout, add(CANNON_PIVOT, { x: 42, y: 30 }));
	const cradleLeft = toScreen(layout, add(CANNON_PIVOT, { x: -12, y: 10 }));
	const cradleRight = toScreen(layout, add(CANNON_PIVOT, { x: 12, y: 10 }));
	const pedestal = [
		toScreen(layout, add(CANNON_PIVOT, { x: -58, y: 44 })),
		toScreen(layout, add(CANNON_PIVOT, { x: -34, y: 26 })),
		toScreen(layout, add(CANNON_PIVOT, { x: -12, y: 34 })),
		toScreen(layout, add(CANNON_PIVOT, { x: 0, y: 22 })),
		toScreen(layout, add(CANNON_PIVOT, { x: 18, y: 32 })),
		toScreen(layout, add(CANNON_PIVOT, { x: 40, y: 24 })),
		toScreen(layout, add(CANNON_PIVOT, { x: 60, y: 44 })),
	];

	graphics.fillStyle(0x473327, 0.96);
	graphics.beginPath();
	graphics.moveTo(pedestal[0].x, pedestal[0].y);
	for (let index = 1; index < pedestal.length; index += 1) {
		graphics.lineTo(pedestal[index].x, pedestal[index].y);
	}
	graphics.closePath();
	graphics.fillPath();
	graphics.lineStyle(toScreenValue(layout, 2), 0x1c120d, 0.35);
	graphics.beginPath();
	graphics.moveTo(pedestal[0].x, pedestal[0].y);
	for (let index = 1; index < pedestal.length; index += 1) {
		graphics.lineTo(pedestal[index].x, pedestal[index].y);
	}
	graphics.strokePath();

	const breechLeftScreen = toScreen(layout, breechLeft);
	const breechRightScreen = toScreen(layout, breechRight);
	const startLeftScreen = toScreen(layout, startLeft);
	const startRightScreen = toScreen(layout, startRight);
	const endLeftScreen = toScreen(layout, endLeft);
	const endRightScreen = toScreen(layout, endRight);
	const breechCenterScreen = toScreen(layout, breechCenter);
	const muzzleScreen = toScreen(layout, muzzleCenter);
	const supportTopLeftScreen = toScreen(layout, supportTopLeft);
	const supportTopRightScreen = toScreen(layout, supportTopRight);
	const supportBottomLeftScreen = toScreen(layout, supportBottomLeft);
	const supportBottomRightScreen = toScreen(layout, supportBottomRight);

	graphics.fillStyle(0x93a0af, 1);
	graphics.beginPath();
	graphics.moveTo(breechLeftScreen.x, breechLeftScreen.y);
	graphics.lineTo(startLeftScreen.x, startLeftScreen.y);
	graphics.lineTo(endLeftScreen.x, endLeftScreen.y);
	graphics.lineTo(endRightScreen.x, endRightScreen.y);
	graphics.lineTo(startRightScreen.x, startRightScreen.y);
	graphics.lineTo(breechRightScreen.x, breechRightScreen.y);
	graphics.closePath();
	graphics.fillPath();
	graphics.fillStyle(0x7f8b9b, 1);
	graphics.fillCircle(breechCenterScreen.x, breechCenterScreen.y, toScreenValue(layout, 12.6));
	graphics.fillStyle(0x667182, 1);
	graphics.fillCircle(breechCenterScreen.x, breechCenterScreen.y, toScreenValue(layout, 7));
	graphics.fillStyle(0x0f1319, 0.92);
	graphics.fillCircle(muzzleScreen.x, muzzleScreen.y, toScreenValue(layout, 4.2));

	const barrelHighlightStart = toScreen(
		layout,
		add(breechCenter, scale(barrelNormal, 0.46)),
	);
	const barrelHighlightEnd = toScreen(
		layout,
		add(barrelEnd, scale(barrelNormal, 0.28)),
	);
	graphics.lineStyle(toScreenValue(layout, 1.9), 0xf7faff, 0.42);
	graphics.beginPath();
	graphics.moveTo(barrelHighlightStart.x, barrelHighlightStart.y);
	graphics.lineTo(barrelHighlightEnd.x, barrelHighlightEnd.y);
	graphics.strokePath();

	graphics.fillStyle(0x748091, 0.96);
	graphics.beginPath();
	graphics.moveTo(supportTopLeftScreen.x, supportTopLeftScreen.y);
	graphics.lineTo(supportTopRightScreen.x, supportTopRightScreen.y);
	graphics.lineTo(supportBottomRightScreen.x, supportBottomRightScreen.y);
	graphics.lineTo(supportBottomLeftScreen.x, supportBottomLeftScreen.y);
	graphics.closePath();
	graphics.fillPath();
	graphics.lineStyle(toScreenValue(layout, 1.6), 0x4f5b6c, 0.5);
	graphics.beginPath();
	graphics.moveTo(supportTopLeftScreen.x, supportTopLeftScreen.y);
	graphics.lineTo(supportTopRightScreen.x, supportTopRightScreen.y);
	graphics.lineTo(supportBottomRightScreen.x, supportBottomRightScreen.y);
	graphics.lineTo(supportBottomLeftScreen.x, supportBottomLeftScreen.y);
	graphics.closePath();
	graphics.strokePath();

	graphics.fillStyle(0x6d4127, 1);
	graphics.beginPath();
	graphics.moveTo(carriageBackTop.x, carriageBackTop.y);
	graphics.lineTo(carriageFrontTop.x, carriageFrontTop.y);
	graphics.lineTo(carriageFrontBottom.x, carriageFrontBottom.y);
	graphics.lineTo(carriageBackBottom.x, carriageBackBottom.y);
	graphics.closePath();
	graphics.fillPath();
	graphics.fillStyle(0x8b5938, 1);
	graphics.fillRoundedRect(
		carriageBaseLeft.x,
		carriageBaseLeft.y - toScreenValue(layout, 4),
		carriageBaseRight.x - carriageBaseLeft.x,
		toScreenValue(layout, 6),
		toScreenValue(layout, 3),
	);
	graphics.lineStyle(toScreenValue(layout, 1.8), 0x331d11, 0.5);
	graphics.beginPath();
	graphics.moveTo(cradleLeft.x, cradleLeft.y);
	graphics.lineTo(wheelLeft.x, wheelLeft.y);
	graphics.moveTo(cradleRight.x, cradleRight.y);
	graphics.lineTo(wheelRight.x, wheelRight.y);
	graphics.strokePath();

	for (const wheel of [wheelLeft, wheelRight]) {
		graphics.fillStyle(0x4f2f1d, 1);
		graphics.fillCircle(wheel.x, wheel.y, wheelRadius);
		graphics.fillStyle(0x8b5b39, 1);
		graphics.fillCircle(wheel.x, wheel.y, wheelRadius * 0.66);
		graphics.lineStyle(toScreenValue(layout, 1.3), 0x3a2113, 0.5);
		graphics.beginPath();
		graphics.moveTo(wheel.x - wheelRadius * 0.7, wheel.y);
		graphics.lineTo(wheel.x + wheelRadius * 0.7, wheel.y);
		graphics.moveTo(wheel.x, wheel.y - wheelRadius * 0.7);
		graphics.lineTo(wheel.x, wheel.y + wheelRadius * 0.7);
		graphics.strokePath();
		graphics.fillStyle(0xc9d2db, 1);
		graphics.fillCircle(wheel.x, wheel.y, wheelRadius * 0.18);
	}

	const pivot = toScreen(layout, CANNON_PIVOT);
	graphics.fillStyle(0x6f7c8d, 1);
	graphics.fillCircle(pivot.x, pivot.y, toScreenValue(layout, 9.5));

	if (launchFlash <= 0) return;

	const flashRadius = toScreenValue(layout, 10 + launchFlash * 18);
	graphics.fillStyle(0xfff1b8, 0.36 * launchFlash);
	graphics.fillCircle(muzzleScreen.x, muzzleScreen.y, flashRadius);
	graphics.fillStyle(0xffa94d, 0.8 * launchFlash);
	graphics.beginPath();
	graphics.moveTo(
		muzzleScreen.x + barrelDir.x * flashRadius * 0.1,
		muzzleScreen.y + barrelDir.y * flashRadius * 0.1,
	);
	graphics.lineTo(
		muzzleScreen.x + barrelDir.x * flashRadius * 1.95 + barrelNormal.x * 0.1,
		muzzleScreen.y + barrelDir.y * flashRadius * 1.95 + barrelNormal.y * 0.1,
	);
	graphics.lineTo(
		muzzleScreen.x + barrelNormal.x * 0.7,
		muzzleScreen.y + barrelNormal.y * 0.7,
	);
	graphics.lineTo(
		muzzleScreen.x - barrelNormal.x * 0.7,
		muzzleScreen.y - barrelNormal.y * 0.7,
	);
	graphics.closePath();
	graphics.fillPath();
}

function drawShot(graphics: PhaserGraphics, layout: Layout, shot: ActiveShot, alpha: number): void {
	const screen = toScreen(layout, shot.pos);
	graphics.fillStyle(0xfff3bf, 0.14 * alpha);
	graphics.fillCircle(screen.x, screen.y, toScreenValue(layout, 12));
	graphics.fillStyle(0xffd166, alpha);
	graphics.fillCircle(screen.x, screen.y, toScreenValue(layout, 4));
}

function drawImpact(graphics: PhaserGraphics, layout: Layout, burst: ImpactBurst): void {
	const center = toScreen(layout, burst.pos);
	const life = clamp(burst.timer, 0, 1);
	const radius = toScreenValue(layout, 12 + (1 - life) * 28);

	graphics.lineStyle(toScreenValue(layout, 2.4), 0xffd166, 0.72 * life);
	graphics.strokeCircle(center.x, center.y, radius);

	for (let index = 0; index < 8; index += 1) {
		const angle = (index / 8) * TAU + (1 - life) * 0.9;
		const start = {
			x: center.x + Math.cos(angle) * radius * 0.68,
			y: center.y + Math.sin(angle) * radius * 0.68,
		};
		const end = {
			x: center.x + Math.cos(angle) * radius * 1.22,
			y: center.y + Math.sin(angle) * radius * 1.22,
		};
		graphics.lineStyle(toScreenValue(layout, 1.7), 0xff9f43, 0.84 * life);
		graphics.beginPath();
		graphics.moveTo(start.x, start.y);
		graphics.lineTo(end.x, end.y);
		graphics.strokePath();
	}
}

function drawFrame(
	backdrop: PhaserGraphics,
	world: PhaserGraphics,
	scene: PhaserScene,
	state: RuntimeState,
	stars: readonly Star[],
): void {
	const layout = resolveLayout(scene);
	drawBackdrop(backdrop, stars, state.drawTime, scene.scale.width, scene.scale.height);

	world.clear();
	drawPrediction(world, layout, state.prediction, state.shots.length > 0 ? 0.16 : 0.48);
	drawAimGuide(world, layout, state.aimAngle);
	for (let index = 0; index < state.shots.length; index += 1) {
		const shot = state.shots[index];
		const alpha = 0.34 + (index + 1) / state.shots.length * 0.46;
		drawTrail(world, layout, shot.trail, alpha);
	}
	drawPlanet(world, layout);
	drawSettledShots(world, layout, state.settledShots);
	drawMountainAndCannon(world, layout, state.aimAngle, state.launchFlash);
	for (let index = 0; index < state.shots.length; index += 1) {
		const shot = state.shots[index];
		const alpha = index === state.shots.length - 1 ? 1 : 0.72;
		drawShot(world, layout, shot, alpha);
	}
	for (const burst of state.impacts) {
		drawImpact(world, layout, burst);
	}
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

function statusLabel(state: UiState, status: "loading" | "ready" | "error"): string {
	if (status === "loading") return "Loading";
	if (status === "error") return "Error";
	if (state.status === "paused") return "Paused";
	if (state.status === "running") return "Tracking";
	return "Ready";
}

function trajectoryLabel(kind: TrajectoryClass | null): string {
	if (!kind) return "Awaiting result";
	if (kind === "orbit") return "Orbit";
	if (kind === "escape") return "Escape";
	return "Impact";
}

function predictionLabel(kind: TrajectoryClass): string {
	if (kind === "orbit") return "Predicted orbit";
	if (kind === "escape") return "Predicted escape";
	return "Predicted impact";
}

function formatUnits(value: number | null): string {
	if (value === null) return "—";
	return `${Math.round(value)} u`;
}

function formatSpeed(value: number): string {
	return `${value.toFixed(1)} u/s`;
}

function telemetryLabel(value: number, fallback: string): string {
	return Number.isFinite(value) ? String(Math.round(value)) : fallback;
}

function mountNewtonCannon(
	host: HTMLDivElement,
	PhaserLib: PhaserModule,
	bridge: Bridge,
): () => void {
	let game: PhaserGame | null = null;
	let observer: ResizeObserver | null = null;
	let backdropGraphics: PhaserGraphics | null = null;
	let worldGraphics: PhaserGraphics | null = null;
	let accumulator = 0;
	let lastUiSync = 0;
	const stars = createStars();
	const state = createRuntimeState(bridge.speedPercentRef.current);

	const syncUi = (force = false) => {
		const now = performance.now();
		if (!force && now - lastUiSync < 80) return;
		lastUiSync = now;
		bridge.onUiState(buildUiState(state, bridge));
	};

	const refreshPrediction = () => {
		const nextSpeed = clamp(
			bridge.speedPercentRef.current,
			MIN_SPEED_PERCENT,
			MAX_SPEED_PERCENT,
		);
		const nextAim = state.aimAngle;

		if (
			nextSpeed === state.previewSpeedPercent &&
			Math.abs(nextAim - state.previewAimAngle) < 1e-5
		) {
			return;
		}

		state.previewSpeedPercent = nextSpeed;
		state.previewAimAngle = nextAim;
		state.prediction = simulateTrajectory(nextSpeed, nextAim);
		syncUi(true);
	};

	const updateAim = (pointer: PhaserPointer, scene: PhaserScene) => {
		const layout = resolveLayout(scene);
		const worldPoint = toWorldPoint(layout, pointer);
		state.aimAngle = angleFromGuideT(guideTFromPointer(worldPoint));
		refreshPrediction();
		syncUi(true);
	};

	const handleWheel = (event: WheelEvent) => {
		event.preventDefault();
		const direction = Math.sign(event.deltaY);
		if (direction === 0) return;
		bridge.onAdjustSpeed(direction > 0 ? -SPEED_SCROLL_STEP : SPEED_SCROLL_STEP);
	};

	const launchShot = () => {
		const shot = shotFromConfig(
			state.nextShotId,
			bridge.speedPercentRef.current,
			state.aimAngle,
		);
		state.nextShotId += 1;
		state.paused = false;
		state.launchFlash = 1;
		state.focusShotId = shot.id;
		state.shots.push(shot);
		if (state.shots.length > MAX_ACTIVE_SHOTS) {
			const [removed] = state.shots.splice(0, state.shots.length - MAX_ACTIVE_SHOTS);
			if (removed && removed.id === state.focusShotId) {
				state.focusShotId = state.shots[state.shots.length - 1]?.id ?? null;
			}
		}
		syncUi(true);
	};

	const settleShot = (shot: ActiveShot) => {
		const settled = {
			id: shot.id,
			pos: projectToSurface(shot.pos),
		};
		state.settledShots.push(settled);
		if (state.settledShots.length > MAX_SETTLED_SHOTS) {
			state.settledShots.splice(0, state.settledShots.length - MAX_SETTLED_SHOTS);
		}
		state.impacts.push({ pos: settled.pos, timer: 1 });
		if (state.impacts.length > MAX_IMPACTS) {
			state.impacts.splice(0, state.impacts.length - MAX_IMPACTS);
		}
		state.lastResult = "suborbital";
	};

	const removeShot = (index: number) => {
		const [removed] = state.shots.splice(index, 1);
		if (!removed) return;
		if (removed.id === state.focusShotId) {
			state.focusShotId = state.shots[state.shots.length - 1]?.id ?? null;
		}
	};

	const handleLaunch = () => {
		launchShot();
	};

	const handleReset = () => {
		state.paused = false;
		state.shots = [];
		state.settledShots = [];
		state.impacts = [];
		state.lastResult = null;
		state.focusShotId = null;
		state.launchFlash = 0;
		accumulator = 0;
		refreshPrediction();
		syncUi(true);
	};

	const handleTogglePause = () => {
		if (state.shots.length === 0) return;
		state.paused = !state.paused;
		syncUi(true);
	};

	const stepShots = () => {
		for (let index = state.shots.length - 1; index >= 0; index -= 1) {
			const shot = state.shots[index];
			const next = integrateOrbit(shot.pos, shot.vel, FIXED_DT);
			shot.pos = next.pos;
			shot.vel = next.vel;

			const radius = distance(shot.pos, PLANET_CENTER);
			shot.apoapsis = Math.max(shot.apoapsis, radius);
			shot.periapsis = Math.min(shot.periapsis, radius);

			if (distance(shot.pos, shot.trail[shot.trail.length - 1]) >= TRAIL_SPACING) {
				shot.trail.push({ ...shot.pos });
				if (shot.trail.length > MAX_TRAIL_POINTS) {
					shot.trail.splice(0, shot.trail.length - MAX_TRAIL_POINTS);
				}
			}

			const angle = angleAroundPlanet(shot.pos);
			shot.traveledAngle += normalizeAngle(angle - shot.lastAngle);
			shot.lastAngle = angle;

			const orbitCount = Math.floor(Math.abs(shot.traveledAngle) / TAU);
			if (orbitCount > shot.orbitCount) {
				shot.orbitCount = orbitCount;
				state.lastResult = "orbit";
			}

			if (radius <= PLANET_RADIUS) {
				settleShot(shot);
				removeShot(index);
				continue;
			}

			if (radius >= SHOT_DESPAWN_RADIUS && isOutbound(shot.pos, shot.vel)) {
				if (specificOrbitalEnergy(shot.pos, shot.vel) > 0) {
					state.lastResult = "escape";
				}
				removeShot(index);
			}
		}
	};

	const handleKeyDown = (event: KeyboardEvent) => {
		if (isEditableTarget(event.target)) return;

		if (event.code === "Space") {
			event.preventDefault();
			handleLaunch();
			return;
		}

		if (event.code === "KeyR") {
			event.preventDefault();
			handleReset();
			return;
		}

		if (event.code === "KeyP") {
			event.preventDefault();
			handleTogglePause();
		}
	};

	const handleVisibilityChange = () => {
		if (!document.hidden || state.shots.length === 0 || state.paused) return;
		state.paused = true;
		syncUi(true);
	};

	class NewtonCannonScene extends PhaserLib.Scene {
		constructor() {
			super("newton-cannon-phaser");
		}

		create() {
			backdropGraphics = this.add.graphics();
			worldGraphics = this.add.graphics();
			this.input.on("pointermove", (pointer: PhaserPointer) => {
				updateAim(pointer, this);
			});
			this.input.on("pointerdown", (pointer: PhaserPointer) => {
				updateAim(pointer, this);
				handleLaunch();
			});
			drawFrame(backdropGraphics, worldGraphics, this, state, stars);
			bridge.onReady();
			syncUi(true);
		}

		update(_time: number, deltaMs: number) {
			const frameDt = Math.min(deltaMs / 1000, MAX_FRAME_DT);
			state.drawTime += frameDt;
			state.launchFlash = Math.max(0, state.launchFlash - deltaMs / 260);
			for (let index = state.impacts.length - 1; index >= 0; index -= 1) {
				state.impacts[index].timer = Math.max(0, state.impacts[index].timer - deltaMs / 820);
				if (state.impacts[index].timer <= 0) {
					state.impacts.splice(index, 1);
				}
			}

			refreshPrediction();

			if (!state.paused && state.shots.length > 0) {
				accumulator += frameDt * resolveTimeScale(bridge.timeScaleRef.current);
				while (accumulator >= FIXED_DT) {
					stepShots();
					accumulator -= FIXED_DT;
					if (state.shots.length === 0) {
						accumulator = 0;
						break;
					}
				}
			} else {
				accumulator = 0;
			}

			if (backdropGraphics && worldGraphics) {
				drawFrame(backdropGraphics, worldGraphics, this, state, stars);
			}

			syncUi();
		}
	}

	host.innerHTML = "";
	bridge.controlsRef.current = {
		launch: handleLaunch,
		reset: handleReset,
		togglePause: handleTogglePause,
	};

	window.addEventListener("keydown", handleKeyDown, { passive: false });
	document.addEventListener("visibilitychange", handleVisibilityChange);
	host.addEventListener("wheel", handleWheel, { passive: false });

	const initialSize = resolveHostSize(host);
	game = new PhaserLib.Game({
		type: PhaserLib.CANVAS,
		parent: host,
		width: initialSize.width,
		height: initialSize.height,
		scene: new NewtonCannonScene() as PhaserScene,
		banner: false,
		disableContextMenu: true,
		audio: { noAudio: true },
		backgroundColor: "#020611",
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
		host.removeEventListener("wheel", handleWheel);
		bridge.controlsRef.current = null;
		backdropGraphics = null;
		worldGraphics = null;
		game?.destroy(true);
		game = null;
		host.innerHTML = "";
	};
}

export default function NewtonCannon() {
	const hostRef = useRef<HTMLDivElement | null>(null);
	const controlsRef = useRef<NewtonControls | null>(null);
	const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
	const [speedPercent, setSpeedPercent] = useState(DEFAULT_SPEED_PERCENT);
	const [timeScale, setTimeScale] = useState<(typeof TIME_SCALE_OPTIONS)[number]>(
		DEFAULT_TIME_SCALE,
	);
	const [uiState, setUiState] = useState<UiState>({
		...EMPTY_UI_STATE,
		timeScale: DEFAULT_TIME_SCALE,
	});

	const speedPercentRef = useRef(speedPercent);
	const timeScaleRef = useRef<number>(timeScale);

	useEffect(() => {
		speedPercentRef.current = speedPercent;
	}, [speedPercent]);

	useEffect(() => {
		timeScaleRef.current = timeScale;
	}, [timeScale]);

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

				cleanup = mountNewtonCannon(hostRef.current, PhaserLib, {
					speedPercentRef,
					timeScaleRef,
					controlsRef,
					onAdjustSpeed: (delta) => {
						if (cancelled) return;
						setSpeedPercent((current) =>
							clamp(current + delta, MIN_SPEED_PERCENT, MAX_SPEED_PERCENT),
						);
					},
					onReady: () => {
						if (!cancelled) setStatus("ready");
					},
					onUiState: (nextState) => {
						if (!cancelled) setUiState(nextState);
					},
				});
			} catch (error) {
				console.error("Unable to initialize Newton's cannon.", error);
				if (!cancelled) setStatus("error");
			}
		})();

		return () => {
			cancelled = true;
			cleanup?.();
		};
	}, []);

	return (
		<div className="relative h-full min-h-0 w-full overflow-hidden bg-[radial-gradient(circle_at_top,#173c57_0%,#0a1422_42%,#040913_100%)] text-slate-100">
			<div ref={hostRef} className="absolute inset-0" />

			<div className="pointer-events-none absolute inset-0 p-3 sm:p-4">
				<div className="flex h-full flex-col justify-between gap-3">
					<div className="flex flex-wrap items-start justify-between gap-3">
						<div className="pointer-events-auto w-full max-w-[24rem] rounded-[24px] border border-[#2c4a63] bg-[#07111b]/76 px-4 py-3 backdrop-blur-md">
							<div
								className="flex items-center justify-between text-[11px] uppercase tracking-[0.22em] text-slate-400"
								style={{ fontFamily: FONT_STACK }}
							>
								<span>Launch Speed</span>
								<span>{speedPercent}%</span>
							</div>
							<input
								type="range"
								min={MIN_SPEED_PERCENT}
								max={MAX_SPEED_PERCENT}
								step={1}
								value={speedPercent}
								onChange={(event) => setSpeedPercent(Number(event.target.value))}
								className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-full bg-[#163148] accent-[#f6d381]"
							/>
							<div
								className="mt-3 grid grid-cols-3 gap-2 text-[11px] uppercase tracking-[0.16em] text-slate-300"
								style={{ fontFamily: FONT_STACK }}
							>
								<div className="rounded-2xl border border-[#1f3548] bg-[#061019] px-3 py-2">
									<div className="text-slate-500">Launch</div>
									<div className="mt-1 text-[#f7f1cf]">{formatSpeed(uiState.launchSpeed)}</div>
								</div>
								<div className="rounded-2xl border border-[#1f3548] bg-[#061019] px-3 py-2">
									<div className="text-slate-500">Circular</div>
									<div className="mt-1 text-[#84e8ff]">{formatSpeed(uiState.circularSpeed)}</div>
								</div>
								<div className="rounded-2xl border border-[#1f3548] bg-[#061019] px-3 py-2">
									<div className="text-slate-500">Escape</div>
									<div className="mt-1 text-[#ffd479]">{formatSpeed(uiState.escapeSpeed)}</div>
								</div>
							</div>
						</div>

						<div
							className="pointer-events-auto flex flex-wrap justify-end gap-2 text-[11px] uppercase tracking-[0.2em]"
							style={{ fontFamily: FONT_STACK }}
						>
							<div className="rounded-full border border-[#355168] bg-[#091521]/82 px-3 py-1.5 text-[#f6d381]">
								{statusLabel(uiState, status)}
							</div>
							<div className="rounded-full border border-[#355168] bg-[#091521]/82 px-3 py-1.5 text-[#84e8ff]">
								{predictionLabel(uiState.prediction)}
							</div>
							<div className="rounded-full border border-[#355168] bg-[#091521]/82 px-3 py-1.5 text-slate-200">
								Last {trajectoryLabel(uiState.lastResult)}
							</div>
						</div>
					</div>

							<div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
						<div className="pointer-events-auto w-full max-w-[23rem] rounded-[24px] border border-[#2b455c] bg-[#07111b]/76 p-4 backdrop-blur-md">
							<div
								className="text-[11px] uppercase tracking-[0.22em] text-slate-400"
								style={{ fontFamily: FONT_STACK }}
							>
								Controls
							</div>
							<div className="mt-3 flex flex-wrap gap-2">
								{TIME_SCALE_OPTIONS.map((option) => (
									<button
										key={option}
										type="button"
										onClick={() => setTimeScale(option)}
										className={`rounded-full px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] transition ${
											timeScale === option
												? "bg-[#f6d381] text-[#102133]"
												: "border border-[#355168] bg-[#0a1723] text-slate-100 hover:border-[#4f7190] hover:bg-[#102133]"
										}`}
										style={{ fontFamily: FONT_STACK }}
									>
										{option}x
									</button>
								))}
							</div>
							<div className="mt-3 flex flex-wrap gap-2">
								<button
									type="button"
									onClick={() => controlsRef.current?.togglePause()}
									disabled={status !== "ready" || uiState.activeShots === 0}
									className="rounded-full border border-[#355168] bg-[#0a1723] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-100 transition hover:border-[#4f7190] hover:bg-[#102133] disabled:cursor-not-allowed disabled:opacity-45"
									style={{ fontFamily: FONT_STACK }}
								>
									{uiState.status === "paused" ? "Resume" : "Pause"}
								</button>
								<button
									type="button"
									onClick={() => controlsRef.current?.reset()}
									disabled={status !== "ready"}
									className="rounded-full border border-[#355168] bg-[#0a1723] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-100 transition hover:border-[#4f7190] hover:bg-[#102133] disabled:cursor-not-allowed disabled:opacity-45"
									style={{ fontFamily: FONT_STACK }}
								>
									Reset
								</button>
							</div>
							<div
								className="mt-3 text-[10px] uppercase tracking-[0.2em] text-slate-500"
								style={{ fontFamily: FONT_STACK }}
							>
								Scroll adjusts speed • click or press space to fire
							</div>
						</div>

						<div className="pointer-events-auto grid w-full max-w-[24rem] grid-cols-2 gap-2">
							{[
								{
									label: "Altitude",
									value: formatUnits(uiState.altitude),
									color: "text-[#f7f1cf]",
								},
								{
									label: "Apoapsis",
									value: formatUnits(uiState.apoapsis),
									color: "text-[#84e8ff]",
								},
								{
									label: "Periapsis",
									value: formatUnits(uiState.periapsis),
									color: "text-[#ffd479]",
								},
								{
									label: "Orbits",
									value: telemetryLabel(uiState.orbitCount, "0"),
									color: "text-[#f7f1cf]",
								},
								{
									label: "Active",
									value: telemetryLabel(uiState.activeShots, "0"),
									color: "text-[#84e8ff]",
								},
								{
									label: "Stuck",
									value: telemetryLabel(uiState.settledShots, "0"),
									color: "text-[#ffd479]",
								},
							].map((item) => (
								<div
									key={item.label}
									className="rounded-[22px] border border-[#2a4358] bg-[#07111b]/76 px-4 py-3 backdrop-blur-md"
								>
									<div
										className="text-[10px] uppercase tracking-[0.22em] text-slate-500"
										style={{ fontFamily: FONT_STACK }}
									>
										{item.label}
									</div>
									<div className={`mt-1 text-base ${item.color}`}>{item.value}</div>
								</div>
							))}
							</div>
						</div>
					</div>
			</div>

			{status === "loading" ? (
				<div
					className="pointer-events-none absolute inset-0 flex items-center justify-center bg-[#020611]/66 text-sm font-semibold uppercase tracking-[0.3em] text-slate-200"
					style={{ fontFamily: FONT_STACK }}
				>
					Loading Phaser...
				</div>
			) : null}

			{status === "error" ? (
				<div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-[#020611]/84 px-6 text-center text-sm font-medium text-rose-200">
					Unable to load Newton&apos;s cannon right now.
				</div>
			) : null}
		</div>
	);
}
