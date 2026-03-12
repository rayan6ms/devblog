"use client";

import { OrbitControls, Sparkles, Stars, useTexture } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { type CSSProperties, useRef, useState } from "react";
import { BackSide, type Group } from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { moon, planets } from "./data";
import Planet from "./Planet";

const DEFAULT_CAMERA: [number, number, number] = [0, 20, 170];
const DEFAULT_TARGET: [number, number, number] = [0, 0, 0];
const STAR_FIELD_STYLE: CSSProperties = {
	backgroundImage: [
		"radial-gradient(circle at 20% 30%, rgba(255,255,255,0.95) 0 1px, transparent 1.4px)",
		"radial-gradient(circle at 75% 20%, rgba(147,197,253,0.7) 0 1px, transparent 1.6px)",
		"radial-gradient(circle at 55% 75%, rgba(251,191,36,0.45) 0 1px, transparent 1.8px)",
		"radial-gradient(circle at 80% 65%, rgba(255,255,255,0.65) 0 1px, transparent 1.6px)",
	].join(","),
	backgroundSize: "240px 240px, 320px 320px, 280px 280px, 360px 360px",
	backgroundPosition: "0 0, 40px 60px, 120px 40px, 10px 120px",
};

function formatOrbit(days: number) {
	if (days <= 0) return "Anchored";
	if (days >= 365) return `${(days / 365.25).toFixed(1)}y orbit`;
	return `${days.toFixed(0)}d orbit`;
}

function formatDistance(au: number) {
	if (au <= 0) return "System center";
	return `${au.toFixed(2)} AU`;
}

export default function SolarSystem() {
	const controlsRef = useRef<OrbitControlsImpl | null>(null);
	const [followed, setFollowed] = useState<string | null>(null);
	const [showOrbits, setShowOrbits] = useState(true);
	const [timeScale, setTimeScale] = useState(6);

	const featuredPlanet =
		planets.find((planet) => planet.name === (followed ?? "Sun")) ?? planets[0];

	const unfollow = () => {
		setFollowed(null);
		const controls = controlsRef.current;
		if (!controls) return;
		controls.target.set(...DEFAULT_TARGET);
		controls.object.position.set(...DEFAULT_CAMERA);
		controls.update();
	};

	return (
		<div className="relative flex h-full min-h-[720px] w-full select-none flex-col overflow-hidden rounded-[30px] border border-[#243347] bg-[#040814] text-slate-100 shadow-[0_28px_90px_rgba(0,0,0,0.5)]">
			<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,#173150_0%,#08111d_38%,#03060d_100%)]" />
			<div
				className="pointer-events-none absolute inset-0 opacity-80"
				style={STAR_FIELD_STYLE}
			/>
			<div className="pointer-events-none absolute -left-20 top-20 h-72 w-72 rounded-full bg-[#3b82f6]/12 blur-3xl" />
			<div className="pointer-events-none absolute right-0 top-0 h-64 w-64 rounded-full bg-[#f59e0b]/10 blur-3xl" />
			<div className="pointer-events-none absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-[#38bdf8]/10 blur-3xl" />

			<div className="relative z-10 border-b border-[#233247] bg-[#07111d]/82 backdrop-blur-xl">
				<div className="flex flex-wrap items-center gap-3 px-4 py-4 sm:px-5">
					<div className="mr-auto min-w-48">
						<div className="font-mono text-sm font-semibold uppercase tracking-[0.28em] text-slate-100">
							Solar System
						</div>
						<div className="max-w-2xl font-mono text-xs text-slate-400">
							A watch-mode miniature observatory with passive camera motion,
							layered stars, and readable planet telemetry.
						</div>
					</div>
					<div className="flex flex-wrap items-center gap-2 font-mono text-xs text-slate-200">
						<StatPill label="Mode" value="Watch" />
						<StatPill label="Focus" value={followed ?? "Free orbit"} />
						<StatPill label="Orbits" value={showOrbits ? "Visible" : "Hidden"} />
						<StatPill label="Time" value={`${timeScale.toFixed(1)} d/s`} />
					</div>
				</div>

				<div className="flex flex-col gap-4 px-4 pb-4 sm:px-5 lg:flex-row lg:items-end lg:justify-between">
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

					<div className="grid gap-3 rounded-[24px] border border-[#1a2740] bg-[#07111d]/80 p-4 backdrop-blur-xl lg:min-w-[320px]">
						<label className="flex items-center justify-between gap-3 font-mono text-xs uppercase tracking-[0.2em] text-slate-300">
							<span>Orbit paths</span>
							<button
								type="button"
								onClick={() => setShowOrbits((value) => !value)}
								className={`rounded-full border px-3 py-1 text-[11px] transition ${
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
								className="w-full"
								style={{ accentColor: featuredPlanet.accent }}
								type="range"
								min={0.4}
								max={24}
								step={0.2}
								value={timeScale}
								onChange={(event) =>
									setTimeScale(Number.parseFloat(event.target.value))
								}
							/>
						</label>
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
					<color attach="background" args={["#02050c"]} />
					<fog attach="fog" args={["#02050c", 220, 920]} />
					<ambientLight intensity={0.28} />
					<hemisphereLight
						args={["#9dd8ff", "#02050c", 0.24]}
					/>
					<pointLight position={[0, 0, 0]} intensity={3.1} color="#ffd79a" />
					<DeepSpaceBackdrop />
					<Stars radius={520} depth={140} count={3200} factor={4} fade />
					<Stars
						radius={380}
						depth={70}
						count={900}
						factor={1.8}
						fade
						saturation={0}
					/>
					<Sparkles
						count={56}
						scale={[360, 140, 360]}
						size={2.4}
						speed={0.08}
						color="#8cc8ff"
					/>
					<Sparkles
						count={18}
						scale={[220, 72, 220]}
						size={3.2}
						speed={0.06}
						color="#ffd089"
					/>

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
						autoRotateSpeed={0.28}
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
				</Canvas>

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

function StatPill({
	label,
	value,
}: {
	label: string;
	value: string;
}) {
	return (
		<div className="rounded-full border border-[#1b2535] bg-[#0b1320] px-3 py-1.5 text-slate-300">
			{label} {value}
		</div>
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
