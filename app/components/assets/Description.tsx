import { Html } from "@react-three/drei";
import { Vector3 } from "three";
import { useEffect, useState } from "react";

export default function Description() {
  const [position, setPosition] = useState(new Vector3(0, 0, 3));

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 440 && window.innerWidth > 320) {
        // Change the position for smaller screens
        setPosition(new Vector3(0, 0, 4));
      } else if (window.innerWidth < 320 && window.innerWidth > 230) {
        setPosition(new Vector3(0, 0, 5));
      } else if (window.innerWidth <= 230 && window.innerHeight > 170) {
        setPosition(new Vector3(0, 0, 7));
      } else {
        // Reset to default position for larger screens
        setPosition(new Vector3(0, 0, 3));
      }
    };

    // Set the initial position based on the current window size
    handleResize();

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);
  return (
    <>
      <Html
        transform
        position={position}
        rotation={[(Math.PI * 3) / 2, 0, 0]}
        className="flex justify-center z-0"
      >
        <div className="lg:w-1/4 flex flex-col justify-center items-center">
          <h1 className="text-center text-2xl mx-10">Explanation</h1>
          <p>
            These sounds are generated using LangChain and GPT 4. GPT is
            prompted to create a text description of a song formatted in a
            specified type of musical markup. This is parsed to be fed back into
            the model, first creating the data for bass, pad, and drums and then
            for filtering. All of this data is then combined together to output
            a song and stored in a database. A new song is generated each day.
            To hear, make sure your sound, including ring switch, is on and use
            the mouse to move around.
          </p>
        </div>
      </Html>
    </>
  );
}
