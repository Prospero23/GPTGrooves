import logging
import os

from music_generator.music_generator_types import Config

logger = logging.getLogger(__name__)


def set_langchain_environment(config: Config) -> None:
    """
    Because Langsmith is set up _only_ by env't variables. This function sets them using config (our uniform entryway for all configuration)
    """
    if config.langchain_api_key and config.langchain_project:
        logger.info("Langchain environment variables are set. Using Langsmith.")
        os.environ["LANGCHAIN_TRACING_V2"] = "true"
        os.environ["LANGCHAIN_ENDPOINT"] = "https://api.smith.langchain.com"
        os.environ["LANGCHAIN_API_KEY"] = config.langchain_api_key
        os.environ["LANGCHAIN_PROJECT"] = config.langchain_project
