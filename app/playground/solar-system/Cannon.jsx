// import { useRef, useState } from 'react';
// import { useFrame, useThree } from '@react-three/fiber';
// import { Vector3 } from 'three';

// export default function Cannon({
//   planetMesh,
//   planetRadius,
//   followed,
//   setActiveBalls
// }) {
//   const cannonBodyRef = useRef();
//   const cannonMuzzleRef = useRef();
//   const { raycaster, camera, mouse } = useThree();
//   const [dragging, setDragging] = useState(false);
//   const [startPoint, setStartPoint] = useState(new Vector3());
//   const [cannonAngle, setCannonAngle] = useState(0);
//   const [planetPos, setPlanetPos] = useState([0, 0, 0]);

//   const shoot = () => {
//     const endPoint = raycaster.ray.at(2);
//     const direction = new Vector3().subVectors(endPoint, startPoint).normalize();
//     const velocity = direction.multiplyScalar(10);

//     const ballData = {
//       position: [cannonMuzzleRef.current.position.x, cannonMuzzleRef.current.position.y, cannonMuzzleRef.current.position.z],
//       velocity: [velocity.x, velocity.y, velocity.z],
//     };

//     setActiveBalls((prevBalls) => {
//       const newBalls = [...prevBalls, ballData];
//       return newBalls.slice(-30);
//     });
//   };

//   const handleMouseDown = () => {
//     setDragging(true);
//     raycaster.setFromCamera(mouse, camera);
//     setStartPoint(raycaster.ray.at(2));
//   };

//   const handleMouseUp = () => {
//     if (dragging) {
//       shoot();
//       setDragging(false);
//     }
//   };

//   useFrame(() => {
//     const { x, y, z } = planetMesh.position;
//     setPlanetPos([x, y, z]);
    
//     cannonBodyRef.current.position.set(x, y + planetRadius, z);
//     cannonMuzzleRef.current.position.set(x, y + planetRadius + 2.5, z); 

//     raycaster.setFromCamera(mouse, camera);
//     const intersects = raycaster.intersectObject(planetMesh);

//     if (intersects.length > 0) {
//       const point = intersects[0].point;
//       const angle = Math.atan2(point.y - planetMesh.position.y, point.x - planetMesh.position.x);
//       setCannonAngle(angle);
//     }
    
//     cannonMuzzleRef.current.rotation.set(0, 0, cannonAngle);
//   });

//   return (
//     <group
//       position={[planetPos[0], planetPos[1] + planetRadius, planetPos[2]]}
//       visible={followed}
//       onMouseDown={handleMouseDown}
//       onMouseUp={handleMouseUp}
//     >
//       <mesh ref={cannonBodyRef}>
//         <cylinderGeometry args={[1, 1, 5]} />
//         <meshStandardMaterial color="gray" />
//       </mesh>

//       <mesh ref={cannonMuzzleRef} position={[0, 2.5, 0]} rotation={[cannonAngle, 0, 0]}>
//         <cylinderGeometry args={[0.5, 0.5, 3]} />
//         <meshStandardMaterial color="black" />
//       </mesh>
//     </group>
//   );
// }