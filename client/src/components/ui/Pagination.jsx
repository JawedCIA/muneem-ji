import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Compact prev/next pager. Caller owns `page` state and triggers re-fetch on change.
 *
 *   <Pagination page={page} pageSize={50} total={total} onChange={setPage} />
 */
export default function Pagination({ page, pageSize, total, onChange, className = '' }) {
  const totalPages = Math.max(1, Math.ceil((total || 0) / pageSize));
  if (total <= pageSize) return null; // nothing to paginate
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return (
    <div className={`flex items-center justify-between text-sm ${className}`}>
      <div className="text-slate-500">
        Showing <span className="font-semibold text-navy">{from.toLocaleString()}–{to.toLocaleString()}</span> of <span className="font-semibold text-navy">{total.toLocaleString()}</span>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          className="px-2 py-1 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed inline-flex items-center gap-1"
        >
          <ChevronLeft size={14} /> Prev
        </button>
        <span className="px-3 text-xs text-slate-500">
          Page <span className="font-semibold text-navy">{page}</span> / {totalPages}
        </span>
        <button
          onClick={() => onChange(page + 1)}
          disabled={page >= totalPages}
          className="px-2 py-1 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed inline-flex items-center gap-1"
        >
          Next <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
