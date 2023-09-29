from typing import Union

from langchain.chat_models.base import BaseChatModel
from langchain.llms.base import BaseLLM

from music_generator.generate_section import generate_section
from music_generator.music_generator_types import (
    MusicalMarkup,
    Song,
)


def generate_song(
    musical_markup: MusicalMarkup, llm: Union[BaseChatModel, BaseLLM]
) -> Song:
    song = Song()

    sections = musical_markup.sections

    # Note: This relies on the fact that the sections are ordered. Each section might reference a previous section.
    for section in sections.keys():
        generated_section = generate_section(
            markup_section=sections[section], prev_gens=song, llm=llm
        )
        song.append_section(generated_section)

    return song
