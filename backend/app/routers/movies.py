from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import Movie, Tag, WatchEntry
from app.schemas import (
    MovieCreate,
    MovieDetail,
    MovieListItem,
    MovieResponse,
    MovieTagsUpdate,
    MovieUpdate,
    StatsResponse,
    TagResponse,
    WatchEntryCreate,
    WatchEntryResponse,
    WatchEntryUpdate,
)
from app.services.sync import add_movie_from_tmdb, sync_movie_from_tmdb

router = APIRouter()


def _movie_with_tags(db: Session, movie_id: int) -> Movie:
    movie = db.query(Movie).options(joinedload(Movie.tags)).filter(Movie.id == movie_id).first()
    if not movie:
        raise HTTPException(status_code=404, detail="Film nicht gefunden")
    return movie


@router.get("/movies", response_model=list[MovieListItem])
def list_movies(db: Session = Depends(get_db)):
    """Alle Filme der Bibliothek auflisten."""
    movies = (
        db.query(Movie)
        .options(
            joinedload(Movie.tags),
            joinedload(Movie.watch_entries),
        )
        .all()
    )
    return movies


@router.post("/movies", response_model=MovieResponse)
async def add_movie(body: MovieCreate, db: Session = Depends(get_db)):
    """Film zur Bibliothek hinzufügen."""
    movie = await add_movie_from_tmdb(db, body.tmdb_id)
    return _movie_with_tags(db, movie.id)


@router.get("/movies/{movie_id}", response_model=MovieDetail)
def get_movie(movie_id: int, db: Session = Depends(get_db)):
    """Filmdetails."""
    movie = (
        db.query(Movie)
        .options(
            joinedload(Movie.tags),
            joinedload(Movie.watch_entries),
        )
        .filter(Movie.id == movie_id)
        .first()
    )
    if not movie:
        raise HTTPException(status_code=404, detail="Film nicht gefunden")
    return movie


@router.put("/movies/{movie_id}", response_model=MovieResponse)
def update_movie(movie_id: int, body: MovieUpdate, db: Session = Depends(get_db)):
    """Film bearbeiten (Overrides setzen)."""
    movie = db.query(Movie).filter(Movie.id == movie_id).first()
    if not movie:
        raise HTTPException(status_code=404, detail="Film nicht gefunden")

    update_data = body.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(movie, key, value)

    db.commit()
    db.refresh(movie)
    return movie


@router.delete("/movies/{movie_id}")
def delete_movie(movie_id: int, db: Session = Depends(get_db)):
    """Film aus Bibliothek entfernen."""
    movie = db.query(Movie).filter(Movie.id == movie_id).first()
    if not movie:
        raise HTTPException(status_code=404, detail="Film nicht gefunden")

    db.delete(movie)
    db.commit()
    return {"detail": "Film gelöscht"}


@router.post("/movies/{movie_id}/sync", response_model=MovieResponse)
async def sync_movie(movie_id: int, db: Session = Depends(get_db)):
    """Filmdaten aus TMDB aktualisieren."""
    movie = db.query(Movie).filter(Movie.id == movie_id).first()
    if not movie:
        raise HTTPException(status_code=404, detail="Film nicht gefunden")

    movie = await sync_movie_from_tmdb(db, movie)
    return _movie_with_tags(db, movie.id)


@router.put("/movies/{movie_id}/reset-overrides", response_model=MovieResponse)
def reset_movie_overrides(movie_id: int, db: Session = Depends(get_db)):
    """Alle manuellen Overrides eines Films zurücksetzen."""
    movie = db.query(Movie).filter(Movie.id == movie_id).first()
    if not movie:
        raise HTTPException(status_code=404, detail="Film nicht gefunden")

    movie.title_override = None
    movie.overview_override = None
    db.commit()
    db.refresh(movie)
    return movie


