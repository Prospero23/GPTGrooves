from typing import Optional, TypeVar, List
from pydantic import BaseModel, Field, validator
import re
from music_generator.music_generator_types.effect_types import (
    EffectInformation,
    EffectBar,
    SongEffects,
    SectionEffects,
)

from music_generator.utilities.logs import get_logger

# from music_generator.music_generator_types.markup_types import MusicalMarkup
logger = get_logger(__name__)


# This file dictates musicData.ts. If you modify this, modify that.
class Config(BaseModel):
    openai_api_key: str
    anyscale_api_token: str
    atlas_cluster_uri: str
    db_name: str
    # If None, don't cache
    llm_cache_filename: Optional[str]
    langchain_api_key: Optional[str]
    langchain_project: Optional[str]


def validate_note(note: str) -> str:
    pattern = re.compile(r"^[A-G][#b]?[0-8]$")
    if not pattern.match(note):
        raise ValueError(f"{note} is not a valid note format.")
    return note


class BassBar(BaseModel):
    # "bass": {
    #   "pattern": ["C3", "0", "0", "0", "E3", "0", "0", "0", "F3", "0", "0", "0", "G3", "0", "0", "0"]
    # },
    pattern: list[str] = Field(
        description="Bass-line of a house song. Sixteenth notes. '0' = rest, 'Cb3' = C-flat 3 note, 'E2' = E2 note, 'G#4' = G-sharp 4 note, etc."
    )
    effects: Optional[EffectInformation] = Field(default=None)

    @validator("pattern")
    def validate_note_count(cls, field: list[str]) -> list[str]:
        if len(field) != 16:
            raise ValueError("Bass line must be 16 notes long.")
        return field

    @validator("pattern", each_item=True)
    def validate_item(cls, item: str) -> str:
        return item if item == "0" else validate_note(item)

    def to_keypairs(self) -> dict[str, str]:
        return {"bass": " ".join(self.pattern)}

    @staticmethod
    def from_keypairs(data: dict[str, str]) -> "BassBar":
        text = data["bass"]
        # fmt: off
        assert not text.startswith("bass "), "Invalid structured text format. Only pass data."
        # fmt: on
        return BassBar(pattern=text.split())

    def apply_effects(self, effect_info: EffectInformation):
        self.effects = effect_info


class DrumBar(BaseModel):
    hi_hat: Optional[list[int]] = Field(
        description="Hi-hat track, 16ths. 1 = hit, 0 = rest."
    )
    kick: Optional[list[int]] = Field(
        description="Kick track, 16ths. 1 = hit, 0 = rest."
    )
    snare: Optional[list[int]] = Field(
        description="Snare track, 16ths. 1 = hit, 0 = rest."
    )
    effects: Optional[EffectInformation] = Field(default=None)

    def to_keypairs(self) -> dict[str, str]:
        # Yep this is a special case, returns a dict
        return {
            drum_type: " ".join([str(val) for val in sequence])
            for drum_type, sequence in self.dict().items()
            if sequence is not None
        }

    @staticmethod
    def from_keypairs(data: dict[str, str]) -> "DrumBar":
        # fmt: off
        for drum_type in ("hi_hat", "kick", "snare"):
            if drum_type in data:
                assert not data[drum_type].startswith(drum_type), "Invalid structured text format. Only pass data."
        return DrumBar(
            hi_hat=[int(val) for val in data["hi_hat"].split()] if "hi_hat" in data else None,
            kick=[int(val) for val in data["kick"].split()] if "kick" in data else None,
            snare=[int(val) for val in data["snare"].split()] if "snare" in data else None,
        )
        # fmt: on

    @validator("hi_hat", "kick", "snare")
    def validate_drums(cls, field: list[int]) -> list[int]:
        if field is not None:
            if len(field) != 16:
                raise ValueError(
                    f"Drum track must be 16 notes long. Got {len(field)}: {field}"
                )
            for item in field:
                if item not in (0, 1):
                    raise ValueError(f"Drum values must be 0 or 1. Got {field}")

        return field

    def apply_effects(self, effect_info: EffectInformation):
        self.effects = effect_info


