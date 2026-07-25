import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { WatchHistoryItem } from '../types';
import { getWatchHistory, posterUrl, deleteWatch, deleteMovieWatch } from '../api/client';

export default function WatchHistoryPage() {
  const [history, setHistory] = useState<WatchHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const limit = 50;

  const load = (off: number = 0) => {
    setLoading(true);
    getWatchHistory(limit, off)
      .then(setHistory)
      .finally(() => setLoading(false));
  };

  useEffect(() => load(offset), [offset]);

  const handleDelete = async (item: WatchHistoryItem) => {
    if (!window.confirm('Sichtung wirklich löschen?')) return;
    if (item.movie_id !== null) {
      await deleteMovieWatch(item.id);
    } else {
      await deleteWatch(item.id);
    }
    load(offset);
  };

  if (loading) return <div className="text-center text-gray-400 py-20">Lade…</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Sichtungsverlauf</h1>

      {history.length === 0 ? (
        <p className="text-gray-400 text-center py-8">Noch keine Sichtungen vorhanden.</p>
      ) : (
        <div className="space-y-2">
          {history.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-4 bg-gray-800 rounded-lg px-4 py-3"
            >
              <div className="w-10 h-14 shrink-0 bg-gray-700 rounded overflow-hidden">
                {item.series_poster_path || item.movie_poster_path ? (
                  <img
                    src={posterUrl(item.series_poster_path || item.movie_poster_path, 'w92')}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                {item.movie_id !== null ? (
                  <>
                    <Link
                      to={`/film/${item.movie_id}`}
                      className="font-medium text-white hover:text-indigo-300 truncate block"
                    >
                      {item.movie_title}
                    </Link>
                    <span className="text-xs text-gray-500">Film</span>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/serie/${item.series_id}`}
                        className="font-medium text-white hover:text-indigo-300 truncate"
                      >
                        {item.series_name}
                      </Link>
                      <span className="text-gray-500 text-sm shrink-0">
                        S{item.season_number}E{item.episode_number}
                      </span>
                    </div>
                    <Link
                      to={`/episode/${item.episode_id}`}
                      className="text-sm text-gray-400 hover:text-indigo-300 truncate block"
                    >
                      {item.episode_name}
                    </Link>
                  </>
                )}
                {item.notes && (
                  <p className="text-xs text-gray-500 mt-0.5">{item.notes}</p>
                )}
              </div>
              <div className="text-right shrink-0">
                <div className="text-sm text-gray-400">
                  {new Date(item.watched_at).toLocaleString('de-DE')}
                </div>
                <button
                  onClick={() => handleDelete(item)}
                  className="text-red-400 hover:text-red-300 text-xs mt-1"
                >
                  Löschen
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      <div className="flex justify-center gap-4 mt-6">
        {offset > 0 && (
          <button
            onClick={() => setOffset(Math.max(0, offset - limit))}
            className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded text-sm"
          >
            ← Neuere
          </button>
        )}
        {history.length >= limit && (
          <button
            onClick={() => setOffset(offset + limit)}
            className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded text-sm"
          >
            Ältere →
          </button>
        )}
      </div>
    </div>
  );
}
