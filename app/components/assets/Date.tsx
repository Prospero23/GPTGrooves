"use client";
import { Text3D, Center } from "@react-three/drei";
// import { useState, useRef } from "react";

export default function Date({ month, day }: { month: string; day: number }) {
  return (
    <Center position={[0, 0, -14]} top>
      <Text3D
        font={"/fonts/ChicagoFLF_Regular.json"}
        scale={4}
        position={[-19, 1, -14]}
        castShadow
      >
        <meshLambertMaterial color={"gray"} emissive={"black"} />
        {month} {day}
      </Text3D>
    </Center>
  );
}

// always center the date
