"use client";
import { Text3D } from "@react-three/drei";

export default function Date() {
  return (
    <Text3D
      font={"/fonts/ChicagoFLF_Regular.json"}
      scale={4}
      position={[-14, 1, -14]}
      castShadow
    >
      <meshLambertMaterial color={"white"} emissive={"grey"} />
      Today Date
    </Text3D>
  );
}

// always center the date
