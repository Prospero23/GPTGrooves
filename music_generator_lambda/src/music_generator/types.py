from pydantic import BaseModel


class Config(BaseModel):
    openai_api_key: str
    atlas_cluster_uri: str
