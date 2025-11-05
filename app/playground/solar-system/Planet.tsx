'use client';

import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { MathUtils, Group, Mesh, Vector3, DoubleSide } from 'three';
import { useTexture } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import type { PlanetDef, MoonDef } from './data';
import OrbitPath from './OrbitPath';

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
  data, moon, followed, setFollowed, controlsRef, showOrbit, timeScaleDaysPerSec
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
      ctrl.object.position.set(tmp.x, tmp.y + data.radiusUnits * 1.8, tmp.z + offsetZ);
      ctrl.update();
    } else {
      lastFollowPos.current = null;
    }
  }, [followed, controlsRef, data.radiusUnits]);

  useFrame((_, dt) => {
    const days = timeScaleDaysPerSec * dt;

    if (data.orbitalPeriodDays > 0) {
      orbitPivot.current.rotation.y += (Math.PI * 2) * (days / data.orbitalPeriodDays);
    }
    if (data.rotationPeriodHours !== 0) {
      const periodDays = data.rotationPeriodHours / 24.0;
      planetMesh.current.rotation.y += (Math.PI * 2) * (days / periodDays);
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
        <OrbitPath radius={data.distanceUnits} segments={256} />
      )}

      <group ref={orbitPivot} rotation={[0, startAngle.current, 0]}>
        <group position={[data.distanceUnits, 0, 0]}>
          <group rotation={[MathUtils.degToRad(data.axialTiltDeg), 0, 0]}>
            {data.ring && (
              <SaturnRing
                textureUrl={data.ring.textureUrl}
                innerUnits={data.ring.innerUnits}
                outerUnits={data.ring.outerUnits}
              />
            )}

            {moon && <MoonOrbit moon={moon} timeScaleDaysPerSec={timeScaleDaysPerSec} />}

            <mesh ref={planetMesh} onClick={() => setFollowed(data.name)}>
              <sphereGeometry args={[data.radiusUnits, 64, 64]} />
              <meshStandardMaterial
                map={planetTex}
                emissive={data.name === 'Sun' ? '#ffaa33' : undefined}
                emissiveIntensity={data.name === 'Sun' ? 0.45 : 0}
              />
            </mesh>
          </group>
        </group>
      </group>
    </group>
  );
}

function SaturnRing({
  textureUrl, innerUnits, outerUnits
}: { textureUrl: string; innerUnits: number; outerUnits: number }) {
  const ringTex = useTexture(textureUrl);
  return (
    <mesh rotation={[Math.PI / 2, 0, 0]}>
      <ringGeometry args={[innerUnits, outerUnits, 128]} />
      <meshBasicMaterial
        map={ringTex}
        transparent
        alphaTest={0.35}
        depthWrite={false}
        side={DoubleSide}
      />
    </mesh>
  );
}

function MoonOrbit({ moon, timeScaleDaysPerSec }: { moon: MoonDef; timeScaleDaysPerSec: number }) {
  const pivot = useRef<Group>(null!);
  const tex = useTexture(moon.textureUrl);
  useFrame((_, dt) => {
    const days = timeScaleDaysPerSec * dt;
    pivot.current.rotation.y += (Math.PI * 2) * (days / moon.orbitalPeriodDays);
  });
  return (
    <group ref={pivot}>
      <group position={[moon.distanceUnits, 0, 0]}>
        <mesh>
          <sphereGeometry args={[moon.radiusUnits, 48, 48]} />
          <meshStandardMaterial map={tex} />
        </mesh>
      </group>
    </group>
  );
}