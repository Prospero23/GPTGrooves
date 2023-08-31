"use client";
import { useState, useEffect, useRef, RefCallback } from "react";
import { useAnimations, useGLTF } from "@react-three/drei";
import { Device, MIDIEvent, MIDIData, TimeNow, MessageEvent } from "@rnbo/js";
import setup from "@/public/sound";
import {Vector3} from 'three'
import {Song, Bar} from '@/library/musicData'

interface ButtonProps {
    position: Vector3
    isPlaying: Boolean | undefined
    setIsPlaying: React.Dispatch<React.SetStateAction<Boolean | undefined>>;
    //give data
    playingData: Song
}

export default function Button({position, isPlaying, setIsPlaying, playingData}: ButtonProps) {
  const { scene, animations } = useGLTF("/assets/butttton.glb");
  const { actions, names } = useAnimations(animations, scene);

  //audio stuff
  const [drums, setDrums] = useState<Device | undefined>(undefined);
  const [bass, setBass] = useState<Device | undefined>(undefined);
  const [synth, setSynth] = useState<Device | undefined>(undefined);
//   const [isPlaying, setIsPlaying] = useState<Boolean | undefined>(false);
  const [intervalID, setIntervalID] = useState<NodeJS.Timeout | null>(null);
  const [currentBar, setCurrentBar] = useState(0);
const [stepCount, setStepCount] = useState(0);


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


  function step() {
  //   // Reset step counter if it reaches 16
  //   if (stepCount >= 16) {
  //     setStepCount(0);
  //   }

  //   // Drums
  //   for (let i = 0; i < playingData.bars.length; i++){
  //   for (let drumType in playingData.bars[i].drums:DrumPattern) {
  //     const eventTrigger = new MessageEvent(TimeNow, drumType, [
  //       playingData.drums[drumType][stepCount]
  //     ]);
  //     drums?.scheduleEvent(eventTrigger);
  //   }

  //   // Bass
  //   const bassEventTrigger = new MessageEvent(TimeNow, `in0`, [
  //     playingData.bass.pattern[stepCount]
  //   ]);
  //   bass?.scheduleEvent(bassEventTrigger);

  //   // Synth
  //   const synthChords = playingData.synth.chords[stepCount];
  //   if (synth) {
  //     synthChords.forEach((note) => {
  //       if (note !== "0") {
  //         // Handle sending MIDI event to synth
  //       }
  //     });
  //   }

  //   // Increment step counter
  //   setStepCount(stepCount + 1);
  // }
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
