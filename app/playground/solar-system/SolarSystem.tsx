"use client";

import { OrbitControls, Stars, useTexture } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { type CSSProperties, Suspense, useEffect, useRef, useState } from "react";
import { BackSide, type Group } from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { moon, planets } from "./data";
import Planet from "./Planet";

const DEFAULT_CAMERA: [number, number, number] = [0, 20, 170];
const DEFAULT_TARGET: [number, number, number] = [0, 0, 0];
const SCENE_TEXTURES = [
	...planets.map((planet) => planet.textureUrl),
	...planets
		.map((planet) => planet.ring?.textureUrl)
		.filter((url): url is string => Boolean(url)),
	moon.textureUrl,
	"/textures/starfield.jpg",
	"/textures/starfield2.jpg",
];
const UNIQUE_SCENE_TEXTURES = [...new Set(SCENE_TEXTURES)];
const STAR_FIELD_STYLE: CSSProperties = {
	backgroundImage: [
		"radial-gradient(circle at 20% 30%, rgba(255,255,255,0.95) 0 1px, transparent 1.25px)",
		"radial-gradient(circle at 75% 20%, rgba(147,197,253,0.78) 0 1px, transparent 1.45px)",
		"radial-gradient(circle at 55% 75%, rgba(251,191,36,0.55) 0 1px, transparent 1.5px)",
		"radial-gradient(circle at 80% 65%, rgba(255,255,255,0.72) 0 1px, transparent 1.4px)",
	].join(","),
	backgroundSize: "190px 190px, 250px 250px, 220px 220px, 300px 300px",
	backgroundPosition: "0 0, 26px 48px, 100px 34px, 8px 110px",
};
const SCENE_STAR_OVERLAY_STYLE: CSSProperties = {
	backgroundImage: [
		"radial-gradient(circle, rgba(255,255,255,0.78) 0 0.8px, transparent 1px)",
		"radial-gradient(circle, rgba(147,197,253,0.52) 0 1px, transparent 1.2px)",
		"radial-gradient(circle, rgba(251,191,36,0.34) 0 1px, transparent 1.2px)",
	].join(","),
	backgroundSize: "130px 130px, 190px 190px, 240px 240px",
	backgroundPosition: "0 0, 22px 40px, 80px 24px",
};

function suppressThreeClockWarning() {
	if (typeof window === "undefined") return () => {};

	const key = "__solar_system_clock_warn_filter__";
	const existing = (window as Window & { [key: string]: boolean })[key];
	if (existing) return () => {};

	(window as Window & { [key: string]: boolean })[key] = true;
	const originalWarn = console.warn;
	console.warn = (...args: unknown[]) => {
		if (
			typeof args[0] === "string" &&
			args[0].includes("THREE.Clock: This module has been deprecated. Please use THREE.Timer instead.")
		) {
			return;
		}
		originalWarn(...args);
	};

	return () => {
		console.warn = originalWarn;
		delete (window as Window & { [key: string]: boolean })[key];
	};
}

function formatOrbit(days: number) {
	if (days <= 0) return "Anchored";
	if (days >= 365) return `${(days / 365.25).toFixed(1)}y orbit`;
	return `${days.toFixed(0)}d orbit`;
}

function formatDistance(au: number) {
	if (au <= 0) return "System center";
	return `${au.toFixed(2)} AU`;
}

for (const textureUrl of UNIQUE_SCENE_TEXTURES) {
	useTexture.preload(textureUrl);
}

