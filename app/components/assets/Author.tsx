/* eslint-disable react/no-unknown-property */
"use client";
import { Text3D, Center } from "@react-three/drei";

export default function Author() {
  return (
    <Center position={[0, 0, -7]} top>
      <Text3D
        font={"/fonts/ChicagoFLF_Regular.json"}
        scale={2}
        position={[-7, 0.5, -7]}
        castShadow
      >
        <meshLambertMaterial color={"gray"} emissive={"black"} /> By: GPT-4
      </Text3D>
    </Center>
  );
}
