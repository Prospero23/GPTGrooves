"use client";


//FOR PRACTICE
import setup from "@/public/sound.js";
import { useEffect, useState, useRef } from "react";
import { Device, MessageEvent, TimeNow, MIDIEvent, MIDIData } from "@rnbo/js";
import { addIssueToContext } from "zod";

export default function PlayButton() {
  //instruments
  const osc = useRef<OscillatorNode | undefined>(undefined); //test oscillator
  const drums = useRef<Device | undefined>(undefined); //test oscillator
  const bass = useRef<Device | undefined>(undefined); //test oscillator
  const bassGain = useRef<GainNode | undefined>(undefined); //test oscillator
  const pad = useRef<Device | undefined>(undefined); //test oscillator
  const [isPlaying, setIsPlaying] = useState<Boolean | undefined>(false); //is sequence playing?
  const audioContext = useRef<AudioContext | undefined>(
    undefined
  ); //reference to the audioContext
  const startTime = useRef<number | undefined>(undefined) //start time of sequence
  const current16thNote = useRef<number>(0) //what step of bar is currently being scheduled?
  const currentBar = useRef<number>(0) //current Bar
  const tempo = 120.0 //current tempo (bpm)
  const lookahead = 25.0 //how frequent to call schedule function in ms
  const scheduleAheadTime = 0.1 //how far ahead to schedule audio in sec
  let nextNoteTime = useRef<number>(0.0) //when next note is due
  let noteResolution = 0 //0 is 16th, 1 - 8th, 2 - quarter
  const noteLength = 0.05 //length of note in seconds
  const timerID = useRef<number | undefined>(undefined) //setInterval identifier

  //ADD CANVAS STUFF? //ADD anim frame STUFF potentially
  let notesInQueue = [];
  //https://github.com/cwilso/metronome/blob/b84727dd3745229124ff108a2ef10ed3bdce8808/js/metronome.js

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

  //Get webAudio context setup
  useEffect(() => {
    // This code runs after the component has been rendered
    async function init() {
      const result = await setup();
      if (result) {
        audioContext.current =result.context;
        drums.current = result.device;
        bass.current = result.deviceBass;
        pad.current = result.deviceSynth;

        drums.current?.node.connect(audioContext.current.destination)

        const gainNode = audioContext.current.createGain();
        gainNode.connect(audioContext.current.destination);
        bassGain.current = gainNode;
        bass.current?.node.connect(bassGain.current)


      } else {
        // Handle the undefined case, maybe log an error or throw an exception
        console.log("error in initializing audio");
      }
    }
    init();
    // Optional: Return a function to run on component unmount / before re-running the effect
    return () => {
      if (audioContext.current) {
        audioContext.current.close();
      }
    };
  }, []);

  function nextNote() { //advance time to next 16th note //ADD BARS?
    let secondsPerBeat = 60.0 / tempo;

    nextNoteTime.current += 0.25 * secondsPerBeat;

    current16thNote.current++;
    if (current16thNote.current == 16){ //wrap 16 to 0
      current16thNote.current = 0
    }
  }

  function scheduleNote( beatNumber:number, time:number ) {
    // push the note on the queue, even if we're not playing.
    //notesInQueue.push( { note: beatNumber, time: time } ); ADD BACK LATER

    if ( (noteResolution==1) && (beatNumber%2)) //only runs when res is set to 1
        return; // we're not playing non-8th 16th notes
    if ( (noteResolution==2) && (beatNumber%4)) //only runs when res is set to 2
        return; // we're not playing non-quarter 8th notes

    // create an oscillator
    if (audioContext.current){
    let osc = audioContext.current.createOscillator();
    osc.connect( audioContext.current.destination );
    if (beatNumber % 16 === 0)    // beat 0 == low pitch
        osc.frequency.value = 880.0;
    else if (beatNumber % 4 === 0 )    // quarter notes = medium pitch
        osc.frequency.value = 440.0;
    else                        // other 16th notes = high pitch
        osc.frequency.value = 220.0;

    osc.start( time );
    osc.stop( time + noteLength );
    } else{
      console.log('AudioContext is undefined')
    }
}

function scheduler() {
  // while there are notes that will need to play before the next interval,
  // schedule them and advance the pointer.
  if (audioContext.current){
  while (nextNoteTime.current < audioContext.current.currentTime + scheduleAheadTime ) {
      scheduleNote(current16thNote.current, nextNoteTime.current); //schedule note to play
      nextNote(); //push to next 16th
  }
  timerID.current = window.setTimeout( scheduler, lookahead );
  }
}

function handleClick() {
  setIsPlaying(!isPlaying)
  if (!isPlaying && audioContext.current) { // start playing
      current16thNote.current = 0;
      nextNoteTime.current = audioContext.current.currentTime;
      scheduler();    // kick off scheduling
      return
  } else {
      window.clearTimeout( timerID.current );
      return
  }
}

function handleClickDrums(
  event: React.MouseEvent<HTMLButtonElement>,
  inlet: number
) {
  if (audioContext.current.state == "suspended"){
    audioContext.current?.resume()
  }
  const eventTrigger = new MessageEvent(TimeNow, `in${inlet}`, [1]);
  if (drums.current) {
    drums.current.scheduleEvent(eventTrigger);
  }
}

function handleClickBass(event: React.MouseEvent<HTMLButtonElement>) {
  const eventTrigger = new MessageEvent(TimeNow, `in0`, [
    Math.random() * 10 + 30,
  ]);
  if (bass.current && bassGain.current) {
    bassGain.current.gain.value = Math.random()
    console.log(bassGain.current.gain.value )
    bass.current.scheduleEvent(eventTrigger);
  }
}
function createChord() {
  let midiNotes: number[] = [];
  const numberNotes = 4;
  for (let i = 0; i < 4; i++) {
    midiNotes.push(Math.floor(Math.random() * 60 + 20));
  }
  if (pad.current) {
    midiNotes.forEach((note) => {
      let midiChannel = 0;

      // Format a MIDI message paylaod, this constructs a MIDI on event
      let noteOnMessage: MIDIData = [
        144 + midiChannel, // Code for a note on: 10010000 & midi channel (0-15)
        note, // MIDI Note
        100, // MIDI Velocity
      ];

      let noteOffMessage: MIDIData = [
        128 + midiChannel, // Code for a note off: 10000000 & midi channel (0-15)
        note, // MIDI Note
        0, // MIDI Velocity
      ];

      // Including rnbo.min.js (or the unminified rnbo.js) will add the RNBO object
      // to the global namespace. This includes the TimeNow constant as well as
      // the MIDIEvent constructor.
      let midiPort = 0;
      let noteDurationMs = 250;

      // When scheduling an event to occur in the future, use the current audio context time
      // multiplied by 1000 (converting seconds to milliseconds) for now.
      let noteOnEvent = new MIDIEvent(
pad.current.context.currentTime * 1000,
        midiPort,
        noteOnMessage
      );
      let noteOffEvent = new MIDIEvent(
        pad.current.context.currentTime * 1000 + noteDurationMs,
        midiPort,
        noteOffMessage
      );

      pad.current.scheduleEvent(noteOnEvent);
      pad.current.scheduleEvent(noteOffEvent);
    });
  }
}

function handleClickSynth(event: React.MouseEvent<HTMLButtonElement>) {
  createChord()
}
  return (
    <div className="flex flex-col">
      <button onClick={(e) => handleClickDrums(e, 1)}>Hat</button>
      <button onClick={(e) => handleClickDrums(e, 2)}>Kick</button>
      <button onClick={(e) => handleClickDrums(e, 3)}>Snare</button>
      <button onClick={(e) => handleClickBass(e)}>Bass</button>
      <button onClick={(e) => handleClickSynth(e)}>Synth</button>
      <button className="hover:bg-green-500" onClick={handleClick}>{isPlaying ? "stop" : "start"}</button>
    </div>
  );
}



//get the code working from the example and then just switch everything out to the blah blah
// const drums = useRef<Device | undefined>(undefined);
// const bass = useRef<Device | undefined>(undefined);
// const pad = useRef<Device | undefined>(undefined);

  //change this to use transport later (https://rnbo.cycling74.com/learn/musical-time-events)
  // function stepSeq() {
  //   let intervalID;
  //   if (isPlaying) {
  //     setIsPlaying(false);
  //     clearInterval(intervalID); //fix this
  //   } else {
  //     setIsPlaying(true);
  //     intervalID = setInterval(step, 100);
  //   }
  // }

  // function step() {
  //   let intervalID;
  //   for (let inlet = 1; inlet < 4; inlet++) {
  //     const eventTrigger = new MessageEvent(TimeNow, `in${inlet}`, [
  //       Math.floor(Math.random() * 2),
  //     ]);

  //     drums?.scheduleEvent(eventTrigger);
  //   }
  //   const eventTrigger = new MessageEvent(TimeNow, `in0`, [
  //     Math.floor(Math.floor(Math.random() * 20 + 30)),
  //   ]);
  //   bass?.scheduleEvent(eventTrigger);
  //   createChord()
  // }
  // function handleClick(){
  //   setIsPlaying(!isPlaying)
  // }