@router.put("/movies/{movie_id}/tags", response_model=MovieResponse)
def set_movie_tags(movie_id: int, body: MovieTagsUpdate, db: Session = Depends(get_db)):
    """Tags eines Films vollständig setzen."""
    movie = _movie_with_tags(db, movie_id)
    unique_tag_ids = list(dict.fromkeys(body.tag_ids))

    if unique_tag_ids:
        tags = db.query(Tag).filter(Tag.id.in_(unique_tag_ids)).all()
        tags_by_id = {tag.id: tag for tag in tags}
        missing_ids = [tag_id for tag_id in unique_tag_ids if tag_id not in tags_by_id]
        if missing_ids:
            raise HTTPException(status_code=404, detail=f"Tags nicht gefunden: {missing_ids}")

        movie.tags = [tags_by_id[tag_id] for tag_id in unique_tag_ids]
    else:
        movie.tags = []

    db.commit()
    return _movie_with_tags(db, movie_id)


@router.post("/movies/{movie_id}/tags/{tag_id}", response_model=MovieResponse)
def add_movie_tag(movie_id: int, tag_id: int, db: Session = Depends(get_db)):
    """Einzelnen Tag zu einem Film hinzufügen."""
    movie = _movie_with_tags(db, movie_id)
    tag = db.query(Tag).filter(Tag.id == tag_id).first()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag nicht gefunden")

    if all(existing.id != tag_id for existing in movie.tags):
        movie.tags.append(tag)
        db.commit()

    return _movie_with_tags(db, movie_id)


@router.delete("/movies/{movie_id}/tags/{tag_id}", response_model=MovieResponse)
def remove_movie_tag(movie_id: int, tag_id: int, db: Session = Depends(get_db)):
    """Einzelnen Tag von einem Film entfernen."""
    movie = _movie_with_tags(db, movie_id)
    tag = db.query(Tag).filter(Tag.id == tag_id).first()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag nicht gefunden")

    current_ids = {existing.id for existing in movie.tags}
    if tag_id in current_ids:
        movie.tags = [existing for existing in movie.tags if existing.id != tag_id]
        db.commit()

    return _movie_with_tags(db, movie_id)


@router.post("/movies/{movie_id}/watch", response_model=WatchEntryResponse)
def add_movie_watch(movie_id: int, body: WatchEntryCreate, db: Session = Depends(get_db)):
    """Sichtung eines Films hinzufügen."""
    from datetime import datetime, timezone

    movie = db.query(Movie).filter(Movie.id == movie_id).first()
    if not movie:
        raise HTTPException(status_code=404, detail="Film nicht gefunden")

    entry = WatchEntry(
        movie_id=movie_id,
        watched_at=body.watched_at or datetime.now(timezone.utc),
        notes=body.notes,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.get("/movies/{movie_id}/watches", response_model=list[WatchEntryResponse])
def list_movie_watches(movie_id: int, db: Session = Depends(get_db)):
    """Sichtungsverlauf eines Films."""
    movie = db.query(Movie).filter(Movie.id == movie_id).first()
    if not movie:
        raise HTTPException(status_code=404, detail="Film nicht gefunden")

    return (
        db.query(WatchEntry)
        .filter(WatchEntry.movie_id == movie_id)
        .order_by(WatchEntry.watched_at.desc())
        .all()
    )


@router.put("/movies/watches/{watch_id}", response_model=WatchEntryResponse)
def update_movie_watch(watch_id: int, body: WatchEntryUpdate, db: Session = Depends(get_db)):
    """Filmsichtung bearbeiten."""
    entry = db.query(WatchEntry).filter(WatchEntry.id == watch_id, WatchEntry.movie_id.isnot(None)).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Sichtung nicht gefunden")

    update_data = body.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(entry, key, value)

    db.commit()
    db.refresh(entry)
    return entry


@router.delete("/movies/watches/{watch_id}")
def delete_movie_watch(watch_id: int, db: Session = Depends(get_db)):
    """Filmsichtung löschen."""
    entry = db.query(WatchEntry).filter(WatchEntry.id == watch_id, WatchEntry.movie_id.isnot(None)).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Sichtung nicht gefunden")

    db.delete(entry)
    db.commit()
    return {"detail": "Sichtung gelöscht"}
