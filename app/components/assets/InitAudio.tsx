import { A11y, useA11y } from "@react-three/a11y";
import { Text3D, Center } from "@react-three/drei"; // Changed from Text3D to Text as Text3D is not a standard export from '@react-three/drei'

interface InitAudioProps {
  isInitialized: boolean;
  set: React.Dispatch<React.SetStateAction<boolean>>; // Updated the type definitions
  initializeAudio: () => Promise<void>;
}

function InitAudioText({
  isShowing,
  handleClick,
}: {
  isShowing: boolean;
  handleClick: () => Promise<void>;
}) {
  const a11y = useA11y();
  return (
    <Center top>
      <Text3D
        font={"/fonts/ChicagoFLF_Regular.json"}
        scale={2.5}
        position={isShowing ? [-10, 0, 0] : [-10, -50, 0]}
        castShadow
        onClick={handleClick}
      >
        <meshLambertMaterial
          color={a11y.hover || a11y.focus ? "red" : "gray"}
          emissive={a11y.hover || a11y.focus ? "red" : "black"}
        />
        Initialize Audio
      </Text3D>
    </Center>
  );
}

const InitAudio: React.FC<InitAudioProps> = ({
  isInitialized,
  initializeAudio,
  set,
}: InitAudioProps) => {
  const isShowing = !isInitialized;

  async function handleClick() {
    await initializeAudio();
    set(!isInitialized);
  }

  return (
    <>
      {isShowing && ( // render the Text3D only if isInitialized is false
        <A11y
          role="button"
          actionCall={async () => {
            await handleClick();
          }}
          description="Text to initialize audio processes"
        >
          <InitAudioText handleClick={handleClick} isShowing={isShowing} />
        </A11y>
      )}
    </>
  );
};

export default InitAudio;
