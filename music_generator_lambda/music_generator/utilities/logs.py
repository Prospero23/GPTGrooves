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
    logger.setLevel(logging.INFO)

    return logger
