import logging
import os
from typing import Optional


def get_logger(name: str, level: Optional[int] = None):
    assert os.environ.get("PYTHON_LOG_LEVEL", "INFO") in (
        "FATAL",
        "CRITICAL",
        "ERROR",
        "WARNING",
        "WARN",
        "WARNING",
        "INFO",
        "DEBUG",
        "NOTSET",
    )
    level = level or getattr(
        logging, os.environ.get("PYTHON_LOG_LEVEL", "INFO").upper()
    )
    # Create a logger
    logger = logging.getLogger(name)

    # Avoid duplicate log messages if the logger is already configured
    if not logger.handlers:
        # Set the log level of the logger to DEBUG
        logger.setLevel(level)

        # Create a handler
        handler = logging.StreamHandler()

        # Set the log level of the handler to DEBUG
        handler.setLevel(level)

        # Create a formatter and add it to the handler
        formatter = logging.Formatter(
            "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
        )
        handler.setFormatter(formatter)

        # Add the handler to the logger
        logger.addHandler(handler)

    return logger
