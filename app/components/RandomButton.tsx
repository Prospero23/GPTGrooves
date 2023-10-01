/* eslint-disable react/no-unknown-property */
"use client";
import { useRef } from "react";
import { useGLTF, useAnimations } from "@react-three/drei";
import * as THREE from "three";

export default function RandomButton() {
  const group = useRef<THREE.Group | null>(null);

  // @ts-expect-error nodes are present on GLTF
  const { nodes, materials, animations } = useGLTF("/assets/butttton.glb");
  const { actions, names } = useAnimations(animations, group);

  function handleClick() {
    const anim = actions[names[0]];
    if (anim != null) {
      anim.reset();
      anim.repetitions = 1;
      anim.setDuration(0.2);
      anim.play();
    }
  }

  function randomHexColor() {
    const hex = Math.floor(Math.random() * 16777215).toString(16);
    return "#" + hex;
  }

  return (
    <group
      ref={group}
      dispose={null}
      position={[0, 0, 0]}
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
          material={new THREE.MeshBasicMaterial({ color: randomHexColor() })} // Set color to red
          position={[0.197, 0.147, 0.019]}
          rotation={[-Math.PI, 0, -Math.PI]}
          scale={[-0.887, -0.122, -0.887]}
        />
      </group>
    </group>
  );
}

useGLTF.preload("/assets/butttton.glb");
