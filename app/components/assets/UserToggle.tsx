import { type Dispatch, type SetStateAction } from "react";
import { Text3D } from "@react-three/drei";
import { useA11y, A11y } from "@react-three/a11y";

function UserToggleText({ userActions }: { userActions: boolean }) {
  const text = userActions ? "User Effects" : "GPT Effects";
  const a11y = useA11y();

  return (
    <Text3D
      font={"/fonts/ChicagoFLF_Regular.json"}
      scale={0.3}
      position={[9, 0, -4]}
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

export default function UserToggle({
  setUserActions,
  userActions,
}: {
  setUserActions: Dispatch<SetStateAction<boolean>>;
  userActions: boolean;
}) {
  function handleClick() {
    setUserActions(!userActions);
  }

  return (
    <A11y
      role="button"
      description="switch between user and GPT generated effects"
      actionCall={handleClick}
      a11yElStyle={{ marginLeft: "400px", marginBottom: "-100px" }}
    >
      <UserToggleText userActions={userActions} />
    </A11y>
  );
}
