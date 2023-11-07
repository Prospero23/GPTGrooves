/* eslint-disable react/no-unknown-property */
import { useRef } from "react";

import { type Vector3 } from "three";
import { type ThreeEvent } from "@react-three/fiber";
import { useAnimations, useGLTF } from "@react-three/drei";
import { A11y } from "@react-three/a11y";

interface ButtonProps {
  position: Vector3;
  isPlaying: boolean;
  setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function Button({
  position,
  isPlaying,
  setIsPlaying,
}: ButtonProps) {
  const group = useRef<THREE.Group | null>(null);

  // @ts-expect-error nodes are present on GLTF
  const { nodes, materials, animations } = useGLTF("/assets/butttton.glb");
  const { actions, names } = useAnimations(animations, group);

  function handleClick(event: ThreeEvent<MouseEvent>) {
    event.stopPropagation(); // stop event from firing twice
    // animation
    const anim = actions[names[0]];
    if (anim != null) {
      anim.reset();
      anim.repetitions = 1;
      anim.setDuration(0.2);
      anim.play();
    }
    // logic
    setIsPlaying(!isPlaying);
  }

  return (
    <A11y role="button" description="Triggers audio">
      <group
        ref={group}
        dispose={null}
        position={position}
        onClick={handleClick}
      >
        <group name="Scene">
          <mesh
            name="Cylinder"
            castShadow
            receiveShadow
            geometry={nodes.Cylinder.geometry}
            material={materials["Material.001"]}
            position={[0.197, 0.055, 0.005]}
            scale={[1, 0.056, 1]}
          />
          <mesh
            name="Cylinder001"
            castShadow
            receiveShadow
            geometry={nodes.Cylinder001.geometry}
            position={[0.197, 0.147, 0.019]}
            rotation={[-Math.PI, 0, -Math.PI]}
            scale={[-0.887, -0.122, -0.887]}
          >
            <meshBasicMaterial color={"red"} />
          </mesh>
        </group>
      </group>
    </A11y>
  );
}

// randomly set button color for each day?
// switch material to look more glass like
