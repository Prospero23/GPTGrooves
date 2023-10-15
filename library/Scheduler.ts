import { type Device, type MIDIData, MIDIEvent } from "@rnbo/js";
import { type BarType } from "./musicData";
import noteToMidi from "./music_helpers/noteToMidi";
import type Drums from "./Drums";
import type Bass from "./Bass";
import type VariableFilter from "./VariableFilter";

type InstrumentType = "bass" | "pad" | "drums";

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

  // advance to the next note in the sequence
  private nextNote() {
    const secondsPerBeat = 60.0 / this.tempo;

    this.nextNoteTime += 0.25 * secondsPerBeat;

    this.currentStep++;
    // console.log("next note time", this.nextNoteTime, this.currentStep);

    if (this.currentStep === 16) {
      // wrap 16 to 0
      this.currentStep = 0;
      this.currentBar++;
      // console.log(this.bars[this.currentBar]);
    }
  }

  private scheduleDrums(audioContextTime: number) {
    const drums = this.bars[this.currentBar].drums;

    // Check if 'hi_hat' is an array and if the current step is a trigger for playing the sound
    if (Array.isArray(drums.hi_hat) && drums.hi_hat[this.currentStep] === 1) {
      this.drums.playHat(audioContextTime);
    }

    if (Array.isArray(drums.kick) && drums.kick[this.currentStep] === 1) {
      this.drums.playKick(audioContextTime);
    }

    if (Array.isArray(drums.snare) && drums.snare[this.currentStep] === 1) {
      this.drums.playSnare(audioContextTime);
    }
  }

  private scheduleBass(audioContextTime: number) {
    const bassData = this.bars[this.currentBar].bass;
    if (Array.isArray(bassData.pattern)) {
      const bassNote = noteToMidi(bassData.pattern[this.currentStep]);
      if (!isNaN(bassNote)) {
        this.bass.playNote(bassNote, audioContextTime);
        this.bass.noteOff(bassNote, audioContextTime + 0.1); // FIX NOTE OFF
      }
    }
  }

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

  private scheduleFilter(
    scheduleTime: number,
    filter: VariableFilter,
    instrument: InstrumentType,
  ) {
    if (this.currentStep % this.changeFrequency === 0) {
      const instrumentInfo =
        this.bars[this.currentBar][instrument].effects.filter;

      const filterValue = instrumentInfo.filter_value;
      const filterType = instrumentInfo.filter_type;

      // skip if the filter is not present at this moment
      if (instrumentInfo.filter_type === "") {
        return; // Skip the rest of this function if 'filter_type' is empty.
      }
      // change freq
      filter.changeFrequency(filterValue[0], filterType, scheduleTime);
      // only change filter if not the same as the current
      if (this.currentFilters[instrument] !== instrumentInfo.filter_type) {
        this.currentFilters[instrument] = instrumentInfo.filter_type; // Update the current filter type
        filter.switchFilter(
          instrumentInfo.filter_type as BiquadFilterType,
          scheduleTime,
        );
      }
    }
  }

  private scheduleFilters(audioContextTime: number) {
    this.scheduleFilter(audioContextTime, this.drumFilter, "drums");
    this.scheduleFilter(audioContextTime, this.bassFilter, "bass");
    this.scheduleFilter(audioContextTime, this.padFilter, "pad");
  }

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

  stop() {
    if (this.isPlaying) {
      this.isPlaying = false;
      this.timerWorker?.postMessage("stop"); // Stop the worker
      // ... [rest of your stopping logic]
    } else {
      console.log("Already stopped");
    }
  }

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
