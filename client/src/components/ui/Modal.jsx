import { useEffect } from 'react';
import { X } from 'lucide-react';
import clsx from 'clsx';

export default function Modal({ open, onClose, title, children, size = 'md', actions }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;
  const sizeCls = { sm: 'sm:max-w-md', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl' }[size] || 'sm:max-w-lg';
  return (
    <div className="fixed inset-0 z-50 animate-fade-in">
      <div className="absolute inset-0 bg-navy/40 backdrop-blur-sm" onClick={onClose} />
      <div
        className={clsx(
          // Mobile: fill the screen edge-to-edge so small screens aren't cramped
          // Desktop: centered card with constrained width
          'absolute inset-0 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2',
          'sm:w-[92%]',
          sizeCls,
          'animate-slide-up flex',
        )}
      >
        <div className="bg-white sm:rounded-2xl shadow-card-lg overflow-hidden flex flex-col w-full h-full sm:h-auto sm:max-h-[90vh]">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
            <h3 className="text-base font-bold text-navy truncate pr-2">{title}</h3>
            <button onClick={onClose} className="text-slate-400 hover:text-navy transition shrink-0 p-1 -mr-1">
              <X size={20} />
            </button>
          </div>
          <div className="p-5 overflow-y-auto flex-1">{children}</div>
          {actions && (
            <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 flex flex-wrap justify-end gap-2 shrink-0">
              {actions}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function SlideOver({ open, onClose, title, children, size = 'lg', actions }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;
  const widthCls = { md: 'sm:max-w-xl', lg: 'sm:max-w-3xl', xl: 'sm:max-w-5xl' }[size] || 'sm:max-w-3xl';
  return (
    <div className="fixed inset-0 z-50 animate-fade-in">
      <div className="absolute inset-0 bg-navy/40 backdrop-blur-sm" onClick={onClose} />
      <aside
        className={clsx(
          'absolute right-0 top-0 h-full w-full bg-white shadow-card-lg flex flex-col animate-slide-in-right',
          widthCls,
        )}
      >
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-slate-100 shrink-0">
          <h3 className="text-base sm:text-lg font-bold text-navy truncate pr-2">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-navy transition shrink-0 p-1 -mr-1">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</div>
        {actions && (
          <div className="px-4 sm:px-6 py-4 bg-slate-50 border-t border-slate-100 flex flex-wrap justify-end gap-2 shrink-0">
            {actions}
          </div>
        )}
      </aside>
    </div>
  );
}
