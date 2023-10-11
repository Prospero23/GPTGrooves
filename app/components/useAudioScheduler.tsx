import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { MIDIEvent, MessageEvent, type Device, type MIDIData } from "@rnbo/js";

import { type SongType } from "@/library/musicData";
import noteToMidi from "@/library/music_helpers/noteToMidi";
import setup from "@/public/sound";

const drumInlets = {
  hi_hat: 1,
  kick: 2,
  snare: 3,
};

function scaleValue(x: number, a: number, b: number, c: number, d: number) {
  return c + ((x - a) * (d - c)) / (b - a);
}

function scaleExponential(
  input: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
  exponent: number,
) {
  const normalizedValue = (input - inMin) / (inMax - inMin);
  const scaledExponentialValue = Math.pow(normalizedValue, exponent);
  return outMin + scaledExponentialValue * (outMax - outMin);
}

export default function useAudioScheduler({ songs }: { songs: SongType[] }) {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentSong, setCurrentSong] = useState<number>(0);

  const bars = useMemo(() => {
    return songs[currentSong].sections.flatMap((section) => section.bars);
  }, [songs, currentSong]);

  // audio devices and context
  const audioContext = useRef<AudioContext | undefined>(undefined);

  const drums = useRef<Device | undefined>(undefined);
  const drumsUserGain = useRef<GainNode | undefined>(undefined);
  const drumsGPTGain = useRef<GainNode | undefined>(undefined);
  const drumFilter = useRef<BiquadFilterNode | undefined>(undefined);

  const bass = useRef<Device | undefined>(undefined);
  const bassUserGain = useRef<GainNode | undefined>(undefined);
  const bassGPTGain = useRef<GainNode | undefined>(undefined);
  const bassFilter = useRef<BiquadFilterNode | undefined>(undefined);

  const pad = useRef<Device | undefined>(undefined);
  const padUserGain = useRef<GainNode | undefined>(undefined);
  const padGPTGain = useRef<GainNode | undefined>(undefined);
  const padFilter = useRef<BiquadFilterNode | undefined>(undefined);

  // sequence stuff
  // const startTime = useRef<number | undefined>(undefined); // start time of sequence
  const currentStep = useRef<number>(0); // what step of bar is currently being scheduled?
  const currentBar = useRef<number>(0); // current Bar
  const tempo = 140.0; // current tempo (bpm)

  const lookahead = 25.0; // how frequent to call schedule function in ms
  const scheduleAheadTime = 2.0; // how far ahead to schedule audio in sec
  const timerID = useRef<number | undefined>(undefined); // setInterval identifier

  const nextNoteTime = useRef<number>(0.0); // when next note is due

  const delay = useRef<DelayNode | undefined>(undefined);
  const delayGain = useRef<GainNode | undefined>(undefined);
  const delayFeedback = useRef<GainNode | undefined>(undefined);
  const delayFilter = useRef<BiquadFilterNode | undefined>(undefined);

  const reverb = useRef<ConvolverNode | undefined>(undefined);
  const reverbGain = useRef<GainNode | undefined>(undefined);
  const dryGain = useRef<GainNode | undefined>(undefined);

  const userFilter = useRef<BiquadFilterNode | undefined>(undefined);

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

        // make the three user gains
        drumsUserGain.current = audioContext.current.createGain();
        bassUserGain.current = audioContext.current.createGain();
        padUserGain.current = audioContext.current.createGain();

        // make the three gpt gains
        drumsGPTGain.current = audioContext.current.createGain();
        bassGPTGain.current = audioContext.current.createGain();
        padGPTGain.current = audioContext.current.createGain();

        // make delay w feedback
        delayGain.current = audioContext.current.createGain();
        delayGain.current.gain.value = 0.2;
        delay.current = audioContext.current.createDelay(4);
        delay.current.delayTime.value = 0; // beats per second / number per sec
        delayFeedback.current = audioContext.current.createGain();
        delayFeedback.current.gain.value = 0.5;
        delayFilter.current = audioContext.current.createBiquadFilter();
        delayFilter.current.type = "lowpass";
        delayFilter.current.frequency.value = 8000; // TODO: improve this value
        delayGain.current.connect(delay.current);
        delay.current.connect(delayFeedback.current);
        delayFeedback.current.connect(delay.current); // create feedback for delay
        delay.current.connect(delayFilter.current);
        delayFilter.current.connect(audioContext.current.destination);

        // reverb
        reverb.current = audioContext.current.createConvolver();
        reverb.current.buffer = result.impulseResponse;
        reverbGain.current = audioContext.current.createGain();
        dryGain.current = audioContext.current.createGain();
        reverbGain.current.gain.value = 0;
        dryGain.current.gain.value = 1;
        reverbGain.current.connect(reverb.current);
        dryGain.current.connect(audioContext.current.destination);
        reverb.current.connect(audioContext.current.destination);

        // user filter
        userFilter.current = audioContext.current.createBiquadFilter();
        userFilter.current.type = "lowpass";
        userFilter.current.frequency.value = 22050; // set to not be able to hear

        // gpt filters
        drumFilter.current = audioContext.current.createBiquadFilter();
        drumFilter.current.type = "lowpass";
        drumFilter.current.frequency.value = 22050; // set to not be able to hear
        bassFilter.current = audioContext.current.createBiquadFilter();
        bassFilter.current.type = "lowpass";
        bassFilter.current.frequency.value = 22050; // set to not be able to hear
        padFilter.current = audioContext.current.createBiquadFilter();
        padFilter.current.type = "lowpass";
        padFilter.current.frequency.value = 22050; // set to not be able to hear

        // connection hub
        userFilter.current.connect(delayGain.current);
        userFilter.current.connect(dryGain.current);
        userFilter.current.connect(reverbGain.current);

        drumFilter.current.connect(audioContext.current.destination);
        bassFilter.current.connect(audioContext.current.destination);
        padFilter.current.connect(audioContext.current.destination);

        drumsUserGain.current.connect(userFilter.current);
        drumsGPTGain.current.connect(drumFilter.current);
        drums.current?.node.connect(drumsUserGain.current);
        drums.current?.node.connect(drumsGPTGain.current);

        bassUserGain.current.connect(userFilter.current);
        bassGPTGain.current.connect(bassFilter.current);
        bass.current?.node.connect(bassUserGain.current);
        bass.current?.node.connect(bassGPTGain.current);

        padUserGain.current.connect(userFilter.current);
        padGPTGain.current.connect(padFilter.current);
        pad.current?.node.connect(padUserGain.current);
        pad.current?.node.connect(padGPTGain.current);
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

  // advance to the next note in the sequence
  function nextNote() {
    // advance time to next 16th note //ADD BARS?
    const secondsPerBeat = 60.0 / tempo;

    nextNoteTime.current += 0.25 * secondsPerBeat; // progress current time by a 16th note

    currentStep.current++;
    if (currentStep.current === 16) {
      // wrap 16 to 0 and progresses to next bar
      currentStep.current = 0;
      currentBar.current++;
    }
  }

  const scheduleDrums = useCallback(
    (time: number, bar: number, step: number) => {
      if (drums.current != null) {
        const drumData = bars[bar].drums;
        for (const drumType of Object.keys(drumData) as Array<
          keyof typeof drumInlets
        >) {
          // Only process if the drumType value is an array
          if (Array.isArray(drumData[drumType])) {
            const inlet = drumInlets[drumType];
            const drumEventTrigger = new MessageEvent(time, `in${inlet}`, [
              drumData[drumType][step],
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
    (time: number, bar: number, step: number) => {
      if (bass.current != null) {
        const bassData = bars[bar].bass;
        if (Array.isArray(bassData.pattern)) {
          const bassNote = noteToMidi(bassData.pattern[step]);

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
    (time: number, bar: number, step: number) => {
      if (pad.current != null) {
        const padInstance = pad.current;
        const padData = bars[bar].pad;
        if (Array.isArray(padData.chord_sequence)) {
          padData.chord_sequence[step].notes.forEach((note) => {
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
            const noteDurationMs = 200; // TODO: BETTER

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
        console.log("time: ", time);
        scheduleDrums(time, currentBar.current, currentStep.current);
        scheduleBass(time, currentBar.current, currentStep.current);
        schedulePad(time, currentBar.current, currentStep.current);
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
          return;
        }
        scheduleEvents(nextNoteTime.current); // schedule note to play
        nextNote(); // push to next 16th
      }
      timerID.current = window.setTimeout(scheduler, lookahead);
    }
  }, [bars.length, scheduleEvents]);

  // AUDIO scheduling in action
  useEffect(() => {
    if (audioContext.current?.state === "suspended") {
      void audioContext.current?.resume();
    }
    if (isPlaying && audioContext.current != null) {
      // start playing
      currentStep.current = 0;
      currentBar.current = 0;
      nextNoteTime.current = audioContext.current.currentTime;
      scheduler(); // kick off scheduling
    } else if (!isPlaying) {
      window.clearTimeout(timerID.current);
      // console.log("this is the timer ID:", timerID.current)
    }
  }, [isPlaying, scheduler]);
  // update filter freq
  function setFilterFrequency(value: number) {
    const scaledValue = scaleExponential(value, 0, 100, 60, 22050, 4);
    if (userFilter.current != null) {
      userFilter.current.frequency.value = scaledValue;
    }
  }
  function setDelayFeedback(value: number) {
    const scaledValue = scaleValue(value, 0, 100, 0.1, 0.99);
    if (delayFeedback.current != null) {
      delayFeedback.current.gain.value = scaledValue;
    }
  }
  function setDelayTime(value: number) {
    // zero, 16th, 8th, quarter
    const scaledValue = Math.floor(scaleValue(value, 0, 100, 0, 3));
    const divisions = [0, 1, 2, 4];
    if (delay.current != null && delayGain.current != null) {
      if (scaledValue !== 0) {
        const delayTime = tempo / 60 / divisions[scaledValue]; // NOTES PER SEC / # DIVISIONS
        delay.current.delayTime.value = delayTime;
      } else {
        delay.current.delayTime.value = 0;
      }
    }
  }
  function setReverbLevel(value: number) {
    const scaledValue = value / 100;
    if (reverbGain.current != null && dryGain.current != null) {
      reverbGain.current.gain.value = scaledValue;
      dryGain.current.gain.value = 1 - scaledValue;
    }
  }
  function switchEffectsGen(isUserEffects: boolean) {
    if (
      bassGPTGain.current !== undefined &&
      padGPTGain.current !== undefined &&
      drumsGPTGain.current !== undefined &&
      bassUserGain.current !== undefined &&
      padUserGain.current !== undefined &&
      drumsUserGain.current !== undefined
    ) {
      if (isUserEffects) {
        bassGPTGain.current.gain.value = 0;
        drumsGPTGain.current.gain.value = 0;
        bassGPTGain.current.gain.value = 0;
        bassUserGain.current.gain.value = 0.8;
        drumsUserGain.current.gain.value = 1;
        padUserGain.current.gain.value = 1;
      } else {
        drumsGPTGain.current.gain.value = 1;
        bassGPTGain.current.gain.value = 0.8;
        padGPTGain.current.gain.value = 1;
        bassUserGain.current.gain.value = 0;
        drumsUserGain.current.gain.value = 0;
        padUserGain.current.gain.value = 0;
      }
    }
  }
  return {
    isPlaying,
    currentSong,
    setFilterFrequency,
    setDelayFeedback,
    setReverbLevel,
    setDelayTime,
    setIsPlaying,
    setCurrentSong, // exposed variables and functions
    switchEffectsGen,
  };
}

// effects: reverb, delay, compression (sidechain?), whatever else
// probably want to improve the instrument sound at some point as well
// use setvalue at time to initialize effects with gpt stuff
// delay: use RNBO bs
// for user: filterFreq, delay time + feedback, reverb: time + wet/dry
