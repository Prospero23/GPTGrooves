import { Text3D } from "@react-three/drei";
import { Vector3 } from "three";

export default function PlayState({ isPlaying }: { isPlaying: boolean }) {
  const state = isPlaying ? "Pause" : "Play";
  const position = isPlaying ? [-0.9, 0, 2] : [-0.6, 0, 2];
  return (
    <Text3D
      font={"/fonts/ChicagoFLF_Regular.json"}
      scale={0.5}
      rotation-x={(Math.PI * 3) / 2}
      position={new Vector3(...position)}
      castShadow
    >
      <meshLambertMaterial color="gray" emissive="black" />
      {state}
    </Text3D>
  );
}
