"use client";
import { useState, useEffect, useRef, RefCallback } from "react";
import { useAnimations, useGLTF } from "@react-three/drei";
import { Device, MIDIEvent, MIDIData, TimeNow, MessageEvent } from "@rnbo/js";
import setup from "@/public/sound";
import {Vector3} from 'three'
import {BarType} from "@/library/musicData"
import noteToMidi from "@/library/noteToMidi";

interface ButtonProps {
    position: Vector3
    isPlaying: Boolean | undefined
    setIsPlaying: React.Dispatch<React.SetStateAction<Boolean | undefined>>;
    //give data
    playingData: Array<BarType>
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

//console.log('babababbr', playingData)


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
      }, 300);

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


  console.log('current bar',currentBar)

  // Go through each bar in the array
  // for (let bar of playingData) {

    if (currentBar === playingData.length - 1 && stepCount >= 15) {
      setIsPlaying(false);
      return;
    }

    const bar = playingData[currentBar]
    console.log('step count', stepCount)

    // Drums
    // for (let drumType in bar.drums) {
    //   // Make sure we have the correct structure
    //   if (bar.drums.hasOwnProperty(drumType)) {

    //     const drumEventTrigger = new MessageEvent(TimeNow, drumType, [
    //       bar.drums[drumType][stepCount]
    //     ]);
    //     drums?.scheduleEvent(drumEventTrigger);
    //   }
    // }

    // Bass
    const bassNote = noteToMidi(bar.bass.pattern[stepCount])
    const bassEventTrigger = new MessageEvent(TimeNow, `in0`, [bassNote]);
    bass?.scheduleEvent(bassEventTrigger);

    // Synth
    const padChords = bar.pad.chord_sequence[stepCount];
    if (synth) { // Keeping the original variable 'synth' here
      padChords.notes.forEach((note) => {
        if (note !== "0") {
          const synthNote = noteToMidi(note)
          //send note to synth
        }
      });
    }
  //}
  setStepCount(prevStep => {
    if (prevStep < 15) {
      return prevStep + 1;
    } else {
      setCurrentBar(prevBar => prevBar + 1);
      return 0;
    }
  });
}

  function handleClick() {
    const anim = actions[names[0]];
    //@ts-ignore
    anim.reset();
    //@ts-ignore
    anim.repetitions = 1;
    anim?.setDuration(.2)
    //@ts-ignore
    anim.play();
    setIsPlaying(true);
  }
  //console.log(position)

  return (
    <>
      <primitive object={scene} onClick={handleClick} position={position}/>
    </>
  );
}

useGLTF.preload("/assets/butttton.glb");
