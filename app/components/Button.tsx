"use client";
import { useState, useEffect, useRef } from "react";
import { useAnimations, useGLTF } from "@react-three/drei";
import {
  type Device,
  MIDIEvent,
  type MIDIData,
  TimeNow,
  MessageEvent,
} from "@rnbo/js";
import setup from "@/public/sound";
import { type Vector3 } from "three";
import { type BarType } from "@/library/musicData";
import noteToMidi from "@/library/noteToMidi";

interface ButtonProps {
  position: Vector3;
  isPlaying: boolean | undefined;
  setIsPlaying: React.Dispatch<React.SetStateAction<boolean | undefined>>;
  // give data
  playingData: BarType[];
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

  // audio devices and context
  const audioContext = useRef<AudioContext | undefined>(undefined);
  const drums = useRef<Device | undefined>(undefined);
  const drumsGain = useRef<GainNode | undefined>(undefined);
  const bass = useRef<Device | undefined>(undefined);
  const bassGain = useRef<GainNode | undefined>(undefined);
  const pad = useRef<Device | undefined>(undefined);
  const padGain = useRef<GainNode | undefined>(undefined);

  // sequence stuff
  const startTime = useRef<number | undefined>(undefined); // start time of sequence
  const currentStep = useRef<number>(0); // what step of bar is currently being scheduled?
  const currentBar = useRef<number>(0); // current Bar
  const tempo = 140.0; // current tempo (bpm)
  const lookahead = 25.0; // how frequent to call schedule function in ms
  const scheduleAheadTime = 0.1; // how far ahead to schedule audio in sec
  const nextNoteTime = useRef<number>(0.0); // when next note is due
  const noteResolution = 0; // 0 is 16th, 1 - 8th, 2 - quarter
  const timerID = useRef<number | undefined>(undefined); // setInterval identifier

  const notesInQueue = []; // FOR FUTURE VISUALS (see playBUTTON link)

  // setup function. RUNS ONCE
  useEffect(() => {
    // This code runs after the component has been rendered
    async function init() {
      const result = await setup(); // TODO: CHECK THE GAIN NODE
      if (result) {
        // get the initialized devices
        drums.current = result.device;
        bass.current = result.deviceBass;
        pad.current = result.deviceSynth;
        audioContext.current = result.context;

        // make the three gains
        drumsGain.current = audioContext.current.createGain();
        drumsGain.current.connect(audioContext.current.destination);
        bassGain.current = audioContext.current.createGain();
        bassGain.current.connect(audioContext.current.destination);
        padGain.current = audioContext.current.createGain();
        padGain.current.connect(audioContext.current.destination);

        // connect devices to their gain nodes
        drums.current?.node.connect(drumsGain.current);
        bass.current?.node.connect(bassGain.current);
        pad.current?.node.connect(padGain.current);
      } else {
        // Handle the undefined case, maybe log an error or throw an exception
        console.log("initializing audio failed. Reload the page.");
      }
    }
    init();
    // Optional: Return a function to run on component unmount / before re-running the effect
    return () => {
      audioContext.current?.close();
    };
  }, []);

  function nextNote() {
    // advance time to next 16th note //ADD BARS?
    const secondsPerBeat = 60.0 / tempo;

    nextNoteTime.current += 0.25 * secondsPerBeat;

    currentStep.current++;
    if (currentStep.current == 16) {
      // wrap 16 to 0
      currentStep.current = 0;
      currentBar.current++;
    }
  }

  function scheduleDrums(time: number) {
    if (drums.current) {
      for (const drumType in playingData[currentBar.current].drums) {
        // check for correct structure
        if (playingData[currentBar.current].drums.hasOwnProperty(drumType)) {
          const inlet = drumInlets[drumType as keyof typeof drumInlets];
          console.log(playingData[currentBar.current]);
          const drumEventTrigger = new MessageEvent(time, `in${inlet}`, [
            // @ts-expect-error
            playingData[currentBar.current].drums[drumType][
              currentStep.current
            ],
          ]);
          drums.current.scheduleEvent(drumEventTrigger);
        }
      }
    } else {
    }
  }

