import hashlib
import json
import os
import sqlite3

from ta.utilities.logs import get_logger


logger = get_logger(__name__)


def memoize_to_sqlite(filename: str = "cache.db"):
    """
    Memoization decorator that caches the output of a method in a SQLite
    database.
    """
    if "AWS_LAMBDA_FUNCTION_NAME" in os.environ or "NOCACHE" in os.environ:
        # print("Warning, using /tmp/ for cache because we're on AWS Lambda.")
        # filename = "/tmp/" + filename
        logger.warning("Not cacheing because we're on AWS Lambda.")
        # Nop decorator
        return lambda x: x

    db_conn = sqlite3.connect(filename)
    db_conn.execute(
        "CREATE TABLE IF NOT EXISTS cache (hash TEXT PRIMARY KEY, result TEXT)"
    )

    def memoize(func):
        def wrapped(*args, **kwargs):
            # Compute the hash of the <function name>:<arguments>:<keyword arguments>
            sorted_kwargs = sorted(kwargs.items())
            xs = f"{func.__name__}:{repr(tuple(args))}:{repr(tuple(sorted_kwargs))}".encode(
                "utf-8"
            )
            arg_hash = hashlib.sha256(xs).hexdigest()

            # Check if the result is already cached
            cursor = db_conn.cursor()
            cursor.execute("SELECT result FROM cache WHERE hash = ?", (arg_hash,))
            row = cursor.fetchone()
            if row is not None:
                logger.info(f"Cache hit: {filename} {arg_hash[-8:]}")
                return json.loads(row[0])

            # Compute the result and cache it
            result = func(*args, **kwargs)
            cursor.execute(
                "INSERT INTO cache (hash, result) VALUES (?, ?)",
                (arg_hash, json.dumps(result)),
            )
            db_conn.commit()

            return result

        return wrapped

    return memoize
