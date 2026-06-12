import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import type { EpisodeDetail, WatchEntryBrief } from '../types';
import {
  getEpisodeDetail,
  updateEpisode,
  resetEpisodeOverrides,
  addWatch,
  setEpisodeIgnore,
  updateWatch,
  deleteWatch,
  stillUrl,
} from '../api/client';

export default function EpisodeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [episode, setEpisode] = useState<EpisodeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [nameOverride, setNameOverride] = useState('');
  const [overviewOverride, setOverviewOverride] = useState('');
  const [editingWatch, setEditingWatch] = useState<number | null>(null);
  const [watchDate, setWatchDate] = useState('');
  const [watchNotes, setWatchNotes] = useState('');

  const load = () => {
    if (!id) return;
    setLoading(true);
    getEpisodeDetail(Number(id))
      .then((data) => {
        setEpisode(data);
        setNameOverride(data.name_override || '');
        setOverviewOverride(data.overview_override || '');
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, [id]);

  const handleSave = async () => {
    if (!episode) return;
    await updateEpisode(episode.id, {
      name_override: nameOverride.trim() || null,
      overview_override: overviewOverride.trim() || null,
    });
    setEditing(false);
    load();
  };

  const handleReset = async () => {
    if (!episode) return;
    await resetEpisodeOverrides(episode.id);
    setEditing(false);
    load();
  };

  const handleAddWatch = async () => {
    if (!episode) return;
    await addWatch(episode.id);
    load();
  };

  const handleToggleIgnore = async () => {
    if (!episode) return;
    await setEpisodeIgnore(episode.id, !episode.ignore_in_progress);
    load();
  };

  const handleSaveWatch = async (watchId: number) => {
    await updateWatch(watchId, {
      watched_at: watchDate ? new Date(watchDate).toISOString() : undefined,
      notes: watchNotes || undefined,
    });
    setEditingWatch(null);
    load();
  };

  const handleDeleteWatch = async (watchId: number) => {
    if (!window.confirm('Sichtung wirklich löschen?')) return;
    await deleteWatch(watchId);
    load();
  };

  const startEditWatch = (w: WatchEntryBrief) => {
    setEditingWatch(w.id);
    setWatchDate(new Date(w.watched_at).toISOString().slice(0, 16));
    setWatchNotes(w.notes || '');
  };

  if (loading) return <div className="text-center text-gray-400 py-20">Lade…</div>;
  if (!episode) return <div className="text-center text-gray-400 py-20">Episode nicht gefunden</div>;

  return (
    <div>
      {/* Breadcrumb */}
      <div className="text-sm text-gray-400 mb-4">
        <Link to="/" className="hover:text-white">Bibliothek</Link>
        {' / '}
        {episode.series_id && (
          <>
            <Link to={`/serie/${episode.series_id}`} className="hover:text-white">{episode.series_name}</Link>
            {' / '}
          </>
        )}
        {episode.season_number !== null && episode.season_id && (
          <>
            <Link to={`/serie/${episode.series_id}/staffel/${episode.season_id}`} className="hover:text-white">
              Staffel {episode.season_number}
            </Link>
            {' / '}
          </>
        )}
        <span className="text-white">Episode {episode.episode_number}</span>
      </div>

      {/* Header */}
      <div className="flex gap-6 mb-6">
        {episode.still_path && (
          <div className="w-64 shrink-0">
            <img src={stillUrl(episode.still_path)} alt="" className="w-full rounded-lg" />
          </div>
        )}
        <div className="flex-1">
          <div className="flex items-start justify-between">
            <div>
              {editing ? (
                <input
                  type="text"
                  value={nameOverride}
                  onChange={(e) => setNameOverride(e.target.value)}
                  placeholder={episode.name_de || episode.name_en}
                  className="text-xl font-bold bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white w-full"
                />
              ) : (
                <h1 className="text-xl font-bold text-white">
                  E{episode.episode_number}: {episode.display_name}
                  {episode.has_override && <span className="ml-2 text-yellow-400 text-sm">✎</span>}
                </h1>
              )}
              <div className="flex gap-3 text-sm text-gray-400 mt-1">
                {episode.name_de && episode.name_de !== episode.name_en && (
                  <span>EN: {episode.name_en}</span>
                )}
                {episode.air_date && <span>{episode.air_date}</span>}
                {episode.runtime && <span>{episode.runtime} min</span>}
              </div>
            </div>
            <div className="flex gap-2 shrink-0 ml-4">
              <button
                onClick={handleAddWatch}
                className="bg-green-600 hover:bg-green-500 text-white text-sm px-4 py-2 rounded"
              >
                Als gesehen markieren
              </button>
              <button
                onClick={handleToggleIgnore}
                className="bg-yellow-700 hover:bg-yellow-600 text-white text-sm px-4 py-2 rounded"
              >
                {episode.ignore_in_progress ? 'Einbeziehen' : 'Ignorieren'}
              </button>
              <button
                onClick={() => setEditing(!editing)}
                className="bg-gray-700 hover:bg-gray-600 text-white text-sm px-3 py-2 rounded"
              >
                {editing ? 'Abbrechen' : 'Bearbeiten'}
              </button>
            </div>
          </div>

          {editing ? (
            <div className="mt-4">
              <textarea
                value={overviewOverride}
                onChange={(e) => setOverviewOverride(e.target.value)}
                placeholder={episode.overview_de || episode.overview_en || 'Beschreibung…'}
                rows={3}
                className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm text-white"
              />
              <div className="flex gap-2 mt-2">
                <button onClick={handleSave} className="bg-green-600 hover:bg-green-500 text-white text-sm px-4 py-1.5 rounded">
                  Speichern
                </button>
                {episode.has_override && (
                  <button onClick={handleReset} className="bg-yellow-600 hover:bg-yellow-500 text-white text-sm px-4 py-1.5 rounded">
                    Zurücksetzen
                  </button>
                )}
              </div>
            </div>
          ) : (
            episode.display_overview && (
              <p className="text-sm text-gray-300 mt-4 leading-relaxed">{episode.display_overview}</p>
            )
          )}

          {episode.missing_from_api && (
            <div className="mt-3 bg-red-900/30 border border-red-700 rounded px-3 py-2 text-sm text-red-300">
              Diese Episode wurde bei der letzten Synchronisierung nicht mehr in der API gefunden.
            </div>
          )}
          {episode.ignore_in_progress && (
            <div className="mt-3 bg-yellow-900/30 border border-yellow-700 rounded px-3 py-2 text-sm text-yellow-200">
              Diese Episode wird in Fortschritt und Prozentanzeige nicht mitgezaehlt.
            </div>
          )}
        </div>
      </div>

      {/* Sichtungsverlauf */}
      <h2 className="text-lg font-bold text-white mb-3">
        Sichtungsverlauf ({episode.watch_entries.length})
      </h2>

      {episode.watch_entries.length === 0 ? (
        <p className="text-gray-500 text-sm">Noch nicht gesehen.</p>
      ) : (
        <div className="space-y-2">
          {episode.watch_entries.map((w: WatchEntryBrief) => (
            <div key={w.id} className="flex items-center gap-3 bg-gray-800 rounded-lg px-4 py-3">
              {editingWatch === w.id ? (
                <div className="flex-1 flex items-center gap-3 flex-wrap">
                  <input
                    type="datetime-local"
                    value={watchDate}
                    onChange={(e) => setWatchDate(e.target.value)}
                    className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white"
                  />
                  <input
                    type="text"
                    value={watchNotes}
                    onChange={(e) => setWatchNotes(e.target.value)}
                    placeholder="Notiz…"
                    className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white flex-1"
                  />
                  <button
                    onClick={() => handleSaveWatch(w.id)}
                    className="bg-green-600 hover:bg-green-500 text-white text-xs px-3 py-1 rounded"
                  >
                    Speichern
                  </button>
                  <button
                    onClick={() => setEditingWatch(null)}
                    className="text-gray-400 hover:text-white text-xs"
                  >
                    Abbrechen
                  </button>
                </div>
              ) : (
                <>
                  <div className="w-5 h-5 rounded-full bg-green-500/20 border border-green-500 flex items-center justify-center text-green-400 text-xs shrink-0">
                    ✓
                  </div>
                  <div className="flex-1">
                    <span className="text-sm text-white">
                      {new Date(w.watched_at).toLocaleString('de-DE')}
                    </span>
                    {w.notes && <span className="text-sm text-gray-400 ml-3">{w.notes}</span>}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => startEditWatch(w)}
                      className="text-gray-400 hover:text-white text-xs"
                    >
                      Bearbeiten
                    </button>
                    <button
                      onClick={() => handleDeleteWatch(w.id)}
                      className="text-red-400 hover:text-red-300 text-xs"
                    >
                      Löschen
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
