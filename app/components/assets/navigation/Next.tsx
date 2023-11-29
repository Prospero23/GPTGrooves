"use client";

import { type Dispatch, type SetStateAction } from "react";
import { Text3D } from "@react-three/drei";
import { A11y, useA11y } from "@react-three/a11y";

function NextButtonObject({ handleClick }: { handleClick: () => void }) {
  const a11y = useA11y();

  return (
    <Text3D
      font={"/fonts/ChicagoFLF_Regular.json"}
      scale={1}
      position={[3, 0, 0.5]}
      rotation={[(Math.PI * 3) / 2, 0, 0]}
      castShadow
      onClick={handleClick}
    >
      <meshLambertMaterial
        color={a11y.hover || a11y.focus ? "red" : "gray"}
        emissive={a11y.hover || a11y.focus ? "red" : "black"}
      />
      {">"}
    </Text3D>
  );
}

export default function Next({
  setCurrentSong,
  currentSong,
  setIsPlaying,
}: {
  setCurrentSong: Dispatch<SetStateAction<number>>;
  currentSong: number;
  setIsPlaying: Dispatch<SetStateAction<boolean>>;
}) {
  function handleClick() {
    if (currentSong > 0) {
      setCurrentSong(currentSong - 1);
      setIsPlaying(false);
    }
  }
  return (
    <A11y
      role="button"
      actionCall={handleClick}
      description="button to go to next song"
      a11yElStyle={{ marginLeft: "100px" }}
    >
      <NextButtonObject handleClick={handleClick} />
    </A11y>
  );
}
