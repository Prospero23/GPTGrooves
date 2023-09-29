from decimal import Decimal
from typing import Optional, TypeVar, List, Dict
from pydantic import BaseModel, Field, validator
import re

from music_generator.utilities.logs import get_logger

logger = get_logger(__name__)


# This file dictates musicData.ts. If you modify this, modify that.
class Config(BaseModel):
    openai_api_key: str
    anyscale_api_token: str
    atlas_cluster_uri: str
    db_name: str
    # If None, don't cache
    llm_cache_filename: Optional[str]


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


class DrumBar(BaseModel):
    hi_hat: list[int] = Field(description="Hi-hat track, 16ths. 1 = hit, 0 = rest.")
    kick: list[int] = Field(description="Kick track, 16ths. 1 = hit, 0 = rest.")
    snare: list[int] = Field(description="Snare track, 16ths. 1 = hit, 0 = rest.")

    def to_keypairs(self) -> dict[str, str]:
        # Yep this is a special case, returns a dict
        return {
            drum_type: " ".join([str(val) for val in sequence])
            for drum_type, sequence in self.dict().items()
        }

    @staticmethod
    def from_keypairs(data: dict[str, str]) -> "DrumBar":
        # fmt: off
        assert not data["hi_hat"].startswith("hi_hat "), "Invalid structured text format. Only pass data."
        assert not data["kick"].startswith("kick "), "Invalid structured text format. Only pass data."
        assert not data["snare"].startswith("snare "), "Invalid structured text format. Only pass data."
        # fmt: on
        return DrumBar(
            hi_hat=[int(val) for val in data["hi_hat"].split()],
            kick=[int(val) for val in data["kick"].split()],
            snare=[int(val) for val in data["snare"].split()],
        )

    @validator("hi_hat", "kick", "snare")
    def validate_drums(cls, field: list[int]) -> list[int]:
        if len(field) != 16:
            raise ValueError("Drum track must be 16 notes long.")
        return field

    @validator("hi_hat", "kick", "snare", each_item=True)
    def validate_item(cls, item: int) -> int:
        if item not in (0, 1):
            raise ValueError("Drum value must be 0 or 1.")
        return item


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
    chord_sequence: list[Chord]

    @validator("chord_sequence")
    def validate_combinations(cls, field: list[str]) -> list[str]:
        # Ensure that the initial length of `field` is a power of 2 and less than or equal to 16
        if len(field) not in {1, 2, 4, 8, 16}:
            raise ValueError(
                "Initial length of field must be an exact power of two among {1, 2, 4, 8, 16}."
            )
        if len(field) != 16:
            logger.info(
                f"Did not receive 16 notes for Pad. Expanding {len(field)} notes to 16."
            )
        return expand_if_necessary(field, 16)

    def to_keypairs(self) -> dict[str, str]:
        """
        The format is as follows:
        pad [C3 E3 G3 B3] [] [] [] [A3 C4 E4 G4] [] [] [] [F3 A3 C4 E4] [] [] [] [G3 B3 D4 F4] [] [] []
        """
        # Convert each Chord object's notes to a string representation
        chord_strings = [" ".join(chord.notes) for chord in self.chord_sequence]

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


