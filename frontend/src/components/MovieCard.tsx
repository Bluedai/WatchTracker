import { Link } from 'react-router-dom';
import type { MovieListItem } from '../types';
import { posterUrl } from '../api/client';

export default function MovieCard({ movie }: { movie: MovieListItem }) {
  const year = movie.release_date?.slice(0, 4) || '–';

  return (
    <Link
      to={`/film/${movie.id}`}
      className="bg-gray-800 rounded-lg overflow-hidden hover:ring-2 hover:ring-indigo-500 transition-all group"
    >
      <div className="aspect-[2/3] bg-gray-700 relative">
        {movie.poster_path ? (
          <img
            src={posterUrl(movie.poster_path)}
            alt={movie.display_title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-500 text-sm">
            Kein Poster
          </div>
        )}
        {movie.has_override && (
          <span className="absolute top-2 right-2 bg-yellow-500 text-black text-xs px-1.5 py-0.5 rounded font-medium">
            Bearbeitet
          </span>
        )}
        {movie.is_watched && (
          <span className="absolute bottom-2 right-2 bg-green-600 text-white text-xs px-1.5 py-0.5 rounded font-medium">
            Gesehen
          </span>
        )}
      </div>
      <div className="p-3">
        <h3 className="font-semibold text-sm text-white truncate group-hover:text-indigo-300">
          {movie.display_title}
        </h3>
        <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
          <span>{year}</span>
          {movie.runtime !== null && movie.runtime > 0 && (
            <>
              <span>·</span>
              <span>{movie.runtime} Min.</span>
            </>
          )}
        </div>
        {movie.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {movie.tags.slice(0, 2).map((tag) => (
              <span
                key={tag.id}
                className="inline-flex items-center rounded-full bg-indigo-500/20 text-indigo-200 text-[10px] px-2 py-0.5"
              >
                {tag.name}
              </span>
            ))}
            {movie.tags.length > 2 && (
              <span className="inline-flex items-center rounded-full bg-gray-700 text-gray-300 text-[10px] px-2 py-0.5">
                +{movie.tags.length - 2}
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
