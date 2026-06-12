from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import Episode, Season
from app.schemas import EpisodeIgnoreUpdate, EpisodeResponse, EpisodeUpdate, WatchEntryBrief

router = APIRouter()


def _episode_to_response(episode: Episode) -> EpisodeResponse:
    return EpisodeResponse(
        id=episode.id,
        season_id=episode.season_id,
        tmdb_id=episode.tmdb_id,
        episode_number=episode.episode_number,
        name_en=episode.name_en,
        name_de=episode.name_de,
        name_override=episode.name_override,
        display_name=episode.display_name,
        overview_en=episode.overview_en,
        overview_de=episode.overview_de,
        overview_override=episode.overview_override,
        display_overview=episode.display_overview,
        air_date=episode.air_date,
        still_path=episode.still_path,
        runtime=episode.runtime,
        is_watched=episode.is_watched,
        ignore_in_progress=episode.ignore_in_progress,
        has_override=episode.has_override,
        missing_from_api=episode.missing_from_api,
        created_at=episode.created_at,
        updated_at=episode.updated_at,
        watch_entries=[
            WatchEntryBrief(id=w.id, watched_at=w.watched_at, notes=w.notes) for w in episode.watch_entries
        ],
        season_number=episode.season.season_number,
        series_id=episode.season.series_id,
        series_name=episode.season.series.display_name if episode.season and episode.season.series else None,
    )


@router.get("/episodes/{episode_id}", response_model=EpisodeResponse)
def get_episode(episode_id: int, db: Session = Depends(get_db)):
    """Episodendetails."""
    episode = (
        db.query(Episode)
        .options(joinedload(Episode.watch_entries), joinedload(Episode.season).joinedload(Season.series))
        .filter(Episode.id == episode_id)
        .first()
    )
    if not episode:
        raise HTTPException(status_code=404, detail="Episode nicht gefunden")

    return _episode_to_response(episode)


@router.put("/episodes/{episode_id}", response_model=EpisodeResponse)
def update_episode(episode_id: int, body: EpisodeUpdate, db: Session = Depends(get_db)):
    """Episode bearbeiten (Overrides)."""
    episode = (
        db.query(Episode)
        .options(joinedload(Episode.watch_entries), joinedload(Episode.season).joinedload(Season.series))
        .filter(Episode.id == episode_id)
        .first()
    )
    if not episode:
        raise HTTPException(status_code=404, detail="Episode nicht gefunden")

    update_data = body.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(episode, key, value)

    db.commit()
    db.refresh(episode)

    return _episode_to_response(episode)


@router.patch("/episodes/{episode_id}/ignore", response_model=EpisodeResponse)
def update_episode_ignore(episode_id: int, body: EpisodeIgnoreUpdate, db: Session = Depends(get_db)):
    """Episode in der Fortschrittsberechnung ignorieren/einbeziehen."""
    episode = (
        db.query(Episode)
        .options(joinedload(Episode.watch_entries), joinedload(Episode.season).joinedload(Season.series))
        .filter(Episode.id == episode_id)
        .first()
    )
    if not episode:
        raise HTTPException(status_code=404, detail="Episode nicht gefunden")

    episode.ignore_in_progress = body.ignore_in_progress
    db.commit()
    db.refresh(episode)
    return _episode_to_response(episode)


@router.put("/episodes/{episode_id}/reset-overrides", response_model=EpisodeResponse)
def reset_episode_overrides(episode_id: int, db: Session = Depends(get_db)):
    """Override einer Episode zurücksetzen."""
    episode = (
        db.query(Episode)
        .options(joinedload(Episode.watch_entries), joinedload(Episode.season).joinedload(Season.series))
        .filter(Episode.id == episode_id)
        .first()
    )
    if not episode:
        raise HTTPException(status_code=404, detail="Episode nicht gefunden")

    episode.name_override = None
    episode.overview_override = None
    db.commit()
    db.refresh(episode)

    return _episode_to_response(episode)
