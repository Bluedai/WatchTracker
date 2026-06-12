from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import Episode, Season, Series, Tag, WatchEntry
from app.schemas import (
    ProgressResponse,
    SeasonBrief,
    SeasonDetail,
    SeasonIgnoreResponse,
    SeasonIgnoreUpdate,
    SeasonResponse,
    SeasonUpdate,
    SeriesCreate,
    SeriesDetail,
    SeriesListItem,
    SeriesResponse,
    SeriesTagsUpdate,
    SeriesUpdate,
    StatsResponse,
    TagCreate,
    TagResponse,
    TagUpdate,
)
from app.services.sync import add_series_from_tmdb, sync_series_from_tmdb

router = APIRouter()


def _count_watched(episodes: list[Episode]) -> int:
    return sum(1 for ep in episodes if not ep.ignore_in_progress and ep.is_watched)


def _count_considered(episodes: list[Episode]) -> int:
    return sum(1 for ep in episodes if not ep.ignore_in_progress)


def _normalize_tag_name(name: str) -> str:
    return name.strip()


def _series_with_tags(db: Session, series_id: int) -> Series:
    series = db.query(Series).options(joinedload(Series.tags)).filter(Series.id == series_id).first()
    if not series:
        raise HTTPException(status_code=404, detail="Serie nicht gefunden")
    return series


@router.get("/series", response_model=list[SeriesListItem])
def list_series(db: Session = Depends(get_db)):
    """Alle Serien der Bibliothek auflisten."""
    all_series = (
        db.query(Series)
        .options(
            joinedload(Series.tags),
            joinedload(Series.seasons).joinedload(Season.episodes).joinedload(Episode.watch_entries),
        )
        .all()
    )
    result = []
    for s in all_series:
        total_eps = sum(_count_considered(season.episodes) for season in s.seasons)
        watched_eps = sum(_count_watched(season.episodes) for season in s.seasons)
        result.append(
            SeriesListItem(
                id=s.id,
                tmdb_id=s.tmdb_id,
                display_name=s.display_name,
                poster_path=s.poster_path,
                first_air_date=s.first_air_date,
                status=s.status,
                total_seasons=s.total_seasons,
                total_episodes=total_eps,
                watched_episodes=watched_eps,
                has_override=s.has_override,
                missing_from_api=s.missing_from_api,
                last_synced_at=s.last_synced_at,
                tags=s.tags,
            )
        )
    return result


@router.post("/series", response_model=SeriesResponse)
async def add_series(body: SeriesCreate, db: Session = Depends(get_db)):
    """Serie zur Bibliothek hinzufügen."""
    series = await add_series_from_tmdb(db, body.tmdb_id)
    return series


@router.get("/series/{series_id}", response_model=SeriesDetail)
def get_series(series_id: int, db: Session = Depends(get_db)):
    """Seriendetails mit Staffeln."""
    series = (
        db.query(Series)
        .options(
            joinedload(Series.tags),
            joinedload(Series.seasons).joinedload(Season.episodes).joinedload(Episode.watch_entries),
        )
        .filter(Series.id == series_id)
        .first()
    )
    if not series:
        raise HTTPException(status_code=404, detail="Serie nicht gefunden")

    season_briefs = []
    for s in series.seasons:
        season_briefs.append(
            SeasonBrief(
                id=s.id,
                season_number=s.season_number,
                display_name=s.display_name,
                poster_path=s.poster_path,
                episode_count=_count_considered(s.episodes),
                watched_count=_count_watched(s.episodes),
                has_override=s.has_override,
                missing_from_api=s.missing_from_api,
            )
        )

    return SeriesDetail(
        id=series.id,
        tmdb_id=series.tmdb_id,
        name_en=series.name_en,
        name_de=series.name_de,
        name_override=series.name_override,
        display_name=series.display_name,
        overview_en=series.overview_en,
        overview_de=series.overview_de,
        overview_override=series.overview_override,
        display_overview=series.display_overview,
        poster_path=series.poster_path,
        first_air_date=series.first_air_date,
        status=series.status,
        total_seasons=series.total_seasons,
        has_override=series.has_override,
        missing_from_api=series.missing_from_api,
        last_synced_at=series.last_synced_at,
        created_at=series.created_at,
        updated_at=series.updated_at,
        tags=series.tags,
        seasons=season_briefs,
    )


