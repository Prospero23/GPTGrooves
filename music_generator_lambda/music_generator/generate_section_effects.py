import logging
from typing import Union

# from langchain import PromptTemplate
from langchain.callbacks import get_openai_callback
from langchain.chat_models import ChatOpenAI

# from langchain.schema.language_model import BaseChatModel
from langchain.chat_models.base import BaseChatModel
from langchain.llms.base import BaseLLM
from langchain.prompts import ChatPromptTemplate
from langchain.prompts.chat import HumanMessagePromptTemplate
from langchain.schema.messages import SystemMessage
from pydantic import ValidationError
from tenacity import (
    before_sleep_log,
    retry,
    retry_if_exception_type,
    stop_after_attempt,
)

from music_generator.music_generator_types import (
    Bar,
    Config,
    MarkupInstrument,
    MarkupSection,
    SongSection,
    DrumBar,
    BassBar,
    PadBar,
    Chord,
)
from music_generator.utilities.logs import get_logger

logger = get_logger(__name__)


@retry(
    # This line makes tenacity log the produced exception before sleeping for its wait-interval
    before_sleep=before_sleep_log(logger, logging.WARNING),
    retry=(
        retry_if_exception_type(ValidationError) | retry_if_exception_type(ValueError)
    ),
    stop=stop_after_attempt(3),
)
def generate_section_effects(
    markup_section: MarkupSection,
    llm: Union[BaseChatModel, BaseLLM],
) -> SongSection:
    """
    Generate the effects of a section from markup (MarkupSection).
    """
    if isinstance(llm, BaseLLM):
        raise NotImplementedError("This only works with chat models")
    else:
        # https://python.langchain.com/docs/modules/model_io/prompts/prompt_templates/#chat-prompt-template
        chat_prompt_template: ChatPromptTemplate = ChatPromptTemplate.from_messages(  # pyright: ignore[reportUnknownMemberType]
            [
                SystemMessage(
                    content="""Your job is to take a text description of the effects of a section of a song and express it in a machine readable tabular format.

# Formatting:
- Provide starting and ending number and type for the filter in a section. This value should be normalized between 0 and 1 and the type should have.
- If you do not want an effect to be present, give it a value of 1.
-Give numbers for drums, synth, and pad. Preface each of these with a #.

example:
#pad - type: lowpass start: 1.0, end: 1.0
#synth- type: hipass start: 1.0 end: 0.3
#drums- type: bandpass start: 0.7 end: 0.2

The text you produce will be programatically parsed into a song. Please follow the format instructions carefully.
""".strip()
                ),
                HumanMessagePromptTemplate.from_template("{prompt}"),
            ]
        )
        _input = chat_prompt_template.format_messages(
            prompt=f"""Realize the following description into the required format: {markup_section.instruments["Effects"]}""".strip(),
        )

        logger.debug(
            "Prompt:\n" + "\n".join([f"{x.type}: {x.content}" for x in _input])
        )

        with get_openai_callback() as cb:
            logger.info("Generating section (this make take a while)...")
            output = llm(_input)

        logger.info(
            f"Used {cb.total_tokens} tokens ({cb.prompt_tokens} prompt, {cb.completion_tokens} completion) @ ${(cb.total_cost):.3f}"
        )
        result = output.content

    logger.debug(f"Output:\n{result}")

    # return SongSection.from_llm_format(
    #     text=result, name=markup_section.name, length=markup_section.number_bars
    # )
    return result