class Chord(BaseModel):
    notes: list[str] = Field(
        description="List of notes in the chord. If rest, then empty list. ['C3', 'E3', 'G3', 'B3'] = C major 7, 3rd octave; ['G#4', 'C5', 'D#5', 'F#5'] = G-sharp dominant 7, 4th octave; [] = rest"
    )

    @validator("notes", each_item=True)
    def validate_notes(cls, note: str) -> str:
        return validate_note(note)


T = TypeVar("T")


def expand_if_necessary(field: list[T], length: int) -> list[T]:
    """
    :param field: A list of items.
    :param length: The desired length of the list.
    :return: A list of items of length `length`. If `field` is shorter than `length`, then it is expanded by repeating

    Example:
    ([X,Y,Z,A],16) -> [X,X,X,X,Y,Y,Y,Y,Z,Z,Z,Z,A,A,A,A]
    """
    repetition_factor = length // len(field)
    expanded_field = []
    for item in field:
        expanded_field.extend([item] * repetition_factor)
    return expanded_field


class PadBar(BaseModel):
    chord_sequence: Optional[list[Chord]]
    effects: Optional[EffectInformation] = Field(default=None)

    @validator("chord_sequence")
    def validate_combinations(cls, field: list[str]) -> list[str]:
        # Ensure that the initial length of `field` is a power of 2 and less than or equal to 16
        if field is not None:
            if len(field) not in {1, 2, 4, 8, 16}:
                raise ValueError(
                    "Initial length of field must be an exact power of two among {1, 2, 4, 8, 16}."
                )
            if len(field) != 16:
                logger.info(
                    f"Did not receive 16 notes for Pad. Expanding {len(field)} notes to 16."
                )
            return expand_if_necessary(field, 16)
        return field

    def to_keypairs(self) -> dict[str, str]:
        """
        The format is as follows:
        pad [C3 E3 G3 B3] [] [] [] [A3 C4 E4 G4] [] [] [] [F3 A3 C4 E4] [] [] [] [G3 B3 D4 F4] [] [] []
        """
        # Convert each Chord object's notes to a string representation
        if self.chord_sequence:
            chord_strings = [" ".join(chord.notes) for chord in self.chord_sequence]
        else:
            chord_strings = []
        # Wrap each string representation in brackets
        bracketed_chords = [f"[{chord}]" if chord else "[]" for chord in chord_strings]

        # Join the bracketed chords with spaces and prefix with "pad"
        return {"pad": " ".join(bracketed_chords)}

    @staticmethod
    def from_keypairs(data: dict[str, str]) -> "PadBar":
        text = data["pad"]
        # fmt: off
        assert not text.startswith("pad "), "Invalid structured text format. Only pass data."
        # Ensure the string starts with "pad "
        assert not text.startswith(
            "pad "
        ), "Invalid structured text format. Only pass data."

        # Extract contents inside brackets using regex
        #
        # Regular expression breakdown:
        #   \[        : Matches the opening bracket '['
        #   ([^\]]*)  : Matches any character sequence that is NOT the closing bracket ']'.
        #               This is done using the character class [^\]] where '^' negates the set,
        #               and it matches everything except the given characters (in this case, the closing bracket).
        #               The '*' means it matches zero or more of the preceding token, which means it will match
        #               any number of characters that are not ']'.
        #   \]        : Matches the closing bracket ']'
        #
        # So, this regular expression essentially captures all characters inside pairs of square brackets.
        # The re.findall function will then return all such matches in the string as a list.
        chord_strings = re.findall(r"\[([^\]]*)\]", text)

        # Convert each string representation back to a Chord object
        chord_sequences = [
            Chord(notes=chord_str.split() if chord_str else [])
            for chord_str in chord_strings
        ]

        return PadBar(chord_sequence=chord_sequences)

    def apply_effects(self, effect_info: EffectInformation):
        self.effects = effect_info


