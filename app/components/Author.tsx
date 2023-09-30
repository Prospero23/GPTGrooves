/* eslint-disable react/no-unknown-property */
"use client";
import { Text3D } from "@react-three/drei";

export default function Author() {
  return (
    <Text3D
      font={"/fonts/ChicagoFLF_Regular.json"}
      scale={2}
      position={[-7, 0.5, -7]}
      castShadow
    >
      <meshLambertMaterial color={"white"} emissive={"grey"} />
      By: GPT-4
    </Text3D>
  );
}