class EffectsBar(BaseModel):
    delay: list[Decimal] = Field(
        description="Delay value at each 16th note. 0.0 = off, 1.0 = full."
    )
    reverb: list[Decimal] = Field(
        description="Reverb value at each 16th note. 0.0 = off, 1.0 = full."
    )

    def to_keypairs(self) -> dict[str, str]:
        # Yep this is a special case, returns a dict
        return {
            effect_type: " ".join([str(val) for val in sequence])
            for effect_type, sequence in self.dict().items()
        }

    @staticmethod
    def from_keypairs(data: dict[str, str]) -> "EffectsBar":
        # fmt: off
        assert not data["delay"].startswith("delay "), "Invalid structured text format. Only pass data."
        assert not data["reverb"].startswith("reverb "), "Invalid structured text format. Only pass data."
        # fmt: on
        return EffectsBar(
            # Quantize to 2 decimal places
            delay=[
                Decimal(val).quantize(Decimal("1.00")) for val in data["delay"].split()
            ],
            reverb=[
                Decimal(val).quantize(Decimal("1.00")) for val in data["reverb"].split()
            ],
        )

    @validator("delay", "reverb")
    def validate_drums(cls, field: list[int]) -> list[int]:
        if len(field) != 16:
            raise ValueError("Drum track must be 16 notes long.")
        return field

    @validator("delay", "reverb", each_item=True)
    def validate_item(cls, item: int) -> int:
        if not Decimal("0.0") <= Decimal(item) <= Decimal("1.0"):
            raise ValueError("Drum value must be between 0 and 1.")
        return item


class Bar(BaseModel):
    drums: DrumBar = Field(description="Drum track.")
    bass: BassBar = Field(description="Bass line.")
    pad: PadBar = Field(description="Pad track.")
    effects: Optional[EffectsBar] = Field(description="Effects track.")

    def __getitem__(self, key: str):
        if key.upper() == "DRUMS":
            return self.drums
        elif key.upper() == "BASS":
            return self.bass
        elif key.upper() == "PAD":
            return self.pad
        elif key.upper() == "EFFECTS":
            return self.effects
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
            ),
            effects=EffectsBar(
                delay=[
                    # Generate a ramp of two digit decimals from 0.0 to 1.0 with 16 steps
                    Decimal(val).quantize(Decimal("1.00")) for val in [i / 15 for i in range(16)]
                ],
                reverb=list(reversed([
                    # Generate a ramp of two digit decimals from 0.0 to 1.0 with 16 steps
                    Decimal(val).quantize(Decimal("1.00")) for val in [i / 15 for i in range(16)]
                ])),
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
        delay 0.00 0.07 0.13 0.20 0.27 0.33 0.40 0.47 0.53 0.60 0.67 0.73 0.80 0.87 0.93 1.00
        reverb 1.00 0.93 0.87 0.80 0.73 0.67 0.60 0.53 0.47 0.40 0.33 0.27 0.20 0.13 0.07 0.00
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
        data = {
            k: [
                line[len(k) + 1 :]
                for line in filter(lambda line: line.startswith(k), lines)
            ]
            for k in ("hi_hat", "kick", "snare", "bass", "pad", "delay", "reverb")
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
            effects=EffectsBar.from_keypairs({k: v for k, v in data.items() if k in ("delay", "reverb")})
            # fmt: on
        )

    def to_keypairs(self) -> dict[str, str]:
        """
        :return: A dictionary of instrument names to their structured text representation.
        """
        drums = self.drums.to_keypairs()
        bass = self.bass.to_keypairs()
        pad = self.pad.to_keypairs()
        effects = self.effects.to_keypairs() if self.effects else {}
        return {
            "hi_hat": drums["hi_hat"],
            "kick": drums["kick"],
            "snare": drums["snare"],
            "bass": bass["bass"],
            "pad": pad["pad"],
            "delay": effects["delay"],
            "reverb": effects["reverb"],
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
                    "delay " + structured_text["delay"],
                    "reverb " + structured_text["reverb"],
                ]
            )
            + "\n}}}"
        )


class MarkupInstrument(BaseModel):
    description: str
    dependencies: List[str]


class MarkupSection(BaseModel):
    number_bars: int = Field("Number of bars in a section")
    instruments: Dict[str, MarkupInstrument] = Field("Instruments in a section")
    name: str


