from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Series
from app.schemas import SearchResponse, TMDBSearchResult
from app.services.tmdb import tmdb_client

router = APIRouter()


@router.get("/search", response_model=SearchResponse)
async def search_series(q: str = Query(..., min_length=1), db: Session = Depends(get_db)):
    """Serien bei TMDB suchen."""
    data = await tmdb_client.search_series(q)

    # Check which are already in library
    tmdb_ids = [r["tmdb_id"] for r in data["results"]]
    existing_ids = set()
    if tmdb_ids:
        existing = db.query(Series.tmdb_id).filter(Series.tmdb_id.in_(tmdb_ids)).all()
        existing_ids = {row[0] for row in existing}

    results = []
    for item in data["results"]:
        results.append(
            TMDBSearchResult(
                tmdb_id=item["tmdb_id"],
                name=item["name"],
                name_de=item.get("name_de"),
                overview=item.get("overview"),
                poster_path=item.get("poster_path"),
                first_air_date=item.get("first_air_date"),
                already_added=item["tmdb_id"] in existing_ids,
            )
        )

    return SearchResponse(results=results, total_results=data["total_results"])
