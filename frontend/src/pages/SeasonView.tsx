import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import type { SeasonDetail, EpisodeBrief } from '../types';
import {
  getSeasonDetail,
  addWatch,
  setEpisodeIgnore,
  setSeasonIgnore,
  updateSeason,
  resetSeasonOverrides,
  posterUrl,
} from '../api/client';
import ProgressBar from '../components/ProgressBar';

type FilterMode = 'all' | 'watched' | 'unwatched' | 'ignored' | 'overrides';

export default function SeasonView() {
  const { seriesId, seasonId } = useParams<{ seriesId: string; seasonId: string }>();
  const [season, setSeason] = useState<SeasonDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterMode>('all');
  const [editing, setEditing] = useState(false);
  const [nameOverride, setNameOverride] = useState('');
  const [overviewOverride, setOverviewOverride] = useState('');

  const load = () => {
    if (!seasonId) return;
    setLoading(true);
    getSeasonDetail(Number(seasonId))
      .then((data) => {
        setSeason(data);
        setNameOverride(data.name_override || '');
        setOverviewOverride(data.overview_override || '');
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, [seasonId]);

  const handleQuickWatch = async (episodeId: number) => {
    await addWatch(episodeId);
    load();
  };

  const handleToggleIgnore = async (episodeId: number, ignoreInProgress: boolean) => {
    await setEpisodeIgnore(episodeId, ignoreInProgress);
    load();
  };

  const handleSetSeasonIgnore = async (ignoreInProgress: boolean) => {
    if (!season) return;
    await setSeasonIgnore(season.id, ignoreInProgress);
    load();
  };

  const handleSave = async () => {
    if (!season) return;
    await updateSeason(season.id, {
      name_override: nameOverride.trim() || null,
      overview_override: overviewOverride.trim() || null,
    });
    setEditing(false);
    load();
  };

  const handleReset = async () => {
    if (!season) return;
    await resetSeasonOverrides(season.id);
    setEditing(false);
    load();
  };

  if (loading) return <div className="text-center text-gray-400 py-20">Lade…</div>;
  if (!season) return <div className="text-center text-gray-400 py-20">Staffel nicht gefunden</div>;

  const filteredEpisodes = season.episodes.filter((ep: EpisodeBrief) => {
    if (filter === 'watched') return ep.is_watched && !ep.ignore_in_progress;
    if (filter === 'unwatched') return !ep.is_watched && !ep.ignore_in_progress;
    if (filter === 'ignored') return ep.ignore_in_progress;
    if (filter === 'overrides') return ep.has_override;
    return true;
  });

  const consideredEpisodes = season.episodes.filter((ep: EpisodeBrief) => !ep.ignore_in_progress);
  const watchedCount = consideredEpisodes.filter((ep: EpisodeBrief) => ep.is_watched).length;
  const ignoredCount = season.episodes.length - consideredEpisodes.length;
  const seasonIsFullyIgnored = season.episodes.length > 0 && ignoredCount === season.episodes.length;

  return (
    <div>
      {/* Breadcrumb */}
      <div className="text-sm text-gray-400 mb-4">
        <Link to="/" className="hover:text-white">Bibliothek</Link>
        {' / '}
        <Link to={`/serie/${season.series_id}`} className="hover:text-white">{season.series_name}</Link>
        {' / '}
        <span className="text-white">{season.display_name}</span>
      </div>

      {/* Header */}
      <div className="flex gap-6 mb-6">
        <div className="w-32 shrink-0">
          {season.poster_path ? (
            <img src={posterUrl(season.poster_path, 'w185')} alt="" className="w-full rounded-lg" />
          ) : (
            <div className="w-full aspect-[2/3] bg-gray-800 rounded-lg flex items-center justify-center text-gray-500">
              S{season.season_number}
            </div>
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-start justify-between">
            {editing ? (
              <input
                type="text"
                value={nameOverride}
                onChange={(e) => setNameOverride(e.target.value)}
                placeholder={season.name_de || season.name_en}
                className="text-xl font-bold bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white"
              />
            ) : (
              <h1 className="text-xl font-bold text-white">
                {season.display_name}
                {season.has_override && <span className="ml-2 text-yellow-400 text-sm">✎</span>}
              </h1>
            )}
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleSetSeasonIgnore(!seasonIsFullyIgnored)}
                className="bg-yellow-700 hover:bg-yellow-600 text-white text-sm px-3 py-1.5 rounded"
              >
                {seasonIsFullyIgnored ? 'Staffel einbeziehen' : 'Staffel ignorieren'}
              </button>
              <button
                onClick={() => setEditing(!editing)}
                className="bg-gray-700 hover:bg-gray-600 text-white text-sm px-3 py-1.5 rounded"
              >
                {editing ? 'Abbrechen' : 'Bearbeiten'}
              </button>
            </div>
          </div>

          <ProgressBar watched={watchedCount} total={consideredEpisodes.length} className="mt-3 max-w-sm" />
          {ignoredCount > 0 && (
            <p className="text-xs text-yellow-300 mt-1">
              {ignoredCount} Episode{ignoredCount !== 1 ? 'n' : ''} ignoriert
            </p>
          )}

          {editing && (
            <div className="mt-3">
              <textarea
                value={overviewOverride}
                onChange={(e) => setOverviewOverride(e.target.value)}
                placeholder="Beschreibung…"
                rows={2}
                className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm text-white max-w-lg"
              />
              <div className="flex gap-2 mt-2">
                <button onClick={handleSave} className="bg-green-600 hover:bg-green-500 text-white text-sm px-4 py-1.5 rounded">
                  Speichern
                </button>
                {season.has_override && (
                  <button onClick={handleReset} className="bg-yellow-600 hover:bg-yellow-500 text-white text-sm px-4 py-1.5 rounded">
                    Zurücksetzen
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-4">
        {([
          ['all', 'Alle'],
          ['watched', 'Gesehen'],
          ['unwatched', 'Ungesehen'],
          ['ignored', 'Ignoriert'],
          ['overrides', 'Bearbeitet'],
        ] as [FilterMode, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`text-sm px-3 py-1.5 rounded transition-colors ${
              filter === key
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Episode List */}
      <div className="space-y-1">
        {filteredEpisodes.map((ep: EpisodeBrief) => (
          <div
            key={ep.id}
            className="flex items-center gap-3 bg-gray-800 rounded-lg px-4 py-3 hover:bg-gray-750"
          >
            <button
              onClick={() => handleQuickWatch(ep.id)}
              className={`w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                ep.is_watched
                  ? 'border-green-500 bg-green-500/20 text-green-400'
                  : 'border-gray-600 hover:border-indigo-500 text-gray-500 hover:text-indigo-400'
              }`}
              title={ep.is_watched ? 'Nochmal als gesehen markieren' : 'Als gesehen markieren'}
            >
              ✓
            </button>

            <Link
              to={`/episode/${ep.id}`}
              className="flex-1 min-w-0 hover:text-indigo-300 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-gray-500 text-sm w-8 shrink-0">E{ep.episode_number}</span>
                <span
                  className={`font-medium truncate ${
                    ep.ignore_in_progress ? 'text-yellow-100' : ep.is_watched ? 'text-gray-400' : 'text-white'
                  }`}
                >
                  {ep.display_name}
                </span>
                {ep.ignore_in_progress && (
                  <span className="text-yellow-300 text-xs">ignoriert</span>
                )}
                {ep.has_override && <span className="text-yellow-400 text-xs">✎</span>}
                {ep.missing_from_api && <span className="text-red-400 text-xs">!</span>}
              </div>
            </Link>

            <div className="flex items-center gap-3 shrink-0 text-sm text-gray-500">
              {ep.runtime && <span>{ep.runtime} min</span>}
              {ep.air_date && <span>{ep.air_date}</span>}
              {ep.watch_count > 1 && (
                <span className="bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded text-xs">
                  {ep.watch_count}×
                </span>
              )}
              <button
                onClick={() => handleToggleIgnore(ep.id, !ep.ignore_in_progress)}
                className={`w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                  ep.ignore_in_progress
                    ? 'border-yellow-500 bg-yellow-500/20 text-yellow-300'
                    : 'border-gray-600 hover:border-yellow-500 text-gray-500 hover:text-yellow-300'
                }`}
                title={ep.ignore_in_progress ? 'In Progress einbeziehen' : 'Für Progress ignorieren'}
              >
                ⊘
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredEpisodes.length === 0 && (
        <p className="text-center text-gray-500 py-8">Keine Episoden für diesen Filter.</p>
      )}
    </div>
  );
}
