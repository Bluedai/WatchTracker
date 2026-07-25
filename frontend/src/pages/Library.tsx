import { useEffect, useMemo, useState } from 'react';
import type { SeriesListItem, MovieListItem, Tag, StatsResponse } from '../types';
import { getSeries, getMovies, getStats, getTags } from '../api/client';
import SeriesCard from '../components/SeriesCard';
import MovieCard from '../components/MovieCard';
import ProgressBar from '../components/ProgressBar';

type Section = 'series' | 'movies';

export default function Library() {
  const [section, setSection] = useState<Section>('series');
  const [series, setSeries] = useState<SeriesListItem[]>([]);
  const [movies, setMovies] = useState<MovieListItem[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<StatsResponse | null>(null);

  useEffect(() => {
    Promise.all([getSeries(), getMovies(), getStats(), getTags()])
      .then(([s, m, st, tg]) => {
        setSeries(s);
        setMovies(m);
        setStats(st);
        setTags(tg);
      })
      .finally(() => setLoading(false));
  }, []);

  const sortedTags = useMemo(
    () => [...tags].sort((a, b) => a.name.localeCompare(b.name, 'de')),
    [tags],
  );

  const activeItems = section === 'series' ? series : movies;

  const filteredItems = useMemo(() => {
    if (selectedTagIds.length === 0) {
      return activeItems;
    }

    return activeItems.filter((item) => item.tags.some((tag) => selectedTagIds.includes(tag.id)));
  }, [activeItems, selectedTagIds]);

  const toggleTagFilter = (tagId: number) => {
    setSelectedTagIds((prev) => (prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]));
  };

  if (loading) {
    return <div className="text-center text-gray-400 py-20">Lade Bibliothek…</div>;
  }

  const hasAnyContent = series.length > 0 || movies.length > 0;

  if (!hasAnyContent) {
    return (
      <div className="text-center py-20">
        <h1 className="text-2xl font-bold text-white mb-4">Willkommen bei WatchTracker</h1>
        <p className="text-gray-400 mb-6">
          Deine Bibliothek ist noch leer. Suche nach Serien oder Filmen und füge sie hinzu.
        </p>
        <a
          href="/suche"
          className="inline-block bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-lg transition-colors"
        >
          Suchen
        </a>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => { setSection('series'); setSelectedTagIds([]); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              section === 'series'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            Serien ({series.length})
          </button>
          <button
            type="button"
            onClick={() => { setSection('movies'); setSelectedTagIds([]); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              section === 'movies'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            Filme ({movies.length})
          </button>
        </div>
        {stats && (
          <div className="w-full sm:w-64">
            <div className="text-xs text-gray-400 mb-1">
              {section === 'series' ? 'Serienfortschritt' : 'Filmfortschritt'}
            </div>
            <ProgressBar
              watched={section === 'series' ? stats.total_watched : stats.total_watched_movies}
              total={section === 'series' ? stats.total_episodes : stats.total_movies}
            />
          </div>
        )}
      </div>

      {sortedTags.length > 0 && (
        <div className="mb-5 bg-gray-800 rounded-lg p-3 border border-gray-700">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-gray-300">Nach Tags filtern (mindestens ein Treffer)</p>
            {selectedTagIds.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedTagIds([])}
                className="text-xs text-indigo-300 hover:text-indigo-200"
              >
                Filter zuruecksetzen
              </button>
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {sortedTags.map((tag) => {
              const isActive = selectedTagIds.includes(tag.id);
              const usageCount = activeItems.filter((item) => item.tags.some((itemTag) => itemTag.id === tag.id)).length;

              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleTagFilter(tag.id)}
                  className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs transition-colors ${
                    isActive
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                  }`}
                >
                  <span>{tag.name}</span>
                  {usageCount > 0 && (
                    <span className={`rounded-full px-1.5 py-0.5 ${isActive ? 'bg-indigo-500/70' : 'bg-gray-600'}`}>
                      {usageCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {selectedTagIds.length > 0 && (
        <p className="text-xs text-gray-400 mb-3">
          {filteredItems.length} von {activeItems.length} {section === 'series' ? 'Serien' : 'Filmen'} sichtbar
        </p>
      )}

      {filteredItems.length === 0 && (
        <div className="text-center py-12 text-gray-400 bg-gray-800 rounded-lg border border-gray-700 mb-4">
          {section === 'series'
            ? 'Keine Serie passt zu den gewaehlten Tags.'
            : 'Kein Film passt zu den gewaehlten Tags.'}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {section === 'series'
          ? (filteredItems as SeriesListItem[]).map((s) => <SeriesCard key={s.id} series={s} />)
          : (filteredItems as MovieListItem[]).map((m) => <MovieCard key={m.id} movie={m} />)}
      </div>
    </div>
  );
}
