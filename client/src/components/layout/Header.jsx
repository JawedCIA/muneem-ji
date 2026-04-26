import { Search, Bell, LogOut, User, Menu } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useSettings } from '../../store/settings.js';
import { useAuth } from '../../store/auth.js';

export default function Header({ onMenuClick }) {
  const settings = useSettings((s) => s.settings);
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  const searchRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => {
      const target = e.target;
      const isInput = target instanceof HTMLElement && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if (e.key === '/' && !isInput) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const onClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const initials = (user?.name || settings.businessName || 'M')
    .split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase();

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-cardBorder h-[60px] flex items-center px-3 md:px-6 gap-2 md:gap-4 no-print">
      {/* Hamburger — mobile only */}
      <button
        onClick={onMenuClick}
        className="md:hidden p-2 -ml-1 rounded-xl text-navy hover:bg-slate-100 transition shrink-0"
        aria-label="Open menu"
      >
        <Menu size={20} />
      </button>

      {/* Search — collapsed on mobile */}
      <div className="relative flex-1 max-w-xl">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          ref={searchRef}
          type="search"
          placeholder="Search…"
          className="input pl-9"
        />
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        <button className="relative p-2 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-navy transition" title="Notifications">
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-amber rounded-full"></span>
        </button>
        {/* Business name strip — hide on small screens */}
        <div className="hidden lg:flex flex-col items-end leading-tight">
          <div className="text-sm font-bold text-navy truncate max-w-[180px]">{settings.businessName || 'Your Business'}</div>
          <div className="text-[11px] text-slate-500 font-mono">{settings.gstin || '—'}</div>
        </div>
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="w-10 h-10 rounded-xl bg-amber/10 border border-amber/20 flex items-center justify-center text-amber font-extrabold hover:bg-amber/20 transition"
            title={user?.name || 'Account'}
          >
            {initials}
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-12 w-56 bg-white rounded-xl border border-cardBorder shadow-card py-1 animate-fade-in">
              {user && (
                <div className="px-4 py-3 border-b border-slate-100">
                  <div className="text-sm font-bold text-navy truncate">{user.name}</div>
                  <div className="text-xs text-slate-500 truncate">{user.email}</div>
                  <div className="text-[10px] uppercase tracking-wider text-amber font-bold mt-1">{user.role}</div>
                </div>
              )}
              {/* Show business identity in the menu on small screens (since the strip is hidden) */}
              <div className="px-4 py-2 border-b border-slate-100 lg:hidden">
                <div className="text-xs font-bold text-navy truncate">{settings.businessName || 'Your Business'}</div>
                {settings.gstin && <div className="text-[10px] text-slate-500 font-mono">{settings.gstin}</div>}
              </div>
              <button
                onClick={() => { setMenuOpen(false); logout(); }}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 transition"
              >
                <LogOut size={14} /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
