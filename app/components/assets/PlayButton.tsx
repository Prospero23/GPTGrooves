"use client";

// FOR PRACTICE
import setup from "@/public/sound.js";
import { useEffect, useState, useRef } from "react";
import {
  type Device,
  MessageEvent,
  TimeNow,
  MIDIEvent,
  type MIDIData,
} from "@rnbo/js";

export default function PlayButton() {
  // instruments
  // const osc = useRef<OscillatorNode | undefined>(undefined); // test oscillator
  const drums = useRef<Device | undefined>(undefined); // test oscillator
  const bass = useRef<Device | undefined>(undefined); // test oscillator
  const bassGain = useRef<GainNode | undefined>(undefined); // test oscillator
  const pad = useRef<Device | undefined>(undefined); // test oscillator
  const [isPlaying, setIsPlaying] = useState<boolean>(false); // is sequence playing?
  const audioContext = useRef<AudioContext | undefined>(undefined); // reference to the audioContext
  // const startTime = useRef<number | undefined>(undefined); // start time of sequence
  const current16thNote = useRef<number>(0); // what step of bar is currently being scheduled?
  // const currentBar = useRef<number>(0); // current Bar
  const tempo = 120.0; // current tempo (bpm)
  const lookahead = 25.0; // how frequent to call schedule function in ms
  const scheduleAheadTime = 0.1; // how far ahead to schedule audio in sec
  const nextNoteTime = useRef<number>(0.0); // when next note is due
  const noteLength = 0.05; // length of note in seconds
  const timerID = useRef<number | undefined>(undefined); // setInterval identifier

  // ADD CANVAS STUFF? //ADD anim frame STUFF potentially
  // const notesInQueue = [];
  // https://github.com/cwilso/metronome/blob/b84727dd3745229124ff108a2ef10ed3bdce8808/js/metronome.js

  //   function draw() {
  //     var currentNote = last16thNoteDrawn;
  //     var currentTime = audioContext.currentTime;

  //     while (notesInQueue.length && notesInQueue[0].time < currentTime) {
  //         currentNote = notesInQueue[0].note;
  //         notesInQueue.splice(0,1);   // remove note from queue
  //     }

  //     // We only need to draw if the note has moved.
  //     if (last16thNoteDrawn != currentNote) {
  //         var x = Math.floor( canvas.width / 18 );
  //         canvasContext.clearRect(0,0,canvas.width, canvas.height);
  //         for (var i=0; i<16; i++) {
  //             canvasContext.fillStyle = ( currentNote == i ) ?
  //                 ((currentNote%4 === 0)?"red":"blue") : "black";
  //             canvasContext.fillRect( x * (i+1), x, x/2, x/2 );
  //         }
  //         last16thNoteDrawn = currentNote;
  //     }

  //     // set up to draw again
  //     requestAnimFrame(draw);
  // }

  // Get webAudio context setup
  useEffect(() => {
    // This code runs after the component has been rendered
    async function init() {
      const result = await setup();
      if (result != null) {
        audioContext.current = result.context;
        drums.current = result.device;
        bass.current = result.deviceBass;
        pad.current = result.deviceSynth;

        drums.current?.node.connect(audioContext.current.destination);

        const gainNode = audioContext.current.createGain();
        gainNode.connect(audioContext.current.destination);
        bassGain.current = gainNode;
        bass.current?.node.connect(bassGain.current);
      } else {
        // Handle the undefined case, maybe log an error or throw an exception
        console.log("error in initializing audio");
      }
    }
    void init();
    // Optional: Return a function to run on component unmount / before re-running the effect
    return () => {
      if (audioContext.current != null) {
        void audioContext.current.close();
      }
    };
  }, []);

  function nextNote() {
    // advance time to next 16th note //ADD BARS?
    const secondsPerBeat = 60.0 / tempo;

    nextNoteTime.current += 0.25 * secondsPerBeat;

    current16thNote.current++;
    if (current16thNote.current === 16) {
      // wrap 16 to 0
      current16thNote.current = 0;
    }
  }

  function scheduleNote(beatNumber: number, time: number) {
    // push the note on the queue, even if we're not playing.
    // notesInQueue.push( { note: beatNumber, time: time } ); ADD BACK LATER

    // create an oscillator
    if (audioContext.current != null) {
      const osc = audioContext.current.createOscillator();
      osc.connect(audioContext.current.destination);
      if (beatNumber % 16 === 0)
        // beat 0 == low pitch
        osc.frequency.value = 880.0;
      else if (beatNumber % 4 === 0)
        // quarter notes = medium pitch
        osc.frequency.value = 440.0;
      // other 16th notes = high pitch
      else osc.frequency.value = 220.0;

      osc.start(time);
      osc.stop(time + noteLength);
    } else {
      console.log("AudioContext is undefined");
    }
  }

  function scheduler() {
    // while there are notes that will need to play before the next interval,
    // schedule them and advance the pointer.
    if (audioContext.current != null) {
      while (
        nextNoteTime.current <
        audioContext.current.currentTime + scheduleAheadTime
      ) {
        scheduleNote(current16thNote.current, nextNoteTime.current); // schedule note to play
        nextNote(); // push to next 16th
      }
      timerID.current = window.setTimeout(scheduler, lookahead);
    }
  }

  function handleClick() {
    setIsPlaying(!isPlaying);
    if (!isPlaying && audioContext.current != null) {
      // start playing
      current16thNote.current = 0;
      nextNoteTime.current = audioContext.current.currentTime;
      scheduler(); // kick off scheduling
    } else {
      window.clearTimeout(timerID.current);
    }
  }

  function handleClickDrums(
    event: React.MouseEvent<HTMLButtonElement>,
    inlet: number,
  ) {
    if (audioContext.current?.state === "suspended") {
      void audioContext.current?.resume();
    }
    const eventTrigger = new MessageEvent(TimeNow, `in${inlet}`, [1]);
    if (drums.current != null) {
      drums.current.scheduleEvent(eventTrigger);
    }
  }

  function handleClickBass(event: React.MouseEvent<HTMLButtonElement>) {
    const eventTrigger = new MessageEvent(TimeNow, `in0`, [
      Math.random() * 10 + 30,
    ]);
    if (bass.current != null && bassGain.current != null) {
      bassGain.current.gain.value = Math.random();
      console.log(bassGain.current.gain.value);
      bass.current.scheduleEvent(eventTrigger);
    }
  }
  function createChord() {
    const midiNotes: number[] = [];
    const numberNotes = 4;
    for (let i = 0; i < numberNotes; i++) {
      midiNotes.push(Math.floor(Math.random() * 60 + 20));
    }
    const padInstance = pad.current as Device;
    midiNotes.forEach((note) => {
      const midiChannel = 0;

      // Format a MIDI message paylaod, this constructs a MIDI on event
      const noteOnMessage: MIDIData = [
        144 + midiChannel, // Code for a note on: 10010000 & midi channel (0-15)
        note, // MIDI Note
        100, // MIDI Velocity
      ];

      const noteOffMessage: MIDIData = [
        128 + midiChannel, // Code for a note off: 10000000 & midi channel (0-15)
        note, // MIDI Note
        0, // MIDI Velocity
      ];

      // Including rnbo.min.js (or the unminified rnbo.js) will add the RNBO object
      // to the global namespace. This includes the TimeNow constant as well as
      // the MIDIEvent constructor.
      const midiPort = 0;
      const noteDurationMs = 250;

      // When scheduling an event to occur in the future, use the current audio context time
      // multiplied by 1000 (converting seconds to milliseconds) for now.
      if (pad.current != null) {
        const noteOnEvent = new MIDIEvent(
          pad.current?.context.currentTime * 1000,
          midiPort,
          noteOnMessage,
        );
        const noteOffEvent = new MIDIEvent(
          pad.current.context.currentTime * 1000 + noteDurationMs,
          midiPort,
          noteOffMessage,
        );

        padInstance.scheduleEvent(noteOnEvent);
        padInstance.scheduleEvent(noteOffEvent);
      }
    });
  }

  function handleClickSynth(event: React.MouseEvent<HTMLButtonElement>) {
    createChord();
  }
  return (
    <div className="flex flex-col">
      <button
        onClick={(e) => {
          handleClickDrums(e, 1);
        }}
      >
        Hat
      </button>
      <button
        onClick={(e) => {
          handleClickDrums(e, 2);
        }}
      >
        Kick
      </button>
      <button
        onClick={(e) => {
          handleClickDrums(e, 3);
        }}
      >
        Snare
      </button>
      <button
        onClick={(e) => {
          handleClickBass(e);
        }}
      >
        Bass
      </button>
      <button
        onClick={(e) => {
          handleClickSynth(e);
        }}
      >
        Synth
      </button>
      <button className="hover:bg-green-500" onClick={handleClick}>
        {isPlaying ? "stop" : "start"}
      </button>
    </div>
  );
}
