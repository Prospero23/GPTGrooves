import { Text3D } from "@react-three/drei";

export default function PlayState({ isPlaying }: { isPlaying: boolean }) {
  const state = isPlaying ? "Pause" : "Play";
  return (
    <Text3D
      font={"/fonts/ChicagoFLF_Regular.json"}
      scale={0.5}
      rotation-x={(Math.PI * 3) / 2}
      position={[-0.7, 0, 2]}
      castShadow
    >
      <meshLambertMaterial color="white" emissive="grey" />
      {state}
    </Text3D>
  );
}
