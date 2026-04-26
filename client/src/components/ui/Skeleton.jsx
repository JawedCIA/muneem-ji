import clsx from 'clsx';

export default function Skeleton({ className, h = 16, w = '100%' }) {
  return <div className={clsx('skeleton', className)} style={{ height: h, width: w }} />;
}

export function SkeletonCard() {
  return (
    <div className="card space-y-3">
      <Skeleton h={14} w="40%" />
      <Skeleton h={28} w="60%" />
      <Skeleton h={10} w="30%" />
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 5 }) {
  return (
    <div className="card">
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex gap-3">
            {Array.from({ length: cols }).map((_, j) => (
              <Skeleton key={j} h={14} w={`${100 / cols}%`} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
