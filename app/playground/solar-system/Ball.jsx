// import { useSphere } from 'use-cannon';
// import { useFrame, useThree } from '@react-three/fiber';
// import { Vector3 } from 'three';

// export default function Ball(props) {
//   const [ref, api] = useSphere(() => ({
//     mass: 1,
//     position: props.position || [0, 0, 0],
//     velocity: props.velocity || [0, 0, 0],
//     restitution: 0.5,
//   }));

//   const { scene } = useThree();

//   useFrame(() => {
//     const planet = scene.getObjectByName(props.planetName);

//     if (planet) {
//       const planetPos = planet.position;
//       const ballPos = ref.current.position;
//       const direction = new Vector3().subVectors(planetPos, ballPos).normalize();
      
//       const G = 6.67430e-11;
//       const ballMass = 1;
//       const forceMagnitude = (G * props.planetMass * ballMass) / ballPos.distanceToSquared(planetPos);

//       const gravitationalForce = direction.multiplyScalar(forceMagnitude);
      
//       api.applyForce([gravitationalForce.x, gravitationalForce.y, gravitationalForce.z]);
//     }
//   });

//   return (
//     <mesh ref={ref}>
//       <sphereBufferGeometry args={[0.5, 32, 32]} />
//       <meshStandardMaterial color="white" />
//     </mesh>
//   );
// }