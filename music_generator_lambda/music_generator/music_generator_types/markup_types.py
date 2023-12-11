from typing import List, Dict
from pydantic import BaseModel, Field
import re


class MarkupInstrument(BaseModel):
    description: str
    dependencies: List[str]


class MarkupEffect(BaseModel):
    description: str


class MarkupSection(BaseModel):
    number_bars: int = Field("Number of bars in a section")
    instruments: Dict[str, MarkupInstrument] = Field("Instruments in a section")
    name: str


class MusicalMarkup(BaseModel):
    original_text: str
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
        *Effects: asdfasdf

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

                    else:
                        instruments[instrument_name] = MarkupInstrument(
                            description=description.strip(), dependencies=references
                        )
            sections_dict[section_name] = MarkupSection(
                number_bars=bars, instruments=instruments, name=section_name
            )

        return MusicalMarkup(original_text=outline, sections=sections_dict)