class MusicalMarkup(BaseModel):
    sections: Dict[str, MarkupSection] = Field("SONG")

    @staticmethod
    def from_outline(outline: str) -> "MusicalMarkup":
        """
        Converts the string generated by Langchain to MusicalMarkup Class

        example input:
        ##Intro (4 bars)
        *Pad: asdfadsfadfafd
        *Bass: asdfasdfasdf %outro
        *Drums: asdhadfiodf
        *Effects: asdfasdfasdf

        """
        sections_list = outline.split("##")[1:]

        if not sections_list:
            raise ValueError("No sections found in the provided outline.")

        sections_dict = {}
        for section in sections_list:
            # Process MarkupSection
            lines = section.split("\n")
            if not lines:
                raise ValueError(f"Empty section found: {section}")

            # get section name and number of bars
            match = re.search(r"(\w+-?\d?)\s*\((\d+)\s*bars?\)", lines[0])
            if not match:
                raise ValueError(
                    f"Improper format for title and bars in section: {lines[0]}"
                )
            section_name = match.group(1)
            bars = int(match.group(2))

            instruments = {}
            for line in lines[1:]:
                if line:
                    # Process MarkupInstrument
                    parts = line.split(" - ", 1)
                    if len(parts) != 2:
                        raise ValueError(
                            f"Expected 'instrument - description', but got: {line}"
                        )

                    instrument, description = parts
                    references = [
                        match[0] for match in re.findall(r"%(\w+(-\d+)?)", description)
                    ]

                    instrument_name = instrument.replace("*", "").strip()
                    if not instrument_name:
                        raise ValueError(f"Invalid instrument name in line: {line}")

                    instruments[instrument_name] = MarkupInstrument(
                        description=description.strip(), dependencies=references
                    )

            sections_dict[section_name] = MarkupSection(
                number_bars=bars, instruments=instruments, name=section_name
            )

        return MusicalMarkup(sections=sections_dict)


class SongSection(BaseModel):
    bars: List[Bar] = Field(description="The list of actualized bars")
    name: str

    @staticmethod
    def from_llm_format(text: str, name: str, length: int) -> "SongSection":
        """
        :param text: A string representation of the section in the format expected by the LLM.
        :param name: A string representation of the section name.
        :param name: An int representing number of bars that should be made.
        :return: A SongSection object.

        The format is as follows:

        {{{
        hi_hat 1 0 0 0 1 0 0 0 1 0 0 0 1 0 0 0
        kick 0 0 0 0 1 0 0 0 0 0 0 0 1 0 0 0
        snare 0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0
        bass B2 0 0 0 Cb2 0 0 0 F#2 0 0 0 C2 0 0 0
        pad [C3 E3 G3 B3] [] [] [] [A3 C4 E4 G4] [] [] [] [F3 A3 C4 E4] [] [] [] [G3 B3 D4 F4] [] [] []
        delay 0.00 0.07 0.13 0.20 0.27 0.33 0.40 0.47 0.53 0.60 0.67 0.73 0.80 0.87 0.93 1.00
        }}},
        {{{
        hi_hat 1 0 0 0 1 0 0 0 1 0 0 0 1 0 0 0
        kick 0 0 0 0 1 0 0 0 0 0 0 0 1 0 0 0
        snare 0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0
        bass B2 0 0 0 Cb2 0 0 0 F#2 0 0 0 C2 0 0 0
        pad [C3 E3 G3 B3] [] [] [] [A3 C4 E4 G4] [] [] [] [F3 A3 C4 E4] [] [] [] [G3 B3 D4 F4] [] [] []
        delay 0.00 0.07 0.13 0.20 0.27 0.33 0.40 0.47 0.53 0.60 0.67 0.73 0.80 0.87 0.93 1.00
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


class Song(BaseModel):
    sections: List[SongSection] = []

    def __len__(self):
        return len(self.sections)

    def __getitem__(self, index: int) -> SongSection:
        return self.sections[index]

    def append_section(self, item: SongSection) -> None:
        self.sections.append(item)


class SongRecord(BaseModel):
    # Id is automatically generated by MongoDB
    song: Song
    created_at_utc: str
