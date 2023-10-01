"use client";
import { useAnimations, useGLTF } from "@react-three/drei";
import { type Vector3 } from "three";

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
  const { scene, animations } = useGLTF("/assets/butttton.glb");
  const { actions, names } = useAnimations(animations, scene);

  function handleClick(event: React.MouseEvent<HTMLButtonElement>) {
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
    <>
      {/* eslint-disable-next-line react/no-unknown-property */}
      <primitive object={scene} onClick={handleClick} position={position} />
    </>
  );
}

// randomly set button color for each day?

// better trash disposal needed
// BETTER ERROR HANDLING
// maybe better scoping of variables?

// <primitive object={scene} onClick={handleClick} position={position} /> change this to new button?

// option shift o
