from langchain import OpenAI, PromptTemplate
from langchain.output_parsers import PydanticOutputParser
from pydantic import BaseModel, Field, validator

from music_generator.types import Config


class BassBar(BaseModel):
    # "bass": {
    #   "pattern": ["C3", "0", "0", "0", "E3", "0", "0", "0", "F3", "0", "0", "0", "G3", "0", "0", "0"]
    # },
    pattern: list[str] = Field(
        description="Bass-line of a house song. Sixteenth notes. '0' = rest, 'Cb3' = C-flat 3 note, 'E2' = E2 note, 'G#4' = G-sharp 4 note, etc."
    )

    @validator("pattern")
    def validate_note_count(cls, field):
        if len(field) != 16:
            raise ValueError("Bass line must be 16 notes long.")
        return field

    # @validator("pattern", each_item=True)
    # def validate_item(cls, item):
    #     if len(item) == 1 and item == "0":
    #         return item

    #     item not in (0, 1):
    #     raise ValueError("Drum value must be 0 or 1.")
    # return item


class DrumBar(BaseModel):
    hi_hat: list[int] = Field(description="Hi-hat track, 16ths. 1 = hit, 0 = rest.")
    kick: list[int] = Field(description="Kick track, 16ths. 1 = hit, 0 = rest.")
    snare: list[int] = Field(description="Snare track, 16ths. 1 = hit, 0 = rest.")

    @validator("hi_hat", "kick", "snare")
    def validate_drums(cls, field):
        if len(field) != 16:
            raise ValueError("Drum track must be 16 notes long.")
        return field

    @validator("hi_hat", "kick", "snare", each_item=True)
    def validate_item(cls, item):
        if item not in (0, 1):
            raise ValueError("Drum value must be 0 or 1.")
        return item


class Chord(BaseModel):
    notes: list[str] = Field(
        description="List of notes in the chord. If rest, then empty list. ['C3', 'E3', 'G3', 'B3'] = C major 7, 3rd octave; ['G#4', 'C5', 'D#5', 'F#5'] = G-sharp dominant 7, 4th octave; [] = rest"
    )


class Pad(BaseModel):
    chord_sequence: list[Chord]

    @validator("chord_sequence")
    def validate_combinations(cls, field):
        if len(field) != 16:
            raise ValueError("Drum track must be 16 notes long.")
        return field


class Bar(BaseModel):
    drums: DrumBar = Field(description="Drum track.")
    bass_line: BassBar = Field(description="Bass line.")
    pad: Pad = Field(description="Pad track.")


def generate_bar(config: Config) -> Bar:
    llm = OpenAI(openai_api_key=config.openai_api_key)

    # model_name = "text-davinci-003"
    # temperature = 0.0
    # model = OpenAI(model_name=model_name, temperature=temperature)

    # Set up a parser + inject instructions into the prompt template.
    parser = PydanticOutputParser(pydantic_object=Bar)

    prompt = PromptTemplate(
        template="Answer the user query.\n{format_instructions}\n{query}\n",
        input_variables=["query"],
        partial_variables={"format_instructions": parser.get_format_instructions()},
    )
    # fmt: off
    demo = Bar(
        drums=DrumBar(
            hi_hat=[1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
            kick=[1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
            snare=[0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0]
        ),
        bass_line=BassBar(
            pattern=['B2', '0', '0', '0', 'C#2', '0', '0', '0', 'F#2', '0', '0', '0', 'C2', '0', '0', '0']
        ),
        pad=Pad(
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
    )
    # fmt: on
    _input = prompt.format_prompt(
        query=f"An example might be as follows: \n```{demo.json()}```\n. Generate an interesting bar of a house song."
    )
    output = llm.predict(_input.to_string())

    return parser.parse(output)


if __name__ == "__main__":
    from dotenv import dotenv_values

    bar = generate_bar(config=Config(**dotenv_values()))
    print(bar)
