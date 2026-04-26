import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import clsx from 'clsx';
import { useToast } from '../../store/toast.js';

const ICONS = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
};
const STYLES = {
  success: 'bg-white border-emerald-200 text-emerald-700',
  error: 'bg-white border-rose-200 text-rose-700',
  info: 'bg-white border-blue-200 text-blue-700',
  warning: 'bg-white border-amber-200 text-amber-700',
};

export default function Toaster() {
  const toasts = useToast((s) => s.toasts);
  const remove = useToast((s) => s.remove);
  return (
    <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 no-print">
      {toasts.map((t) => {
        const Icon = ICONS[t.type] || Info;
        return (
          <div
            key={t.id}
            className={clsx('flex items-start gap-3 min-w-[280px] max-w-md px-4 py-3 rounded-xl shadow-card-lg border animate-slide-up', STYLES[t.type] || STYLES.info)}
          >
            <Icon size={18} className="mt-0.5 shrink-0" />
            <div className="flex-1 text-sm text-slate-700 font-medium">{t.message}</div>
            <button onClick={() => remove(t.id)} className="text-slate-400 hover:text-navy">
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
