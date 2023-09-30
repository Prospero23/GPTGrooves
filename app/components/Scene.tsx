/* eslint-disable react/no-unknown-property */
"use client";

import { type SongType } from "@/library/musicData";
import { OrbitControls, Html } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
// import { useState } from "react";
// import Button from "./Button";
import RandomButton from "./RandomButton";

export default function Scene({ songs }: { songs: SongType[] }) {
  // const [isPlaying, setIsPlaying] = useState<boolean | undefined>(false);
  // TODO improve this, we're only getting 1
  // const bars = songs[0].sections.flatMap((section) => section.bars);

  // console.log(bars);

  return (
    <Canvas camera={{ position: [0, 3, 5], fov: 75 }}>
      <ambientLight intensity={0.2} />
      {/* eslint-disable-next-line react/no-unknown-property */}
      <directionalLight color="white" position={[0, 2, 5]} />
      <OrbitControls makeDefault />
      {/* <Button
        position={new Vector3(0, -1.01, 0)}
        isPlaying={isPlaying}
        setIsPlaying={setIsPlaying}
        playingData={bars}
      /> */}
      <RandomButton />
      <Html receiveShadow position={[0, 0, -5]} zIndexRange={[0, 1]}>
        <h1 className="text-black">rarara</h1>
      </Html>
    </Canvas>
  );
}
// potentially make plane its own component
//     {isPlaying ?? false ? "playing" : "paused"}
//   </p>
