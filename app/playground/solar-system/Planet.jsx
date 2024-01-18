'use client';


import { useRef, useState } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import { MathUtils, TextureLoader } from "three";
import * as THREE from 'three';
import { useSphere } from "use-cannon";
import { moon } from "./solar-system-data";
// import Cannon from "./Cannon";
// import Ball from "./Ball";

export default function Planet({
  name,
  radius,
  distance,
  texture,
  rotationSpeed,
  orbitSpeed,
  axialTilt,
  mass,
  controlsRef,
  setFollowedPlanet,
  followed,
}) {
  const ref = useRef();
  const moonRef = useRef();
  // const [planetRef] = useSphere(() => ({
  //   radius: radius,
  //   type: 'Static',
  // }));

  // const [activeBalls, setActiveBalls] = useState([]);
  const [angle, setAngle] = useState(0);
  const [moonAngle, setMoonAngle] = useState(0);

  const planetTexture = useLoader(TextureLoader, texture);
  const moonTexture = useLoader(TextureLoader, moon.texture);
  
  const moonOrbitSpeed = 0.07;
  
  useFrame((state, delta) => {
    ref.current.rotation.y += rotationSpeed * delta;
  
    const newAngle = angle + delta * orbitSpeed;
    setAngle(newAngle);
    
    ref.current.position.x = distance * Math.cos(newAngle);
    ref.current.position.z = distance * Math.sin(newAngle);
    
    if (name === 'Earth') {
      const newMoonAngle = moonAngle + delta * moonOrbitSpeed;
      setMoonAngle(newMoonAngle);
      
      moonRef.current.position.x = (0.52 + 8) * Math.cos(newAngle) + 0.3 * Math.cos(newMoonAngle);
      moonRef.current.position.z = (0.52 + 8) * Math.sin(newAngle) + 0.3 * Math.sin(newMoonAngle);
    }

    if (followed && controlsRef.current) {
      const { x, y, z } = ref.current.position;
      controlsRef.current.target.set(x, y, z);
      controlsRef.current.update();

      let offsetZ = 20;
      if (['Sun', 'Jupiter', 'Saturn'].includes(name)) offsetZ = 45;
      const camera = controlsRef.current.object;
      camera.position.set(x, y + 5, z + offsetZ);
    }
  });
  
  return (
    <group
      ref={ref}
      rotation={[MathUtils.degToRad(axialTilt), 0, 0]}
      onClick={() => setFollowedPlanet(name)}
    >
      {name === 'Earth' && (
        <mesh ref={moonRef} >
          <sphereGeometry args={[moon.radius, 32, 32]} />
          <meshStandardMaterial map={moonTexture} />
        </mesh>
      )}
      {name === 'Saturn' && (
        <mesh rotation={[MathUtils.degToRad(90), 0, 0]}>
          <ringGeometry args={[8, 12, 64]} />
          <meshStandardMaterial side={THREE.DoubleSide} map={planetTexture} />
        </mesh>
      )}
      <mesh name={name}> {/*ref={planetRef}  */}
        <sphereGeometry args={[radius, 32, 32]} />
        <meshStandardMaterial map={planetTexture} />
      </mesh>
    </group>
    // {followed && (
    //   <Cannon
    //     planetMesh={ref.current}
    //     planetRadius={radius}
    //     followed={followed}
    //     setActiveBalls={setActiveBalls}
    //   />
    // )}
    // {activeBalls.map((ballData, index) => (
    //   <Ball
    //     key={index}
    //     position={ballData.position}
    //     velocity={ballData.velocity}
    //     planetMass={mass}
    //     planetName={name}
    //   />
    // ))}
  );
}