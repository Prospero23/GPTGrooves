"use client";

import { Canvas } from "@react-three/fiber";
import Button from "./Button";
import { useState, useEffect } from "react";
import { Device, MIDIEvent, MIDIData, TimeNow } from "@rnbo/js";
import setup from "@/public/sound";
import { OrbitControls, Html } from "@react-three/drei";
import {Vector3} from "three"


export default function Scene() {
  return (
    <Canvas>
        <Html position={[0,3,0]}>
            <div>
        <h1 className=" text-4xl">GPT House</h1>
        </div>
        </Html>
      <color attach="background" args={["black"]} />
      <ambientLight intensity={0.2} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]} receiveShadow>
        <planeGeometry args={[10, 10]}/>
        <meshStandardMaterial color="white" />
      </mesh>
      <directionalLight color="white" position={[0, 2, 5]}/>
      <OrbitControls />
      <Button position={new Vector3(0, -1.01, 0)} />
    </Canvas>
  );
}
