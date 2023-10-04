"use client";
import { Text3D } from "@react-three/drei";

export default function Date({ month, day }: { month: string; day: number }) {
  return (
    <Text3D
      font={"/fonts/ChicagoFLF_Regular.json"}
      scale={4}
      position={[-19, 1, -14]}
      castShadow
    >
      <meshLambertMaterial color={"white"} emissive={"grey"} />
      {month} {day}
    </Text3D>
  );
}

// always center the date
