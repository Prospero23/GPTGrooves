/* eslint-disable react/no-unknown-property */
import {
  useRef,
  useState,
  useEffect,
  type Dispatch,
  type SetStateAction,
} from "react";

import { type Vector3 } from "three";
import { type ThreeEvent } from "@react-three/fiber";
import { useAnimations, useGLTF } from "@react-three/drei";
import { A11y, useA11y } from "@react-three/a11y";

interface ButtonProps {
  position: Vector3;
  isPlaying: boolean;
  setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;
}
function ButtonObject({
  position,
  setPlayAnimation,
  playAnimation,
}: {
  position: Vector3;
  handleClick: (event: ThreeEvent<MouseEvent>) => void;
  setPlayAnimation: Dispatch<SetStateAction<boolean>>;
  playAnimation: boolean;
}) {
  const a11y = useA11y();
  const group = useRef<THREE.Group | null>(null);

  // @ts-expect-error nodes are present on GLTF
  const { nodes, materials, animations } = useGLTF("/assets/butttton.glb");
  const { actions, names } = useAnimations(animations, group);

  useEffect(() => {
    if (playAnimation) {
      const anim = actions[names[0]];
      if (anim != null) {
        anim.reset();
        anim.repetitions = 1;
        anim.setDuration(0.2);
        anim.play();
      }
      setPlayAnimation(false); // Reset the state
    }
  }, [playAnimation, actions, names, setPlayAnimation]);

  return (
    <group ref={group} dispose={null} position={position}>
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
          <meshBasicMaterial
            color={a11y.focus || a11y.hover ? "red" : "blue"}
          />
        </mesh>
      </group>
    </group>
  );
}

export default function Button({
  position,
  isPlaying,
  setIsPlaying,
}: ButtonProps) {
  const [playAnimation, setPlayAnimation] = useState(false);

  function handleClick() {
    setIsPlaying(!isPlaying);
    setPlayAnimation(true); // Add this line to trigger animation
  }

  return (
    <A11y role="button" actionCall={handleClick} description="Plays songs">
      <ButtonObject
        position={position}
        handleClick={handleClick}
        playAnimation={playAnimation}
        setPlayAnimation={setPlayAnimation}
      />
    </A11y>
  );
}
// randomly set button color for each day?
// switch material to look more glass like
// need accessisisiblity yo be better
