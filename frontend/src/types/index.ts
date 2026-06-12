export interface TMDBSearchResult {
  tmdb_id: number;
  name: string;
  name_de: string | null;
  overview: string | null;
  poster_path: string | null;
  first_air_date: string | null;
  already_added: boolean;
}

export interface SearchResponse {
  results: TMDBSearchResult[];
  total_results: number;
}

export interface Tag {
  id: number;
  name: string;
}

export interface SeriesListItem {
  id: number;
  tmdb_id: number;
  display_name: string;
  poster_path: string | null;
  first_air_date: string | null;
  status: string | null;
  total_seasons: number;
  total_episodes: number;
  watched_episodes: number;
  has_override: boolean;
  missing_from_api: boolean;
  last_synced_at: string | null;
  tags: Tag[];
}

export interface SeasonBrief {
  id: number;
  season_number: number;
  display_name: string;
  poster_path: string | null;
  episode_count: number;
  watched_count: number;
  has_override: boolean;
  missing_from_api: boolean;
}

export interface SeriesDetail {
  id: number;
  tmdb_id: number;
  name_en: string;
  name_de: string | null;
  name_override: string | null;
  display_name: string;
  overview_en: string | null;
  overview_de: string | null;
  overview_override: string | null;
  display_overview: string | null;
  poster_path: string | null;
  first_air_date: string | null;
  status: string | null;
  total_seasons: number;
  has_override: boolean;
  missing_from_api: boolean;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
  tags: Tag[];
  seasons: SeasonBrief[];
}

export interface EpisodeBrief {
  id: number;
  episode_number: number;
  display_name: string;
  air_date: string | null;
  runtime: number | null;
  is_watched: boolean;
  ignore_in_progress: boolean;
  watch_count: number;
  has_override: boolean;
  missing_from_api: boolean;
  still_path: string | null;
}

export interface SeasonDetail {
  id: number;
  series_id: number;
  tmdb_id: number | null;
  season_number: number;
  name_en: string;
  name_de: string | null;
  name_override: string | null;
  display_name: string;
  overview_en: string | null;
  overview_de: string | null;
  overview_override: string | null;
  poster_path: string | null;
  air_date: string | null;
  episode_count: number;
  has_override: boolean;
  missing_from_api: boolean;
  created_at: string;
  updated_at: string;
  episodes: EpisodeBrief[];
  series_name: string;
}

export interface WatchEntryBrief {
  id: number;
  watched_at: string;
  notes: string | null;
}

export interface EpisodeDetail {
  id: number;
  season_id: number;
  tmdb_id: number | null;
  episode_number: number;
  name_en: string;
  name_de: string | null;
  name_override: string | null;
  display_name: string;
  overview_en: string | null;
  overview_de: string | null;
  overview_override: string | null;
  display_overview: string | null;
  air_date: string | null;
  still_path: string | null;
  runtime: number | null;
  is_watched: boolean;
  ignore_in_progress: boolean;
  has_override: boolean;
  missing_from_api: boolean;
  created_at: string;
  updated_at: string;
  watch_entries: WatchEntryBrief[];
  season_number: number | null;
  series_id: number | null;
  series_name: string | null;
}

export interface WatchEntry {
  id: number;
  episode_id: number;
  watched_at: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface WatchHistoryItem {
  id: number;
  watched_at: string;
  notes: string | null;
  episode_id: number;
  episode_number: number;
  episode_name: string;
  season_number: number;
  series_id: number;
  series_name: string;
  series_poster_path: string | null;
}

export interface ProgressResponse {
  total_episodes: number;
  watched_episodes: number;
  percentage: number;
  seasons: {
    season_number: number;
    display_name: string;
    total: number;
    watched: number;
    percentage: number;
  }[] | null;
}

export interface StatsResponse {
  total_series: number;
  total_episodes: number;
  total_watched: number;
  total_watch_entries: number;
  percentage: number;
}

export interface SeasonIgnoreResponse {
  season_id: number;
  updated_episodes: number;
  ignore_in_progress: boolean;
}
