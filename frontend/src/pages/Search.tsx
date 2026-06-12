import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { TMDBSearchResult } from '../types';
import { searchSeries, addSeries, posterUrl } from '../api/client';

export default function Search() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<TMDBSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingId, setAddingId] = useState<number | null>(null);
  const [searched, setSearched] = useState(false);
  const navigate = useNavigate();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    try {
      const data = await searchSeries(query.trim());
      setResults(data.results);
      setSearched(true);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (tmdbId: number) => {
    setAddingId(tmdbId);
    try {
      const series = await addSeries(tmdbId);
      navigate(`/serie/${series.id}`);
    } catch {
      setAddingId(null);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Serie suchen</h1>

      <form onSubmit={handleSearch} className="flex gap-3 mb-8">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Serienname eingeben…"
          className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-600 text-white px-6 py-2 rounded-lg transition-colors"
        >
          {loading ? 'Suche…' : 'Suchen'}
        </button>
      </form>

      {searched && results.length === 0 && (
        <p className="text-gray-400 text-center py-8">Keine Ergebnisse gefunden.</p>
      )}

      <div className="space-y-3">
        {results.map((r) => (
          <div
            key={r.tmdb_id}
            className="flex items-center gap-4 bg-gray-800 rounded-lg p-3 hover:bg-gray-750"
          >
            <div className="w-12 h-18 shrink-0 bg-gray-700 rounded overflow-hidden">
              {r.poster_path ? (
                <img
                  src={posterUrl(r.poster_path, 'w92')}
                  alt={r.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-white truncate">{r.name}</h3>
              {r.first_air_date && (
                <p className="text-sm text-gray-400">{r.first_air_date.slice(0, 4)}</p>
              )}
              {r.overview && (
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{r.overview}</p>
              )}
            </div>
            <div className="shrink-0">
              {r.already_added ? (
                <span className="text-sm text-green-400">✓ Hinzugefügt</span>
              ) : (
                <button
                  onClick={() => handleAdd(r.tmdb_id)}
                  disabled={addingId === r.tmdb_id}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-600 text-white text-sm px-4 py-1.5 rounded transition-colors"
                >
                  {addingId === r.tmdb_id ? 'Wird geladen…' : 'Hinzufügen'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
