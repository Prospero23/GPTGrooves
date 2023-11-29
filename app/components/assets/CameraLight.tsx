import React, { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type * as THREE from "three";
import { type OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export const CameraLight = ({
  controlsRef,
}: {
  controlsRef: React.RefObject<OrbitControls>;
}) => {
  const lightRef = useRef<THREE.DirectionalLight>(null);
  const { camera } = useThree();

  useFrame(() => {
    if (lightRef.current != null) {
      lightRef.current.position.copy(camera.position);
    }
  });

  // eslint-disable-next-line react/no-unknown-property
  return <directionalLight ref={lightRef} intensity={10} castShadow />;
};
