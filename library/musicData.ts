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
  pattern: z
    .array(Note)
    .refine((data) => data.length === 16, {
      message: "Bass line must be 16 notes long.",
    })
    .nullable(),
});

export const DrumValue = z.union([z.literal(0), z.literal(1)]);

export const DrumBar = z.object({
  hi_hat: z
    .array(DrumValue)
    .refine((data) => data.length === 16, {
      message: "Drum track must be 16 notes long.",
    })
    .nullable(),
  kick: z
    .array(DrumValue)
    .refine((data) => data.length === 16, {
      message: "Drum track must be 16 notes long.",
    })
    .nullable(),
  snare: z
    .array(DrumValue)
    .refine((data) => data.length === 16, {
      message: "Drum track must be 16 notes long.",
    })
    .nullable(),
});

export const Chord = z.object({
  notes: z.array(Note),
});

export const PadBar = z.object({
  chord_sequence: z
    .array(Chord)
    .refine((data) => data.length === 16, {
      message: "Drum track must be 16 notes long.",
    })
    .nullable(),
});
export const EffectsBar = z.object({
  // Require each to be 16 notes long and between 0 and 1
  delay: z
    .number()
    .refine((data) => data >= 0 && data <= 1, {
      message: "Effects track elements must be between 0 and 1.",
    })
    .nullable(),
  reverb: z
    .number()
    .refine((data) => data >= 0 && data <= 1, {
      message: "Effects track elements must be between 0 and 1.",
    })
    .nullable(),
});
export const Bar = z.object({
  // Each of these will always be present. Their children might be empty (their fields are optional). Absence implies inactivity.
  drums: DrumBar,
  bass: BassBar,
  pad: PadBar,
  effects: EffectsBar,
});

export const SongSection = z.object({
  bars: z.array(Bar),
  name: z.string(),
});

export const Song = z.object({
  sections: z.array(SongSection),
});
export const SongRecord = z.object({
  song: Song,
  created_at_utc: z.string(),
});

export type BarType = z.infer<typeof Bar>;
export type SongSectionType = z.infer<typeof SongSection>;
export type SongType = z.infer<typeof Song>;
export type SongRecordType = z.infer<typeof SongRecord>;
