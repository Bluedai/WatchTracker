from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    tmdb_api_key: str = ""
    database_url: str = "sqlite:///./data/serien_tracker.db"
    tmdb_base_url: str = "https://api.themoviedb.org/3"

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
