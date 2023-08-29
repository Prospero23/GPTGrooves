"use client";

import { Canvas } from "@react-three/fiber";
import Button from "./Button";
import { useState, useEffect } from "react";
import { Device, MIDIEvent, MIDIData, TimeNow } from "@rnbo/js";
import setup from "@/public/sound";
import { OrbitControls, Html } from "@react-three/drei";
import { Vector3 } from "three";

export default function Scene() {
    const [isPlaying, setIsPlaying] = useState<Boolean | undefined>(false);

  return (
    <Canvas>
      <color attach="background" args={["black"]} />
      <ambientLight intensity={0.2} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]} receiveShadow>
        <Html transform position={[0,-2,0]}>
          <h1 className=" text-2xl">GPT House</h1>
          <p className="text-center">{isPlaying ? 'playing' : 'paused'}</p>
        </Html>
        <planeGeometry args={[10, 10]} />
        <meshStandardMaterial color="white" />
      </mesh>
      <directionalLight color="white" position={[0, 2, 5]} />
      <OrbitControls />
      <Button position={new Vector3(0, -1.01, 0)} isPlaying={isPlaying} setIsPlaying={setIsPlaying}/>
    </Canvas>
  );
}