  function scheduleBass(time: number) {
    if (bass.current) {
      const bassNote = noteToMidi(
        playingData[currentBar.current].bass.pattern[currentStep.current],
      );

      if (!isNaN(bassNote)) {
        const bassEventTrigger = new MessageEvent(TimeNow, `in0`, [bassNote]);
        bass.current?.scheduleEvent(bassEventTrigger);
      }
    }
  }

  function schedulePad(time: number) {
    if (pad.current) {
      const padInstance = pad.current;
      playingData[currentBar.current].pad.chord_sequence[
        currentStep.current
      ].notes.forEach((note) => {
        const midiChannel = 0;

        const midiNote = noteToMidi(note) + 12;

        // Format a MIDI message paylaod, this constructs a MIDI on event
        const noteOnMessage: MIDIData = [
          144 + midiChannel, // Code for a note on: 10010000 & midi channel (0-15)
          midiNote, // MIDI Note
          100, // MIDI Velocity
        ];

        const noteOffMessage: MIDIData = [
          128 + midiChannel, // Code for a note off: 10000000 & midi channel (0-15)
          midiNote, // MIDI Note
          0, // MIDI Velocity
        ];

        const midiPort = 0;
        const noteDurationMs = 250; // TODO: BETTER

        // When scheduling an event to occur in the future, use the current audio context time
        // multiplied by 1000 (converting seconds to milliseconds) for now.
        const noteOnEvent = new MIDIEvent(time * 1000, midiPort, noteOnMessage);
        const noteOffEvent = new MIDIEvent(
          time * 1000 + noteDurationMs,
          midiPort,
          noteOffMessage,
        );
        padInstance.scheduleEvent(noteOnEvent);
        padInstance.scheduleEvent(noteOffEvent);
      });
    }
  }

  function scheduleEvents(time: number) {
    // push the note on the queue, even if we're not playing.
    // notesInQueue.push( { note: beatNumber, time: time } ); ADD BACK LATER

    if (noteResolution == 1 && currentStep.current % 2)
      // only runs when res is set to 1
      return; // we're not playing non-8th 16th notes
    if (noteResolution == 2 && currentStep.current % 4)
      // only runs when res is set to 2
      return; // we're not playing non-quarter 8th notes

    // logic for scheduling
    if (audioContext.current) {
      scheduleDrums(time);
      scheduleBass(time);
      schedulePad(time);
    } else {
      console.log("AudioContext is undefined");
    }
  }

  function scheduler() {
    // while there are notes that will need to play before the next interval,
    // schedule them and advance the pointer.
    if (audioContext.current) {
      while (
        nextNoteTime.current <
        audioContext.current.currentTime + scheduleAheadTime
      ) {
        scheduleEvents(nextNoteTime.current); // schedule note to play
        nextNote(); // push to next 16th
      }
      timerID.current = window.setTimeout(scheduler, lookahead);
    }
  }

  function handleClick(event: React.MouseEvent<HTMLButtonElement>) {
    event.stopPropagation(); // stop event from firing twice
    // animation
    const anim = actions[names[0]];
    if (anim) {
      anim.reset();
      anim.repetitions = 1;
      anim.setDuration(0.2);
      anim.play();
    }
    // logic
    setIsPlaying(!isPlaying);
    if (audioContext.current?.state == "suspended") {
      audioContext.current?.resume();
    }
    if (!isPlaying && audioContext.current) {
      // start playing
      currentStep.current = 0;
      currentBar.current = 0;
      nextNoteTime.current = audioContext.current.currentTime;
      scheduler(); // kick off scheduling
    } else if (isPlaying) {
      window.clearTimeout(timerID.current);
      // console.log("this is the timer ID:", timerID.current)
    }
  }

  return (
    <>
      <primitive object={scene} onClick={handleClick} position={position} />
    </>
  );
}

// randomly set button color for each day?

// better trash disposal needed
// BETTER ERROR HANDLING
// maybe better scoping of variables?

// <primitive object={scene} onClick={handleClick} position={position} /> change this to new button?
