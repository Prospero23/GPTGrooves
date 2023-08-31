"use client";
import { useState, useEffect, useRef, RefCallback } from "react";
import { useAnimations, useGLTF } from "@react-three/drei";
import { Device, MIDIEvent, MIDIData, TimeNow, MessageEvent } from "@rnbo/js";
import setup from "@/public/sound";
import {Vector3} from 'three'
import Song from '@/library/musicData'

interface ButtonProps {
    position: Vector3
    isPlaying: Boolean | undefined
    setIsPlaying: React.Dispatch<React.SetStateAction<Boolean | undefined>>;
    //give data
    playingData: Song
}


//if no data: randomize

export default function Button({position, isPlaying, setIsPlaying, playingData}: ButtonProps) {
  const { scene, animations } = useGLTF("/assets/butttton.glb");
  const { actions, names } = useAnimations(animations, scene);

  //audio stuff
  const [drums, setDrums] = useState<Device | undefined>(undefined);
  const [bass, setBass] = useState<Device | undefined>(undefined);
  const [synth, setSynth] = useState<Device | undefined>(undefined);
//   const [isPlaying, setIsPlaying] = useState<Boolean | undefined>(false);
  const [intervalID, setIntervalID] = useState<NodeJS.Timeout | null>(null);

  const [audioContext, setAudioContext] = useState<AudioContext | undefined>(
    undefined
  );

  //setup the audio stuff
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
        console.log("wtf");
      }
    }
    init();
    // Optional: Return a function to run on component unmount / before re-running the effect
    return () => {
      if (audioContext) {
        audioContext.close();
      }
    };
  }, []);

  //start/stop sequence
  useEffect(() => {
    let newIntervalID: NodeJS.Timeout | null = null;

    if (isPlaying) {
      newIntervalID = setInterval(() => {
        step();
      }, 100);

      setIntervalID(newIntervalID);
    } else if (intervalID !== null) {
      clearInterval(intervalID);
    }

    return () => {
      if (newIntervalID !== null) {
        clearInterval(newIntervalID);
      }
    };
  }, [isPlaying]); //intervalID

  function createChord() {
    let midiNotes: number[] = [];
    const numberNotes = 4;
    for (let i = 0; i < 4; i++) {
      midiNotes.push(Math.floor(Math.random() * 60 + 20));
    }
    if (synth) {
      midiNotes.forEach((note) => {
        let midiChannel = 0;

        // Format a MIDI message paylaod, this constructs a MIDI on event
        let noteOnMessage: MIDIData = [
          144 + midiChannel, // Code for a note on: 10010000 & midi channel (0-15)
          note, // MIDI Note
          100, // MIDI Velocity
        ];

        let noteOffMessage: MIDIData = [
          128 + midiChannel, // Code for a note off: 10000000 & midi channel (0-15)
          note, // MIDI Note
          0, // MIDI Velocity
        ];

        // Including rnbo.min.js (or the unminified rnbo.js) will add the RNBO object
        // to the global namespace. This includes the TimeNow constant as well as
        // the MIDIEvent constructor.
        let midiPort = 0;
        let noteDurationMs = 250;

        // When scheduling an event to occur in the future, use the current audio context time
        // multiplied by 1000 (converting seconds to milliseconds) for now.
        let noteOnEvent = new MIDIEvent(
          synth.context.currentTime * 1000,
          midiPort,
          noteOnMessage
        );
        let noteOffEvent = new MIDIEvent(
          synth.context.currentTime * 1000 + noteDurationMs,
          midiPort,
          noteOffMessage
        );

        synth.scheduleEvent(noteOnEvent);
        synth.scheduleEvent(noteOffEvent);
      });
    }
  }

  function step() {
    for (let inlet = 1; inlet < 4; inlet++) {
      const eventTrigger = new MessageEvent(TimeNow, `in${inlet}`, [
        Math.floor(Math.random() * 2)
      ]);

      drums?.scheduleEvent(eventTrigger);
    }
    const eventTrigger = new MessageEvent(TimeNow, `in0`, [
      Math.floor(Math.floor(Math.random() * 20 + 30)),
    ]);
    bass?.scheduleEvent(eventTrigger);
    createChord();
  }

  //'button_press

  function handleClick() {
    const anim = actions[names[0]];
    //@ts-ignore
    anim.reset();
    //@ts-ignore
    anim.repetitions = 1;
    anim?.setDuration(.2)
    //@ts-ignore
    anim.play();
    setIsPlaying(!isPlaying);
  }
  //console.log(position)

  return (
    <>
      <primitive object={scene} onClick={handleClick} position={position}/>
    </>
  );
}

useGLTF.preload("/assets/butttton.glb");
