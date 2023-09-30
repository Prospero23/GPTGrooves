/* eslint-disable react/no-unknown-property */
"use client";

import { type SongType } from "@/library/musicData";
import { OrbitControls, Plane } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useState } from "react";
import Button from "./Button";
import { Vector3 } from "three";
import Next from "@/app/components/Next";
import Prev from "@/app/components/Prev";
import Date from "@/app/components/Date";
import Author from "@/app/components/Author";
import Album from "@/app/components/Album";
import PlayState from "@/app/components/PlayState";
// import RandomButton from "./RandomButton";

export default function Scene({ songs }: { songs: SongType[] }) {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  // const button = useRef(null);
  // TODO improve this, we're only getting 1
  const bars = songs[0].sections.flatMap((section) => section.bars);

  return (
    <Canvas camera={{ position: [0, 11, 13.6], fov: 75 }} linear flat shadows>
      {/* <CameraLogger /> */}
      <Plane
        rotation={[(Math.PI * 3) / 2, 0, 0]}
        scale={40}
        position={[0, -0.1, -10]}
        receiveShadow
      >
        <meshLambertMaterial color={"white"} emissive={"white"} />
      </Plane>
      <directionalLight
        position={[0, 20, 10]}
        intensity={1.0}
        castShadow
        color={"white"}
      />
      <OrbitControls makeDefault />
      <Button
        position={new Vector3(0, 0, 0)}
        isPlaying={isPlaying}
        setIsPlaying={setIsPlaying}
        playingData={bars}
      />
      <Date />
      <Author />
      <Album />
      <Next />
      <Prev />
      <PlayState isPlaying={isPlaying} />
    </Canvas>
  );
}
// potentially make plane its own component
//     {isPlaying ?? false ? "playing" : "paused"}
//   </p>
// function CameraLogger() {
//   // helper function
//   const { camera } = useThree();

//   useFrame(() => {
//     console.log(
//       "Camera Position: ",
//       camera.position.x,
//       camera.position.y,
//       camera.position.z,
//     );
//   });
//   return <></>;
// }
