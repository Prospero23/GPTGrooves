import { Html } from "@react-three/drei";
import { useState } from "react";
import { Vector3 } from "three";

export default function Description() {
  const [isToggled, setIsToggled] = useState(false);

  const handleToggle = () => {
    setIsToggled(!isToggled);
  };

  const position = isToggled ? [0, 0, 8] : [0, 0, 3];
  return (
    <Html
      transform
      position={new Vector3(...position)}
      rotation={[(Math.PI * 3) / 2, 0, 0]}
    >
      <h1 className="text-center text-2xl pb-1">Explanation</h1>
      {isToggled ? (
        <p>
          In this intricate endeavor, we witness the profound amalgamation of
          technological prowess and artistic expression, mediated through the
          innovative applications of LangChain and GPT. The creation of music,
          an endeavor historically rooted in the depths of human creativity and
          expression, is now being reimagined and transformed under the auspices
          of computational ingenuity. GPT, standing at the helm of linguistic
          proficiency, meticulously generates a text-based representation of a
          musical piece, encoded in a bespoke musical markup language. This is
          no trivial feat; it embodies a complex interplay of syntactic
          structures and semantic depth, capturing the quintessence of musical
          expression in a textual format. Subsequently, this text is subjected
          to a rigorous parsing process, orchestrated through Python. It is here
          that the textual representation transcends its initial form,
          metamorphosing into a structured musical composition. This intricate
          process delineates the creation of the foundational musical elements:
          the bass, pad, and drums, effectively laying down the sonic framework
          of the piece. However, the journey of transformation does not
          culminate here. The music undergoes a critical phase of filtering, a
          meticulous refinement that ensures the auditory experience is not
          merely a passive reception but an immersive engagement. The aim is
          clear: to elevate the piece from a mere arrangement of sounds to a
          profound sonic experience, capable of resonating with the very fabric
          of human emotion and cognition. As the daily cycle concludes, a unique
          musical composition comes into existence, marking the perpetual ritual
          of creation and innovation. Each piece stands as a testament to the
          fleeting nature of time and creativity, a singular expression of the
          day’s essence, never to be replicated in its exact form. In this, we
          observe not just a technological marvel, but a philosophical inquiry
          into the nature of creativity, art, and expression. We are invited to
          reflect upon the ways in which the machinations of code and algorithm
          can intertwine with the ephemeral beauty of musical artistry. This,
          indeed, is the dialectic of our times.
        </p>
      ) : (
        <p>
          The music is generated using LangChain and GPT 4. GPT is prompted to
          create a text description of a song formatted in a specified type of
          musical markup. This is then parsed in python to be fed back into the
          model, first creating the data for bass, pad, and drums and then for
          filtering. All of this data is then combined together to output a song
          and stored in a MongoDB database. A new song is generated each day.
        </p>
      )}
      <div className="absolute right-0 top-0">
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            value=""
            className="sr-only peer"
            onChange={handleToggle}
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
          <span className="ml-3 text-sm font-medium text-gray-900">
            {isToggled ? "ChomskAI" : "Short"}
          </span>
        </label>
      </div>
    </Html>
  );
}
