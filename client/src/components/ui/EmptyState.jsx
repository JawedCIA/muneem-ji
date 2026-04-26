export default function EmptyState({ title, description, action, icon }) {
  return (
    <div className="text-center py-14 px-6">
      <div className="mx-auto w-20 h-20 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center mb-4">
        {icon || (
          <img src="/logo.png" alt="" className="w-12 h-12 object-contain opacity-80" />
        )}
      </div>
      <h3 className="text-lg font-bold text-navy">{title}</h3>
      {description && <p className="text-sm text-slate-500 mt-1.5 max-w-sm mx-auto">{description}</p>}
      {action && <div className="mt-5 inline-flex">{action}</div>}
    </div>
  );
}
