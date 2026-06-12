import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import type { SeriesDetail, Tag } from '../types';
import {
  createTag,
  deleteTag,
  getTags,
  getSeriesDetail,
  deleteSeries,
  posterUrl,
  resetSeriesOverrides,
  setSeriesTags,
  syncSeries,
  updateTag,
  updateSeries,
} from '../api/client';
import ProgressBar from '../components/ProgressBar';

export default function SeriesDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [series, setSeries] = useState<SeriesDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [nameOverride, setNameOverride] = useState('');
  const [overviewOverride, setOverviewOverride] = useState('');
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [tagError, setTagError] = useState<string | null>(null);

  const load = () => {
    if (!id) return;
    setLoading(true);
    Promise.all([getSeriesDetail(Number(id)), getTags()])
      .then(([data, tags]) => {
        setSeries(data);
        setAllTags(tags);
        setNameOverride(data.name_override || '');
        setOverviewOverride(data.overview_override || '');
        setSelectedTagIds(data.tags.map((tag) => tag.id));
        setTagInput('');
        setTagError(null);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, [id]);

  const handleSync = async () => {
    if (!series) return;
    setSyncing(true);
    try {
      await syncSeries(series.id);
      load();
    } finally {
      setSyncing(false);
    }
  };

  const handleSave = async () => {
    if (!series) return;
    setSaving(true);
    try {
      await Promise.all([
        updateSeries(series.id, {
          name_override: nameOverride.trim() || null,
          overview_override: overviewOverride.trim() || null,
        }),
        setSeriesTags(series.id, selectedTagIds),
      ]);
      setEditing(false);
      load();
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!series) return;
    await resetSeriesOverrides(series.id);
    setEditing(false);
    load();
  };

  const handleDelete = async () => {
    if (!series) return;
    if (!window.confirm(`„${series.display_name}" wirklich aus der Bibliothek entfernen?`)) return;
    await deleteSeries(series.id);
    navigate('/');
  };

  const handleToggleEditing = () => {
    if (!series) return;
    if (editing) {
      setNameOverride(series.name_override || '');
      setOverviewOverride(series.overview_override || '');
      setSelectedTagIds(series.tags.map((tag) => tag.id));
      setTagInput('');
      setTagError(null);
    }
    setEditing(!editing);
  };

  const handleAddTag = async () => {
    const normalized = tagInput.trim();
    if (!normalized) return;

    setTagError(null);

    let targetTag = allTags.find((tag) => tag.name.toLowerCase() === normalized.toLowerCase());
    if (!targetTag) {
      try {
        targetTag = await createTag(normalized);
        setAllTags((prev) => [...prev, targetTag as Tag].sort((a, b) => a.name.localeCompare(b.name, 'de')));
      } catch {
        const refreshedTags = await getTags();
        setAllTags(refreshedTags);
        targetTag = refreshedTags.find((tag) => tag.name.toLowerCase() === normalized.toLowerCase());
        if (!targetTag) {
          setTagError('Tag konnte nicht erstellt werden.');
          return;
        }
      }
    }

    setSelectedTagIds((prev) => (prev.includes(targetTag.id) ? prev : [...prev, targetTag.id]));
    setTagInput('');
  };

  const handleRemoveTag = (tagId: number) => {
    setSelectedTagIds((prev) => prev.filter((id) => id !== tagId));
  };

  const handleRenameTag = async (tag: Tag) => {
    const newName = window.prompt('Neuer Tag-Name', tag.name);
    if (newName === null) {
      return;
    }

    const normalized = newName.trim();
    if (!normalized) {
      setTagError('Tag-Name darf nicht leer sein.');
      return;
    }

    if (normalized.toLowerCase() === tag.name.toLowerCase()) {
      return;
    }

    try {
      const updated = await updateTag(tag.id, normalized);
      setAllTags((prev) =>
        prev
          .map((existing) => (existing.id === updated.id ? updated : existing))
          .sort((a, b) => a.name.localeCompare(b.name, 'de')),
      );
      setTagError(null);
    } catch {
      setTagError('Tag konnte nicht umbenannt werden.');
    }
  };

  const handleDeleteTagGlobal = async (tag: Tag) => {
    if (!window.confirm(`Tag „${tag.name}" wirklich global loeschen?`)) {
      return;
    }

    try {
      await deleteTag(tag.id);
      setAllTags((prev) => prev.filter((existing) => existing.id !== tag.id));
      setSelectedTagIds((prev) => prev.filter((tagId) => tagId !== tag.id));
      setSeries((prev) => {
        if (!prev) {
          return prev;
        }

        return {
          ...prev,
          tags: prev.tags.filter((existing) => existing.id !== tag.id),
        };
      });
      setTagError(null);
    } catch {
      setTagError('Tag konnte nicht geloescht werden.');
    }
  };

  if (loading) return <div className="text-center text-gray-400 py-20">Lade…</div>;
  if (!series) return <div className="text-center text-gray-400 py-20">Serie nicht gefunden</div>;

  const totalEps = series.seasons.reduce((s, sn) => s + sn.episode_count, 0);
  const watchedEps = series.seasons.reduce((s, sn) => s + sn.watched_count, 0);
  const tagSuggestionsId = `tag-suggestions-${series.id}`;
  const selectedTags = selectedTagIds
    .map((tagId) => allTags.find((tag) => tag.id === tagId) || series.tags.find((tag) => tag.id === tagId))
    .filter((tag): tag is Tag => Boolean(tag));
  const availableTags = allTags.filter((tag) => !selectedTagIds.includes(tag.id));

  return (
    <div>
      {/* Header */}
      <div className="flex gap-6 mb-8">
        <div className="w-48 shrink-0">
          {series.poster_path ? (
            <img
              src={posterUrl(series.poster_path, 'w342')}
              alt={series.display_name}
              className="w-full rounded-lg"
            />
          ) : (
            <div className="w-full aspect-[2/3] bg-gray-800 rounded-lg flex items-center justify-center text-gray-500">
              Kein Poster
            </div>
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-start justify-between">
            <div>
              {editing ? (
                <input
                  type="text"
                  value={nameOverride}
                  onChange={(e) => setNameOverride(e.target.value)}
                  placeholder={series.name_de || series.name_en}
                  className="text-2xl font-bold bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white w-full"
                />
              ) : (
                <h1 className="text-2xl font-bold text-white">{series.display_name}</h1>
              )}
              {series.name_de && series.name_de !== series.name_en && (
                <p className="text-sm text-gray-400 mt-1">
                  EN: {series.name_en}
                </p>
              )}
            </div>
            <div className="flex gap-2 shrink-0 ml-4">
              <button
                onClick={handleSync}
                disabled={syncing}
                className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 text-white text-sm px-4 py-2 rounded transition-colors"
              >
                {syncing ? 'Synchronisiere…' : 'Aktualisieren'}
              </button>
              <button
                onClick={handleToggleEditing}
                className="bg-gray-700 hover:bg-gray-600 text-white text-sm px-4 py-2 rounded transition-colors"
              >
                {editing ? 'Abbrechen' : 'Bearbeiten'}
              </button>
              <button
                onClick={handleDelete}
                className="bg-red-700 hover:bg-red-600 text-white text-sm px-4 py-2 rounded transition-colors"
              >
                Entfernen
              </button>
            </div>
          </div>

          <div className="flex gap-3 text-sm text-gray-400 mt-2">
            {series.first_air_date && <span>{series.first_air_date.slice(0, 4)}</span>}
            <span>{series.total_seasons} Staffel{series.total_seasons !== 1 ? 'n' : ''}</span>
            <span>{totalEps} Episoden</span>
            {series.status && <span>· {series.status}</span>}
          </div>

          {series.has_override && (
            <span className="inline-block mt-2 bg-yellow-500/20 text-yellow-300 text-xs px-2 py-0.5 rounded">
              Manuell bearbeitet
            </span>
          )}

          {series.tags.length > 0 && !editing && (
            <div className="mt-3 flex flex-wrap gap-2">
              {series.tags.map((tag) => (
                <span
                  key={tag.id}
                  className="inline-flex items-center rounded-full bg-indigo-500/20 text-indigo-200 text-xs px-2 py-1"
                >
                  {tag.name}
                </span>
              ))}
            </div>
          )}

          <ProgressBar watched={watchedEps} total={totalEps} className="mt-4 max-w-md" />

          {editing ? (
            <div className="mt-4">
              <div>
                <p className="text-sm text-gray-300">Tags</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedTags.length > 0 ? (
                    selectedTags.map((tag) => (
                      <div
                        key={tag.id}
                        className="inline-flex items-center gap-2 rounded-full bg-indigo-500/20 text-indigo-100 text-xs px-2 py-1"
                      >
                        <span className="px-1">{tag.name}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag.id)}
                          className="rounded-full bg-indigo-500/30 px-2 py-0.5 hover:bg-indigo-500/50"
                          aria-label={`Tag ${tag.name} von Serie entfernen`}
                          title="Von Serie entfernen"
                        >
                          ×
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleRenameTag(tag)}
                          className="rounded-full bg-gray-700 px-2 py-0.5 hover:bg-gray-600"
                          aria-label={`Tag ${tag.name} umbenennen`}
                          title="Tag umbenennen"
                        >
                          Umbenennen
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeleteTagGlobal(tag)}
                          className="rounded-full bg-red-900/70 px-2 py-0.5 text-red-100 hover:bg-red-800"
                          aria-label={`Tag ${tag.name} global loeschen`}
                          title="Tag global loeschen"
                        >
                          Loeschen
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-gray-500">Noch keine Tags zugewiesen.</p>
                  )}
                </div>
                {selectedTags.length > 0 && (
                  <p className="text-xs text-gray-500 mt-2">
                    × entfernt nur die Zuweisung von dieser Serie. Loeschen entfernt den Tag global.
                  </p>
                )}
                <div className="mt-3 flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        void handleAddTag();
                      }
                    }}
                    list={tagSuggestionsId}
                    placeholder="Tag eingeben oder vorhandenen waehlen"
                    className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm text-white"
                  />
                  <datalist id={tagSuggestionsId}>
                    {availableTags.map((tag) => (
                      <option key={tag.id} value={tag.name} />
                    ))}
                  </datalist>
                  <button
                    type="button"
                    onClick={() => void handleAddTag()}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm px-4 py-2 rounded"
                  >
                    Tag hinzufuegen
                  </button>
                </div>
                {tagError && <p className="text-xs text-red-400 mt-2">{tagError}</p>}
              </div>

              <textarea
                value={overviewOverride}
                onChange={(e) => setOverviewOverride(e.target.value)}
                placeholder={series.overview_de || series.overview_en || 'Beschreibung…'}
                rows={3}
                className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm text-white mt-4"
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-green-600 hover:bg-green-500 disabled:bg-gray-600 text-white text-sm px-4 py-1.5 rounded"
                >
                  {saving ? 'Speichere…' : 'Speichern'}
                </button>
                {series.has_override && (
                  <button
                    onClick={handleReset}
                    className="bg-yellow-600 hover:bg-yellow-500 text-white text-sm px-4 py-1.5 rounded"
                  >
                    Overrides zurücksetzen
                  </button>
                )}
              </div>
            </div>
          ) : (
            series.display_overview && (
              <p className="text-sm text-gray-300 mt-4 leading-relaxed max-w-2xl">
                {series.display_overview}
              </p>
            )
          )}

          {series.last_synced_at && (
            <p className="text-xs text-gray-500 mt-4">
              Zuletzt synchronisiert: {new Date(series.last_synced_at).toLocaleString('de-DE')}
            </p>
          )}
        </div>
      </div>

      {/* Staffeln */}
      <h2 className="text-xl font-bold text-white mb-4">Staffeln</h2>
      <div className="space-y-2">
        {series.seasons.map((season) => (
          <Link
            key={season.id}
            to={`/serie/${series.id}/staffel/${season.id}`}
            className="flex items-center gap-4 bg-gray-800 rounded-lg p-4 hover:bg-gray-750 hover:ring-1 hover:ring-indigo-500 transition-all"
          >
            <div className="w-16 shrink-0">
              {season.poster_path ? (
                <img
                  src={posterUrl(season.poster_path, 'w92')}
                  alt={season.display_name}
                  className="w-full rounded"
                />
              ) : (
                <div className="w-full aspect-[2/3] bg-gray-700 rounded flex items-center justify-center text-gray-500 text-xs">
                  S{season.season_number}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-white">
                {season.display_name}
                {season.has_override && (
                  <span className="ml-2 text-yellow-400 text-xs">✎</span>
                )}
                {season.missing_from_api && (
                  <span className="ml-2 text-red-400 text-xs">Nicht mehr in API</span>
                )}
              </h3>
              <p className="text-sm text-gray-400">
                {season.episode_count} Episoden
              </p>
            </div>
            <div className="w-40 shrink-0">
              <ProgressBar watched={season.watched_count} total={season.episode_count} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
