import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { MovieDetail as MovieDetailType, Tag, WatchEntryBrief } from '../types';
import {
  addMovieWatch,
  createTag,
  deleteMovie,
  deleteMovieWatch,
  deleteTag,
  getMovieDetail,
  getTags,
  posterUrl,
  resetMovieOverrides,
  setMovieTags,
  syncMovie,
  updateMovie,
  updateMovieWatch,
  updateTag,
} from '../api/client';

export default function MovieDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [movie, setMovie] = useState<MovieDetailType | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editOverview, setEditOverview] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [tagError, setTagError] = useState<string | null>(null);
  const [watchNotes, setWatchNotes] = useState('');
  const [editWatch, setEditWatch] = useState<WatchEntryBrief | null>(null);
  const [editWatchDate, setEditWatchDate] = useState('');
  const [editWatchNotes, setEditWatchNotes] = useState('');

  const movieId = Number(id);

  const fetchMovie = async () => {
    try {
      const data = await getMovieDetail(movieId);
      setMovie(data);
      setSelectedTagIds(data.tags.map((t) => t.id));
    } catch {
      setError('Film konnte nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchMovie(), getTags()])
      .then(([, tagsData]) => setTags(tagsData))
      .finally(() => setLoading(false));
  }, [movieId]);

  const tagSuggestionsId = `tag-suggestions-${movie?.id ?? 0}`;
  const selectedTags = useMemo(
    () =>
      selectedTagIds
        .map((tagId) => tags.find((tag) => tag.id === tagId) || movie?.tags.find((tag) => tag.id === tagId))
        .filter((tag): tag is Tag => Boolean(tag))
        .sort((a, b) => a.name.localeCompare(b.name, 'de')),
    [selectedTagIds, tags, movie]
  );
  const availableTags = useMemo(
    () => tags.filter((tag) => !selectedTagIds.includes(tag.id)).sort((a, b) => a.name.localeCompare(b.name, 'de')),
    [tags, selectedTagIds]
  );

  const handleSync = async () => {
    if (!movie) return;
    setLoading(true);
    try {
      const updated = await syncMovie(movie.id);
      setMovie(updated);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!movie) return;
    if (!window.confirm('Film wirklich aus der Bibliothek entfernen?')) return;
    await deleteMovie(movie.id);
    navigate('/');
  };

  const startEdit = () => {
    if (!movie) return;
    setEditTitle(movie.title_override || '');
    setEditOverview(movie.overview_override || '');
    setSelectedTagIds(movie.tags.map((t) => t.id));
    setTagInput('');
    setTagError(null);
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!movie) return;
    const title = editTitle.trim() || null;
    const overview = editOverview.trim() || null;
    await Promise.all([
      updateMovie(movie.id, {
        title_override: title,
        overview_override: overview,
      }),
      setMovieTags(movie.id, selectedTagIds),
    ]);
    fetchMovie();
    setIsEditing(false);
  };

  const handleResetOverrides = async () => {
    if (!movie) return;
    const updated = await resetMovieOverrides(movie.id);
    setMovie(updated);
    setSelectedTagIds(updated.tags.map((t) => t.id));
    setIsEditing(false);
  };

  const handleAddTag = async () => {
    const normalized = tagInput.trim();
    if (!normalized) return;

    setTagError(null);

    let targetTag = tags.find((tag) => tag.name.toLowerCase() === normalized.toLowerCase());
    if (!targetTag) {
      try {
        targetTag = await createTag(normalized);
        setTags((prev) => [...prev, targetTag as Tag].sort((a, b) => a.name.localeCompare(b.name, 'de')));
      } catch {
        const refreshedTags = await getTags();
        setTags(refreshedTags);
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
    if (newName === null) return;

    const normalized = newName.trim();
    if (!normalized) {
      setTagError('Tag-Name darf nicht leer sein.');
      return;
    }

    if (normalized.toLowerCase() === tag.name.toLowerCase()) return;

    try {
      const updated = await updateTag(tag.id, normalized);
      setTags((prev) =>
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
    if (!window.confirm(`Tag "${tag.name}" wirklich global löschen?`)) return;

    try {
      await deleteTag(tag.id);
      setTags((prev) => prev.filter((existing) => existing.id !== tag.id));
      setSelectedTagIds((prev) => prev.filter((tagId) => tagId !== tag.id));
      setTagError(null);
    } catch {
      setTagError('Tag konnte nicht gelöscht werden.');
    }
  };

  const handleAddWatch = async () => {
    if (!movie) return;
    const notes = watchNotes.trim() || null;
    await addMovieWatch(movie.id, { notes: notes ?? undefined });
    setWatchNotes('');
    fetchMovie();
  };

  const startEditWatch = (entry: WatchEntryBrief) => {
    setEditWatch(entry);
    const date = new Date(entry.watched_at);
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    setEditWatchDate(local.toISOString().slice(0, 16));
    setEditWatchNotes(entry.notes || '');
  };

  const handleSaveWatch = async () => {
    if (!editWatch || !movie) return;
    const watchedAt = editWatchDate ? new Date(editWatchDate).toISOString() : undefined;
    const notes = editWatchNotes.trim() || null;
    await updateMovieWatch(editWatch.id, {
      watched_at: watchedAt,
      notes: notes ?? undefined,
    });
    setEditWatch(null);
    fetchMovie();
  };

  const handleDeleteWatch = async (watchId: number) => {
    if (!window.confirm('Sichtung wirklich löschen?')) return;
    await deleteMovieWatch(watchId);
    fetchMovie();
  };

  if (loading && !movie) {
    return <div className="text-center text-gray-400 py-20">Lade Film…</div>;
  }

  if (error || !movie) {
    return <div className="text-center text-red-400 py-20">{error || 'Film nicht gefunden.'}</div>;
  }

  const year = movie.release_date?.slice(0, 4) || '–';

  return (
    <div>
      <div className="flex flex-col md:flex-row gap-6 mb-8">
        <div className="shrink-0 w-full md:w-64">
          <div className="aspect-[2/3] bg-gray-700 rounded-lg overflow-hidden">
            {movie.poster_path ? (
              <img
                src={posterUrl(movie.poster_path, 'w500')}
                alt={movie.display_title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-500">Kein Poster</div>
            )}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4 mb-2">
            <div>
              <h1 className="text-3xl font-bold text-white">{movie.display_title}</h1>
              {movie.title_override && (
                <p className="text-sm text-gray-400 mt-1">Original: {movie.title_en}</p>
              )}
              <div className="flex items-center gap-3 text-sm text-gray-400 mt-2">
                <span>{year}</span>
                {movie.runtime !== null && movie.runtime > 0 && (
                  <>
                    <span>·</span>
                    <span>{movie.runtime} Min.</span>
                  </>
                )}
                {movie.status && (
                  <>
                    <span>·</span>
                    <span>{movie.status}</span>
                  </>
                )}
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={handleSync}
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm transition-colors"
              >
                Aktualisieren
              </button>
              <button
                onClick={startEdit}
                className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm transition-colors"
              >
                Bearbeiten
              </button>
              <button
                onClick={handleDelete}
                className="bg-red-700 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm transition-colors"
              >
                Entfernen
              </button>
            </div>
          </div>

          {movie.tags.length > 0 && !isEditing && (
            <div className="mt-3 flex flex-wrap gap-2">
              {[...movie.tags]
                .sort((a, b) => a.name.localeCompare(b.name, 'de'))
                .map((tag) => (
                  <span
                    key={tag.id}
                    className="inline-flex items-center rounded-full bg-indigo-500/20 text-indigo-200 text-xs px-2 py-1"
                  >
                    {tag.name}
                  </span>
                ))}
            </div>
          )}

          {isEditing ? (
            <div className="mt-4 bg-gray-800 rounded-lg p-4 border border-gray-700 space-y-4">
              <h3 className="text-white font-medium mb-1">Film bearbeiten</h3>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Titel-Override</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white"
                  placeholder="Leer lassen für API-Titel"
                />
              </div>

              <div>
                <p className="text-sm text-gray-300 mb-2">Tags</p>
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
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
                            aria-label={`Tag ${tag.name} von Film entfernen`}
                            title="Von Film entfernen"
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
                            aria-label={`Tag ${tag.name} global löschen`}
                            title="Tag global löschen"
                          >
                            Löschen
                          </button>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-gray-500">Noch keine Tags zugewiesen.</p>
                    )}
                  </div>
                  {selectedTags.length > 0 && (
                    <p className="text-xs text-gray-500">
                      × entfernt nur die Zuweisung von diesem Film. Löschen entfernt den Tag global.
                    </p>
                  )}
                  <div className="flex flex-col sm:flex-row gap-2">
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
                      placeholder="Tag eingeben oder vorhandenen wählen"
                      className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm text-white"
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
                      Tag hinzufügen
                    </button>
                  </div>
                  {tagError && <p className="text-xs text-red-400">{tagError}</p>}
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Beschreibung-Override</label>
                <textarea
                  value={editOverview}
                  onChange={(e) => setEditOverview(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white"
                  rows={4}
                  placeholder="Leer lassen für API-Beschreibung"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleSaveEdit}
                  className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg text-sm"
                >
                  Speichern
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded-lg text-sm"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleResetOverrides}
                  className="text-indigo-300 hover:text-indigo-200 text-sm px-2"
                >
                  Overrides zurücksetzen
                </button>
              </div>
            </div>
          ) : (
            <p className="text-gray-300 mt-4 whitespace-pre-line">
              {movie.display_overview || 'Keine Beschreibung verfügbar.'}
            </p>
          )}
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <h2 className="text-xl font-bold text-white mb-4">Sichtungen</h2>

        <div className="flex gap-2 mb-6">
          <input
            type="text"
            value={watchNotes}
            onChange={(e) => setWatchNotes(e.target.value)}
            placeholder="Notiz (optional)"
            className="flex-1 bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
          />
          <button
            onClick={handleAddWatch}
            className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg text-sm"
          >
            Als gesehen markieren
          </button>
        </div>

        {movie.watch_count === 0 ? (
          <p className="text-gray-400 text-sm">Noch nicht gesehen.</p>
        ) : (
          <ul className="space-y-3">
            {movie.watch_entries?.map((entry) => (
              <li key={entry.id} className="bg-gray-900 rounded-lg p-3 flex items-start justify-between">
                {editWatch?.id === entry.id ? (
                  <div className="flex-1 flex flex-col sm:flex-row gap-2">
                    <input
                      type="datetime-local"
                      value={editWatchDate}
                      onChange={(e) => setEditWatchDate(e.target.value)}
                      className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-sm"
                    />
                    <input
                      type="text"
                      value={editWatchNotes}
                      onChange={(e) => setEditWatchNotes(e.target.value)}
                      placeholder="Notiz"
                      className="flex-1 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-sm"
                    />
                    <div className="flex gap-2">
                      <button onClick={handleSaveWatch} className="text-green-400 text-sm hover:text-green-300">
                        Speichern
                      </button>
                      <button onClick={() => setEditWatch(null)} className="text-gray-400 text-sm hover:text-gray-300">
                        Abbrechen
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div>
                      <p className="text-white text-sm">
                        {new Date(entry.watched_at).toLocaleString('de-DE')}
                      </p>
                      {entry.notes && <p className="text-gray-400 text-xs mt-1">{entry.notes}</p>}
                    </div>
                    <div className="flex gap-3 ml-4">
                      <button
                        onClick={() => startEditWatch(entry)}
                        className="text-indigo-300 hover:text-indigo-200 text-xs"
                      >
                        Bearbeiten
                      </button>
                      <button
                        onClick={() => handleDeleteWatch(entry.id)}
                        className="text-red-400 hover:text-red-300 text-xs"
                      >
                        Löschen
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