@router.put("/series/{series_id}", response_model=SeriesResponse)
def update_series(series_id: int, body: SeriesUpdate, db: Session = Depends(get_db)):
    """Serie bearbeiten (Overrides setzen)."""
    series = db.query(Series).filter(Series.id == series_id).first()
    if not series:
        raise HTTPException(status_code=404, detail="Serie nicht gefunden")

    update_data = body.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(series, key, value)

    db.commit()
    db.refresh(series)
    return series


@router.delete("/series/{series_id}")
def delete_series(series_id: int, db: Session = Depends(get_db)):
    """Serie aus Bibliothek entfernen."""
    series = db.query(Series).filter(Series.id == series_id).first()
    if not series:
        raise HTTPException(status_code=404, detail="Serie nicht gefunden")

    db.delete(series)
    db.commit()
    return {"detail": "Serie gelöscht"}


@router.post("/series/{series_id}/sync", response_model=SeriesResponse)
async def sync_series(series_id: int, db: Session = Depends(get_db)):
    """Seriendaten aus TMDB aktualisieren."""
    series = db.query(Series).filter(Series.id == series_id).first()
    if not series:
        raise HTTPException(status_code=404, detail="Serie nicht gefunden")

    series = await sync_series_from_tmdb(db, series)
    return series


@router.put("/series/{series_id}/reset-overrides", response_model=SeriesResponse)
def reset_series_overrides(series_id: int, db: Session = Depends(get_db)):
    """Alle manuellen Overrides einer Serie zurücksetzen."""
    series = db.query(Series).filter(Series.id == series_id).first()
    if not series:
        raise HTTPException(status_code=404, detail="Serie nicht gefunden")

    series.name_override = None
    series.overview_override = None
    db.commit()
    db.refresh(series)
    return series


# --- Tags ---

@router.get("/tags", response_model=list[TagResponse])
def list_tags(db: Session = Depends(get_db)):
    """Alle Tags auflisten."""
    return db.query(Tag).order_by(func.lower(Tag.name), Tag.id).all()


@router.post("/tags", response_model=TagResponse, status_code=201)
def create_tag(body: TagCreate, db: Session = Depends(get_db)):
    """Neuen Tag erstellen."""
    normalized_name = _normalize_tag_name(body.name)
    if not normalized_name:
        raise HTTPException(status_code=400, detail="Tag-Name darf nicht leer sein")

    duplicate = db.query(Tag).filter(func.lower(Tag.name) == normalized_name.lower()).first()
    if duplicate:
        raise HTTPException(status_code=409, detail="Tag existiert bereits")

    tag = Tag(name=normalized_name)
    db.add(tag)
    db.commit()
    db.refresh(tag)
    return tag


@router.put("/tags/{tag_id}", response_model=TagResponse)
def update_tag(tag_id: int, body: TagUpdate, db: Session = Depends(get_db)):
    """Tag umbenennen."""
    tag = db.query(Tag).filter(Tag.id == tag_id).first()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag nicht gefunden")

    normalized_name = _normalize_tag_name(body.name)
    if not normalized_name:
        raise HTTPException(status_code=400, detail="Tag-Name darf nicht leer sein")

    duplicate = db.query(Tag).filter(func.lower(Tag.name) == normalized_name.lower(), Tag.id != tag_id).first()
    if duplicate:
        raise HTTPException(status_code=409, detail="Tag existiert bereits")

    tag.name = normalized_name
    db.commit()
    db.refresh(tag)
    return tag


@router.delete("/tags/{tag_id}")
def delete_tag(tag_id: int, db: Session = Depends(get_db)):
    """Tag löschen."""
    tag = db.query(Tag).filter(Tag.id == tag_id).first()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag nicht gefunden")

    db.delete(tag)
    db.commit()
    return {"detail": "Tag gelöscht"}


