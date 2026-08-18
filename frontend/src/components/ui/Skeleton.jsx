/**
 * Skeleton loading components
 */

export function SkeletonCard({ rows = 3 }) {
  return (
    <div className="card p-5 space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="shimmer h-4 rounded" style={{ width: `${60 + (i % 3) * 15}%` }} />
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 8 }) {
  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="flex gap-4 px-4 py-3 border-b border-bg-border bg-bg-base">
        {[120, 80, 100, 80, 80, 100, 80].map((w, i) => (
          <div key={i} className="shimmer h-3 rounded" style={{ width: w }} />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 px-4 py-3.5 border-b border-bg-border">
          {[120, 80, 100, 80, 80, 100, 80].map((w, j) => (
            <div key={j} className="shimmer h-3 rounded" style={{ width: w }} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonChart({ height = 240 }) {
  return (
    <div className="card p-5">
      <div className="shimmer h-4 w-32 rounded mb-4" />
      <div className="shimmer rounded" style={{ height }} />
    </div>
  );
}

export function SkeletonKpiRow() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="card p-5 space-y-2">
          <div className="shimmer h-3 w-20 rounded" />
          <div className="shimmer h-7 w-28 rounded" />
          <div className="shimmer h-3 w-16 rounded" />
        </div>
      ))}
    </div>
  );
}
