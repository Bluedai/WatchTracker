import { useEffect, useMemo, useState } from 'react';
import type { SeriesListItem, Tag } from '../types';
import { getSeries, getStats, getTags } from '../api/client';
import SeriesCard from '../components/SeriesCard';
import ProgressBar from '../components/ProgressBar';

export default function Library() {
  const [series, setSeries] = useState<SeriesListItem[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{ total_episodes: number; total_watched: number } | null>(null);

  useEffect(() => {
    Promise.all([getSeries(), getStats(), getTags()])
      .then(([s, st, tg]) => {
        setSeries(s);
        setStats(st);
        setTags(tg);
      })
      .finally(() => setLoading(false));
  }, []);

  const sortedTags = useMemo(
    () => [...tags].sort((a, b) => a.name.localeCompare(b.name, 'de')),
    [tags],
  );

  const filteredSeries = useMemo(() => {
    if (selectedTagIds.length === 0) {
      return series;
    }

    return series.filter((item) => item.tags.some((tag) => selectedTagIds.includes(tag.id)));
  }, [series, selectedTagIds]);

  const toggleTagFilter = (tagId: number) => {
    setSelectedTagIds((prev) => (prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]));
  };

  if (loading) {
    return <div className="text-center text-gray-400 py-20">Lade Bibliothek…</div>;
  }

  if (series.length === 0) {
    return (
      <div className="text-center py-20">
        <h1 className="text-2xl font-bold text-white mb-4">Willkommen bei WatchTracker</h1>
        <p className="text-gray-400 mb-6">
          Deine Bibliothek ist noch leer. Suche nach Serien und füge sie hinzu.
        </p>
        <a
          href="/suche"
          className="inline-block bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-lg transition-colors"
        >
          Serien suchen
        </a>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Meine Serien</h1>
        {stats && (
          <div className="w-64">
            <div className="text-xs text-gray-400 mb-1">Gesamtfortschritt</div>
            <ProgressBar watched={stats.total_watched} total={stats.total_episodes} />
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
              const usageCount = series.filter((item) => item.tags.some((itemTag) => itemTag.id === tag.id)).length;

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
                  <span className={`rounded-full px-1.5 py-0.5 ${isActive ? 'bg-indigo-500/70' : 'bg-gray-600'}`}>
                    {usageCount}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {selectedTagIds.length > 0 && (
        <p className="text-xs text-gray-400 mb-3">
          {filteredSeries.length} von {series.length} Serien sichtbar
        </p>
      )}

      {filteredSeries.length === 0 && (
        <div className="text-center py-12 text-gray-400 bg-gray-800 rounded-lg border border-gray-700 mb-4">
          Keine Serie passt zu den gewaehlten Tags.
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {filteredSeries.map((s) => (
          <SeriesCard key={s.id} series={s} />
        ))}
      </div>
    </div>
  );
}
