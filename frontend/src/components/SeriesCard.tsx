import { Link } from 'react-router-dom';
import type { SeriesListItem } from '../types';
import { posterUrl } from '../api/client';
import ProgressBar from './ProgressBar';

export default function SeriesCard({ series }: { series: SeriesListItem }) {
  const year = series.first_air_date?.slice(0, 4) || '–';
  const statusText = series.status === 'Ended' || series.status === 'Canceled'
    ? 'Abgeschlossen'
    : series.status === 'Returning Series'
    ? 'Laufend'
    : series.status || '';

  return (
    <Link
      to={`/serie/${series.id}`}
      className="bg-gray-800 rounded-lg overflow-hidden hover:ring-2 hover:ring-indigo-500 transition-all group"
    >
      <div className="aspect-[2/3] bg-gray-700 relative">
        {series.poster_path ? (
          <img
            src={posterUrl(series.poster_path)}
            alt={series.display_name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-500 text-sm">
            Kein Poster
          </div>
        )}
        {series.has_override && (
          <span className="absolute top-2 right-2 bg-yellow-500 text-black text-xs px-1.5 py-0.5 rounded font-medium">
            Bearbeitet
          </span>
        )}
      </div>
      <div className="p-3">
        <h3 className="font-semibold text-sm text-white truncate group-hover:text-indigo-300">
          {series.display_name}
        </h3>
        <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
          <span>{year}</span>
          <span>·</span>
          <span>{series.total_seasons} Staffel{series.total_seasons !== 1 ? 'n' : ''}</span>
          {statusText && (
            <>
              <span>·</span>
              <span>{statusText}</span>
            </>
          )}
        </div>
        {series.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {series.tags.slice(0, 2).map((tag) => (
              <span
                key={tag.id}
                className="inline-flex items-center rounded-full bg-indigo-500/20 text-indigo-200 text-[10px] px-2 py-0.5"
              >
                {tag.name}
              </span>
            ))}
            {series.tags.length > 2 && (
              <span className="inline-flex items-center rounded-full bg-gray-700 text-gray-300 text-[10px] px-2 py-0.5">
                +{series.tags.length - 2}
              </span>
            )}
          </div>
        )}
        <ProgressBar
          watched={series.watched_episodes}
          total={series.total_episodes}
          className="mt-2"
        />
      </div>
    </Link>
  );
}
