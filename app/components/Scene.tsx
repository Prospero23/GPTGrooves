"use client";

import { Canvas } from "@react-three/fiber";
import Button from "./Button";
import { useState, useEffect } from "react";
import { Device, MIDIEvent, MIDIData, TimeNow } from "@rnbo/js";
import setup from "@/public/sound";
import {OrbitControls} from "@react-three/drei"


export default function Scene() {


  return (
    <Canvas>
      <color attach="background" args={["white"]} />
      <ambientLight intensity={0.1} />
      <directionalLight color="red" position={[0, 0, 5]} />
      <OrbitControls/>
      <Button/>

    </Canvas>
  );
}
