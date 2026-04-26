import clsx from 'clsx';
import { forwardRef } from 'react';

export const Input = forwardRef(function Input({ label, error, className, hint, ...props }, ref) {
  return (
    <div>
      {label && <label className="label">{label}</label>}
      <input
        ref={ref}
        className={clsx('input', error && 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/30', className)}
        {...props}
      />
      {hint && !error && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
      {error && <p className="text-xs text-rose-600 mt-1">{error}</p>}
    </div>
  );
});

export const Textarea = forwardRef(function Textarea({ label, error, className, ...props }, ref) {
  return (
    <div>
      {label && <label className="label">{label}</label>}
      <textarea
        ref={ref}
        className={clsx('input min-h-[80px]', error && 'border-rose-400', className)}
        {...props}
      />
      {error && <p className="text-xs text-rose-600 mt-1">{error}</p>}
    </div>
  );
});

export const Select = forwardRef(function Select({ label, error, children, className, ...props }, ref) {
  return (
    <div>
      {label && <label className="label">{label}</label>}
      <select ref={ref} className={clsx('input pr-10', error && 'border-rose-400', className)} {...props}>
        {children}
      </select>
      {error && <p className="text-xs text-rose-600 mt-1">{error}</p>}
    </div>
  );
});
