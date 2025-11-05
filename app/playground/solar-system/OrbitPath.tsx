'use client';

import { useMemo } from 'react';
import { Line } from '@react-three/drei';
import * as THREE from 'three';

type Props = { radius: number; segments?: number };

export default function OrbitPath({ radius, segments = 128 }: Props) {
  const points = useMemo(() => {
    const arr: THREE.Vector3[] = [];
    for (let i = 0; i <= segments; i++) {
      const t = (i / segments) * Math.PI * 2;
      arr.push(new THREE.Vector3(Math.cos(t) * radius, 0, Math.sin(t) * radius));
    }
    return arr;
  }, [radius, segments]);

  return <Line points={points} transparent opacity={0.25} linewidth={1} />;
}