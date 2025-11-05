'use client';

import { useRef, useState, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import Planet from './Planet';
import { planets, moon } from './data';

export default function SolarSystem() {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const [followed, setFollowed] = useState<string | null>(null);
  const [showOrbits, setShowOrbits] = useState(true);
  const [timeScale, setTimeScale] = useState(5);

  const names = useMemo(() => planets.map(p => p.name), []);

  const unfollow = () => {
    setFollowed(null);
    const c = controlsRef.current;
    if (!c) return;
    c.target.set(0, 0, 0);
    c.object.position.set(0, 12, 140);
    c.update();
  };

  return (
    <div className="relative w-full h-full">
      <div className="pointer-events-none absolute top-3 left-3 z-10 flex flex-col gap-2">
        <div className="flex gap-2 flex-wrap">
          {names.map((n) => (
            <button
              key={n}
              className={`pointer-events-auto rounded-lg px-3 py-1 text-sm border border-zinc-500/40 shadow-md shadow-black/50 
                          ${followed===n ? 'bg-indigo-600 text-white' : 'bg-zinc-700/80 hover:bg-zinc-700 text-zinc-100'}`}
              onClick={() => setFollowed(n)}
            >
              {n}
            </button>
          ))}
          {followed && (
            <button
              className="pointer-events-auto rounded-lg px-3 py-1 text-sm bg-zinc-700/80 hover:bg-zinc-700 border border-zinc-500/40 text-zinc-100 shadow-md shadow-black/50"
              onClick={unfollow}
            >
              Unfollow
            </button>
          )}
        </div>

        <label className="pointer-events-auto text-xs text-zinc-200 flex items-center gap-2">
          <input type="checkbox" checked={showOrbits} onChange={e => setShowOrbits(e.target.checked)} />
          Show orbits
        </label>

        <label className="pointer-events-auto text-xs text-zinc-200">
          Time scale (days/sec): <span className="font-mono">{timeScale.toFixed(1)}</span>
          <input
            className="block w-64 mt-1"
            type="range"
            min={0.1}
            max={50}
            step={0.1}
            value={timeScale}
            onChange={e => setTimeScale(parseFloat(e.target.value))}
          />
        </label>
      </div>

      <Canvas camera={{ position: [0, 12, 140], fov: 50 }} className="bg-black rounded-lg">
        <ambientLight intensity={0.35} />
        <pointLight position={[0, 0, 0]} intensity={2.2} />
        <Stars radius={900} depth={100} count={8000} factor={4} fade />

        {planets.map(p => (
          <Planet
            key={p.name}
            data={p}
            moon={p.name === 'Earth' ? moon : undefined}
            followed={followed === p.name}
            setFollowed={setFollowed}
            controlsRef={controlsRef}
            showOrbit={showOrbits}
            timeScaleDaysPerSec={timeScale}
          />
        ))}

        <OrbitControls
          ref={controlsRef}
          enablePan
          enableDamping
          enableZoom
          dampingFactor={0.08}
          rotateSpeed={0.6}
          maxDistance={5000}
          minDistance={2}
        />
      </Canvas>
    </div>
  );
}