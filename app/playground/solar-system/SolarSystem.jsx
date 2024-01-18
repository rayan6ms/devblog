'use client';


import { useRef, useState } from 'react';
import { TextureLoader, MeshBasicMaterial } from 'three';
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Physics } from '@react-three/cannon';
import Planet from './Planet';
import { planets } from './solar-system-data';
import starfield from '../../../public/starfield.jpg';

// const StarBackground = () => {
//   const texture = new TextureLoader().load('starfield.jpg');
//   const material = new MeshBasicMaterial({ map: texture, side: THREE.BackSide });
//   const geometry = new THREE.SphereGeometry(1000, 32, 32);
  
//   return <mesh material={material} geometry={geometry} />;
// };

export default function SolarSystem() {
  const controlsRef = useRef();

  const [followedPlanet, setFollowedPlanet] = useState(null);

  const unfollowPlanet = () => {
    setFollowedPlanet(null);
    const camera = controlsRef.current;
    camera.target.set(0, 0, 0);
    camera.update();
  }
  
  return (
    <>
      <div className="flex flex-col gap-3 absolute top-10 left-12 z-50 select-none">
        {planets.map((planet) => (
          <button
            className="bg-zinc-600/80 hover:bg-zinc-600 rounded-xl p-1 border border-zinc-500/40 shadow-md shadow-zinc-900"
            onClick={() => setFollowedPlanet(planet.name)}
          >
            {planet.name}
          </button>
        ))}
      </div>
      {followedPlanet && (
        <button
          className="bg-zinc-600/80 hover:bg-zinc-600 rounded-xl p-1.5 border border-zinc-500/40 shadow-md shadow-zinc-900 absolute top-10 z-50"
          onClick={() => unfollowPlanet()}
        >
          Unfollow
        </button>
      )}
      <Canvas
        camera={{ position: [0, 0, 50] }}
        className="bg-black"
        style={{ backgroundImage: `url(${starfield})`}}
      >
        <Physics>
          {/* <StarBackground /> */}
          <ambientLight intensity={3} />
          <pointLight intensity={2} position={[0, 0, 0]} />
          {planets.map((planet) => (
            <Planet
              key={planet.name}
              name={planet.name}
              radius={planet.radius}
              distance={planet.orbitRadius}
              texture={planet.texture}
              rotationSpeed={planet.rotationSpeed}
              orbitSpeed={planet.orbitSpeed}
              axialTilt={planet.axialTilt}
              mass={planet.mass}
              controlsRef={controlsRef}
              setFollowedPlanet={setFollowedPlanet}
              followed={followedPlanet === planet.name}
            />
          ))}
          <OrbitControls ref={controlsRef} />
        </Physics>
      </Canvas>
    </>
  );
};  
