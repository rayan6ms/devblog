"use client";

import { type MutableRefObject, useEffect, useRef, useState } from "react";

type PhaserModule = typeof import("phaser");
type PhaserGame = import("phaser").Game;
type PhaserScene = import("phaser").Scene;

type WaveAxis = "horizontal" | "vertical";
type WaveMode = "harmonic" | "odd" | "detuned";
type PresetName = "classic" | "square-ish" | "bloom";

type WaveSettings = {
	numCircles: number;
	baseRadius: number;
	decay: number;
	speed: number;
	trailRatio: number;
	showGuides: boolean;
	strokeWeightPx: number;
	waveAxis: WaveAxis;
	mode: WaveMode;
	paused: boolean;
};

type MountBridge = {
	settingsRef: MutableRefObject<WaveSettings>;
	resetVersionRef: MutableRefObject<number>;
	onReady: () => void;
};

type Rect = {
	x: number;
	y: number;
	w: number;
	h: number;
};

const DEFAULT_SETTINGS: WaveSettings = {
	numCircles: 5,
	baseRadius: 120,
	decay: 0.65,
	speed: 0.02,
	trailRatio: 0.55,
	showGuides: true,
	strokeWeightPx: 2,
	waveAxis: "horizontal",
	mode: "harmonic",
	paused: false,
};

const PRESETS: Record<PresetName, WaveSettings> = {
	classic: DEFAULT_SETTINGS,
	"square-ish": {
		numCircles: 7,
		baseRadius: 148,
		decay: 0.7,
		speed: 0.016,
		trailRatio: 0.72,
		showGuides: true,
		strokeWeightPx: 2,
		waveAxis: "horizontal",
		mode: "odd",
		paused: false,
	},
	bloom: {
		numCircles: 9,
		baseRadius: 110,
		decay: 0.82,
		speed: 0.011,
		trailRatio: 0.8,
		showGuides: true,
		strokeWeightPx: 2,
		waveAxis: "vertical",
		mode: "detuned",
		paused: false,
	},
};

function clamp(value: number, min: number, max: number) {
	if (max < min) return min;
	return Math.min(max, Math.max(min, value));
}

function resolveHostSize(host: HTMLDivElement) {
	const rect = host.getBoundingClientRect();
	return {
		width: Math.max(1, Math.floor(host.clientWidth || rect.width || 1)),
		height: Math.max(1, Math.floor(host.clientHeight || rect.height || 1)),
	};
}

function getFrequency(mode: WaveMode, index: number) {
	if (mode === "odd") return index * 2 + 1;
	if (mode === "detuned") return 1 + index * 1.35 + (index % 2 === 0 ? 0.15 : -0.1);
	return index + 1;
}

function harmonicColor(PhaserLib: PhaserModule, index: number, total: number) {
	const hue = (0.54 + (index / Math.max(total, 1)) * 0.22) % 1;
	return PhaserLib.Display.Color.HSLToColor(hue, 0.84, 0.6).color;
}

function drawLine(
	graphics: import("phaser").GameObjects.Graphics,
	x1: number,
	y1: number,
	x2: number,
	y2: number,
) {
	graphics.beginPath();
	graphics.moveTo(x1, y1);
	graphics.lineTo(x2, y2);
	graphics.strokePath();
}

