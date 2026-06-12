from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import desc
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import Episode, Season, Series, WatchEntry
from app.schemas import WatchEntryCreate, WatchEntryResponse, WatchEntryUpdate, WatchHistoryItem

router = APIRouter()


@router.post("/episodes/{episode_id}/watch", response_model=WatchEntryResponse)
def add_watch(episode_id: int, body: WatchEntryCreate, db: Session = Depends(get_db)):
    """Sichtung hinzufügen."""
    episode = db.query(Episode).filter(Episode.id == episode_id).first()
    if not episode:
        raise HTTPException(status_code=404, detail="Episode nicht gefunden")

    entry = WatchEntry(
        episode_id=episode_id,
        watched_at=body.watched_at or datetime.now(timezone.utc),
        notes=body.notes,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.get("/episodes/{episode_id}/watches", response_model=list[WatchEntryResponse])
def list_watches(episode_id: int, db: Session = Depends(get_db)):
    """Sichtungsverlauf einer Episode."""
    episode = db.query(Episode).filter(Episode.id == episode_id).first()
    if not episode:
        raise HTTPException(status_code=404, detail="Episode nicht gefunden")

    entries = (
        db.query(WatchEntry)
        .filter(WatchEntry.episode_id == episode_id)
        .order_by(WatchEntry.watched_at.desc())
        .all()
    )
    return entries


@router.put("/watches/{watch_id}", response_model=WatchEntryResponse)
def update_watch(watch_id: int, body: WatchEntryUpdate, db: Session = Depends(get_db)):
    """Sichtung bearbeiten."""
    entry = db.query(WatchEntry).filter(WatchEntry.id == watch_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Sichtung nicht gefunden")

    update_data = body.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(entry, key, value)

    db.commit()
    db.refresh(entry)
    return entry


@router.delete("/watches/{watch_id}")
def delete_watch(watch_id: int, db: Session = Depends(get_db)):
    """Sichtung löschen."""
    entry = db.query(WatchEntry).filter(WatchEntry.id == watch_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Sichtung nicht gefunden")

    db.delete(entry)
    db.commit()
    return {"detail": "Sichtung gelöscht"}


@router.get("/watch-history", response_model=list[WatchHistoryItem])
def watch_history(
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    """Globaler Sichtungsverlauf, chronologisch sortiert."""
    entries = (
        db.query(WatchEntry)
        .options(
            joinedload(WatchEntry.episode)
            .joinedload(Episode.season)
            .joinedload(Season.series)
        )
        .order_by(desc(WatchEntry.watched_at))
        .offset(offset)
        .limit(limit)
        .all()
    )

    result = []
    for e in entries:
        ep = e.episode
        season = ep.season
        series = season.series
        result.append(
            WatchHistoryItem(
                id=e.id,
                watched_at=e.watched_at,
                notes=e.notes,
                episode_id=ep.id,
                episode_number=ep.episode_number,
                episode_name=ep.display_name,
                season_number=season.season_number,
                series_id=series.id,
                series_name=series.display_name,
                series_poster_path=series.poster_path,
            )
        )
    return result
