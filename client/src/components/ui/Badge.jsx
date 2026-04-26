import clsx from 'clsx';
import { STATUS_LABEL, STATUS_COLORS } from '../../utils/format.js';

export default function Badge({ children, variant = 'slate', className }) {
  const map = {
    slate: 'bg-slate-100 text-slate-600',
    navy: 'bg-navy/10 text-navy',
    amber: 'bg-amber-50 text-amber-700',
    success: 'bg-emerald-50 text-emerald-700',
    danger: 'bg-rose-50 text-rose-700',
    info: 'bg-blue-50 text-blue-700',
    warning: 'bg-amber-50 text-amber-700',
  };
  return <span className={clsx('badge', map[variant] || map.slate, className)}>{children}</span>;
}

export function StatusBadge({ status }) {
  return <span className={clsx('badge', STATUS_COLORS[status] || STATUS_COLORS.draft)}>{STATUS_LABEL[status] || status}</span>;
}
