import { useEffect, useMemo, useState } from 'react';
import type { SeriesListItem, Tag } from '../types';
import { createTag, deleteTag, getSeries, getTags, updateTag } from '../api/client';

export default function TagAdminPage() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [series, setSeries] = useState<SeriesListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTagName, setNewTagName] = useState('');
  const [editingTagId, setEditingTagId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    Promise.all([getTags(), getSeries()])
      .then(([allTags, allSeries]) => {
        setTags(allTags);
        setSeries(allSeries);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const usageByTag = useMemo(() => {
    const counts = new Map<number, number>();

    for (const tag of tags) {
      counts.set(tag.id, 0);
    }

    for (const item of series) {
      for (const tag of item.tags) {
        counts.set(tag.id, (counts.get(tag.id) || 0) + 1);
      }
    }

    return counts;
  }, [tags, series]);

  const sortedTags = useMemo(
    () => [...tags].sort((a, b) => a.name.localeCompare(b.name, 'de')),
    [tags],
  );

  const handleCreate = async () => {
    const normalized = newTagName.trim();
    if (!normalized) {
      return;
    }

    try {
      const created = await createTag(normalized);
      setTags((prev) => [...prev, created]);
      setNewTagName('');
      setError(null);
    } catch {
      setError('Tag konnte nicht erstellt werden.');
    }
  };

  const handleStartRename = (tag: Tag) => {
    setEditingTagId(tag.id);
    setEditingName(tag.name);
    setError(null);
  };

  const handleSaveRename = async (tagId: number) => {
    const normalized = editingName.trim();
    if (!normalized) {
      setError('Tag-Name darf nicht leer sein.');
      return;
    }

    try {
      const updated = await updateTag(tagId, normalized);
      setTags((prev) => prev.map((tag) => (tag.id === updated.id ? updated : tag)));
      setSeries((prev) =>
        prev.map((item) => ({
          ...item,
          tags: item.tags.map((tag) => (tag.id === updated.id ? updated : tag)),
        })),
      );
      setEditingTagId(null);
      setEditingName('');
      setError(null);
    } catch {
      setError('Tag konnte nicht umbenannt werden.');
    }
  };

  const handleDelete = async (tag: Tag) => {
    if (!window.confirm(`Tag "${tag.name}" wirklich loeschen?`)) {
      return;
    }

    try {
      await deleteTag(tag.id);
      setTags((prev) => prev.filter((existing) => existing.id !== tag.id));
      setSeries((prev) =>
        prev.map((item) => ({
          ...item,
          tags: item.tags.filter((existing) => existing.id !== tag.id),
        })),
      );
      setError(null);
    } catch {
      setError('Tag konnte nicht geloescht werden.');
    }
  };

  if (loading) {
    return <div className="text-center text-gray-400 py-20">Lade Tag-Verwaltung...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Tag-Verwaltung</h1>
          <p className="text-sm text-gray-400 mt-1">Tags erstellen, umbenennen und bereinigen.</p>
        </div>
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-6">
        <p className="text-sm text-gray-300 mb-2">Neuen Tag erstellen</p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void handleCreate();
              }
            }}
            placeholder="z. B. Favorit"
            className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm text-white"
          />
          <button
            type="button"
            onClick={() => void handleCreate()}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm px-4 py-2 rounded"
          >
            Erstellen
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-red-400 mb-4">{error}</p>}

      {sortedTags.length === 0 ? (
        <div className="text-center py-12 text-gray-400 bg-gray-800 rounded-lg border border-gray-700">
          Noch keine Tags vorhanden.
        </div>
      ) : (
        <div className="space-y-2">
          {sortedTags.map((tag) => {
            const usage = usageByTag.get(tag.id) || 0;
            const isEditing = editingTagId === tag.id;

            return (
              <div
                key={tag.id}
                className="bg-gray-800 rounded-lg border border-gray-700 px-3 py-3 flex flex-col sm:flex-row sm:items-center gap-3"
              >
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm text-white"
                    />
                  ) : (
                    <p className="text-white font-medium">{tag.name}</p>
                  )}
                </div>

                <div className="text-xs text-gray-400 shrink-0">
                  {usage} Serie{usage !== 1 ? 'n' : ''}
                </div>

                <div className="flex gap-2 shrink-0">
                  {isEditing ? (
                    <>
                      <button
                        type="button"
                        onClick={() => void handleSaveRename(tag.id)}
                        className="bg-green-600 hover:bg-green-500 text-white text-xs px-3 py-1.5 rounded"
                      >
                        Speichern
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingTagId(null);
                          setEditingName('');
                        }}
                        className="bg-gray-600 hover:bg-gray-500 text-white text-xs px-3 py-1.5 rounded"
                      >
                        Abbrechen
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => handleStartRename(tag)}
                        className="bg-gray-700 hover:bg-gray-600 text-white text-xs px-3 py-1.5 rounded"
                      >
                        Umbenennen
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(tag)}
                        className="bg-red-700 hover:bg-red-600 text-white text-xs px-3 py-1.5 rounded"
                      >
                        Loeschen
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
