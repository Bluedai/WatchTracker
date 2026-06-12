export default function ProgressBar({
  watched,
  total,
  className = '',
}: {
  watched: number;
  total: number;
  className?: string;
}) {
  const pct = total > 0 ? Math.round((watched / total) * 100) : 0;

  return (
    <div className={`w-full ${className}`}>
      <div className="flex justify-between text-xs text-gray-400 mb-1">
        <span>
          {watched} / {total}
        </span>
        <span>{pct}%</span>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-2">
        <div
          className="bg-indigo-500 h-2 rounded-full transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
