import { useState, useRef, useEffect, useMemo } from "react";
import { type Device } from "@rnbo/js";

import { type SongType } from "@/library/musicData";
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
import AudioScheduler from "@/library/Scheduler";

export default function useAudioScheduler({ songs }: { songs: SongType[] }) {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentSong, setCurrentSong] = useState<number>(0);

  const bars = useMemo(() => {
    return songs[currentSong].sections.flatMap((section) => section.bars);
  }, [songs, currentSong]);

  // audio devices and context
  const audioContext = useRef<AudioContext | undefined>(undefined);
  const audioScheduling = useRef<AudioScheduler | undefined>(undefined);
  const tempo = 140;

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

      audioScheduling.current = new AudioScheduler(
        tempo,
        bars,
        audioContext.current,
        drums.current,
        bass.current,
        pad.current,
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

  // AUDIO scheduling in action
  useEffect(() => {
    // if (audioContext.current?.state === "suspended") {
    //   void audioContext.current?.resume();
    // }
    if (isPlaying && audioContext.current != null) {
      // start playing
      audioScheduling.current?.play();
      // start
    } else if (!isPlaying) {
      // stop
      audioScheduling.current?.stop();

      // console.log("this is the timer ID:", timerID.current)
    }
  }, [isPlaying]);
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