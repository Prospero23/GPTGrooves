"use client";

import setup from "@/public/sound.js";
import { useEffect, useState } from "react";
import { Device, MessageEvent, TimeNow } from "@rnbo/js";

export default function PlayButton() {
  const [drums, setDrums] = useState<Device | undefined>(undefined);
  const [bass, setBass] = useState<Device | undefined>(undefined);
  const [piano, setPiano] = useState<Device | undefined>(undefined);

  const [audioContext, setAudioContext] = useState<AudioContext | undefined>(undefined);

  useEffect(() => {
    // This code runs after the component has been rendered
    async function init() {
      const result = await setup();
      if (result) {
        setAudioContext(result.context);
        setDrums(result.device);
        setBass(result.deviceBass);
        //setPiano(result.devicePiano);
       // console.log(bass)
      } else {
        // Handle the undefined case, maybe log an error or throw an exception
        console.log('wtf')
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

  function handleClickDrums(event: React.MouseEvent<HTMLButtonElement>, inlet: number) {
    const eventTrigger = new MessageEvent(TimeNow, `in${inlet}`, [ 1 ]);
    if (drums) {
    drums.scheduleEvent(eventTrigger);
    }
  }

  function handleClickBass(event: React.MouseEvent<HTMLButtonElement>) {
    const eventTrigger = new MessageEvent(TimeNow, `in0`, [ Math.random() * 10 + 30 ]);
    if (bass){
    bass.scheduleEvent(eventTrigger);
    }
  }

return (
    <div className="flex flex-col">
   <button onClick={(e) => handleClickDrums(e, 1)}>Hat</button>
   <button onClick={(e) => handleClickDrums(e, 2)}>Kick</button>
   <button onClick={(e) => handleClickDrums(e, 3)}>Snare</button>
   <button onClick={(e) => handleClickBass(e)}>Bass</button>
  </div>
)
}
