import axios from 'axios';
import type {
  SearchResponse,
  SeriesListItem,
  SeriesDetail,
  SeasonDetail,
  EpisodeDetail,
  WatchEntry,
  WatchHistoryItem,
  ProgressResponse,
  SeasonIgnoreResponse,
  StatsResponse,
  Tag,
  MovieListItem,
  MovieDetail,
} from '../types';

const api = axios.create({
  baseURL: '/api',
});

export const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

export function posterUrl(path: string | null, size: string = 'w342'): string {
  if (!path) return '';
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

export function stillUrl(path: string | null, size: string = 'w300'): string {
  if (!path) return '';
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

// --- Search ---
export async function searchSeries(query: string): Promise<SearchResponse> {
  const { data } = await api.get('/search', { params: { q: query } });
  return data;
}

export async function searchMovies(query: string): Promise<SearchResponse> {
  const { data } = await api.get('/search/movies', { params: { q: query } });
  return data;
}

// --- Series ---
export async function getSeries(): Promise<SeriesListItem[]> {
  const { data } = await api.get('/series');
  return data;
}

export async function getSeriesDetail(id: number): Promise<SeriesDetail> {
  const { data } = await api.get(`/series/${id}`);
  return data;
}

export async function addSeries(tmdbId: number): Promise<SeriesDetail> {
  const { data } = await api.post('/series', { tmdb_id: tmdbId });
  return data;
}

export async function updateSeries(id: number, body: { name_override?: string | null; overview_override?: string | null }): Promise<SeriesDetail> {
  const { data } = await api.put(`/series/${id}`, body);
  return data;
}

export async function deleteSeries(id: number): Promise<void> {
  await api.delete(`/series/${id}`);
}

export async function syncSeries(id: number): Promise<SeriesDetail> {
  const { data } = await api.post(`/series/${id}/sync`);
  return data;
}

export async function resetSeriesOverrides(id: number): Promise<SeriesDetail> {
  const { data } = await api.put(`/series/${id}/reset-overrides`);
  return data;
}

export async function getTags(): Promise<Tag[]> {
  const { data } = await api.get('/tags');
  return data;
}

export async function createTag(name: string): Promise<Tag> {
  const { data } = await api.post('/tags', { name });
  return data;
}

export async function updateTag(tagId: number, name: string): Promise<Tag> {
  const { data } = await api.put(`/tags/${tagId}`, { name });
  return data;
}

export async function deleteTag(tagId: number): Promise<void> {
  await api.delete(`/tags/${tagId}`);
}

export async function setSeriesTags(id: number, tagIds: number[]): Promise<void> {
  await api.put(`/series/${id}/tags`, { tag_ids: tagIds });
}

export async function addTagToSeries(seriesId: number, tagId: number): Promise<void> {
  await api.post(`/series/${seriesId}/tags/${tagId}`);
}

export async function removeTagFromSeries(seriesId: number, tagId: number): Promise<void> {
  await api.delete(`/series/${seriesId}/tags/${tagId}`);
}

// --- Seasons ---
export async function getSeasonDetail(seasonId: number): Promise<SeasonDetail> {
  const { data } = await api.get(`/seasons/${seasonId}`);
  return data;
}

export async function updateSeason(id: number, body: { name_override?: string | null; overview_override?: string | null }): Promise<SeasonDetail> {
  const { data } = await api.put(`/seasons/${id}`, body);
  return data;
}

export async function resetSeasonOverrides(id: number): Promise<SeasonDetail> {
  const { data } = await api.put(`/seasons/${id}/reset-overrides`);
  return data;
}

export async function setSeasonIgnore(seasonId: number, ignoreInProgress: boolean): Promise<SeasonIgnoreResponse> {
  const { data } = await api.patch(`/seasons/${seasonId}/ignore`, { ignore_in_progress: ignoreInProgress });
  return data;
}

// --- Episodes ---
export async function getEpisodeDetail(id: number): Promise<EpisodeDetail> {
  const { data } = await api.get(`/episodes/${id}`);
  return data;
}

export async function updateEpisode(id: number, body: { name_override?: string | null; overview_override?: string | null }): Promise<EpisodeDetail> {
  const { data } = await api.put(`/episodes/${id}`, body);
  return data;
}

export async function resetEpisodeOverrides(id: number): Promise<EpisodeDetail> {
  const { data } = await api.put(`/episodes/${id}/reset-overrides`);
  return data;
}

export async function setEpisodeIgnore(id: number, ignoreInProgress: boolean): Promise<EpisodeDetail> {
  const { data } = await api.patch(`/episodes/${id}/ignore`, { ignore_in_progress: ignoreInProgress });
  return data;
}

// --- Watches ---
export async function addWatch(episodeId: number, body?: { watched_at?: string; notes?: string }): Promise<WatchEntry> {
  const { data } = await api.post(`/episodes/${episodeId}/watch`, body || {});
  return data;
}

export async function updateWatch(watchId: number, body: { watched_at?: string; notes?: string }): Promise<WatchEntry> {
  const { data } = await api.put(`/watches/${watchId}`, body);
  return data;
}

export async function deleteWatch(watchId: number): Promise<void> {
  await api.delete(`/watches/${watchId}`);
}

// --- History ---
export async function getWatchHistory(limit: number = 50, offset: number = 0): Promise<WatchHistoryItem[]> {
  const { data } = await api.get('/watch-history', { params: { limit, offset } });
  return data;
}

// --- Movies ---
export async function getMovies(): Promise<MovieListItem[]> {
  const { data } = await api.get('/movies');
  return data;
}

export async function getMovieDetail(id: number): Promise<MovieDetail> {
  const { data } = await api.get(`/movies/${id}`);
  return data;
}

export async function addMovie(tmdbId: number): Promise<MovieDetail> {
  const { data } = await api.post('/movies', { tmdb_id: tmdbId });
  return data;
}

export async function updateMovie(
  id: number,
  body: { title_override?: string | null; overview_override?: string | null }
): Promise<MovieDetail> {
  const { data } = await api.put(`/movies/${id}`, body);
  return data;
}

export async function deleteMovie(id: number): Promise<void> {
  await api.delete(`/movies/${id}`);
}

export async function syncMovie(id: number): Promise<MovieDetail> {
  const { data } = await api.post(`/movies/${id}/sync`);
  return data;
}

export async function resetMovieOverrides(id: number): Promise<MovieDetail> {
  const { data } = await api.put(`/movies/${id}/reset-overrides`);
  return data;
}

export async function setMovieTags(id: number, tagIds: number[]): Promise<void> {
  await api.put(`/movies/${id}/tags`, { tag_ids: tagIds });
}

export async function addMovieWatch(
  movieId: number,
  body?: { watched_at?: string; notes?: string }
): Promise<WatchEntry> {
  const { data } = await api.post(`/movies/${movieId}/watch`, body || {});
  return data;
}

export async function updateMovieWatch(
  watchId: number,
  body: { watched_at?: string; notes?: string }
): Promise<WatchEntry> {
  const { data } = await api.put(`/movies/watches/${watchId}`, body);
  return data;
}

export async function deleteMovieWatch(watchId: number): Promise<void> {
  await api.delete(`/movies/watches/${watchId}`);
}

// --- Progress & Stats ---
export async function getSeriesProgress(id: number): Promise<ProgressResponse> {
  const { data } = await api.get(`/series/${id}/progress`);
  return data;
}

export async function getStats(): Promise<StatsResponse> {
  const { data } = await api.get('/stats');
  return data;
}
