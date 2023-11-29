import { type Dispatch, type SetStateAction } from "react";
import { Text3D } from "@react-three/drei";
import { A11y, useA11y } from "@react-three/a11y";

function UserToggleText({ effectToggle }: { effectToggle: boolean }) {
  const text = effectToggle ? "Effects" : " No Effects";
  const a11y = useA11y();

  return (
    <Text3D
      font={"/fonts/ChicagoFLF_Regular.json"}
      scale={0.3}
      position={[9, 0, -6]}
      rotation={[(Math.PI * 3) / 2, 0, 0]}
      castShadow
    >
      <meshLambertMaterial
        color={a11y.hover || a11y.focus ? "red" : "gray"}
        emissive={a11y.hover || a11y.focus ? "red" : "black"}
      />
      {text}
    </Text3D>
  );
}

export default function EffectToggle({
  effectToggle,
  setEffectToggle,
}: {
  setEffectToggle: Dispatch<SetStateAction<boolean>>;
  effectToggle: boolean;
}) {
  function handleClick() {
    setEffectToggle(!effectToggle);
  }

  return (
    <A11y
      role="button"
      description="switch between user and GPT generated effects"
      actionCall={handleClick}
    >
      <UserToggleText effectToggle={effectToggle} />
    </A11y>
  );
}
