import clsx from 'clsx';

export default function Table({ columns, rows, empty, onRowClick, rowClassName }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-cardBorder">
      <table className="min-w-full bg-white">
        <thead className="sticky top-0 z-10">
          <tr>
            {columns.map((c) => (
              <th key={c.key} className={clsx('table-th', c.align === 'right' && 'text-right', c.align === 'center' && 'text-center', c.thClassName)}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={columns.length} className="px-4 py-12 text-center text-slate-400 text-sm">{empty || 'No records'}</td></tr>
          ) : (
            rows.map((row, idx) => (
              <tr
                key={row.id || idx}
                onClick={() => onRowClick?.(row)}
                className={clsx(
                  'transition group',
                  idx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white',
                  onRowClick && 'cursor-pointer hover:bg-amber-50/40',
                  typeof rowClassName === 'function' ? rowClassName(row) : rowClassName,
                )}
              >
                {columns.map((c) => (
                  <td key={c.key} className={clsx('table-td', c.align === 'right' && 'text-right', c.align === 'center' && 'text-center', c.tdClassName)}>
                    {c.render ? c.render(row) : row[c.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
