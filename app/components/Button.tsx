"use client";
import { useState, useEffect, useRef, RefCallback } from "react";
import { useAnimations, useGLTF } from "@react-three/drei";
import { Device, MIDIEvent, MIDIData, TimeNow, MessageEvent } from "@rnbo/js";
import setup from "@/public/sound";
import { Vector3 } from "three";
import { BarType } from "@/library/musicData";
import noteToMidi from "@/library/noteToMidi";

interface ButtonProps {
  position: Vector3;
  isPlaying: Boolean | undefined;
  setIsPlaying: React.Dispatch<React.SetStateAction<Boolean | undefined>>;
  //give data
  playingData: Array<BarType>;
}

//bc state stuff is being weird this is the fix
const transport = {
  position: 0, // Current step position
  interval: 100, // Interval in ms (this can be changed based on your needs)
  nextEventTime: 0,
  isPlaying: false,
  currentStep: 0,
  currentBar: 0,
};

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

  //audio stuff
  const [audioContext, setAudioContext] = useState<AudioContext | undefined>(
    undefined
  );
  //RNBO Devices
  const [drums, setDrums] = useState<Device | undefined>(undefined);
  const [bass, setBass] = useState<Device | undefined>(undefined);
  const [pad, setPad] = useState<Device | undefined>(undefined);
  //timing

  //console.log("babababbr", playingData);

  //setup function
  useEffect(() => {
    // This code runs after the component has been rendered
    async function init() {
      const result = await setup();
      if (result) {
        setAudioContext(result.context);
        setDrums(result.device);
        setBass(result.deviceBass);
        setPad(result.deviceSynth);
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

  //start the isPlaying stuff as a reaction
  useEffect(() => {
    if (audioContext) {
      transport.nextEventTime = audioContext.currentTime;
      schedule();
    }
    // Return a cleanup function
    return () => {
      if (!isPlaying && audioContext){
      transport.nextEventTime = audioContext.currentTime + 500000
      schedule();
      console.log('bang')
      }
    };
  }, [isPlaying]);

  //when button is pressed
  function handleClick() {
    const anim = actions[names[0]];
    if (anim) {
      anim.reset();
      anim.repetitions = 1;
      anim.setDuration(0.2);
      anim.play();
    }
    setIsPlaying(!isPlaying);
  }

  function schedule() {
    if (!isPlaying) return; // Exit if playback is stopped

    if (audioContext) {
      while (transport.nextEventTime < audioContext.currentTime + 0.1) {
        // Schedule the next 100ms

        //console.log(transport.currentStep);
        step(transport.currentStep, transport.currentBar);
        transport.position++;
        transport.nextEventTime += transport.interval / 1000; // convert to seconds for Web Audio API

        if (transport.currentStep < 15) {
          transport.currentStep++;
        } else {
          if (transport.currentBar < playingData.length - 1) {
            transport.currentStep = 0;
            transport.currentBar++;
          } else {
            setIsPlaying(false); // Stop the transport
          }
        }
      }

      let animationFrameId: number | null = null;

      if (isPlaying) {
        //potentially change this
        animationFrameId = requestAnimationFrame(schedule);
      } else {
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
        }
      }
    }
  }

  function step(currentStep: number, currentBar: number) {
    // Drums
    for (let drumType in playingData[currentBar].drums) {
      // Make sure we have the correct structure
      if (playingData[currentBar].drums.hasOwnProperty(drumType)) {
        let inlet = drumInlets[drumType as keyof typeof drumInlets];
        const drumEventTrigger = new MessageEvent(TimeNow, `in${inlet}`, [
          //@ts-ignore
          playingData[currentBar].drums[drumType][currentStep],
        ]);
        //console.log(drumEventTrigger)
        drums?.scheduleEvent(drumEventTrigger);
      }
    }

    // Bass
    const bassNote = noteToMidi(
      playingData[currentBar].bass.pattern[currentStep]
    );

    if (!isNaN(bassNote)) {
      const bassEventTrigger = new MessageEvent(TimeNow, `in0`, [bassNote]);
      bass?.scheduleEvent(bassEventTrigger);
    }
    if (pad) {
      playingData[currentBar].pad.chord_sequence[currentStep].notes.forEach(
        (note) => {
          let midiChannel = 0;

          let midiNote = noteToMidi(note) + 12;

          // Format a MIDI message paylaod, this constructs a MIDI on event
          let noteOnMessage: MIDIData = [
            144 + midiChannel, // Code for a note on: 10010000 & midi channel (0-15)
            midiNote, // MIDI Note
            100, // MIDI Velocity
          ];

          let noteOffMessage: MIDIData = [
            128 + midiChannel, // Code for a note off: 10000000 & midi channel (0-15)
            midiNote, // MIDI Note
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
            pad.context.currentTime * 1000,
            midiPort,
            noteOnMessage
          );
          let noteOffEvent = new MIDIEvent(
            pad.context.currentTime * 1000 + noteDurationMs,
            midiPort,
            noteOffMessage
          );

          pad.scheduleEvent(noteOnEvent);
          pad.scheduleEvent(noteOffEvent);
        }
      );
    }
  }

  return (
    <>
      <primitive object={scene} onClick={handleClick} position={position} />
    </>
  );
}

useGLTF.preload("/assets/butttton.glb");
