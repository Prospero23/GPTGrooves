import { type Device, type MIDIData, MIDIEvent } from "@rnbo/js";
import { type FilterInformationType, type BarType } from "./musicData";
import noteToMidi from "./music_helpers/noteToMidi";
import type Drums from "./Drums";
import type Bass from "./Bass";
import type VariableFilter from "./VariableFilter";

type InstrumentType = "bass" | "pad" | "drums";
function isBiquadFilterType(type: any): type is BiquadFilterType {
  return [
    "lowpass",
    "highpass",
    "bandpass",
    "notch",
    "allpass",
    "peaking",
  ].includes(type);
}

/**
 * A class that handles all of the audio scheduling. Based off the scheduler in the article "A Tale of Two Clocks" (https://web.dev/articles/audio-scheduling)
 * It uses a web worker in order to make Timeout calls off of the main thread that schedule events in the future based off some fixed interval.
 */

export default class AudioScheduler {
  // Declare the properties of the class
  private readonly audioContext: AudioContext;
  private bars: BarType[]; // TODO: fix
  private readonly drums: Drums;
  private readonly drumFilter: VariableFilter;
  private readonly bass: Bass;
  private readonly bassFilter: VariableFilter;
  private readonly pad: Device;
  private readonly padFilter: VariableFilter;
  private readonly currentFilters: Record<InstrumentType, string> = {
    bass: "lowpass",
    pad: "lowpass",
    drums: "lowpass",
  };

  private readonly changeFrequency: number;

  private readonly tempo: number;
  private currentStep: number;
  private currentBar: number;
  private nextNoteTime: number;
  private isPlaying: boolean;
  private readonly lookahead: number;
  private scheduleAheadTime: number;
  private readonly timerID: number | null = null;
  private readonly timerWorker: Worker | null = null;

  constructor(
    tempo: number,
    bars: BarType[],
    audioContext: AudioContext,
    drums: Drums,
    bass: Bass,
    pad: Device,
    drumFilter: VariableFilter,
    bassFilter: VariableFilter,
    padFilter: VariableFilter,
  ) {
    this.audioContext = audioContext;
    this.bars = bars; // input song we are using

    this.drums = drums;
    this.drumFilter = drumFilter;
    this.bass = bass;
    this.bassFilter = bassFilter;
    this.pad = pad;
    this.padFilter = padFilter;

    this.tempo = tempo; // Now we're correctly initializing the tempo property
    this.currentStep = 0;
    this.currentBar = 0;
    this.nextNoteTime = 0;
    this.changeFrequency = 16;

    this.isPlaying = false;
    this.lookahead = 20.0; // how frequent to call schedule function in ms
    this.scheduleAheadTime = 0.2; // how far ahead to schedule audio in sec

    this.timerWorker = new Worker("/audioSchedulerWorker.js");
    this.timerWorker.onmessage = this.handleWorkerMessage;
    this.timerWorker.onerror = this.handleWorkerError;

    // Set the initial interval for the worker
    this.timerWorker.postMessage({ interval: this.lookahead });
  }

  /**
   * Function that advances the nextNoteTime of the scheduler by one step (16th note) and also increments currentStep and currentBar.
   */
  private nextNote() {
    const secondsPerBeat = 60.0 / this.tempo;

    this.nextNoteTime += 0.25 * secondsPerBeat; // adds the time (seconds) of one step to give the new audioContext time.

    this.currentStep++;

    if (this.currentStep === 16) {
      // wrap end of bar to next bar
      this.currentStep = 0;
      this.currentBar++;
      console.log(this.bars[this.currentBar]);
    }
  }

  /**
   * Simple: Handles drum scheduling. Checks to make sure that each instrument in drums (kick, snare, and hi-hat) have arrays before accessing them
   * to play if the current step contains a 1 for that instrument.
   * @param scheduleTime - AudioContext time that the play event should be scheduled at.
   */
  private scheduleDrums(scheduleTime: number) {
    const drums = this.bars[this.currentBar].drums;

    // Check if 'hi_hat' is an array and if the current step is a trigger for playing the sound
    if (Array.isArray(drums.hi_hat) && drums.hi_hat[this.currentStep] === 1) {
      this.drums.playHat(scheduleTime);
    }

    if (Array.isArray(drums.kick) && drums.kick[this.currentStep] === 1) {
      this.drums.playKick(scheduleTime);
    }

    if (Array.isArray(drums.snare) && drums.snare[this.currentStep] === 1) {
      this.drums.playSnare(scheduleTime);
    }
  }