export default function SolarSystem() {
	const controlsRef = useRef<OrbitControlsImpl | null>(null);
	const [followed, setFollowed] = useState<string | null>(null);
	const [showOrbits, setShowOrbits] = useState(true);
	const [timeScale, setTimeScale] = useState(0.4);

	const featuredPlanet =
		planets.find((planet) => planet.name === (followed ?? "Sun")) ?? planets[0];

	useEffect(() => suppressThreeClockWarning(), []);

	const unfollow = () => {
		setFollowed(null);
		const controls = controlsRef.current;
		if (!controls) return;
		controls.target.set(...DEFAULT_TARGET);
		controls.object.position.set(...DEFAULT_CAMERA);
		controls.update();
	};

	return (
		<div className="relative isolate flex h-full min-h-0 w-full select-none flex-col overflow-hidden bg-[#040814] text-slate-100">
			<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,#173150_0%,#08111d_38%,#03060d_100%)]" />
			<div
				className="pointer-events-none absolute inset-0 opacity-90"
				style={STAR_FIELD_STYLE}
			/>
			<div className="pointer-events-none absolute -left-20 top-20 h-72 w-72 rounded-full bg-[#3b82f6]/14 blur-3xl" />
			<div className="pointer-events-none absolute right-0 top-0 h-64 w-64 rounded-full bg-[#f59e0b]/12 blur-3xl" />
			<div className="pointer-events-none absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-[#38bdf8]/12 blur-3xl" />

			<div className="relative z-10 border-b border-[#233247] bg-[#07111d]/86 backdrop-blur-xl">
				<div className="flex flex-col gap-4 px-4 py-4 sm:px-5">
					<div className="font-mono text-xs tracking-[0.18em] text-slate-400">
						A watch-mode miniature observatory with a stronger star field and a quieter HUD.
					</div>

					<div className="grid gap-3 border-b border-[#1a2740] pb-4 sm:grid-cols-[auto_minmax(170px,220px)] sm:items-end">
						<label className="flex items-center justify-between gap-3 font-mono text-xs uppercase tracking-[0.2em] text-slate-300 sm:min-w-[120px]">
							<span>Orbit paths</span>
							<button
								type="button"
								onClick={() => setShowOrbits((value) => !value)}
								className={`inline-flex h-8 items-center justify-center border px-3 text-[11px] leading-none align-middle transition ${
									showOrbits
										? "border-sky-300/40 bg-sky-300/15 text-sky-100"
										: "border-[#223048] bg-[#0b1320] text-slate-300"
								}`}
							>
								{showOrbits ? "On" : "Off"}
							</button>
						</label>

						<label className="grid gap-2 font-mono text-xs uppercase tracking-[0.2em] text-slate-300">
							<div className="flex items-center justify-between gap-3">
								<span>Time scale</span>
								<span className="text-slate-100">{timeScale.toFixed(1)} d/s</span>
							</div>
							<input
								className="w-full sm:max-w-[220px]"
								style={{ accentColor: featuredPlanet.accent }}
								type="range"
								min={0.05}
								max={10}
								step={0.05}
								value={timeScale}
								onChange={(event) =>
									setTimeScale(Number.parseFloat(event.target.value))
								}
							/>
						</label>
					</div>

					<div className="flex flex-wrap gap-2">
						{planets.map((planet) => {
							const active = followed === planet.name;
							return (
								<button
									key={planet.name}
									type="button"
									onClick={() => setFollowed(planet.name)}
									className={`rounded-full px-4 py-2 font-mono text-xs font-semibold uppercase tracking-[0.2em] transition ${
										active
											? "text-slate-950"
											: "border border-[#223048] bg-[#0b1320] text-slate-100 hover:border-[#2d4262] hover:bg-[#10192a]"
									}`}
									style={
										active
											? {
													backgroundColor: planet.accent,
													boxShadow: `0 0 26px ${planet.accent}55`,
												}
											: undefined
									}
								>
									{planet.name}
								</button>
							);
						})}
						{followed && (
							<button
								type="button"
								onClick={unfollow}
								className="rounded-full border border-[#223048] bg-[#0b1320] px-4 py-2 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-slate-100 transition hover:border-[#2d4262] hover:bg-[#10192a]"
							>
								Release Focus
							</button>
						)}
					</div>
				</div>
			</div>

			<div className="relative min-h-0 flex-1">
				<Canvas
					camera={{ position: DEFAULT_CAMERA, fov: 46 }}
					className="absolute inset-0"
					dpr={[1, 1.5]}
					performance={{ min: 0.6 }}
					gl={{ antialias: false }}
				>
					<Suspense fallback={null}>
						<SolarSystemScene
							controlsRef={controlsRef}
							followed={followed}
							setFollowed={setFollowed}
							showOrbits={showOrbits}
							timeScale={timeScale}
						/>
					</Suspense>
				</Canvas>

				<div
					className="pointer-events-none absolute inset-0 opacity-75 mix-blend-screen"
					style={SCENE_STAR_OVERLAY_STYLE}
				/>
				<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_34%,rgba(2,6,23,0.44)_100%)]" />

				<div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col gap-3 p-4 sm:p-5 lg:flex-row lg:items-end lg:justify-between">
					<div className="max-w-md rounded-[24px] border border-[#1a2740] bg-[#07111d]/78 p-4 backdrop-blur-xl">
						<div className="font-mono text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
							Featured Body
						</div>
						<div className="mt-2 flex items-center gap-3">
							<div
								className="h-3 w-3 rounded-full shadow-[0_0_18px_currentColor]"
								style={{ backgroundColor: featuredPlanet.accent, color: featuredPlanet.accent }}
							/>
							<div className="text-2xl font-semibold text-white">
								{featuredPlanet.name}
							</div>
						</div>
						<p className="mt-2 text-sm leading-6 text-slate-300">
							{featuredPlanet.summary}
						</p>
						<div className="mt-4 grid grid-cols-2 gap-2 font-mono text-xs text-slate-300">
							<MetricCard label="Distance" value={formatDistance(featuredPlanet.distanceAU)} />
							<MetricCard label="Orbit" value={formatOrbit(featuredPlanet.orbitalPeriodDays)} />
							<MetricCard
								label="Radius"
								value={`${featuredPlanet.radiusEarths.toFixed(
									featuredPlanet.radiusEarths >= 10 ? 0 : 2,
								)} x Earth`}
							/>
							<MetricCard
								label="Axial Tilt"
								value={`${featuredPlanet.axialTiltDeg.toFixed(2)} deg`}
							/>
						</div>
					</div>

					<div className="max-w-sm rounded-[22px] border border-[#1a2740] bg-[#07111d]/72 px-4 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-slate-400 backdrop-blur-xl">
						Watch mode runs passively. Drag to orbit the camera, scroll to zoom,
						or leave it alone and let the scene drift.
					</div>
				</div>
			</div>
		</div>
	);
}

