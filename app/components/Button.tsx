"use client";
import { useState, useEffect, useRef } from "react";
import {
  useAnimations,
  useGLTF,
} from "@react-three/drei";

export default function Button({}) {
  const { scene, animations } = useGLTF("/assets/butttton.glb");
  const { actions, names } = useAnimations(animations, scene);

  //'button_press

  function handleClick() {
    const anim = actions[names[0]];
    //@ts-ignore
    anim.reset();
    //@ts-ignore
    anim.repetitions = 1;
    //@ts-ignore
    anim.play();
  }

  return (
    <>
        <primitive object={scene} onClick={handleClick} />;
    </>
  );
}

useGLTF.preload("/assets/butttton.glb");
