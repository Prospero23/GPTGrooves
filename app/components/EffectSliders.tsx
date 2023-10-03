"use client";

import { Html } from "@react-three/drei";
import {
  type ChangeEvent,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
// import {
//   type ThreeElements,
//   useFrame,
//   useThree,
//   type ThreeEvent,
// } from "@react-three/fiber";

// import * as THREE from "three";
// export default function EffectSliders() {
//   const [value, setValue] = useState(0);
//   const [isDragging, setIsDragging] = useState(false);
//   const meshRef = useRef<ThreeElements["mesh"]>();

//   const { camera, mouse, scene } = useThree();
//   const ray = new THREE.Raycaster();

//   // Use the frame to update the position and detect boundaries
//   useFrame(() => {
//     if (isDragging && meshRef.current != null) {
//       ray.setFromCamera(mouse, camera);
//       const intersects = ray.intersectObject(meshRef.current);
//       if (intersects.length > 0) {
//         meshRef.current.position.set(
//           intersects[0].point.x,
//           intersects[0].point.y,
//           intersects[0].point.z,
//         );
//       }
//     }
//   });
//   function handleDown(event: ThreeEvent<MouseEvent>) {
//     event.stopPropagation();
//     setIsDragging(true);
//   }

//   function handleUp(event: ThreeEvent<MouseEvent>) {
//     event.stopPropagation();
//     setIsDragging(false);
//   }

//   return (
//     <group>
//       <mesh
//         position={[0, 1, 10]}
//         ref={meshRef}
//         onPointerDown={handleDown}
//         onPointerUp={handleUp}
//       >
//         <boxGeometry args={[1, 1, 1]} />
//         <meshBasicMaterial color="blue" />
//       </mesh>
//       <mesh position={[0, 1, 10]}>
//         <boxGeometry args={[10, 0.1, 0.1]} />
//         <meshBasicMaterial color="red" />
//       </mesh>
//     </group>
//   );
// }

interface SliderProps {
  count: number;
  visible: boolean;
  setOrbitEndabled: Dispatch<SetStateAction<boolean>>;
}

export default function EffectSliders({
  count,
  visible,
  setOrbitEndabled,
}: SliderProps) {
  // Initialize an array of size 'count' with all zeros
  const [values, setValues] = useState<number[]>(Array(count).fill(0));

  function handleChange(e: ChangeEvent<HTMLInputElement>, index: number) {
    const updatedValues = [...values];
    updatedValues[index] = Number(e.target.value);
    setValues(updatedValues);
    setOrbitEndabled(false);
    e.stopPropagation();
  }

  function handleDown() {
    setOrbitEndabled(false);
  }
  function handleUp() {
    setOrbitEndabled(true);
  }
  const show = visible ? "flex" : "hidden";

  return (
    <>
      {values.map((value, index) => (
        <Html
          key={index}
          transform
          rotation={[(Math.PI * 3) / 2, 0, 0]}
          position={[0, 0, 3 + index]}
          visible={false}
        >
          <div className={`text-black flex-center ${show}`}>
            <label htmlFor={`effect-${index}`} className="">
              {`Effect ${index + 1}`}
            </label>
            <input
              className="cursor-pointer"
              type="range"
              name={`effect-${index}`}
              id={`effect-${index}`}
              onChange={(e) => {
                handleChange(e, index);
              }}
              value={value}
              onPointerDown={handleDown}
              onPointerUp={handleUp}
            />
            <p>{value}</p>
          </div>
        </Html>
      ))}
    </>
  );
}
// these pointer events are messing up the audio for whatever reason