function SolarSystemScene({
	controlsRef,
	followed,
	setFollowed,
	showOrbits,
	timeScale,
}: {
	controlsRef: React.MutableRefObject<OrbitControlsImpl | null>;
	followed: string | null;
	setFollowed: (name: string | null) => void;
	showOrbits: boolean;
	timeScale: number;
}) {
	return (
		<>
			<color attach="background" args={["#02050c"]} />
			<fog attach="fog" args={["#02050c", 220, 920]} />
			<ambientLight intensity={0.28} />
			<hemisphereLight args={["#9dd8ff", "#02050c", 0.24]} />
			<pointLight position={[0, 0, 0]} intensity={3.1} color="#ffd79a" />
			<DeepSpaceBackdrop />
			<Stars radius={560} depth={180} count={3200} factor={4.2} fade />

			{planets.map((planet) => (
				<Planet
					key={planet.name}
					data={planet}
					moon={planet.name === "Earth" ? moon : undefined}
					followed={followed === planet.name}
					setFollowed={setFollowed}
					controlsRef={controlsRef}
					showOrbit={showOrbits}
					timeScaleDaysPerSec={timeScale}
				/>
			))}

			<OrbitControls
				ref={controlsRef}
				autoRotate={!followed}
				autoRotateSpeed={0.2}
				enableDamping
				enablePan={false}
				enableZoom
				dampingFactor={0.06}
				rotateSpeed={0.45}
				maxDistance={900}
				minDistance={10}
				minPolarAngle={0.35}
				maxPolarAngle={Math.PI - 0.35}
			/>
		</>
	);
}

function DeepSpaceBackdrop() {
	const [starfield, starfieldAlt] = useTexture([
		"/textures/starfield.jpg",
		"/textures/starfield2.jpg",
	]);
	const backdropRef = useRef<Group>(null!);
	const altBackdropRef = useRef<Group>(null!);

	useFrame(({ clock }) => {
		const t = clock.elapsedTime;
		backdropRef.current.rotation.y = t * 0.008;
		altBackdropRef.current.rotation.y = -t * 0.006;
	});

	return (
		<>
			<group ref={backdropRef}>
				<mesh>
					<sphereGeometry args={[760, 24, 24]} />
					<meshBasicMaterial color="#040814" side={BackSide} />
				</mesh>
				<mesh rotation={[0.05, 0.2, 0]}>
					<sphereGeometry args={[720, 24, 24]} />
					<meshBasicMaterial
						map={starfield}
						side={BackSide}
						transparent
						opacity={0.38}
					/>
				</mesh>
			</group>

			<group ref={altBackdropRef}>
				<mesh rotation={[-0.08, -0.4, 0.06]}>
					<sphereGeometry args={[680, 24, 24]} />
					<meshBasicMaterial
						map={starfieldAlt}
						side={BackSide}
						transparent
						opacity={0.18}
					/>
				</mesh>
			</group>
		</>
	);
}

function MetricCard({
	label,
	value,
}: {
	label: string;
	value: string;
}) {
	return (
		<div className="rounded-2xl border border-[#1b2535] bg-[#0b1320]/85 px-3 py-2">
			<div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
				{label}
			</div>
			<div className="mt-1 text-slate-100">{value}</div>
		</div>
	);
}
