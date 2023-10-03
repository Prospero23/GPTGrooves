export default function noteToMidi(note: string): number {
  const noteMap: Record<string, number> = {
    C: 0,
    "C#": 1,
    D: 2,
    "D#": 3,
    E: 4,
    F: 5,
    "F#": 6,
    G: 7,
    "G#": 8,
    A: 9,
    "A#": 10,
    B: 11,
  };

  const noteName = note.slice(0, -1);
  const octave = parseInt(note.slice(-1));

  return 12 + octave * 12 + noteMap[noteName];
}
