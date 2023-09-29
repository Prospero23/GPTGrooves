"use client";

import { type SongType } from "@/library/musicData";
import { Html, OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useState } from "react";
import { Vector3 } from "three";
import Button from "./Button";

export default function Scene({ songs }: { songs: SongType[] }) {
  const [isPlaying, setIsPlaying] = useState<boolean | undefined>(false);
  // TODO improve this, we're only getting 1
  const bars = songs[0].sections.flatMap((section) => section.bars);

  // console.log(bars);

  return (
    <Canvas>
      <color attach="background" args={["black"]} />
      <ambientLight intensity={0.2} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]} receiveShadow>
        <Html transform position={[0, 2, 0]}>
          <h1 className=" text-2xl">Composition Date</h1>
          <p className="text-center">{isPlaying ? "playing" : "paused"}</p>
        </Html>
        <Html transform position={[2.5, 0, 0]}>
          <button className=" hover:text-red-600">next</button>
        </Html>
        <Html transform position={[-2.5, 0, 0]}>
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
      {/* <RandomButton position={new Vector3(0, -1.01, 0)}/> */}
    </Canvas>
  );
}
//potentially make plane its own component
