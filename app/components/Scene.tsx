/* eslint-disable react/no-unknown-property */
"use client";

import { type SongType } from "@/library/musicData";
import { OrbitControls, Text3D, Plane } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useState } from "react";
import Button from "./Button";
import { Vector3 } from "three";
// import RandomButton from "./RandomButton";

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

export default function Scene({ songs }: { songs: SongType[] }) {
  const [isPlaying, setIsPlaying] = useState<boolean | undefined>(false);
  // TODO improve this, we're only getting 1
  const bars = songs[0].sections.flatMap((section) => section.bars);

  // console.log(bars);

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
      <Text3D
        font={"/fonts/ChicagoFLF_Regular.json"}
        scale={4}
        position={[-14, 1, -14]}
        castShadow
      >
        <meshLambertMaterial color={"white"} emissive={"grey"} />
        Song Name
      </Text3D>
      <Text3D
        font={"/fonts/ChicagoFLF_Regular.json"}
        scale={2}
        position={[-7, 0.5, -7]}
        castShadow
      >
        <meshLambertMaterial color={"white"} emissive={"grey"} />
        By: GPT-4
      </Text3D>
      <Text3D
        font={"/fonts/ChicagoFLF_Regular.json"}
        scale={1}
        position={[-3.5, 0.0, -3]}
        castShadow
      >
        <meshLambertMaterial color="white" emissive="grey" />
        SONG A DAY
      </Text3D>
      <Text3D
        font={"/fonts/ChicagoFLF_Regular.json"}
        scale={1}
        position={[-3, 0, 0.5]}
        rotation={[(Math.PI * 3) / 2, 0, 0]}
        castShadow
        onClick={() => {
          console.log("purcell");
        }}
      >
        <meshLambertMaterial color="white" emissive="grey" />
        {"<"}
      </Text3D>
      <Text3D
        font={"/fonts/ChicagoFLF_Regular.json"}
        scale={1}
        position={[3, 0, 0.5]}
        rotation={[(Math.PI * 3) / 2, 0, 0]}
        castShadow
        onClick={() => {
          console.log("katie");
        }}
      >
        <meshLambertMaterial color="white" emissive="grey" />
        {">"}
      </Text3D>
    </Canvas>
  );
}
// potentially make plane its own component
//     {isPlaying ?? false ? "playing" : "paused"}
//   </p>