@router.put("/series/{series_id}/tags", response_model=SeriesResponse)
def set_series_tags(series_id: int, body: SeriesTagsUpdate, db: Session = Depends(get_db)):
    """Tags einer Serie vollständig setzen."""
    series = _series_with_tags(db, series_id)
    unique_tag_ids = list(dict.fromkeys(body.tag_ids))

    if unique_tag_ids:
        tags = db.query(Tag).filter(Tag.id.in_(unique_tag_ids)).all()
        tags_by_id = {tag.id: tag for tag in tags}
        missing_ids = [tag_id for tag_id in unique_tag_ids if tag_id not in tags_by_id]
        if missing_ids:
            raise HTTPException(status_code=404, detail=f"Tags nicht gefunden: {missing_ids}")

        series.tags = [tags_by_id[tag_id] for tag_id in unique_tag_ids]
    else:
        series.tags = []

    db.commit()
    return _series_with_tags(db, series_id)


@router.post("/series/{series_id}/tags/{tag_id}", response_model=SeriesResponse)
def add_series_tag(series_id: int, tag_id: int, db: Session = Depends(get_db)):
    """Einzelnen Tag zu einer Serie hinzufügen."""
    series = _series_with_tags(db, series_id)
    tag = db.query(Tag).filter(Tag.id == tag_id).first()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag nicht gefunden")

    if all(existing.id != tag_id for existing in series.tags):
        series.tags.append(tag)
        db.commit()

    return _series_with_tags(db, series_id)


@router.delete("/series/{series_id}/tags/{tag_id}", response_model=SeriesResponse)
def remove_series_tag(series_id: int, tag_id: int, db: Session = Depends(get_db)):
    """Einzelnen Tag von einer Serie entfernen."""
    series = _series_with_tags(db, series_id)
    tag = db.query(Tag).filter(Tag.id == tag_id).first()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag nicht gefunden")

    current_ids = {existing.id for existing in series.tags}
    if tag_id in current_ids:
        series.tags = [existing for existing in series.tags if existing.id != tag_id]
        db.commit()

    return _series_with_tags(db, series_id)


# --- Seasons ---

@router.get("/series/{series_id}/seasons", response_model=list[SeasonBrief])
def list_seasons(series_id: int, db: Session = Depends(get_db)):
    """Alle Staffeln einer Serie."""
    series = (
        db.query(Series)
        .options(joinedload(Series.seasons).joinedload(Season.episodes).joinedload(Episode.watch_entries))
        .filter(Series.id == series_id)
        .first()
    )
    if not series:
        raise HTTPException(status_code=404, detail="Serie nicht gefunden")

    return [
        SeasonBrief(
            id=s.id,
            season_number=s.season_number,
            display_name=s.display_name,
            poster_path=s.poster_path,
            episode_count=_count_considered(s.episodes),
            watched_count=_count_watched(s.episodes),
            has_override=s.has_override,
            missing_from_api=s.missing_from_api,
        )
        for s in series.seasons
    ]


@router.get("/seasons/{season_id}", response_model=SeasonDetail)
def get_season(season_id: int, db: Session = Depends(get_db)):
    """Staffeldetails mit Episoden."""
    season = (
        db.query(Season)
        .options(joinedload(Season.episodes).joinedload(Episode.watch_entries), joinedload(Season.series))
        .filter(Season.id == season_id)
        .first()
    )
    if not season:
        raise HTTPException(status_code=404, detail="Staffel nicht gefunden")

    from app.schemas import EpisodeBrief

    episodes = [
        EpisodeBrief(
            id=ep.id,
            episode_number=ep.episode_number,
            display_name=ep.display_name,
            air_date=ep.air_date,
            runtime=ep.runtime,
            is_watched=ep.is_watched,
            ignore_in_progress=ep.ignore_in_progress,
            watch_count=len(ep.watch_entries),
            has_override=ep.has_override,
            missing_from_api=ep.missing_from_api,
            still_path=ep.still_path,
        )
        for ep in season.episodes
    ]

    return SeasonDetail(
        id=season.id,
        series_id=season.series_id,
        tmdb_id=season.tmdb_id,
        season_number=season.season_number,
        name_en=season.name_en,
        name_de=season.name_de,
        name_override=season.name_override,
        display_name=season.display_name,
        overview_en=season.overview_en,
        overview_de=season.overview_de,
        overview_override=season.overview_override,
        poster_path=season.poster_path,
        air_date=season.air_date,
        episode_count=len(season.episodes),
        has_override=season.has_override,
        missing_from_api=season.missing_from_api,
        created_at=season.created_at,
        updated_at=season.updated_at,
        episodes=episodes,
        series_name=season.series.display_name,
    )


