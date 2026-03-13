"use client";

import { useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import {
	AdditiveBlending,
	DoubleSide,
	type Group,
	MathUtils,
	type Mesh,
	Vector3,
} from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import type { MoonDef, PlanetDef } from "./data";
import OrbitPath from "./OrbitPath";

type Props = {
	data: PlanetDef;
	moon?: MoonDef;
	followed: boolean;
	setFollowed: (name: string | null) => void;
	controlsRef: React.MutableRefObject<OrbitControlsImpl | null>;
	showOrbit: boolean;
	timeScaleDaysPerSec: number;
};

export default function Planet({
	data,
	moon,
	followed,
	setFollowed,
	controlsRef,
	showOrbit,
	timeScaleDaysPerSec,
}: Props) {
	const orbitPivot = useRef<Group>(null!);
	const planetMesh = useRef<Mesh>(null!);
	const startAngle = useRef(Math.random() * Math.PI * 2);
	const planetTex = useTexture(data.textureUrl);
	const lastFollowPos = useRef<Vector3 | null>(null);
	const tmp = new Vector3();
	const tmpDelta = new Vector3();

	useEffect(() => {
		const ctrl = controlsRef.current;
		if (!ctrl) return;

		if (followed) {
			planetMesh.current.getWorldPosition(tmp);
			lastFollowPos.current = tmp.clone();

			const offsetZ = Math.max(25, data.radiusUnits * 6);
			ctrl.target.copy(tmp);
			ctrl.object.position.set(
				tmp.x,
				tmp.y + data.radiusUnits * 1.8,
				tmp.z + offsetZ,
			);
			ctrl.update();
		} else {
			lastFollowPos.current = null;
		}
	}, [followed, controlsRef, data.radiusUnits]);

	useFrame((_, dt) => {
		const days = timeScaleDaysPerSec * dt;

		if (data.orbitalPeriodDays > 0) {
			orbitPivot.current.rotation.y +=
				Math.PI * 2 * (days / data.orbitalPeriodDays);
		}
		if (data.rotationPeriodHours !== 0) {
			const periodDays = data.rotationPeriodHours / 24.0;
			planetMesh.current.rotation.y += Math.PI * 2 * (days / periodDays);
		}

		if (followed && controlsRef.current && lastFollowPos.current) {
			planetMesh.current.getWorldPosition(tmp);

			tmpDelta.copy(tmp).sub(lastFollowPos.current);

			const ctrl = controlsRef.current;
			if (tmpDelta.lengthSq() > 0) {
				ctrl.target.add(tmpDelta);
				ctrl.object.position.add(tmpDelta);
				ctrl.update();
				lastFollowPos.current.copy(tmp);
			}
		}
	});

	return (
		<group>
			{showOrbit && data.distanceUnits > 0 && (
				<OrbitPath
					radius={data.distanceUnits}
					segments={256}
					color={data.accent}
					opacity={followed ? 0.48 : 0.18}
				/>
			)}

			<group ref={orbitPivot} rotation={[0, startAngle.current, 0]}>
				<group position={[data.distanceUnits, 0, 0]}>
					<group rotation={[MathUtils.degToRad(data.axialTiltDeg), 0, 0]}>
						{data.ring && (
							<SaturnRing
								accent={data.accent}
								textureUrl={data.ring.textureUrl}
								innerUnits={data.ring.innerUnits}
								outerUnits={data.ring.outerUnits}
							/>
						)}

						{moon && (
							<MoonOrbit
								moon={moon}
								showOrbit={showOrbit && followed}
								timeScaleDaysPerSec={timeScaleDaysPerSec}
							/>
						)}

						{data.name === "Sun" && (
							<SunHalo
								accent={data.accent}
								radiusUnits={data.radiusUnits}
							/>
						)}

						<mesh ref={planetMesh} onClick={() => setFollowed(data.name)}>
							<sphereGeometry args={[data.radiusUnits, 40, 40]} />
							<meshStandardMaterial
								map={planetTex}
								emissive={data.name === "Sun" ? data.accent : "#08131f"}
								emissiveIntensity={data.name === "Sun" ? 1.2 : 0.12}
								roughness={1}
								metalness={0}
							/>
						</mesh>

						<mesh scale={1.14}>
							<sphereGeometry args={[data.radiusUnits, 24, 24]} />
							<meshBasicMaterial
								color={data.accent}
								transparent
								opacity={
									data.name === "Sun" ? 0.1 : followed ? 0.08 : 0.025
								}
								depthWrite={false}
								blending={AdditiveBlending}
							/>
						</mesh>
					</group>
				</group>
			</group>
		</group>
	);
}

function SaturnRing({
	accent,
	textureUrl,
	innerUnits,
	outerUnits,
}: {
	accent: string;
	textureUrl: string;
	innerUnits: number;
	outerUnits: number;
}) {
	const ringTex = useTexture(textureUrl);
	return (
		<group rotation={[Math.PI / 2, 0, 0]}>
				<mesh>
					<ringGeometry args={[innerUnits, outerUnits, 96]} />
				<meshBasicMaterial
					map={ringTex}
					transparent
					alphaTest={0.35}
					depthWrite={false}
					side={DoubleSide}
				/>
			</mesh>
			<mesh scale={1.015}>
				<ringGeometry args={[innerUnits, outerUnits, 96]} />
				<meshBasicMaterial
					color={accent}
					transparent
					opacity={0.08}
					depthWrite={false}
					side={DoubleSide}
				/>
			</mesh>
		</group>
	);
}

function MoonOrbit({
	moon,
	showOrbit,
	timeScaleDaysPerSec,
}: {
	moon: MoonDef;
	showOrbit: boolean;
	timeScaleDaysPerSec: number;
}) {
	const pivot = useRef<Group>(null!);
	const tex = useTexture(moon.textureUrl);
	useFrame((_, dt) => {
		const days = timeScaleDaysPerSec * dt;
		pivot.current.rotation.y += Math.PI * 2 * (days / moon.orbitalPeriodDays);
	});
	return (
		<group ref={pivot}>
			{showOrbit && (
				<OrbitPath radius={moon.distanceUnits} color="#cbd5e1" opacity={0.16} />
			)}
			<group position={[moon.distanceUnits, 0, 0]}>
				<mesh>
					<sphereGeometry args={[moon.radiusUnits, 24, 24]} />
					<meshStandardMaterial map={tex} roughness={1} metalness={0} />
				</mesh>
			</group>
		</group>
	);
}

function SunHalo({
	accent,
	radiusUnits,
}: {
	accent: string;
	radiusUnits: number;
}) {
	const outerHalo = useRef<Mesh>(null!);
	const innerHalo = useRef<Mesh>(null!);

	useFrame(({ clock }) => {
		const t = clock.elapsedTime;
		const outerScale = 1 + Math.sin(t * 0.55) * 0.04;
		const innerScale = 1 + Math.cos(t * 0.9) * 0.03;
		outerHalo.current.scale.setScalar(outerScale);
		innerHalo.current.scale.setScalar(innerScale);
	});

	return (
		<group>
			<mesh ref={outerHalo}>
				<sphereGeometry args={[radiusUnits * 1.45, 24, 24]} />
				<meshBasicMaterial
					color={accent}
					transparent
					opacity={0.08}
					depthWrite={false}
					blending={AdditiveBlending}
				/>
			</mesh>
			<mesh ref={innerHalo}>
				<sphereGeometry args={[radiusUnits * 1.18, 24, 24]} />
				<meshBasicMaterial
					color="#ffd49a"
					transparent
					opacity={0.12}
					depthWrite={false}
					blending={AdditiveBlending}
				/>
			</mesh>
		</group>
	);
}
