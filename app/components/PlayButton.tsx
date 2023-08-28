"use client";

import setup from "@/public/sound.js";
import { useEffect, useState } from "react";
import { Device, MessageEvent, TimeNow } from "@rnbo/js";

export default function PlayButton() {
  const [drums, setDrums] = useState<Device | undefined>(undefined);

  const [audioContext, setAudioContext] = useState<AudioContext | undefined>(undefined);

  useEffect(() => {
    // This code runs after the component has been rendered
    async function init() {
      const result = await setup();
      if (result) {
        setAudioContext(result.context);
        setDrums(result.device);
      } else {
        // Handle the undefined case, maybe log an error or throw an exception
      }
    }
    init()
    // Optional: Return a function to run on component unmount / before re-running the effect
    return () => {
        if (audioContext) {
     audioContext.close()
        }
    };
  }, []);

  function handleClick(event: React.MouseEvent<HTMLButtonElement>, inlet: number) {
    const eventTrigger = new MessageEvent(TimeNow, `in${inlet}`, [ 1 ]);
    if (drums) {
    drums.scheduleEvent(eventTrigger);
    }

    // No need for a return statement here.
  }
return (
    <div className="flex flex-col">
   <button onClick={(e) => handleClick(e, 1)}>Hat</button>
   <button onClick={(e) => handleClick(e, 2)}>Kick</button>
   <button onClick={(e) => handleClick(e, 3)}>Snare</button>
  </div>
)
}
