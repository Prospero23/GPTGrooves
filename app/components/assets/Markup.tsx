import { type Dispatch, type SetStateAction } from "react";
import { Text3D } from "@react-three/drei";
import { useA11y, A11y } from "@react-three/a11y";

function MarkupText() {
  const a11y = useA11y();

  return (
    <Text3D
      font={"/fonts/ChicagoFLF_Regular.json"}
      scale={0.7}
      position={[-13, 0, -4]}
      rotation={[(Math.PI * 3) / 2, 0, 0]}
      castShadow
    >
      <meshLambertMaterial
        color={a11y.hover || a11y.focus ? "red" : "gray"}
        emissive={a11y.hover || a11y.focus ? "red" : "black"}
      />
      See Markup
    </Text3D>
  );
}

export default function Markup({
  setShowModal,
}: {
  setShowModal: Dispatch<SetStateAction<boolean>>;
}) {
  function handleClick() {
    setShowModal(true);
  }

  return (
    <A11y
      role="button"
      description="See the markup that generated data"
      actionCall={handleClick}
      a11yElStyle={{ marginLeft: "-400px", marginBottom: "-100px" }}
    >
      <MarkupText />
    </A11y>
  );
}
