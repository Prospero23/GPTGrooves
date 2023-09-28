"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useAnimations, useGLTF } from "@react-three/drei";
import { Device, MIDIEvent, MIDIData, TimeNow, MessageEvent } from "@rnbo/js";
import setup from "@/public/sound";
import { Vector3 } from "three";
import { BarType } from "@/library/musicData";
import noteToMidi from "@/library/noteToMidi";
import * as Tone from 'tone'


interface ButtonProps {
  position: Vector3;
  isPlaying: Boolean | undefined;
  setIsPlaying: React.Dispatch<React.SetStateAction<Boolean | undefined>>;
  //give data
  playingData: Array<BarType>;
}

const drumInlets = {
  hi_hat: 1,
  kick: 2,
  snare: 3,
};

export default function Button({
  position,
  isPlaying,
  setIsPlaying,
  playingData,
}: ButtonProps) {
  const { scene, animations } = useGLTF("/assets/butttton.glb");
  const { actions, names } = useAnimations(animations, scene);

  //audio devices and context
  const audioContext = useRef<AudioContext | undefined>(undefined);
  const ToneContext = useRef<AudioContext | undefined>(undefined);
  const drums = useRef<Device | undefined>(undefined);
  const bass = useRef<Device | undefined>(undefined);
  const pad = useRef<Device | undefined>(undefined);
  const [audioAllowed, setAudioAllowed] = useState(false)
  //timing

  const currentBar = useRef<number>(0)
  const currentStep = useRef<number>(0)

  //setup function. RUNS ONCE
  useEffect(() => {
    // This code runs after the component has been rendered
    async function init() {
      const result = await setup();
      if (result) {
        drums.current = result.device;
        bass.current = result.deviceBass;
        pad.current = result.deviceSynth;
        audioContext.current = result.context

        //drums.current.node

      } else {
        // Handle the undefined case, maybe log an error or throw an exception
        console.log("initializing audio failed. Reload the page.");
      }
    }
    init();
    // Optional: Return a function to run on component unmount / before re-running the effect
    return () => {
      audioContext.current?.close()
    };
  }, []);

  async function handleClick() {
    await Tone.context.resume()
    console.log(Tone.context.state)
    const anim = actions[names[0]];
    if (anim) {
        anim.reset();
        anim.repetitions = 1;
        anim.setDuration(0.2);
        anim.play();
    }
  }

  return (
    <>
      <primitive object={scene} onClick={handleClick} position={position} />
    </>
  );
}


//randomly set button color for each day?
//I think audio is hooked to wrong place]

    // //setIsPlaying(!isPlaying);
    // Tone.Transport.scheduleRepeat((time) => {
    //    console.log('current step: ', currentStep)
    //    console.log('current bar: ' ,currentBar)
    // //   //drums
    // //   for (let drumType in playingData[currentBar.current].drums) {
    // //     // Make sure we have the correct structure
    // //     if (playingData[currentBar.current].drums.hasOwnProperty(drumType)) {
    // //       let inlet = drumInlets[drumType as keyof typeof drumInlets];
    // //       const drumEventTrigger = new MessageEvent(TimeNow, `in${inlet}`, [
    // //         //@ts-ignore
    // //         playingData[currentBar.current].drums[drumType][currentStep.current],
    // //       ]);
    // //       drums.current?.scheduleEvent(drumEventTrigger);
    // //     }
    // //   }
    // //   //bass
    // //   // const bassNote = noteToMidi(
    // //   //   playingData[currentBar.current].bass.pattern[currentStep.current]
    // //   // );

    // //   // if (!isNaN(bassNote)) {
    // //   //   const bassEventTrigger = new MessageEvent(TimeNow, `in0`, [bassNote]);
    // //   //   bass.current?.scheduleEvent(bassEventTrigger);
    // //   // }
    // //   //synth
    // //   // if (pad.current) {

    // //   //   let padInstance = pad.current as Device;

    // //   //   playingData[currentBar.current].pad.chord_sequence[currentStep.current].notes.forEach(
    // //   //     (note) => {
    // //   //       let midiChannel = 0;

    // //   //       let midiNote = noteToMidi(note) + 12;

    // //   //       // Format a MIDI message paylaod, this constructs a MIDI on event
    // //   //       let noteOnMessage: MIDIData = [
    // //   //         144 + midiChannel, // Code for a note on: 10010000 & midi channel (0-15)
    // //   //         midiNote, // MIDI Note
    // //   //         100, // MIDI Velocity
    // //   //       ];

    // //   //       let noteOffMessage: MIDIData = [
    // //   //         128 + midiChannel, // Code for a note off: 10000000 & midi channel (0-15)
    // //   //         midiNote, // MIDI Note
    // //   //         0, // MIDI Velocity
    // //   //       ];

    // //   //       // Including rnbo.min.js (or the unminified rnbo.js) will add the RNBO object
    // //   //       // to the global namespace. This includes the TimeNow constant as well as
    // //   //       // the MIDIEvent constructor.
    // //   //       let midiPort = 0;
    // //   //       let noteDurationMs = 250; // TODO: BETTER

    // //   //       // When scheduling an event to occur in the future, use the current audio context time
    // //   //       // multiplied by 1000 (converting seconds to milliseconds) for now.
    // //   //       let noteOnEvent = new MIDIEvent(
    // //   //         time,
    // //   //         midiPort,
    // //   //         noteOnMessage
    // //   //       );
    // //   //       let noteOffEvent = new MIDIEvent(
    // //   //         time + noteDurationMs, //maybe * 10000
    // //   //         midiPort,
    // //   //         noteOffMessage
    // //   //       );

    // //   //       padInstance.scheduleEvent(noteOnEvent);
    // //   //       padInstance.scheduleEvent(noteOffEvent);
    // //   //     }
    // //   //   );
    // //   // }
    // //   if (currentStep.current <= 16){ //make better later
    // //     currentStep.current += 1
    // //   } else {
    // //     currentStep.current = 0
    // //     currentBar.current += 1
    // //   }
    // }, "16n")




    //use setTimeout to nake queue
//large overall lookahead and reasonably short interval
//A good place to start is probably 100ms of “lookahead” time, with intervals set to 25ms.
//up the lookahead time if too complex and stuttering