function mountSineWaves(
	host: HTMLDivElement,
	PhaserLib: PhaserModule,
	bridge: MountBridge,
) {
	let game: PhaserGame | null = null;
	let graphics: import("phaser").GameObjects.Graphics | null = null;
	let observer: ResizeObserver | null = null;
	let angles: number[] = [];
	let trail: number[] = [];
	let lastResetVersion = bridge.resetVersionRef.current;
	let lastAxis = bridge.settingsRef.current.waveAxis;
	let lastMode = bridge.settingsRef.current.mode;

	const resetState = () => {
		angles = Array.from(
			{ length: bridge.settingsRef.current.numCircles },
			() => -Math.PI / 2,
		);
		trail = [];
	};

	const ensureAngles = (count: number) => {
		if (angles.length === count) return;
		if (angles.length < count) {
			for (let index = angles.length; index < count; index += 1) {
				angles.push(-Math.PI / 2);
			}
			return;
		}
		angles.length = count;
	};

	const resizeGame = () => {
		if (!game) return;
		const nextSize = resolveHostSize(host);
		game.scale.resize(nextSize.width, nextSize.height);
	};

	const drawFrame = (scene: PhaserScene, deltaSeconds: number) => {
		if (!graphics) return;

		const settings = bridge.settingsRef.current;
		if (
			lastResetVersion !== bridge.resetVersionRef.current ||
			lastAxis !== settings.waveAxis ||
			lastMode !== settings.mode
		) {
			lastResetVersion = bridge.resetVersionRef.current;
			lastAxis = settings.waveAxis;
			lastMode = settings.mode;
			resetState();
		}

		ensureAngles(settings.numCircles);

		const width = scene.scale.width;
		const height = scene.scale.height;
		const padding = 24;
		const gap = 28;
		const isHorizontal = settings.waveAxis === "horizontal";

		const orbitArea: Rect = isHorizontal
			? {
					x: padding,
					y: padding,
					w: Math.max(
						140,
						clamp(width * 0.38, 180, width - 160) - padding - gap / 2,
					),
					h: Math.max(120, height - padding * 2),
				}
			: {
					x: padding,
					y: padding,
					w: Math.max(120, width - padding * 2),
					h: Math.max(
						140,
						clamp(height * 0.38, 180, height - 160) - padding - gap / 2,
					),
				};

		const plotArea: Rect = isHorizontal
			? {
					x: orbitArea.x + orbitArea.w + gap,
					y: padding,
					w: Math.max(96, width - (orbitArea.x + orbitArea.w + gap) - padding),
					h: Math.max(120, height - padding * 2),
				}
			: {
					x: padding,
					y: orbitArea.y + orbitArea.h + gap,
					w: Math.max(120, width - padding * 2),
					h: Math.max(96, height - (orbitArea.y + orbitArea.h + gap) - padding),
				};

		const totalReach = Array.from(
			{ length: settings.numCircles },
			(_, index) => settings.baseRadius * settings.decay ** index,
		).reduce((sum, value) => sum + value, 0);
		const fitRadius = Math.max(
			24,
			Math.min(orbitArea.w, orbitArea.h) * 0.5 - padding,
		);
		const radiusScale = totalReach > fitRadius ? fitRadius / totalReach : 1;

		let x = orbitArea.x + orbitArea.w / 2;
		let y = orbitArea.y + orbitArea.h / 2;
		let radius = settings.baseRadius * radiusScale;

		graphics.clear();
		graphics.fillStyle(0x07111c, 1);
		graphics.fillRect(0, 0, width, height);

		graphics.fillStyle(0x0a1825, 0.9);
		graphics.fillRect(plotArea.x, plotArea.y, plotArea.w, plotArea.h);
		graphics.lineStyle(1, 0x224056, 0.55);
		graphics.strokeRect(plotArea.x, plotArea.y, plotArea.w, plotArea.h);

		graphics.lineStyle(1, 0x183246, 0.28);
		const gridSize = clamp(
			Math.round(Math.min(width, height) / 12),
			28,
			72,
		);
		for (let gridX = 0; gridX <= width; gridX += gridSize) {
			drawLine(graphics, gridX, 0, gridX, height);
		}
		for (let gridY = 0; gridY <= height; gridY += gridSize) {
			drawLine(graphics, 0, gridY, width, gridY);
		}

		if (settings.showGuides) {
			graphics.lineStyle(1, 0x6b8296, 0.3);
			if (isHorizontal) {
				drawLine(
					graphics,
					plotArea.x,
					orbitArea.y + orbitArea.h / 2,
					plotArea.x + plotArea.w,
					orbitArea.y + orbitArea.h / 2,
				);
			} else {
				drawLine(
					graphics,
					orbitArea.x + orbitArea.w / 2,
					plotArea.y,
					orbitArea.x + orbitArea.w / 2,
					plotArea.y + plotArea.h,
				);
			}
		}

		for (let index = 0; index < settings.numCircles; index += 1) {
			const frequency = getFrequency(settings.mode, index);
			const color = harmonicColor(PhaserLib, index, settings.numCircles);
			const nextX = x + Math.cos(angles[index]) * radius;
			const nextY = y + Math.sin(angles[index]) * radius;

			if (settings.showGuides) {
				graphics.lineStyle(1, color, 0.2);
				graphics.strokeCircle(x, y, radius);
			}

			graphics.lineStyle(Math.max(1, settings.strokeWeightPx), color, 0.95);
			drawLine(graphics, x, y, nextX, nextY);
			graphics.fillStyle(color, 0.96);
			graphics.fillCircle(nextX, nextY, Math.max(2.5, settings.strokeWeightPx * 1.25));

			x = nextX;
			y = nextY;
			radius *= settings.decay;

			if (!settings.paused) {
				angles[index] += frequency * settings.speed * deltaSeconds * 60;
			}
		}

		if (!settings.paused) {
			trail.unshift(isHorizontal ? y : x);
		}

		const maxSamples = Math.max(
			24,
			Math.floor((isHorizontal ? plotArea.w : plotArea.h) * settings.trailRatio),
		);
		if (trail.length > maxSamples) {
			trail.length = maxSamples;
		}

		const projectionX = isHorizontal ? plotArea.x : x;
		const projectionY = isHorizontal ? y : plotArea.y;

		if (settings.showGuides) {
			graphics.lineStyle(1.5, 0xf59e0b, 0.65);
			drawLine(graphics, x, y, projectionX, projectionY);
		}

		const spacing =
			(isHorizontal ? plotArea.w : plotArea.h) / Math.max(maxSamples - 1, 1);
		if (trail.length > 1) {
			graphics.lineStyle(settings.strokeWeightPx * 3, 0x0ea5e9, 0.18);
			graphics.beginPath();
			for (let index = 0; index < trail.length; index += 1) {
				const waveX = isHorizontal ? plotArea.x + index * spacing : trail[index];
				const waveY = isHorizontal ? trail[index] : plotArea.y + index * spacing;
				if (index === 0) graphics.moveTo(waveX, waveY);
				else graphics.lineTo(waveX, waveY);
			}
			graphics.strokePath();

			graphics.lineStyle(Math.max(1, settings.strokeWeightPx), 0x7dd3fc, 0.98);
			graphics.beginPath();
			for (let index = 0; index < trail.length; index += 1) {
				const waveX = isHorizontal ? plotArea.x + index * spacing : trail[index];
				const waveY = isHorizontal ? trail[index] : plotArea.y + index * spacing;
				if (index === 0) graphics.moveTo(waveX, waveY);
				else graphics.lineTo(waveX, waveY);
			}
			graphics.strokePath();
		}

		graphics.fillStyle(0xf8fafc, 1);
		graphics.fillCircle(x, y, Math.max(4, settings.strokeWeightPx * 2.2));
		graphics.fillStyle(0x38bdf8, 1);
		graphics.fillCircle(
			projectionX,
			projectionY,
			Math.max(4, settings.strokeWeightPx * 1.8),
		);
	};

	class SineWaveScene extends PhaserLib.Scene {
		constructor() {
			super("sine-waves");
		}

		create() {
			graphics = this.add.graphics();
			this.cameras.main.setBackgroundColor("#07111c");
			resetState();
			bridge.onReady();
		}

		update(_time: number, delta: number) {
			drawFrame(this, delta / 1000);
		}
	}

	host.innerHTML = "";
	const initialSize = resolveHostSize(host);

	game = new PhaserLib.Game({
		type: PhaserLib.CANVAS,
		parent: host,
		width: initialSize.width,
		height: initialSize.height,
		scene: new SineWaveScene() as PhaserScene,
		banner: false,
		disableContextMenu: true,
		audio: { noAudio: true },
		transparent: false,
		antialias: true,
		pixelArt: false,
		backgroundColor: "#07111c",
	});

	observer = new ResizeObserver(() => {
		resizeGame();
	});
	observer.observe(host);

	return () => {
		observer?.disconnect();
		observer = null;

		if (game) {
			game.destroy(true);
			game = null;
		}

		graphics = null;
	};
}

