import { type Device, type MIDIData, MIDIEvent } from "@rnbo/js";
import { type BarType } from "./musicData";
import noteToMidi from "./music_helpers/noteToMidi";
import type Drums from "./Drums";
import type Bass from "./Bass";

export default class AudioScheduler {
  // Declare the properties of the class
  private readonly audioContext: AudioContext;
  private bars: BarType[]; // TODO: fix
  private readonly drums: Drums;
  private readonly bass: Bass;
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
    drums: Drums,
    bass: Bass,
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

    if (drums.hi_hat[this.currentStep] === 1) {
      this.drums.playHat(audioContextTime);
    }
    if (drums.kick[this.currentStep] === 1) {
      this.drums.playKick(audioContextTime);
    }
    if (drums.snare[this.currentStep] === 1) {
      this.drums.playSnare(audioContextTime);
    }
  }

  private scheduleBass(audioContextTime: number) {
    const bassData = this.bars[this.currentBar].bass;
    if (Array.isArray(bassData.pattern)) {
      const bassNote = noteToMidi(bassData.pattern[this.currentStep]);

      if (!isNaN(bassNote)) {
        this.bass.playNote(bassNote, audioContextTime);
        this.bass.noteOff(audioContextTime + 100);
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
        const noteDurationMs = 100; // TODO: BETTER

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
    // this.scheduleBass(audioContextTime);
    // this.schedulePad(audioContextTime);
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
}
