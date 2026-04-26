import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, User, Plus, X } from 'lucide-react';

/**
 * PartyPicker — combobox that lets the shopowner type any name freely
 * while still suggesting saved parties as they type.
 *
 * Calls onChange({ id, name }) whenever the value changes.
 *  - id = saved party id (string) when the user picks from the dropdown
 *  - id = null when the user just types free-text (walk-in / new party)
 */
export default function PartyPicker({ parties = [], value, onChange, label = 'Party', placeholder = 'Type customer / supplier name…', autoFocus }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(value?.name || '');
  const wrapRef = useRef(null);
  const inputRef = useRef(null);

  // Sync incoming value (e.g. when editing an invoice)
  useEffect(() => { setText(value?.name || ''); }, [value?.id, value?.name]);

  // Close on outside click
  useEffect(() => {
    const onDoc = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const matches = useMemo(() => {
    const q = (text || '').toLowerCase().trim();
    if (!q) return parties.slice(0, 10);
    return parties
      .filter((p) => p.name.toLowerCase().includes(q) || (p.gstin || '').toLowerCase().includes(q) || (p.phone || '').includes(q))
      .slice(0, 10);
  }, [parties, text]);

  function handleType(v) {
    setText(v);
    setOpen(true);
    // typing breaks any existing id binding — caller now sees free-text
    onChange({ id: null, name: v });
  }

  function pick(p) {
    setText(p.name);
    setOpen(false);
    onChange({ id: p.id, name: p.name, party: p });
  }

  function clear() {
    setText('');
    onChange({ id: null, name: '' });
    inputRef.current?.focus();
  }

  return (
    <div ref={wrapRef} className="relative">
      {label && <label className="label">{label}</label>}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          ref={inputRef}
          autoFocus={autoFocus}
          className="input pl-9 pr-9"
          placeholder={placeholder}
          value={text}
          onFocus={() => setOpen(true)}
          onChange={(e) => handleType(e.target.value)}
        />
        {text && (
          <button type="button" onClick={clear} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500" title="Clear">
            <X size={14} />
          </button>
        )}
      </div>

      {value?.id && (
        <div className="mt-1 text-xs text-emerald-700 inline-flex items-center gap-1">
          <User size={12} /> Linked to saved party
        </div>
      )}
      {!value?.id && text.trim() && (
        <div className="mt-1 text-xs text-amber-700 inline-flex items-center gap-1">
          <Plus size={12} /> Will be saved as walk-in (free-text) name
        </div>
      )}

      {open && (
        <div className="absolute left-0 right-0 z-30 mt-1 bg-white rounded-xl border border-cardBorder shadow-card max-h-72 overflow-y-auto">
          {matches.length === 0 ? (
            <div className="px-3 py-3 text-xs text-slate-400">
              No saved parties match. Press <kbd className="px-1 bg-slate-100 rounded text-[10px]">Enter</kbd> to use this name as walk-in.
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {matches.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => pick(p)}
                    className="w-full flex items-start gap-3 px-3 py-2 text-left hover:bg-amber/10 transition"
                  >
                    <div className="w-7 h-7 rounded-full bg-amber/10 text-amber font-bold flex items-center justify-center text-xs shrink-0">
                      {p.name[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-navy text-sm truncate">{p.name}</div>
                      <div className="text-[11px] text-slate-500 truncate">
                        {p.gstin ? <span className="font-mono mr-2">{p.gstin}</span> : null}
                        {p.city || ''} {p.state_name ? `· ${p.state_name}` : ''}
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="border-t border-slate-100 px-3 py-2 bg-slate-50 text-[11px] text-slate-500">
            Tip: Just type the name — no need to add the party first.
          </div>
        </div>
      )}
    </div>
  );
}
