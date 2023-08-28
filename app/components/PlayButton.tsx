"use client";

import setup from "@/public/sound.js";
import { useEffect, useState } from "react";
import { Device, MessageEvent, TimeNow, MIDIEvent, MIDIData } from "@rnbo/js";

export default function PlayButton() {
  const [drums, setDrums] = useState<Device | undefined>(undefined);
  const [bass, setBass] = useState<Device | undefined>(undefined);
  const [synth, setSynth] = useState<Device | undefined>(undefined);

  const [audioContext, setAudioContext] = useState<AudioContext | undefined>(undefined);

  useEffect(() => {
    // This code runs after the component has been rendered
    async function init() {
      const result = await setup();
      if (result) {
        setAudioContext(result.context);
        setDrums(result.device);
        setBass(result.deviceBass);
        setSynth(result.deviceSynth);
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

  function handleClickSynth(event: React.MouseEvent<HTMLButtonElement>) {

    let midiNotes: number[] = [];
    const numberNotes = 4;
    for (let i = 0; i < 4; i++){
        midiNotes.push(Math.floor(Math.random() * 60 + 20))
    }
    if (synth){
    midiNotes.forEach(note => {
            let midiChannel = 0;

            // Format a MIDI message paylaod, this constructs a MIDI on event
            let noteOnMessage:MIDIData = [
                144 + midiChannel, // Code for a note on: 10010000 & midi channel (0-15)
                note, // MIDI Note
                100 // MIDI Velocity
            ];

            let noteOffMessage:MIDIData = [
                128 + midiChannel, // Code for a note off: 10000000 & midi channel (0-15)
                note, // MIDI Note
                0 // MIDI Velocity
            ];

            // Including rnbo.min.js (or the unminified rnbo.js) will add the RNBO object
            // to the global namespace. This includes the TimeNow constant as well as
            // the MIDIEvent constructor.
            let midiPort = 0;
            let noteDurationMs = 250;

            // When scheduling an event to occur in the future, use the current audio context time
            // multiplied by 1000 (converting seconds to milliseconds) for now.
            let noteOnEvent = new MIDIEvent(synth.context.currentTime * 1000, midiPort, noteOnMessage);
            let noteOffEvent = new MIDIEvent(synth.context.currentTime * 1000 + noteDurationMs, midiPort, noteOffMessage);

            synth.scheduleEvent(noteOnEvent);
            synth.scheduleEvent(noteOffEvent);
        })
  }
}

return (
    <div className="flex flex-col">
   <button onClick={(e) => handleClickDrums(e, 1)}>Hat</button>
   <button onClick={(e) => handleClickDrums(e, 2)}>Kick</button>
   <button onClick={(e) => handleClickDrums(e, 3)}>Snare</button>
   <button onClick={(e) => handleClickBass(e)}>Bass</button>
   <button onClick={(e) => handleClickSynth(e)}>Synth</button>
  </div>
)
}
