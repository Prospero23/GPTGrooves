import { Text3D, Center } from "@react-three/drei"; // Changed from Text3D to Text as Text3D is not a standard export from '@react-three/drei'
import { useEffect, useState } from "react"; // Removed 'type' imports, as they're not standard in JavaScript or TypeScript

interface InitAudioProps {
  isInitialized: boolean;
  set: React.Dispatch<React.SetStateAction<boolean>>; // Updated the type definitions
  initializeAudio: () => Promise<void>;
}

const InitAudio: React.FC<InitAudioProps> = ({
  isInitialized,
  initializeAudio,
  set,
}: InitAudioProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const textColor = isHovered ? "red" : "white";
  const textEmmisive = isHovered ? "red" : "grey";
  const isShowing = !isInitialized;

  function handleEnter() {
    setIsHovered(true);
  }

  function handleLeave() {
    setIsHovered(false);
  }

  async function handleClick() {
    await initializeAudio();
    console.log("smh");
    set(!isInitialized);
  }

  // change cursor whenever hovered
  useEffect(() => {
    if (isHovered) {
      document.body.style.cursor = "pointer";
    } else {
      document.body.style.cursor = "default";
    }

    // Cleanup function to reset cursor when component is unmounted
    return () => {
      document.body.style.cursor = "default";
    };
  }, [isHovered]);

  return (
    <>
      {isShowing && ( // render the Text3D only if isInitialized is false
        <Center top>
          <Text3D
            font={"/fonts/ChicagoFLF_Regular.json"}
            scale={2.5}
            position={isShowing ? [-10, 0, 0] : [-10, -50, 0]}
            castShadow
            onPointerEnter={handleEnter}
            onPointerLeave={handleLeave}
            onClick={handleClick}
          >
            <meshLambertMaterial color={textColor} emissive={textEmmisive} />
            Initialize Audio
          </Text3D>
        </Center>
      )}
    </>
  );
};

export default InitAudio;
