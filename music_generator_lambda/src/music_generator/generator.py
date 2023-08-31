from langchain import OpenAI, PromptTemplate
from music_generator.music_generator_types import Bar, Config
from music_generator.utilities.logs import get_logger
from langchain.callbacks import get_openai_callback


logger = get_logger(__name__)


def generate_bar(config: Config) -> Bar:
    llm = OpenAI(openai_api_key=config.openai_api_key)

    # model_name = "text-davinci-003"
    # temperature = 0.0
    # model = OpenAI(model_name=model_name, temperature=temperature)

    # Set up a parser + inject instructions into the prompt template.

    # Note, {{ in an fstring produces a single {
    format_instructions = f"""Your format should be an instrument followed by sixteenth notes, separated by spaces.
Your output should be wrapped in {{{{{{ and }}}}}} for me to extract. The music should be formatted as follows:
{Bar.example().to_llm_format()}
"""

    prompt = PromptTemplate(
        template="Answer the user query.\n{format_instructions}\n{query}\n",
        input_variables=["query"],
        partial_variables={"format_instructions": format_instructions},
    )

    _input = prompt.format_prompt(query="Generate an interesting bar of a house song.")

    logger.debug(f"Prompt:\n{_input.to_string()}")

    with get_openai_callback() as cb:
        output = llm.predict(_input.to_string())

    logger.info(
        f"Used {cb.total_tokens} tokens ({cb.prompt_tokens} prompt, {cb.completion_tokens} completion) @ ${(cb.total_cost):.3f}"
    )
    logger.debug(f"Output:\n{output}")

    deserialized_bar = Bar.from_llm_format(output)

    return deserialized_bar


if __name__ == "__main__":
    from dotenv import dotenv_values

    assert Bar.example() == Bar.example()
    assert Bar.from_keypairs(Bar.example().to_keypairs()) == Bar.example()
    assert Bar.from_llm_format(Bar.example().to_llm_format()) == Bar.example()
    bar = generate_bar(config=Config(**dotenv_values()))  # type: ignore
    logger.info(f"Generated Bar:\n{bar}")