export default function SineWaves() {
	const hostRef = useRef<HTMLDivElement | null>(null);
	const settingsRef = useRef(DEFAULT_SETTINGS);
	const resetVersionRef = useRef(0);
	const [settings, setSettings] = useState(DEFAULT_SETTINGS);
	const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
	const [activePreset, setActivePreset] = useState<PresetName | null>("classic");

	useEffect(() => {
		settingsRef.current = settings;
	}, [settings]);

	useEffect(() => {
		const host = hostRef.current;
		if (!host) return;

		let cancelled = false;
		let cleanup: (() => void) | undefined;

		setStatus("loading");

		void (async () => {
			try {
				const PhaserLib = await import("phaser");
				if (cancelled || !hostRef.current) return;

				cleanup = mountSineWaves(hostRef.current, PhaserLib, {
					settingsRef,
					resetVersionRef,
					onReady: () => {
						if (!cancelled) setStatus("ready");
					},
				});
			} catch (error) {
				console.error("Unable to initialize Sine Waves:", error);
				if (!cancelled) setStatus("error");
			}
		})();

		return () => {
			cancelled = true;
			cleanup?.();
		};
	}, []);

	const updateSettings = (patch: Partial<WaveSettings>) => {
		setActivePreset(null);
		setSettings((current) => ({ ...current, ...patch }));
	};

	const applyPreset = (preset: PresetName) => {
		setActivePreset(preset);
		setSettings({ ...PRESETS[preset] });
		resetVersionRef.current += 1;
	};

	return (
		<div className="flex h-full min-h-0 w-full flex-col bg-slate-950 text-slate-100">
			<div className="border-b border-white/10 bg-slate-950/85 backdrop-blur">
				<div className="mx-auto flex max-w-screen-2xl flex-wrap items-center gap-4 px-4 py-3">
					<div className="min-w-36">
						<div className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-200">
							Sine Waves
						</div>
						<div className="text-xs text-slate-400">
							Epicycles feeding a live waveform.
						</div>
					</div>

					<div className="flex items-center gap-2">
						{(["classic", "square-ish", "bloom"] as const).map((preset) => (
							<button
								key={preset}
								type="button"
								onClick={() => applyPreset(preset)}
								className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.2em] transition ${
									activePreset === preset
										? "border-sky-300 bg-sky-400/20 text-sky-100"
										: "border-white/15 bg-white/5 text-slate-300 hover:border-white/30 hover:bg-white/10"
								}`}
							>
								{preset}
							</button>
						))}
					</div>

					<div className="flex items-center gap-2">
						<label className="text-xs text-slate-300">Circles</label>
						<input
							type="range"
							min={1}
							max={24}
							value={settings.numCircles}
							onChange={(event) =>
								updateSettings({ numCircles: Number.parseInt(event.target.value, 10) })
							}
							className="w-28 accent-sky-300"
						/>
						<span className="w-7 text-center text-xs tabular-nums">
							{settings.numCircles}
						</span>
					</div>

					<div className="flex items-center gap-2">
						<label className="text-xs text-slate-300">Radius</label>
						<input
							type="range"
							min={40}
							max={260}
							value={settings.baseRadius}
							onChange={(event) =>
								updateSettings({
									baseRadius: Number.parseInt(event.target.value, 10),
								})
							}
							className="w-28 accent-sky-300"
						/>
						<span className="w-10 text-center text-xs tabular-nums">
							{settings.baseRadius}
						</span>
					</div>

					<div className="flex items-center gap-2">
						<label className="text-xs text-slate-300">Decay</label>
						<input
							type="range"
							min={0.35}
							max={0.95}
							step={0.01}
							value={settings.decay}
							onChange={(event) =>
								updateSettings({
									decay: Number.parseFloat(event.target.value),
								})
							}
							className="w-28 accent-sky-300"
						/>
						<span className="w-10 text-center text-xs tabular-nums">
							{settings.decay.toFixed(2)}
						</span>
					</div>

					<div className="flex items-center gap-2">
						<label className="text-xs text-slate-300">Speed</label>
						<input
							type="range"
							min={0.002}
							max={0.05}
							step={0.001}
							value={settings.speed}
							onChange={(event) =>
								updateSettings({
									speed: Number.parseFloat(event.target.value),
								})
							}
							className="w-28 accent-sky-300"
						/>
						<span className="w-12 text-center text-xs tabular-nums">
							{settings.speed.toFixed(3)}
						</span>
					</div>

					<div className="flex items-center gap-2">
						<label className="text-xs text-slate-300">Trail</label>
						<input
							type="range"
							min={0.15}
							max={1}
							step={0.01}
							value={settings.trailRatio}
							onChange={(event) =>
								updateSettings({
									trailRatio: Number.parseFloat(event.target.value),
								})
							}
							className="w-24 accent-sky-300"
						/>
						<span className="w-10 text-center text-xs tabular-nums">
							{Math.round(settings.trailRatio * 100)}%
						</span>
					</div>

					<div className="flex items-center gap-2">
						<label className="text-xs text-slate-300">Stroke</label>
						<input
							type="range"
							min={1}
							max={6}
							value={settings.strokeWeightPx}
							onChange={(event) =>
								updateSettings({
									strokeWeightPx: Number.parseInt(event.target.value, 10),
								})
							}
							className="w-20 accent-sky-300"
						/>
						<span className="w-6 text-center text-xs tabular-nums">
							{settings.strokeWeightPx}
						</span>
					</div>

					<div className="flex items-center gap-2">
						<label className="text-xs text-slate-300">Mode</label>
						<select
							value={settings.mode}
							onChange={(event) =>
								updateSettings({
									mode: event.target.value as WaveMode,
								})
							}
							className="rounded-md border border-white/15 bg-slate-900 px-2 py-1 text-xs text-slate-100"
						>
							<option value="harmonic">Harmonic</option>
							<option value="odd">Odd Harmonics</option>
							<option value="detuned">Detuned</option>
						</select>
					</div>

					<div className="flex items-center gap-2">
						<label className="text-xs text-slate-300">Axis</label>
						<select
							value={settings.waveAxis}
							onChange={(event) =>
								updateSettings({
									waveAxis: event.target.value as WaveAxis,
								})
							}
							className="rounded-md border border-white/15 bg-slate-900 px-2 py-1 text-xs text-slate-100"
						>
							<option value="horizontal">Horizontal</option>
							<option value="vertical">Vertical</option>
						</select>
					</div>

					<label className="ml-auto flex items-center gap-2 text-xs text-slate-300">
						<input
							type="checkbox"
							checked={settings.showGuides}
							onChange={(event) =>
								updateSettings({
									showGuides: event.target.checked,
								})
							}
							className="accent-sky-300"
						/>
						Show guides
					</label>

					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={() =>
								updateSettings({
									paused: !settings.paused,
								})
							}
							className="rounded-md border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-100 transition hover:border-white/30 hover:bg-white/10"
						>
							{settings.paused ? "Resume" : "Pause"}
						</button>

						<button
							type="button"
							onClick={() => {
								resetVersionRef.current += 1;
							}}
							className="rounded-md border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-100 transition hover:border-white/30 hover:bg-white/10"
						>
							Reset
						</button>
					</div>
				</div>
			</div>

			<div className="relative min-h-0 flex-1">
				<div ref={hostRef} className="absolute inset-0" />

				{status === "loading" && (
					<div className="absolute inset-0 grid place-items-center text-sm text-slate-300">
						Initializing visualizer...
					</div>
				)}

				{status === "error" && (
					<div className="absolute inset-0 grid place-items-center px-6 text-center text-sm text-rose-300">
						Unable to start the Phaser scene.
					</div>
				)}
			</div>
		</div>
	);
}
