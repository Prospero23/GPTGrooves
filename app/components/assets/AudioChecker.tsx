import { useFrame } from "@react-three/fiber";

export default function AudioChecker({ check }: { check: () => void }) {
  useFrame(() => {
    check();
  });
  return <></>;
}