class Bar(BaseModel):
    drums: DrumBar = Field(description="Drum track.")
    bass: BassBar = Field(description="Bass line.")
    pad: PadBar = Field(description="Pad track.")

    def __getitem__(self, key: str):
        if key.upper() == "DRUMS":
            return self.drums
        elif key.upper() == "BASS":
            return self.bass
        elif key.upper() == "PAD":
            return self.pad
        else:
            raise KeyError(f"Key '{key}' not found in Bar instance.")

    @staticmethod
    def example() -> "Bar":
        return Bar(
            # fmt: off
            drums=DrumBar(
                hi_hat=[1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
                kick=[1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
                snare=[0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0]
            ),
            bass=BassBar(
                pattern=['C2', '0', '0', '0', 'A2', '0', '0', '0', 'F2', '0', '0', '0', 'G2', '0', '0', '0']
            ),
            pad=PadBar(
                chord_sequence=[
                    Chord(notes=['C3', 'E3', 'G3', 'B3']),
                    Chord(notes=[]),
                    Chord(notes=[]),
                    Chord(notes=[]),
                    Chord(notes=['A3', 'C4', 'E4', 'G4']),
                    Chord(notes=[]),
                    Chord(notes=[]),
                    Chord(notes=[]),
                    Chord(notes=['F3', 'A3', 'C4', 'E4']),
                    Chord(notes=[]),
                    Chord(notes=[]),
                    Chord(notes=[]),
                    Chord(notes=['G3', 'B3', 'D4', 'F4']),
                    Chord(notes=[]),
                    Chord(notes=[]),
                    Chord(notes=[])
                ]
            )
            # fmt: on
        )

    @staticmethod
    def from_llm_format(text: str) -> "Bar":
        """
        :param text: A string representation of the bar in the format expected by the LLM.
        :return: A Bar object.

        The format is as follows:

        {{{
        hi_hat 1 0 0 0 1 0 0 0 1 0 0 0 1 0 0 0
        kick 0 0 0 0 1 0 0 0 0 0 0 0 1 0 0 0
        snare 0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0
        bass B2 0 0 0 Cb2 0 0 0 F#2 0 0 0 C2 0 0 0
        pad [C3 E3 G3 B3] [] [] [] [A3 C4 E4 G4] [] [] [] [F3 A3 C4 E4] [] [] [] [G3 B3 D4 F4] [] [] []
        }}}

        """

        # Isolate the music NOTE: NOT NEEDED ANYMORE HANDLED BY SongSection class but kept here incase needed later
        # match = re.search(r"\{\{\{(.+?)\}\}\}", text, re.DOTALL)
        # if not match:
        #     logger.error(f"Invalid LLM format:\n{text}")
        #     raise ValueError("Invalid LLM format. Must be wrapped in {{{...}}}")

        # Splitting the input string by newline to process each line
        # text = match.group(1)
        lines = text.split("\n")

        # Filter out instrument names
        default_value = "0 " * 15 + "0"
        data = {
            k: [
                line[len(k) + 1 :]
                for line in filter(lambda line: line.startswith(k), lines)
            ]
            if any(line.startswith(k) for line in lines)
            else [default_value]
            for k in ("hi_hat", "kick", "snare", "bass", "pad")
        }

        for k, v in data.items():
            if len(v) > 1:
                logger.warning(f"Invalid structured text format:\n{text}")
                raise ValueError(
                    f"Invalid structured text format. {k} must must not be duplicated. Got {v}"
                )

        # We know there is one per key
        data = {k: v[0] for k, v in data.items()}

        return Bar.from_keypairs(data)

    @staticmethod
    def from_keypairs(data: dict[str, str]) -> "Bar":
        """
        :param data: A dictionary of instrument names to their structured text representation.
        :return: A Bar object.

        LLM Format: pad [C3 E3 G3 B3] [] [] [] [A3 C4 E4 G4] [] [] [] [F3 A3 C4 E4] [] [] [] [G3 B3 D4 F4] [] [] []
        v
        Keypairs Format: { "pad": "[C3 E3 G3 B3] [] [] [] [A3 C4 E4 G4] [] [] [] [F3 A3 C4 E4] [] [] [] [G3 B3 D4 F4] [] [] []" }
        v
        List[KeyPair]
        """
        return Bar(
            # fmt: off
            drums=DrumBar.from_keypairs({k: v for k, v in data.items() if k in ("hi_hat", "kick", "snare")}),
            bass=BassBar.from_keypairs({k: v for k, v in data.items() if k in ("bass",)}),
            pad=PadBar.from_keypairs({k: v for k, v in data.items() if k in ("pad",)}),
            # fmt: on
        )

    def to_keypairs(self) -> dict[str, str]:
        """
        :return: A dictionary of instrument names to their structured text representation.
        """
        drums = self.drums.to_keypairs()
        bass = self.bass.to_keypairs()
        pad = self.pad.to_keypairs()
        return {
            "hi_hat": drums["hi_hat"],
            "kick": drums["kick"],
            "snare": drums["snare"],
            "bass": bass["bass"],
            "pad": pad["pad"],
        }

    def to_llm_format(self) -> str:
        """
        :return: A string representation of the bar in the format expected by the LLM.
        """
        structured_text = self.to_keypairs()
        return (
            "{{{\n"
            + "\n".join(
                [
                    "hi_hat " + structured_text["hi_hat"],
                    "kick " + structured_text["kick"],
                    "snare " + structured_text["snare"],
                    "bass " + structured_text["bass"],
                    "pad " + structured_text["pad"],
                ]
            )
            + "\n}}}"
        )

    def apply_effects(self, effects: EffectBar):
        for instrument in ["drums", "bass", "pad"]:
            effect_info = getattr(effects, f"{instrument}_effects")
            track = getattr(self, instrument)

            if effect_info and track:  # Make sure they exist before applying
                track.apply_effects(effect_info.filter)


class SongSection(BaseModel):
    bars: List[Bar] = Field(description="The list of actualized bars")
    name: str

    @staticmethod
    def from_llm_format(text: str, name: str, length: int) -> "SongSection":
        """
        :param text: A string representation of the section in the format expected by the LLM.
        :param name: A string representation of the section name.
        :param length: An int representing number of bars that should be made.
        :return: A SongSection object.

        The format is as follows:

        {{{
        hi_hat 1 0 0 0 1 0 0 0 1 0 0 0 1 0 0 0
        kick 0 0 0 0 1 0 0 0 0 0 0 0 1 0 0 0
        snare 0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0
        bass B2 0 0 0 Cb2 0 0 0 F#2 0 0 0 C2 0 0 0
        pad [C3 E3 G3 B3] [] [] [] [A3 C4 E4 G4] [] [] [] [F3 A3 C4 E4] [] [] [] [G3 B3 D4 F4] [] [] []
        }}},
        {{{
        hi_hat 1 0 0 0 1 0 0 0 1 0 0 0 1 0 0 0
        kick 0 0 0 0 1 0 0 0 0 0 0 0 1 0 0 0
        snare 0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0
        bass B2 0 0 0 Cb2 0 0 0 F#2 0 0 0 C2 0 0 0
        pad [C3 E3 G3 B3] [] [] [] [A3 C4 E4 G4] [] [] [] [F3 A3 C4 E4] [] [] [] [G3 B3 D4 F4] [] [] []
        }}}

        """

        pattern = r"{{{[\s\S]+?}}}"
        matches = re.findall(pattern, text, re.DOTALL)
        if not matches:
            logger.error(f"Invalid LLM format:\n{text}")
            raise ValueError("Invalid LLM format. Must be wrapped in {{{...}}}")

        bar_array = []

        for match in matches:
            match_bar = Bar.from_llm_format(match)
            bar_array.append(match_bar)

        # if len(bar_array) != length:
        #     raise ValueError(
        #         f"Incorrect number of bars generated, generated {len(bar_array)} bars not {length}"
        #     )

        return SongSection(bars=bar_array, name=name)

    def __getitem__(self, index: int) -> Bar:
        return self.bars[index]

    def apply_effects(self, effects: SectionEffects):
        """
        add effects (SectionEffects) to the bars of a section

        :param effects: A SectionEffects object
        """
        for index, bar in enumerate(self.bars):
            try:
                bar.apply_effects(effects=effects.bars[index])
            except IndexError:
                logger.warning(
                    f"IndexError when attempting to apply effect[{index}] to bar[{index}]"
                )
                continue


class Song(BaseModel):
    sections: List[SongSection] = []

    def __len__(self):
        return len(self.sections)

    def __getitem__(self, index: int) -> SongSection:
        return self.sections[index]

    def append_section(self, item: SongSection) -> None:
        self.sections.append(item)

    def add_effects(self, song_effects: SongEffects):
        for section in self.sections:
            section.apply_effects(effects=song_effects.sections[section.name])


class SongRecord(BaseModel):
    # Id is automatically generated by MongoDB
    song: Song
    created_at_utc: str