@router.put("/seasons/{season_id}", response_model=SeasonResponse)
def update_season(season_id: int, body: SeasonUpdate, db: Session = Depends(get_db)):
    """Staffel bearbeiten (Overrides)."""
    season = db.query(Season).filter(Season.id == season_id).first()
    if not season:
        raise HTTPException(status_code=404, detail="Staffel nicht gefunden")

    update_data = body.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(season, key, value)

    db.commit()
    db.refresh(season)
    return season


@router.put("/seasons/{season_id}/reset-overrides", response_model=SeasonResponse)
def reset_season_overrides(season_id: int, db: Session = Depends(get_db)):
    """Manuelle Overrides einer Staffel zurücksetzen."""
    season = db.query(Season).filter(Season.id == season_id).first()
    if not season:
        raise HTTPException(status_code=404, detail="Staffel nicht gefunden")

    season.name_override = None
    season.overview_override = None
    db.commit()
    db.refresh(season)
    return season


@router.patch("/seasons/{season_id}/ignore", response_model=SeasonIgnoreResponse)
def update_season_ignore(season_id: int, body: SeasonIgnoreUpdate, db: Session = Depends(get_db)):
    """Alle Episoden einer Staffel in der Fortschrittsberechnung ignorieren/einbeziehen."""
    season = db.query(Season).options(joinedload(Season.episodes)).filter(Season.id == season_id).first()
    if not season:
        raise HTTPException(status_code=404, detail="Staffel nicht gefunden")

    for episode in season.episodes:
        episode.ignore_in_progress = body.ignore_in_progress

    db.commit()
    return SeasonIgnoreResponse(
        season_id=season.id,
        updated_episodes=len(season.episodes),
        ignore_in_progress=body.ignore_in_progress,
    )


# --- Progress & Stats ---

@router.get("/series/{series_id}/progress", response_model=ProgressResponse)
def get_progress(series_id: int, db: Session = Depends(get_db)):
    """Fortschritt einer Serie."""
    series = (
        db.query(Series)
        .options(joinedload(Series.seasons).joinedload(Season.episodes).joinedload(Episode.watch_entries))
        .filter(Series.id == series_id)
        .first()
    )
    if not series:
        raise HTTPException(status_code=404, detail="Serie nicht gefunden")

    season_progress = []
    total_eps = 0
    watched_eps = 0

    for s in series.seasons:
        s_total = _count_considered(s.episodes)
        s_watched = _count_watched(s.episodes)
        total_eps += s_total
        watched_eps += s_watched
        season_progress.append({
            "season_number": s.season_number,
            "display_name": s.display_name,
            "total": s_total,
            "watched": s_watched,
            "percentage": round(s_watched / s_total * 100, 1) if s_total > 0 else 0,
        })

    return ProgressResponse(
        total_episodes=total_eps,
        watched_episodes=watched_eps,
        percentage=round(watched_eps / total_eps * 100, 1) if total_eps > 0 else 0,
        seasons=season_progress,
    )


@router.get("/stats", response_model=StatsResponse)
def get_stats(db: Session = Depends(get_db)):
    """Gesamtstatistik."""
    total_series = db.query(Series).count()
    total_episodes = db.query(Episode).filter(Episode.ignore_in_progress.is_(False)).count()

    # Episodes with at least one watch entry
    from sqlalchemy import distinct, func

    total_watched = (
        db.query(func.count(distinct(WatchEntry.episode_id)))
        .join(Episode, Episode.id == WatchEntry.episode_id)
        .filter(Episode.ignore_in_progress.is_(False))
        .scalar()
        or 0
    )
    total_watch_entries = db.query(WatchEntry).count()

    return StatsResponse(
        total_series=total_series,
        total_episodes=total_episodes,
        total_watched=total_watched,
        total_watch_entries=total_watch_entries,
        percentage=round(total_watched / total_episodes * 100, 1) if total_episodes > 0 else 0,
    )
