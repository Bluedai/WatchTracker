import asyncio
import logging

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p"


class TMDBClient:
    """Async client for TMDB API v3. Fetches data in German and English."""

    def __init__(self):
        self.base_url = settings.tmdb_base_url
        self.api_key = settings.tmdb_api_key
        self._client: httpx.AsyncClient | None = None

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                timeout=30.0,
                headers={"Accept": "application/json"},
            )
        return self._client

    async def close(self):
        if self._client and not self._client.is_closed:
            await self._client.aclose()

    async def _get(self, path: str, params: dict | None = None) -> dict:
        client = await self._get_client()
        params = params or {}
        params["api_key"] = self.api_key
        url = f"{self.base_url}{path}"
        response = await client.get(url, params=params)
        response.raise_for_status()
        return response.json()

    async def search_series(self, query: str, page: int = 1) -> dict:
        """Search for TV series. Returns German results with English fallback."""
        data_de = await self._get("/search/tv", {"query": query, "language": "de-DE", "page": page})

        # Also fetch English names for fallback
        data_en = await self._get("/search/tv", {"query": query, "language": "en-US", "page": page})

        en_map = {r["id"]: r for r in data_en.get("results", [])}

        results = []
        for item in data_de.get("results", []):
            tmdb_id = item["id"]
            en_item = en_map.get(tmdb_id, {})
            results.append({
                "tmdb_id": tmdb_id,
                "name_de": item.get("name"),
                "name_en": en_item.get("name", item.get("original_name", "")),
                "name": item.get("name") or en_item.get("name", ""),
                "overview": item.get("overview") or en_item.get("overview"),
                "poster_path": item.get("poster_path"),
                "first_air_date": item.get("first_air_date"),
            })

        return {
            "results": results,
            "total_results": data_de.get("total_results", 0),
        }

    async def get_series_details(self, tmdb_id: int) -> dict:
        """Get series details in both German and English."""
        data_de, data_en = await asyncio.gather(
            self._get(f"/tv/{tmdb_id}", {"language": "de-DE"}),
            self._get(f"/tv/{tmdb_id}", {"language": "en-US"}),
        )

        return {
            "tmdb_id": tmdb_id,
            "name_de": data_de.get("name"),
            "name_en": data_en.get("name", data_de.get("original_name", "")),
            "overview_de": data_de.get("overview") or None,
            "overview_en": data_en.get("overview") or None,
            "poster_path": data_de.get("poster_path"),
            "first_air_date": data_de.get("first_air_date"),
            "status": data_de.get("status"),
            "total_seasons": data_de.get("number_of_seasons", 0),
            "seasons": data_de.get("seasons", []),
            "seasons_en": data_en.get("seasons", []),
        }

    async def get_season_details(self, tmdb_id: int, season_number: int) -> dict:
        """Get season details with episodes in both languages."""
        await asyncio.sleep(0.2)  # Rate limiting

        data_de, data_en = await asyncio.gather(
            self._get(f"/tv/{tmdb_id}/season/{season_number}", {"language": "de-DE"}),
            self._get(f"/tv/{tmdb_id}/season/{season_number}", {"language": "en-US"}),
        )

        en_episodes = {ep["episode_number"]: ep for ep in data_en.get("episodes", [])}

        episodes = []
        for ep in data_de.get("episodes", []):
            ep_num = ep["episode_number"]
            en_ep = en_episodes.get(ep_num, {})
            episodes.append({
                "tmdb_id": ep.get("id"),
                "episode_number": ep_num,
                "name_de": ep.get("name") or None,
                "name_en": en_ep.get("name", ep.get("name", "")),
                "overview_de": ep.get("overview") or None,
                "overview_en": en_ep.get("overview") or None,
                "air_date": ep.get("air_date"),
                "still_path": ep.get("still_path"),
                "runtime": ep.get("runtime"),
            })

        return {
            "tmdb_id": data_de.get("id"),
            "season_number": season_number,
            "name_de": data_de.get("name") or None,
            "name_en": data_en.get("name", ""),
            "overview_de": data_de.get("overview") or None,
            "overview_en": data_en.get("overview") or None,
            "poster_path": data_de.get("poster_path"),
            "air_date": data_de.get("air_date"),
            "episode_count": len(episodes),
            "episodes": episodes,
        }


tmdb_client = TMDBClient()
