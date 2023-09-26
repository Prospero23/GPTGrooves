import { z } from "zod";

// This file is generated based on the ./music_generator_lambda/music_generator/music_generator_types.py.
// If it changes, this needs to, too.
export const Note = z.custom<string>(
  (note) => {
    const pattern = /^[A-G][#b]?[0-8]$/;
    return pattern.test(note as string) || note === "0";
  },
  { message: "Invalid note format." },
);

export const BassBar = z.object({
  pattern: z.array(Note).refine((data) => data.length === 16, {
    message: "Bass line must be 16 notes long.",
  }),
});

export const DrumValue = z.union([z.literal(0), z.literal(1)]);

export const DrumBar = z.object({
  hi_hat: z.array(DrumValue).refine((data) => data.length === 16, {
    message: "Drum track must be 16 notes long.",
  }),
  kick: z.array(DrumValue).refine((data) => data.length === 16, {
    message: "Drum track must be 16 notes long.",
  }),
  snare: z.array(DrumValue).refine((data) => data.length === 16, {
    message: "Drum track must be 16 notes long.",
  }),
});

export const Chord = z.object({
  notes: z.array(Note),
});

export const PadBar = z.object({
  chord_sequence: z.array(Chord).refine((data) => data.length === 16, {
    message: "Drum track must be 16 notes long.",
  }),
});

export const Bar = z.object({
  drums: DrumBar,
  bass: BassBar,
  pad: PadBar,
});

export const BarRecord = z.object({
  bar: Bar,
  created_at_utc: z.string(),
});

export const SongSection = z.object({
  bars: z.array(BarRecord),
});

export const Song = z.object({
  sections: z.array(SongSection),
});

export type BarType = z.infer<typeof Bar>;
export type BarRecordType = z.infer<typeof BarRecord>;
export type SongSectionType = z.infer<typeof SongSection>;
export type SongType = z.infer<typeof Song>;
