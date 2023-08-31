type Note = string; // Define Note type as a string
type Beat = Boolean; // Define Beat type as a number

interface DrumPatterns {
  bass_drum: Beat[];
  snare_drum: Beat[];
  hi_hat: Beat[];
}

interface BassPattern {
  pattern: Note[];
}

interface SynthPattern {
  chords: Note[][];
}

export interface Bar {
  drums: DrumPatterns;
  bass: BassPattern;
  synth: SynthPattern;
}

export interface Song {
    bars: Bar[]
}
