import {
  type Device,
  type MIDIData,
  MIDIEvent,
  MessageEvent as RNBOMesageEvent,
} from "@rnbo/js";
import { type BarType } from "./musicData";
import noteToMidi from "./music_helpers/noteToMidi";

export default class AudioScheduler {
  // Declare the properties of the class
  private readonly audioContext: AudioContext;
  private bars: BarType[]; // TODO: fix
  private readonly drums: Device;
  private readonly bass: Device;
  private readonly pad: Device;
  private readonly tempo: number;
  private currentStep: number;
  private currentBar: number;
  private nextNoteTime: number;
  private isPlaying: boolean;
  private readonly lookahead: number;
  private readonly scheduleAheadTime: number;
  private readonly timerID: number | null = null;
  private readonly timerWorker: Worker | null = null;

  constructor(
    tempo: number,
    bars: BarType[],
    audioContext: AudioContext,
    drums: Device,
    bass: Device,
    pad: Device,
  ) {
    this.audioContext = audioContext;
    this.bars = bars; // input song we are using

    this.drums = drums;
    this.bass = bass;
    this.pad = pad;

    this.tempo = tempo; // Now we're correctly initializing the tempo property
    this.currentStep = 0;
    this.currentBar = 0;
    this.nextNoteTime = 0;

    this.isPlaying = false;
    this.lookahead = 25.0; // how frequent to call schedule function in ms
    this.scheduleAheadTime = 0.05; // how far ahead to schedule audio in sec

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
    if (this.currentStep === 16) {
      // wrap 16 to 0
      this.currentStep = 0;
      this.currentBar++;
    }
  }

  private scheduleDrums(audioContextTime: number) {
    const drumInlets = {
      hi_hat: 1,
      kick: 2,
      snare: 3,
    };

    const drumData = this.bars[this.currentBar].drums;

    // Create an array to hold the current values for all drum types
    const drumValuesForCurrentStep = [];

    // Iterate over each drum type and collect the current step value
    for (const drumType of Object.keys(drumData) as Array<
      keyof typeof drumInlets
    >) {
      // Assuming each drumData[drumType] is an array of steps
      if (Array.isArray(drumData[drumType])) {
        drumValuesForCurrentStep.push(drumData[drumType][this.currentStep]);
      }
    }

    // Check if there are any drum values to process
    if (drumValuesForCurrentStep.length > 0) {
      // Create a single event with all drum values for the current step
      const drumEventTrigger = new RNBOMesageEvent(
        audioContextTime,
        `in1`,
        drumValuesForCurrentStep,
      );
      this.drums.scheduleEvent(drumEventTrigger);
    } else {
      console.log("DRUM ERROR");
    }
  }

  private scheduleBass(audioContextTime: number) {
    const bassData = this.bars[this.currentBar].bass;
    if (Array.isArray(bassData.pattern)) {
      const bassNote = noteToMidi(bassData.pattern[this.currentStep]);

      if (!isNaN(bassNote)) {
        const bassEventTrigger = new RNBOMesageEvent(audioContextTime, `in0`, [
          bassNote,
        ]);
        this.bass.scheduleEvent(bassEventTrigger);
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

  private scheduleEvents(audioContextTime: number) {
    this.scheduleDrums(audioContextTime);
    this.scheduleBass(audioContextTime);
    this.schedulePad(audioContextTime);
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
    this.bars = bars;
  }
}
