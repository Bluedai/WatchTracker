from datetime import datetime

from pydantic import BaseModel, Field


# --- TMDB Search ---
class TMDBSearchResult(BaseModel):
    tmdb_id: int
    name: str
    name_de: str | None = None
    overview: str | None = None
    poster_path: str | None = None
    first_air_date: str | None = None
    already_added: bool = False


class SearchResponse(BaseModel):
    results: list[TMDBSearchResult]
    total_results: int


# --- Series ---
class SeriesCreate(BaseModel):
    tmdb_id: int


class SeriesUpdate(BaseModel):
    name_override: str | None = None
    overview_override: str | None = None


class TagCreate(BaseModel):
    name: str


class TagUpdate(BaseModel):
    name: str


class SeriesTagsUpdate(BaseModel):
    tag_ids: list[int] = Field(default_factory=list)


class TagResponse(BaseModel):
    id: int
    name: str

    model_config = {"from_attributes": True}


class SeasonBrief(BaseModel):
    id: int
    season_number: int
    display_name: str
    poster_path: str | None
    episode_count: int
    watched_count: int
    has_override: bool
    missing_from_api: bool

    model_config = {"from_attributes": True}


class SeriesResponse(BaseModel):
    id: int
    tmdb_id: int
    name_en: str
    name_de: str | None
    name_override: str | None
    display_name: str
    overview_en: str | None
    overview_de: str | None
    overview_override: str | None
    display_overview: str | None
    poster_path: str | None
    first_air_date: str | None
    status: str | None
    total_seasons: int
    has_override: bool
    missing_from_api: bool
    last_synced_at: datetime | None
    created_at: datetime
    updated_at: datetime
    tags: list[TagResponse] = Field(default_factory=list)

    model_config = {"from_attributes": True}


class SeriesListItem(BaseModel):
    id: int
    tmdb_id: int
    display_name: str
    poster_path: str | None
    first_air_date: str | None
    status: str | None
    total_seasons: int
    total_episodes: int
    watched_episodes: int
    has_override: bool
    missing_from_api: bool
    last_synced_at: datetime | None
    tags: list[TagResponse] = Field(default_factory=list)

    model_config = {"from_attributes": True}


class SeriesDetail(SeriesResponse):
    seasons: list[SeasonBrief]


# --- Season ---
class SeasonUpdate(BaseModel):
    name_override: str | None = None
    overview_override: str | None = None


class EpisodeBrief(BaseModel):
    id: int
    episode_number: int
    display_name: str
    air_date: str | None
    runtime: int | None
    is_watched: bool
    ignore_in_progress: bool
    watch_count: int
    has_override: bool
    missing_from_api: bool
    still_path: str | None

    model_config = {"from_attributes": True}


class SeasonResponse(BaseModel):
    id: int
    series_id: int
    tmdb_id: int | None
    season_number: int
    name_en: str
    name_de: str | None
    name_override: str | None
    display_name: str
    overview_en: str | None
    overview_de: str | None
    overview_override: str | None
    poster_path: str | None
    air_date: str | None
    episode_count: int
    has_override: bool
    missing_from_api: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class SeasonDetail(SeasonResponse):
    episodes: list[EpisodeBrief]
    series_name: str


# --- Episode ---
class EpisodeUpdate(BaseModel):
    name_override: str | None = None
    overview_override: str | None = None


class EpisodeIgnoreUpdate(BaseModel):
    ignore_in_progress: bool


class SeasonIgnoreUpdate(BaseModel):
    ignore_in_progress: bool


class SeasonIgnoreResponse(BaseModel):
    season_id: int
    updated_episodes: int
    ignore_in_progress: bool


class WatchEntryBrief(BaseModel):
    id: int
    watched_at: datetime
    notes: str | None

    model_config = {"from_attributes": True}


class EpisodeResponse(BaseModel):
    id: int
    season_id: int
    tmdb_id: int | None
    episode_number: int
    name_en: str
    name_de: str | None
    name_override: str | None
    display_name: str
    overview_en: str | None
    overview_de: str | None
    overview_override: str | None
    display_overview: str | None
    air_date: str | None
    still_path: str | None
    runtime: int | None
    is_watched: bool
    ignore_in_progress: bool
    has_override: bool
    missing_from_api: bool
    created_at: datetime
    updated_at: datetime
    watch_entries: list[WatchEntryBrief]
    season_number: int | None = None
    series_id: int | None = None
    series_name: str | None = None

    model_config = {"from_attributes": True}


# --- Watch Entry ---
class WatchEntryCreate(BaseModel):
    watched_at: datetime | None = None
    notes: str | None = None


class WatchEntryUpdate(BaseModel):
    watched_at: datetime | None = None
    notes: str | None = None


class WatchEntryResponse(BaseModel):
    id: int
    episode_id: int
    watched_at: datetime
    notes: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class WatchHistoryItem(BaseModel):
    id: int
    watched_at: datetime
    notes: str | None
    episode_id: int
    episode_number: int
    episode_name: str
    season_number: int
    series_id: int
    series_name: str
    series_poster_path: str | None


# --- Progress ---
class ProgressResponse(BaseModel):
    total_episodes: int
    watched_episodes: int
    percentage: float
    seasons: list[dict] | None = None


# --- Stats ---
class StatsResponse(BaseModel):
    total_series: int
    total_episodes: int
    total_watched: int
    total_watch_entries: int
    percentage: float
