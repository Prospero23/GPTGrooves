/* eslint-disable react/no-unknown-property */
"use client";
import { Text3D } from "@react-three/drei";

export default function Album({ year }: { year: number }) {
  return (
    <Text3D
      font={"/fonts/ChicagoFLF_Regular.json"}
      scale={1}
      position={[-4.5, 0.0, -3]}
      castShadow
    >
      <meshLambertMaterial color="white" emissive="grey" />
      Album: {year}
    </Text3D>
  );
}
