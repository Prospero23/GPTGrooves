import { useState, useRef, useEffect, useCallback } from "react";

import { type SongType } from "@/library/musicData";
import noteToMidi from "@/library/noteToMidi";
import setup from "@/public/sound";
import { MIDIEvent, MessageEvent, type Device, type MIDIData } from "@rnbo/js";

const drumInlets = {
  hi_hat: 1,
  kick: 2,
  snare: 3,
};

export default function useAudioScheduler({ songs }: { songs: SongType[] }) {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentSong, setCurrentSong] = useState<number>(0);

  const bars = songs[currentSong].sections.flatMap((section) => section.bars);

  // audio devices and context
  const audioContext = useRef<AudioContext | undefined>(undefined);
  const drums = useRef<Device | undefined>(undefined);
  const drumsGain = useRef<GainNode | undefined>(undefined);
  const bass = useRef<Device | undefined>(undefined);
  const bassGain = useRef<GainNode | undefined>(undefined);
  const pad = useRef<Device | undefined>(undefined);
  const padGain = useRef<GainNode | undefined>(undefined);

  // sequence stuff
  // const startTime = useRef<number | undefined>(undefined); // start time of sequence
  const currentStep = useRef<number>(0); // what step of bar is currently being scheduled?
  const currentBar = useRef<number>(0); // current Bar
  const tempo = 140.0; // current tempo (bpm)
  const lookahead = 15.0; // how frequent to call schedule function in ms
  const scheduleAheadTime = 0.1; // how far ahead to schedule audio in sec
  const nextNoteTime = useRef<number>(0.0); // when next note is due
  const timerID = useRef<number | undefined>(undefined); // setInterval identifier

  const delay = useRef<DelayNode | undefined>(undefined);
  const reverb = useRef<ConvolverNode | undefined>(undefined);

  // const notesInQueue = []; // FOR FUTURE VISUALS (see playBUTTON link)

  // setup function. RUNS ONCE
  useEffect(() => {
    // This code runs after the component has been rendered
    async function init() {
      const result = await setup(); // TODO: CHECK THE GAIN NODE
      if (result != null) {
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

        // make delay and reverb
        delay.current = audioContext.current.createDelay();
        reverb.current = audioContext.current.createConvolver();

        // connect devices to their gain nodes
        drums.current?.node.connect(drumsGain.current);
        bass.current?.node.connect(bassGain.current);
        pad.current?.node.connect(padGain.current);
      } else {
        // Handle the undefined case, maybe log an error or throw an exception
        console.log("initializing audio failed. Reload the page.");
      }
    }
    void init();
    // Optional: Return a function to run on component unmount / before re-running the effect
    return () => {
      void audioContext.current?.close();
    };
  }, []);

  function nextNote() {
    // advance time to next 16th note //ADD BARS?
    const secondsPerBeat = 60.0 / tempo;

    nextNoteTime.current += 0.25 * secondsPerBeat;

    currentStep.current++;
    if (currentStep.current === 16) {
      // wrap 16 to 0
      currentStep.current = 0;
      currentBar.current++;
    }
  }

  const scheduleDrums = useCallback(
    (time: number) => {
      if (drums.current != null) {
        const drumData = bars[currentBar.current].drums;
        for (const drumType of Object.keys(drumData) as Array<
          keyof typeof drumInlets
        >) {
          // Only process if the drumType value is an array
          if (Array.isArray(drumData[drumType])) {
            const inlet = drumInlets[drumType];
            const drumEventTrigger = new MessageEvent(time, `in${inlet}`, [
              drumData[drumType][currentStep.current],
            ]);
            drums.current.scheduleEvent(drumEventTrigger);
          }
        }
      } else {
        console.log("DRUM ERROR");
      }
    },
    [bars],
  );

  const scheduleBass = useCallback(
    (time: number) => {
      if (bass.current != null) {
        const bassData = bars[currentBar.current].bass;
        if (Array.isArray(bassData.pattern)) {
          const bassNote = noteToMidi(bassData.pattern[currentStep.current]);

          if (!isNaN(bassNote)) {
            const bassEventTrigger = new MessageEvent(time, `in0`, [bassNote]);
            bass.current?.scheduleEvent(bassEventTrigger);
          }
        }
      }
    },
    [bars],
  );

  const schedulePad = useCallback(
    (time: number) => {
      if (pad.current != null) {
        const padInstance = pad.current;
        const padData = bars[currentBar.current].pad;
        if (Array.isArray(padData.chord_sequence)) {
          padData.chord_sequence[currentStep.current].notes.forEach((note) => {
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
            const noteOnEvent = new MIDIEvent(
              time * 1000,
              midiPort,
              noteOnMessage,
            );
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
    },
    [bars],
  );

  const scheduleEvents = useCallback(
    (time: number) => {
      // push the note on the queue, even if we're not playing.
      // notesInQueue.push( { note: beatNumber, time: time } ); ADD BACK LATER

      // logic for scheduling
      if (audioContext.current != null) {
        scheduleDrums(time);
        scheduleBass(time);
        schedulePad(time);
      } else {
        console.log("AudioContext is undefined");
      }
    },
    [scheduleBass, scheduleDrums, schedulePad],
  );

  const scheduler = useCallback(() => {
    // while there are notes that will need to play before the next interval,
    // schedule them and advance the pointer.
    if (audioContext.current != null) {
      while (
        nextNoteTime.current <
        audioContext.current.currentTime + scheduleAheadTime
      ) {
        if (currentBar.current >= bars.length) {
          // Check if we've reached the end of the song
          // stopSong(); // Call the function to stop the song
          return; // Exit the scheduler function
        }
        scheduleEvents(nextNoteTime.current); // schedule note to play
        nextNote(); // push to next 16th
      }
      timerID.current = window.setTimeout(scheduler, lookahead);
    }
  }, [bars.length, scheduleEvents]);

  // AUDIO BOOM BOOM
  useEffect(() => {
    if (audioContext.current?.state === "suspended") {
      void audioContext.current?.resume();
    }
    if (isPlaying && audioContext.current != null) {
      // start playing
      console.log("BOOM");
      currentStep.current = 0;
      currentBar.current = 0;
      nextNoteTime.current = audioContext.current.currentTime;
      scheduler(); // kick off scheduling
    } else if (!isPlaying) {
      window.clearTimeout(timerID.current);
      // console.log("this is the timer ID:", timerID.current)
    }
  }, [isPlaying, scheduler]);
  return {
    isPlaying,
    currentSong,
    setIsPlaying,
    setCurrentSong, // exposed variables and functions
  };
}

// expose: start, stop, currentSong
