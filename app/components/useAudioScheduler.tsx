import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { MIDIEvent, MessageEvent, type Device, type MIDIData } from "@rnbo/js";

import { type SongType } from "@/library/musicData";
import noteToMidi from "@/library/music_helpers/noteToMidi";
import {
  setupDevice,
  setupDrum,
  setupGain,
  setupDelay,
  setupReverb,
  setupFilter,
  safelyConnect,
  scaleValue,
  scaleExponential,
} from "@/library/music_helpers/helpers";

const drumInlets = {
  hi_hat: 1,
  kick: 2,
  snare: 3,
};

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

  const lookahead = 14.0; // how frequent to call schedule function in ms
  const scheduleAheadTime = 0.08; // how far ahead to schedule audio in sec
  const timerID = useRef<number | undefined>(undefined); // setInterval identifier
  const timerWorker = useRef<Worker | undefined>(undefined);

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

  async function init() {
    // @ts-expect-error this is for compat
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    const WAContext = window.AudioContext || window.webkitAudioContext;

    // set audio context
    audioContext.current = new WAContext();
    await audioContext.current.resume();
    timerWorker.current = new Worker("/audioWorker.js");

    if (audioContext.current != null) {
      drums.current = await setupDrum(audioContext.current);
      bass.current = await setupDevice(
        audioContext.current,
        "/export/bass/bass.export.json",
      );
      pad.current = await setupDevice(
        audioContext.current,
        "/export/pad/pad.export.json",
      );

      drumsUserGain.current = setupGain(audioContext.current, 0);
      bassUserGain.current = setupGain(audioContext.current, 0);
      padUserGain.current = setupGain(audioContext.current, 0);

      drumsGPTGain.current = setupGain(audioContext.current, 0);
      bassGPTGain.current = setupGain(audioContext.current, 0);
      padGPTGain.current = setupGain(audioContext.current, 0);

      // make delay w feedback
      const delaySetup = setupDelay(audioContext.current, 0.2, 0.5, 8000);
      delayGain.current = delaySetup.delayGain;
      delay.current = delaySetup.delay;
      delayFeedback.current = delaySetup.delayFeedback;
      delayFilter.current = delaySetup.delayFilter;

      // reverb
      const reverbSetup = await setupReverb(
        audioContext.current,
        "export/reverb/convolution.wav",
      );
      reverb.current = reverbSetup.reverb;
      reverbGain.current = reverbSetup.reverbGain;
      dryGain.current = setupGain(audioContext.current, 1);

      reverbGain.current.gain.value = 0;
      dryGain.current.connect(audioContext.current.destination);

      // user filter
      userFilter.current = setupFilter(audioContext.current);

      // gpt filters
      drumFilter.current = setupFilter(audioContext.current);
      bassFilter.current = setupFilter(audioContext.current);
      padFilter.current = setupFilter(audioContext.current);

      connectAudioNodes();
    }
  }

  function connectAudioNodes() {
    // connection hub
    if (audioContext.current != null) {
      safelyConnect(userFilter.current, delayGain.current);
      safelyConnect(userFilter.current, dryGain.current);
      safelyConnect(userFilter.current, reverbGain.current);

      safelyConnect(drumFilter.current, audioContext.current.destination);
      safelyConnect(bassFilter.current, audioContext.current.destination);
      safelyConnect(padFilter.current, audioContext.current.destination);

      safelyConnect(drumsUserGain.current, userFilter.current);
      safelyConnect(drumsGPTGain.current, drumFilter.current);
      safelyConnect(drums.current?.node, drumsUserGain.current);
      safelyConnect(drums.current?.node, drumsGPTGain.current);

      safelyConnect(bassUserGain.current, userFilter.current);
      safelyConnect(bassGPTGain.current, bassFilter.current);
      safelyConnect(bass.current?.node, bassUserGain.current);
      safelyConnect(bass.current?.node, bassGPTGain.current);

      safelyConnect(padUserGain.current, userFilter.current);
      safelyConnect(padGPTGain.current, padFilter.current);
      safelyConnect(pad.current?.node, padUserGain.current);
      safelyConnect(pad.current?.node, padGPTGain.current);
    } else {
      console.error("error in connections");
    }
  }

  // advance to the next note in the sequence
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
        // Retrieve the drum data for the current bar and step
        const drumData = bars[currentBar.current].drums;

        // Create an array to hold the current values for all drum types
        const drumValuesForCurrentStep = [];

        // Iterate over each drum type and collect the current step value
        for (const drumType of Object.keys(drumData) as Array<
          keyof typeof drumInlets
        >) {
          // Assuming each drumData[drumType] is an array of steps
          if (Array.isArray(drumData[drumType])) {
            drumValuesForCurrentStep.push(
              drumData[drumType][currentStep.current],
            );
          }
        }

        // Check if there are any drum values to process
        if (drumValuesForCurrentStep.length > 0) {
          // Create a single event with all drum values for the current step
          const drumEventTrigger = new MessageEvent(
            time,
            `in1`,
            drumValuesForCurrentStep,
          );
          drums.current.scheduleEvent(drumEventTrigger);
          console.log(drumEventTrigger);
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
      console.log("RUNNING, ", isUserEffects);
      if (isUserEffects) {
        bassGPTGain.current.gain.value = 0;
        drumsGPTGain.current.gain.value = 0;
        padGPTGain.current.gain.value = 0;
        bassUserGain.current.gain.value = 1;
        drumsUserGain.current.gain.value = 1;
        padUserGain.current.gain.value = 1;
      } else {
        drumsGPTGain.current.gain.value = 1;
        bassGPTGain.current.gain.value = 1;
        padGPTGain.current.gain.value = 1;
        bassUserGain.current.gain.value = 0;
        drumsUserGain.current.gain.value = 0;
        padUserGain.current.gain.value = 0;
      }
      console.log(drumsGPTGain.current.gain.value);
      console.log(drumsUserGain.current.gain.value);
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
    init,
  };
}

// effects: reverb, delay, compression (sidechain?), whatever else
// probably want to improve the instrument sound at some point as well
// use setvalue at time to initialize effects with gpt stuff
// delay: use RNBO bs
// for user: filterFreq, delay time + feedback, reverb: time + wet/dry
// refactor this soon into helper functions