if __name__ == "__main__":
    from dotenv import dotenv_values

    assert Bar.example() == Bar.example()
    assert Bar.from_keypairs(Bar.example().to_keypairs()) == Bar.example()
    assert Bar.from_llm_format(Bar.example().to_llm_format()) == Bar.example()

    config = Config(**dotenv_values())  # type: ignore
    llm = ChatOpenAI(
        openai_api_key=config.openai_api_key, model="gpt-4", temperature=0.1
    )
    gen_song = [
        SongSection(
            bars=[
                Bar(
                    drums=DrumBar(
                        hi_hat=[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                        kick=[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                        snare=[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                    ),
                    bass=BassBar(
                        pattern=[
                            "0",
                            "0",
                            "0",
                            "0",
                            "0",
                            "0",
                            "0",
                            "0",
                            "0",
                            "0",
                            "0",
                            "0",
                            "0",
                            "0",
                            "0",
                            "0",
                        ]
                    ),
                    pad=PadBar(
                        chord_sequence=[
                            Chord(notes=["C3", "Eb3", "G3", "Bb3"]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=["C3", "Eb3", "G3", "Bb3"]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=["C3", "Eb3", "G3", "Bb3"]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=["C3", "Eb3", "G3", "Bb3"]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                        ]
                    ),
                ),
                Bar(
                    drums=DrumBar(
                        hi_hat=[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                        kick=[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                        snare=[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                    ),
                    bass=BassBar(
                        pattern=[
                            "0",
                            "0",
                            "0",
                            "0",
                            "0",
                            "0",
                            "0",
                            "0",
                            "0",
                            "0",
                            "0",
                            "0",
                            "0",
                            "0",
                            "0",
                            "0",
                        ]
                    ),
                    pad=PadBar(
                        chord_sequence=[
                            Chord(notes=["F3", "Ab3", "C4", "Eb4"]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=["F3", "Ab3", "C4", "Eb4"]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=["F3", "Ab3", "C4", "Eb4"]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=["F3", "Ab3", "C4", "Eb4"]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                        ]
                    ),
                ),
            ],
            name="intro",
        ),
        SongSection(
            bars=[
                Bar(
                    drums=DrumBar(
                        hi_hat=[1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
                        kick=[1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
                        snare=[0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
                    ),
                    bass=BassBar(
                        pattern=[
                            "C2",
                            "0",
                            "0",
                            "C3",
                            "0",
                            "0",
                            "0",
                            "0",
                            "C2",
                            "0",
                            "0",
                            "C3",
                            "0",
                            "0",
                            "0",
                            "0",
                        ]
                    ),
                    pad=PadBar(
                        chord_sequence=[
                            Chord(notes=["C3", "E3", "G3", "B3"]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=["A3", "C4", "E4", "G4"]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=["C3", "E3", "G3", "B3"]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=["A3", "C4", "E4", "G4"]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                        ]
                    ),
                ),
                Bar(
                    drums=DrumBar(
                        hi_hat=[1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
                        kick=[1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
                        snare=[0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
                    ),
                    bass=BassBar(
                        pattern=[
                            "C2",
                            "0",
                            "0",
                            "C3",
                            "0",
                            "0",
                            "0",
                            "0",
                            "C2",
                            "0",
                            "0",
                            "C3",
                            "0",
                            "0",
                            "0",
                            "0",
                        ]
                    ),
                    pad=PadBar(
                        chord_sequence=[
                            Chord(notes=["C3", "E3", "G3", "B3"]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=["A3", "C4", "E4", "G4"]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=["C3", "E3", "G3", "B3"]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=["A3", "C4", "E4", "G4"]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                        ]
                    ),
                ),
            ],
            name="verse-1",
        ),
        SongSection(
            bars=[
                Bar(
                    drums=DrumBar(
                        hi_hat=[1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
                        kick=[1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
                        snare=[0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
                    ),
                    bass=BassBar(
                        pattern=[
                            "C2",
                            "0",
                            "C2",
                            "0",
                            "A2",
                            "0",
                            "A2",
                            "0",
                            "F2",
                            "0",
                            "F2",
                            "0",
                            "G2",
                            "0",
                            "G2",
                            "0",
                        ]
                    ),
                    pad=PadBar(
                        chord_sequence=[
                            Chord(notes=["C3", "Eb3", "G3", "Bb3"]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=["F3", "Ab3", "C4", "Eb4"]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=["Ab3", "C4", "Eb4", "G4"]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=["Eb3", "G3", "Bb3", "D4"]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                        ]
                    ),
                ),
                Bar(
                    drums=DrumBar(
                        hi_hat=[1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
                        kick=[1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
                        snare=[0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
                    ),
                    bass=BassBar(
                        pattern=[
                            "C2",
                            "0",
                            "C2",
                            "0",
                            "A2",
                            "0",
                            "A2",
                            "0",
                            "F2",
                            "0",
                            "F2",
                            "0",
                            "G2",
                            "0",
                            "G2",
                            "0",
                        ]
                    ),
                    pad=PadBar(
                        chord_sequence=[
                            Chord(notes=["C3", "Eb3", "G3", "Bb3"]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=["F3", "Ab3", "C4", "Eb4"]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=["Ab3", "C4", "Eb4", "G4"]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=["Eb3", "G3", "Bb3", "D4"]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                        ]
                    ),
                ),
                Bar(
                    drums=DrumBar(
                        hi_hat=[1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
                        kick=[1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
                        snare=[0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
                    ),
                    bass=BassBar(
                        pattern=[
                            "C2",
                            "0",
                            "C2",
                            "0",
                            "A2",
                            "0",
                            "A2",
                            "0",
                            "F2",
                            "0",
                            "F2",
                            "0",
                            "G2",
                            "0",
                            "G2",
                            "0",
                        ]
                    ),
                    pad=PadBar(
                        chord_sequence=[
                            Chord(notes=["C3", "Eb3", "G3", "Bb3"]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=["F3", "Ab3", "C4", "Eb4"]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=["Ab3", "C4", "Eb4", "G4"]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=["Eb3", "G3", "Bb3", "D4"]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                        ]
                    ),
                ),
                Bar(
                    drums=DrumBar(
                        hi_hat=[1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
                        kick=[1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
                        snare=[0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
                    ),
                    bass=BassBar(
                        pattern=[
                            "C2",
                            "0",
                            "C2",
                            "0",
                            "A2",
                            "0",
                            "A2",
                            "0",
                            "F2",
                            "0",
                            "F2",
                            "0",
                            "G2",
                            "0",
                            "G2",
                            "0",
                        ]
                    ),
                    pad=PadBar(
                        chord_sequence=[
                            Chord(notes=["C3", "Eb3", "G3", "Bb3"]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=["F3", "Ab3", "C4", "Eb4"]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=["Ab3", "C4", "Eb4", "G4"]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=["Eb3", "G3", "Bb3", "D4"]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                        ]
                    ),
                ),
            ],
            name="chorus",
        ),
        SongSection(
            bars=[
                Bar(
                    drums=DrumBar(
                        hi_hat=[1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
                        kick=[1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
                        snare=[0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
                    ),
                    bass=BassBar(
                        pattern=[
                            "C2",
                            "0",
                            "0",
                            "C3",
                            "0",
                            "0",
                            "0",
                            "0",
                            "C2",
                            "0",
                            "0",
                            "C3",
                            "0",
                            "0",
                            "0",
                            "0",
                        ]
                    ),
                    pad=PadBar(
                        chord_sequence=[
                            Chord(notes=["C3", "E3", "G3", "B3"]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=["A3", "C4", "E4", "G4"]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=["C3", "E3", "G3", "B3"]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=["A3", "C4", "E4", "G4"]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                        ]
                    ),
                ),
                Bar(
                    drums=DrumBar(
                        hi_hat=[1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
                        kick=[1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
                        snare=[0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
                    ),
                    bass=BassBar(
                        pattern=[
                            "C2",
                            "0",
                            "0",
                            "C3",
                            "0",
                            "0",
                            "0",
                            "0",
                            "C2",
                            "0",
                            "0",
                            "C3",
                            "0",
                            "0",
                            "0",
                            "0",
                        ]
                    ),
                    pad=PadBar(
                        chord_sequence=[
                            Chord(notes=["C3", "E3", "G3", "B3"]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=["A3", "C4", "E4", "G4"]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=["C3", "E3", "G3", "B3"]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=["A3", "C4", "E4", "G4"]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                        ]
                    ),
                ),
            ],
            name="verse-2",
        ),
        SongSection(
            bars=[
                Bar(
                    drums=DrumBar(
                        hi_hat=[1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
                        kick=[1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
                        snare=[0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
                    ),
                    bass=BassBar(
                        pattern=[
                            "C2",
                            "0",
                            "0",
                            "0",
                            "A2",
                            "0",
                            "0",
                            "0",
                            "F2",
                            "0",
                            "0",
                            "0",
                            "G2",
                            "0",
                            "0",
                            "0",
                        ]
                    ),
                    pad=PadBar(
                        chord_sequence=[
                            Chord(notes=["C3", "E3", "G3", "B3"]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=["A3", "C4", "E4", "G4"]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=["F3", "A3", "C4", "E4"]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=["G3", "B3", "D4", "F4"]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                        ]
                    ),
                ),
                Bar(
                    drums=DrumBar(
                        hi_hat=[1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
                        kick=[1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
                        snare=[0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
                    ),
                    bass=BassBar(
                        pattern=[
                            "C2",
                            "0",
                            "0",
                            "0",
                            "A2",
                            "0",
                            "0",
                            "0",
                            "0",
                            "0",
                            "0",
                            "0",
                            "0",
                            "0",
                            "0",
                            "0",
                        ]
                    ),
                    pad=PadBar(
                        chord_sequence=[
                            Chord(notes=["C3", "E3", "G3", "B3"]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=["A3", "C4", "E4", "G4"]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                        ]
                    ),
                ),
                Bar(
                    drums=DrumBar(
                        hi_hat=[1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
                        kick=[1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
                        snare=[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                    ),
                    bass=BassBar(
                        pattern=[
                            "0",
                            "0",
                            "0",
                            "0",
                            "0",
                            "0",
                            "0",
                            "0",
                            "0",
                            "0",
                            "0",
                            "0",
                            "0",
                            "0",
                            "0",
                            "0",
                        ]
                    ),
                    pad=PadBar(
                        chord_sequence=[
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                        ]
                    ),
                ),
                Bar(
                    drums=DrumBar(
                        hi_hat=[1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
                        kick=[1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
                        snare=[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                    ),
                    bass=BassBar(
                        pattern=[
                            "0",
                            "0",
                            "0",
                            "0",
                            "0",
                            "0",
                            "0",
                            "0",
                            "0",
                            "0",
                            "0",
                            "0",
                            "0",
                            "0",
                            "0",
                            "0",
                        ]
                    ),
                    pad=PadBar(
                        chord_sequence=[
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                        ]
                    ),
                ),
                Bar(
                    drums=DrumBar(
                        hi_hat=[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                        kick=[1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
                        snare=[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                    ),
                    bass=BassBar(
                        pattern=[
                            "0",
                            "0",
                            "0",
                            "0",
                            "0",
                            "0",
                            "0",
                            "0",
                            "0",
                            "0",
                            "0",
                            "0",
                            "0",
                            "0",
                            "0",
                            "0",
                        ]
                    ),
                    pad=PadBar(
                        chord_sequence=[
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                        ]
                    ),
                ),
                Bar(
                    drums=DrumBar(
                        hi_hat=[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                        kick=[1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
                        snare=[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                    ),
                    bass=BassBar(
                        pattern=[
                            "0",
                            "0",
                            "0",
                            "0",
                            "0",
                            "0",
                            "0",
                            "0",
                            "0",
                            "0",
                            "0",
                            "0",
                            "0",
                            "0",
                            "0",
                            "0",
                        ]
                    ),
                    pad=PadBar(
                        chord_sequence=[
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                        ]
                    ),
                ),
                Bar(
                    drums=DrumBar(
                        hi_hat=[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                        kick=[1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
                        snare=[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                    ),
                    bass=BassBar(
                        pattern=[
                            "0",
                            "0",
                            "0",
                            "0",
                            "0",
                            "0",
                            "0",
                            "0",
                            "0",
                            "0",
                            "0",
                            "0",
                            "0",
                            "0",
                            "0",
                            "0",
                        ]
                    ),
                    pad=PadBar(
                        chord_sequence=[
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                        ]
                    ),
                ),
                Bar(
                    drums=DrumBar(
                        hi_hat=[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                        kick=[1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
                        snare=[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                    ),
                    bass=BassBar(
                        pattern=[
                            "0",
                            "0",
                            "0",
                            "0",
                            "0",
                            "0",
                            "0",
                            "0",
                            "0",
                            "0",
                            "0",
                            "0",
                            "0",
                            "0",
                            "0",
                            "0",
                        ]
                    ),
                    pad=PadBar(
                        chord_sequence=[
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                            Chord(notes=[]),
                        ]
                    ),
                ),
            ],
            name="outro",
        ),
    ]

    sections = {
        "intro": MarkupSection(
            number_bars=8,
            instruments={
                "Pad": MarkupInstrument(
                    description="The song begins with a warm, lush synth pad playing a simple two-chord progression (Cmin7 - Fmin7) with a slow attack and release, creating a dreamy, ethereal atmosphere.",
                    dependencies=[],
                ),
                "Bass": MarkupInstrument(
                    description="The bass is silent in this section.", dependencies=[]
                ),
                "Drums": MarkupInstrument(
                    description="The drums are also silent in this section.",
                    dependencies=[],
                ),
                "Effects": MarkupInstrument(
                    description="A low-pass filter is gradually opened on the pad throughout this section, slowly revealing the higher frequencies and creating a sense of anticipation.",
                    dependencies=[],
                ),
            },
            name="intro",
        ),
        "verse-1": MarkupSection(
            number_bars=16,
            instruments={
                "Pad": MarkupInstrument(
                    description="The pad continues the same two-chord progression from the intro, but now with a faster attack and release, giving it a more rhythmic feel.",
                    dependencies=[],
                ),
                "Bass": MarkupInstrument(
                    description="The bass enters here, playing a syncopated rhythm that emphasizes the off-beats, adding a sense of groove. The notes are primarily root notes of the chords, with occasional octave jumps for variation.",
                    dependencies=[],
                ),
                "Drums": MarkupInstrument(
                    description="The drums kick in with a classic house beat: a kick on every beat, a snare on the 2nd and 4th, and a hi-hat playing eighth notes. This drives the rhythm forward and establishes the danceable feel of the track.",
                    dependencies=[],
                ),
                "Effects": MarkupInstrument(
                    description="A high-pass filter is applied to the bass, gradually removing the lower frequencies over the course of this section. This creates a sense of tension and anticipation for the chorus.",
                    dependencies=[],
                ),
            },
            name="verse-1",
        ),
        "chorus": MarkupSection(
            number_bars=16,
            instruments={
                "Pad": MarkupInstrument(
                    description="The pad switches to a four-chord progression (Cmin7 - Fmin7 - Abmaj7 - Ebmaj7), adding more harmonic complexity and interest.",
                    dependencies=[],
                ),
                "Bass": MarkupInstrument(
                    description="The bass follows the chord progression, playing a more complex rhythm that includes sixteenth-note runs and syncopated accents.",
                    dependencies=[],
                ),
                "Drums": MarkupInstrument(
                    description="The drums continue the house beat from the verse, but with added snare rolls and open hi-hat hits for extra energy.",
                    dependencies=[],
                ),
                "Effects": MarkupInstrument(
                    description="The high-pass filter on the bass is removed, bringing back the full frequency range and creating a powerful, full-bodied sound. A low-pass filter is applied to the pad, gradually reducing the higher frequencies over the course of this section to create a sense of closure.",
                    dependencies=[],
                ),
            },
            name="chorus",
        ),
        "verse-2": MarkupSection(
            number_bars=16,
            instruments={
                "Pad": MarkupInstrument(
                    description="The pad returns to the two-chord progression from %verse-1, but with a different voicing to keep things fresh.",
                    dependencies=["verse-1"],
                ),
                "Bass": MarkupInstrument(
                    description="The bass also returns to the simpler rhythm from %verse-1, but with occasional variations to keep the listener engaged.",
                    dependencies=["verse-1"],
                ),
                "Drums": MarkupInstrument(
                    description="The drums continue the house beat, but with less intensity than in the chorus to create a sense of contrast.",
                    dependencies=[],
                ),
                "Effects": MarkupInstrument(
                    description="A band-pass filter is applied to the pad, gradually sweeping up and down the frequency spectrum to create a sense of movement and interest.",
                    dependencies=[],
                ),
            },
            name="verse-2",
        ),
        "outro": MarkupSection(
            number_bars=8,
            instruments={
                "Pad": MarkupInstrument(
                    description="The pad fades out slowly, leaving just the echo of the last chord hanging in the air.",
                    dependencies=[],
                ),
                "Bass": MarkupInstrument(
                    description="The bass also fades out, playing a simple, slow rhythm that echoes the pad.",
                    dependencies=[],
                ),
                "Drums": MarkupInstrument(
                    description="The drums gradually simplify, eventually leaving just the kick drum playing on every beat.",
                    dependencies=[],
                ),
                "Effects": MarkupInstrument(
                    description="A low-pass filter is applied to all instruments, gradually reducing the higher frequencies until only the low rumble of the kick drum remains. This creates a sense of finality and closure.",
                    dependencies=[],
                ),
            },
            name="outro",
        ),
    }
    for section in sections:
        generated_section = generate_section_effects(
            markup_section=sections[section], llm=llm
        )
        print("description: ", sections[section].instruments["Effects"])
        print("section: ", generated_section)

    # logger.info(f"Generated song:\n{result}")

# store previouss sections stuff -> keep running total of previous sections that can be referenced
# section_names = list(sections.keys())