  /**
   * schedule dat bass. Makes sure that the pattern is an array and that the generated value is VALID.
   * @param scheduleTime - AudioContext time that the play event should be scheduled at.
   */
  private scheduleBass(scheduleTime: number) {
    const bassData = this.bars[this.currentBar].bass;
    if (Array.isArray(bassData.pattern)) {
      const bassNote = noteToMidi(bassData.pattern[this.currentStep]);
      if (!isNaN(bassNote)) {
        this.bass.playNote(bassNote, scheduleTime);
        this.bass.noteOff(bassNote, scheduleTime + 0.1); // FIX NOTE OFF
      }
    }
  }
  /**
   * schedule thePAD. Makes RNBO Midi messages for note on and off scheduling. Makes sure that the chords are an array before playing.
   * @param scheduleTime - AudioContext time that the play event should be scheduled at.
   */

  private schedulePad(audioContextTime: number) {
    const padInstance = this.pad;
    const padData = this.bars[this.currentBar].pad;
    if (Array.isArray(padData.chord_sequence)) {
      padData.chord_sequence[this.currentStep].notes.forEach((note) => {
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
          audioContextTime * 1000,
          midiPort,
          noteOnMessage,
        );
        const noteOffEvent = new MIDIEvent(
          audioContextTime * 1000 + noteDurationMs,
          midiPort,
          noteOffMessage,
        );
        padInstance.scheduleEvent(noteOnEvent);
        padInstance.scheduleEvent(noteOffEvent);
      });
    }
  }
  /**
   * Schedules a filter change. Does nothing if filter type is an empty string and only changes the type of filter if the current and new filter are different
   * @param scheduleTime - time at which to schedule the filter changes
   * @param filter - which instrument filter you are scheduling
   * @param instrument - which instrument it is for
   */

  private scheduleFilter(
    scheduleTime: number,
    filter: VariableFilter,
    instrument: InstrumentType,
  ) {
    // only schedule filter at specified resolution (default is 1)
    if (this.currentStep % this.changeFrequency === 0) {
      const bar = this.bars[this.currentBar];

      // hotfix for data being structured the wrong way (sometimes no filter:{filter_type ...} just {filter_type ...})
      const restructuredData: FilterInformationType = {
        filter_type: "",
        filter_value: [],
      };

      const effectInfo = bar?.[instrument]?.effects;

      // check if filter does not exist
      if (effectInfo.filter === undefined) {
        // if effects exist, populate what is in effects into filter (better patch to datatype can be made)
        if (effectInfo !== undefined) {
          const unknownEffectType = effectInfo as unknown;
          const EffectHotfix = unknownEffectType as FilterInformationType;
          restructuredData.filter_type = EffectHotfix.filter_type;
          restructuredData.filter_value = EffectHotfix.filter_value;
        } else {
          return; // Exit if the required properties are not present
        }
      } else {
        // runs if the data is in the proper format
        restructuredData.filter_type = effectInfo.filter.filter_type;
        restructuredData.filter_value = effectInfo.filter.filter_value;
      }
      console.log(instrument, restructuredData);
      // have the fixed structure be used as the info
      const instrumentInfo = restructuredData;
      const filterValue = instrumentInfo.filter_value;
      const filterType = instrumentInfo.filter_type;

      // sometimes the python outputs "hipass" instead of "highpass"
      let checkedFilterType: string = "hipass";
      // change hipass to highpass
      if (filterType === "hipass") {
        checkedFilterType = "highpass";
      } else {
        checkedFilterType = filterType;
      }
      // makes sure that nothing will blow up. Skips when GPT sucks at following instructions
      if (!isBiquadFilterType(checkedFilterType)) {
        filter.switchFilter("lowpass", scheduleTime);
        filter.changeFrequency(0, "lowpass", scheduleTime);
        return;
      }
      const secondsPerBeat = 60 / this.tempo;
      const timeTillNextBar =
        (secondsPerBeat * 4) / (16 / this.changeFrequency); // get a full bar
      // const timeBetweenFilterChanges = secondsPerBeat

      // Change frequency
      filter.changeFrequency(
        filterValue[0],
        checkedFilterType,
        scheduleTime + timeTillNextBar,
      );
      console.log(checkedFilterType, filterValue);

      // Only change filter if not the same as the current
      if (this.currentFilters[instrument] !== checkedFilterType) {
        this.currentFilters[instrument] = checkedFilterType; // Update the current filter type
        filter.switchFilter(checkedFilterType, scheduleTime);
      }
    }
  }

  /**
   * Small method to schedule the filters for the three instruments
   */
  private scheduleFilters(scheduleTime: number) {
    this.scheduleFilter(scheduleTime, this.drumFilter, "drums");
    this.scheduleFilter(scheduleTime, this.bassFilter, "bass");
    this.scheduleFilter(scheduleTime, this.padFilter, "pad");
  }

  /**
   * method that calls all of the schedule methods. Only calls filter scheduling if filters exist on the bars
   * @param audioContextTime - the time at which to schedule all the events
   */
  private scheduleEvents(audioContextTime: number) {
    this.scheduleDrums(audioContextTime);
    this.scheduleBass(audioContextTime);
    this.schedulePad(audioContextTime);
    if (this.bars[this.currentBar].drums.effects != null) {
      this.scheduleFilters(audioContextTime); // only do if this is defined
    }
  }

  private scheduler() {
    // while there are notes that will need to play before the next interval,
    // schedule them and advance the pointer.
    while (
      this.nextNoteTime <
      this.audioContext.currentTime + this.scheduleAheadTime
    ) {
      if (this.currentBar >= this.bars.length) {
        // this.stop(); // Assume you have a method to stop the song or handle it accordingly
        return; // Exit the scheduler function
      }
      this.scheduleEvents(this.nextNoteTime); // schedule note to play
      this.nextNote(); // push to next 16th
    }
  }

  private readonly handleWorkerMessage = (e: MessageEvent) => {
    if (e.data === "tick") {
      this.scheduler(); // Call your existing scheduler method
    } else if (e.data === "ready") {
      console.log("Worker is ready");
    }
  };

  private readonly handleWorkerError = (e: ErrorEvent) => {
    console.error(`Worker error: ${e.message}`);
  };

  /**
   * start scheduling
   */
  play() {
    if (!this.isPlaying) {
      this.isPlaying = true;
      this.currentStep = 0;
      this.currentBar = 0;
      this.nextNoteTime = this.audioContext.currentTime;
      this.timerWorker?.postMessage("start"); // Start the worker
    } else {
      console.log("Already playing");
    }
  }

  /**
   * stop scheduling
   */
  stop() {
    if (this.isPlaying) {
      this.isPlaying = false;
      this.timerWorker?.postMessage("stop"); // Stop the worker
      this.bassFilter.reset(this.audioContext.currentTime); // reset all the filters
      this.drumFilter.reset(this.audioContext.currentTime);
      this.padFilter.reset(this.audioContext.currentTime);
      // ... [rest of stopping logic]
    } else {
      console.log("Already stopped");
    }
  }

  /**
   * Set the current song that is being played
   * @param bars the new song to use.
   */
  setBars(bars: BarType[]) {
    // if (
    //   !Array.isArray(bars) ||
    //   bars.some((bar) => this.isValidBar(bar) === false)
    // ) {
    //   console.error("Invalid bars data:", bars);
    //   return;
    // }

    if (this.isPlaying) {
      this.stop(); // stop the scheduler if it's running
    }

    this.currentStep = 0;
    this.currentBar = 0;
    this.bars = bars;

    // If needed, restart any processes stopped earlier
    // this.play();
  }

  // Method to set a new scheduleAheadTime value
  setScheduleAheadTime(newScheduleAheadTime: number) {
    this.scheduleAheadTime = newScheduleAheadTime;
    // You don't need to notify the worker here because it's not directly affected by this change.
  }
}
