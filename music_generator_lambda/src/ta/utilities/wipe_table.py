from ta.db import get_table
from ta.ta_types import TaConfig
from ta.utilities.logs import get_logger
from dotenv import dotenv_values


logger = get_logger(__name__)

if __name__ == "__main__":
    logger.warning("Wiping table...")
    config = TaConfig.from_dotenv_values(dotenv_values())
    table = get_table(config)
    for item in table.scan()["Items"]:
        table.delete_item(Key={"Id": item["Id"], "CreatedAt": item["CreatedAt"]})
    logger.warning("Table wiped.")
