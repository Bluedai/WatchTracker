from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    tmdb_api_key: str = ""
    db_name: str = "watchtracker.db"
    database_url: str | None = None
    tmdb_base_url: str = "https://api.themoviedb.org/3"

    model_config = {"env_file": ".env", "extra": "ignore"}

    @property
    def resolved_database_url(self) -> str:
        if self.database_url:
            return self.database_url
        return f"sqlite:///./data/{self.db_name}"


settings = Settings()
