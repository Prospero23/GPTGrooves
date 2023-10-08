from typing import List, Dict, Tuple
from pydantic import BaseModel, Field


class FilterInformation(BaseModel):
    filter_type: str
    filter_value: List[float]  # filter values in a bar


class EffectInformation(BaseModel):
    filter: FilterInformation


class EffectBar(BaseModel):
    drums_effects: EffectInformation = Field(
        description="Drum filter info",
        default=EffectInformation(
            filter=FilterInformation(filter_type="", filter_value=[])
        ),
    )
    bass_effects: EffectInformation = Field(
        description="Bass filter info",
        default=EffectInformation(
            filter=FilterInformation(filter_type="", filter_value=[])
        ),
    )
    pad_effects: EffectInformation = Field(
        description="Pad filter info",
        default=EffectInformation(
            filter=FilterInformation(filter_type="", filter_value=[])
        ),
    )


def chunk_list(input_list: List[float], chunk_size: int) -> List[List[float]]:
    """
    Splits a list into chunks of a specified size.
    """
    return [
        input_list[i : i + chunk_size] for i in range(0, len(input_list), chunk_size)
    ]


class SectionEffects(BaseModel):
    bars: List[EffectBar]
    name: str

    @staticmethod
    def parse_filter_string(
        s: str, sample_number: int
    ) -> Tuple[str, List[FilterInformation]]:
        """
        Parse a filter string and return the instrument name and filter info.

        :param s: Input filter string
        :param sample_number: Number of filter values per bar
        :return: A tuple containing instrument name and list of filter information
        """
        parts = s.split()

        instrument = parts[0].replace("#", "")
        if instrument not in ["drums", "bass", "pad"]:
            raise ValueError(f"Invalid instrument name: {instrument}")

        filter_type = parts[1]

        filter_values_groups = [
            parts[i : i + sample_number] for i in range(2, len(parts), sample_number)
        ]
        filter_infos = [
            FilterInformation(
                filter_type=filter_type, filter_value=list(map(float, group))
            )
            for group in filter_values_groups
        ]

        return instrument, filter_infos

    @staticmethod
    def from_llm_text(input_string: str, name: str, sample_number: int):
        """
        Parses a string in the LLM format and returns an instance of SectionEffects.

        :param input_string: A string containing the effect details in the LLM format.
        :param name: Name of the section.
        :param sample_number: Number of filter values per bar
        :return: An instance of SectionEffects.
        """
        lines = input_string.strip().split("\n")
        instrument_effects = {}

        for line in lines:
            try:
                instrument, effects = SectionEffects.parse_filter_string(
                    line, sample_number
                )
                instrument_effects[instrument] = effects
            except ValueError as ve:
                print(f"Error processing line '{line}': {ve}")

        # Ensure all instruments are present
        for instrument in ["drums", "bass", "pad"]:
            if instrument not in instrument_effects:
                instrument_effects[instrument] = [
                    FilterInformation(filter_type="", filter_value=[])
                    for _ in range(
                        len(instrument_effects[next(iter(instrument_effects))])
                    )
                ]

        num_bars = len(instrument_effects["drums"])
        bars = []
        for i in range(num_bars):
            bar = EffectBar(
                drums_effects=EffectInformation(filter=instrument_effects["drums"][i]),
                bass_effects=EffectInformation(filter=instrument_effects["bass"][i]),
                pad_effects=EffectInformation(filter=instrument_effects["pad"][i]),
            )
            bars.append(bar)

        return SectionEffects(bars=bars, name=name)


class SongEffects(BaseModel):
    sections: Dict[str, SectionEffects]  # section name: section effect

    def add_section(self, section: SectionEffects) -> None:
        """
        Adds a SectionEffects object to the sections dictionary.
        :param section: The SectionEffects object to add.
        """
        if section.name in self.sections:
            raise ValueError(f"Section named {section.name} already exists!")
        self.sections[section.name] = section
