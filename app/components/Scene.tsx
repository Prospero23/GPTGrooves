"use client";

import { Canvas } from "@react-three/fiber";
import Button from "./Button";
import { useState } from "react";
import { OrbitControls, Html } from "@react-three/drei";
import { Vector3 } from "three";
import {BarType} from "@/library/musicData"



export default function Scene({ bars }: { bars: Array<BarType> }) {
  const [isPlaying, setIsPlaying] = useState<Boolean | undefined>(false);

  return (
    <Canvas>
      <color attach="background" args={["black"]} />
      <ambientLight intensity={0.2} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]} receiveShadow>
        <Html transform position={[0, 2, 0]}>
          <h1 className=" text-2xl">Composition Date</h1>
          <p className="text-center">{isPlaying ? "playing" : "paused"}</p>
        </Html>
        <Html transform position={[2.5,0,0]}>
          <button className=" hover:text-red-600">next</button>
        </Html>
        <Html transform position={[-2.5,0,0]}>
          <button className=" hover:text-red-600">prev</button>
        </Html>
        <planeGeometry args={[10, 10]} />
        <meshStandardMaterial color="white" />
      </mesh>
      <directionalLight color="white" position={[0, 2, 5]} />
      <OrbitControls />
      <Button
        position={new Vector3(0, -1.01, 0)}
        isPlaying={isPlaying}
        setIsPlaying={setIsPlaying}
        playingData={bars}
      />
    </Canvas>
  );
}
//potentially make plane its own component
