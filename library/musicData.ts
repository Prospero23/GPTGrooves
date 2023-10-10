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

export const FilterInformation = z.object({
  filter_type: z.string(),
  filter_value: z.array(z.number()),
});

export const EffectInformation = z.object({
  filter: FilterInformation,
});

export const EffectBar = z.object({
  drums_effects: EffectInformation.default({
    filter: {
      filter_type: "",
      filter_value: [],
    },
  }),
  bass_effects: EffectInformation.default({
    filter: {
      filter_type: "",
      filter_value: [],
    },
  }),
  pad_effects: EffectInformation.default({
    filter: {
      filter_type: "",
      filter_value: [],
    },
  }),
});

export const SectionEffects = z.object({
  bars: z.array(EffectBar),
  name: z.string(),
});

export const BassBar = z.object({
  pattern: z.array(Note).refine((data) => data.length === 16, {
    message: "Bass line must be 16 notes long.",
  }),
  effects: EffectInformation,
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
  effects: EffectInformation,
});

export const Chord = z.object({
  notes: z.array(Note),
});

export const PadBar = z.object({
  chord_sequence: z.array(Chord).refine((data) => data.length === 16, {
    message: "Drum track must be 16 notes long.",
  }),
  effects: EffectInformation,
});

export const Bar = z.object({
  drums: DrumBar,
  bass: BassBar,
  pad: PadBar,
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
export type FilterInformationType = z.infer<typeof FilterInformation>;
export type EffectInformationType = z.infer<typeof EffectInformation>;
export type EffectBarType = z.infer<typeof EffectBar>;
export type SectionEffectsType = z.infer<typeof SectionEffects>;
