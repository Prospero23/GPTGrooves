from langchain import OpenAI, PromptTemplate
from langchain.output_parsers import PydanticOutputParser
from pydantic import BaseModel, Field, validator

from music_generator.types import Config


class Bar(BaseModel):
    drums: list[int] = Field(description="Drum track. 1 = hit, 0 = rest.")

    @validator("drums")
    def validate_drums(cls, field):
        if len(field) != 16:
            raise ValueError("Drum track must be 16 notes long.")
        return field

    @validator("drums", each_item=True)
    def validate_item(cls, item):
        if item not in (0, 1):
            raise ValueError("Drum value must be 0 or 1.")
        return item


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
    _input = prompt.format_prompt(query="Generate a drum track with 16 notes.")
    output = llm.predict(_input.to_string())

    return parser.parse(output)


if __name__ == "__main__":
    from dotenv import dotenv_values

    bar = generate_bar(config=Config(**dotenv_values()))
    print(bar)
