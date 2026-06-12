import logging
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models import Episode, Season, Series
from app.services.tmdb import tmdb_client

logger = logging.getLogger(__name__)


async def sync_series_from_tmdb(db: Session, series: Series) -> Series:
    """Sync a series and all its seasons/episodes from TMDB.

    - Only updates API-sourced columns, never touches *_override columns.
    - Uses UPSERT logic based on unique constraints.
    - Marks entities missing from API response with missing_from_api=True.
    """
    details = await tmdb_client.get_series_details(series.tmdb_id)

    # Update series API fields only
    series.name_en = details["name_en"]
    series.name_de = details["name_de"]
    series.overview_en = details["overview_en"]
    series.overview_de = details["overview_de"]
    series.poster_path = details["poster_path"]
    series.first_air_date = details["first_air_date"]
    series.status = details["status"]
    series.total_seasons = details["total_seasons"]
    series.missing_from_api = False

    # Track which season numbers we see from API
    api_season_numbers = set()

    # Build lookup of English season names
    en_seasons = {s.get("season_number"): s for s in details.get("seasons_en", [])}

    for api_season in details.get("seasons", []):
        season_number = api_season.get("season_number")
        if season_number is None:
            continue
        api_season_numbers.add(season_number)

        en_season = en_seasons.get(season_number, {})

        # Upsert season
        db_season = (
            db.query(Season)
            .filter(Season.series_id == series.id, Season.season_number == season_number)
            .first()
        )

        if db_season is None:
            db_season = Season(series_id=series.id, season_number=season_number)
            db.add(db_season)

        db_season.tmdb_id = api_season.get("id")
        db_season.name_de = api_season.get("name") or None
        db_season.name_en = en_season.get("name", api_season.get("name", ""))
        db_season.overview_de = api_season.get("overview") or None
        db_season.overview_en = en_season.get("overview") or None
        db_season.poster_path = api_season.get("poster_path")
        db_season.air_date = api_season.get("air_date")
        db_season.episode_count = api_season.get("episode_count", 0)
        db_season.missing_from_api = False

        db.flush()

        # Fetch full season details with episodes
        try:
            season_details = await tmdb_client.get_season_details(series.tmdb_id, season_number)
        except Exception:
            logger.warning("Failed to fetch season %d for series %d", season_number, series.tmdb_id)
            continue

        api_episode_numbers = set()

        for api_ep in season_details.get("episodes", []):
            ep_number = api_ep["episode_number"]
            api_episode_numbers.add(ep_number)

            db_episode = (
                db.query(Episode)
                .filter(Episode.season_id == db_season.id, Episode.episode_number == ep_number)
                .first()
            )

            if db_episode is None:
                db_episode = Episode(season_id=db_season.id, episode_number=ep_number)
                db.add(db_episode)

            # Keep user-specific progress flags untouched (e.g. ignore_in_progress).
            db_episode.tmdb_id = api_ep.get("tmdb_id")
            db_episode.name_en = api_ep.get("name_en", "")
            db_episode.name_de = api_ep.get("name_de")
            db_episode.overview_en = api_ep.get("overview_en")
            db_episode.overview_de = api_ep.get("overview_de")
            db_episode.air_date = api_ep.get("air_date")
            db_episode.still_path = api_ep.get("still_path")
            db_episode.runtime = api_ep.get("runtime")
            db_episode.missing_from_api = False

        # Mark episodes not found in API
        for db_ep in db_season.episodes:
            if db_ep.episode_number not in api_episode_numbers:
                db_ep.missing_from_api = True

        db_season.episode_count = len(season_details.get("episodes", []))

    # Mark seasons not found in API
    for db_season in series.seasons:
        if db_season.season_number not in api_season_numbers:
            db_season.missing_from_api = True

    series.last_synced_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(series)
    return series


async def add_series_from_tmdb(db: Session, tmdb_id: int) -> Series:
    """Add a new series from TMDB and sync all data."""
    existing = db.query(Series).filter(Series.tmdb_id == tmdb_id).first()
    if existing:
        return existing

    details = await tmdb_client.get_series_details(tmdb_id)

    series = Series(
        tmdb_id=tmdb_id,
        name_en=details["name_en"],
        name_de=details["name_de"],
        overview_en=details["overview_en"],
        overview_de=details["overview_de"],
        poster_path=details["poster_path"],
        first_air_date=details["first_air_date"],
        status=details["status"],
        total_seasons=details["total_seasons"],
    )
    db.add(series)
    db.commit()
    db.refresh(series)

    # Now sync all seasons and episodes
    series = await sync_series_from_tmdb(db, series)
    return series
