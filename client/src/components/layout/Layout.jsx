import { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import Header from './Header.jsx';
import Toaster from '../ui/Toaster.jsx';
import { useSettings } from '../../store/settings.js';

export default function Layout() {
  const [collapsed, setCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    return saved ? JSON.parse(saved) : false;
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const loadSettings = useSettings((s) => s.load);
  const loaded = useSettings((s) => s.loaded);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => { if (!loaded) loadSettings(); }, [loaded, loadSettings]);

  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', JSON.stringify(collapsed));
  }, [collapsed]);

  // Close the mobile drawer on route change
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  // Global shortcut: N for new invoice
  useEffect(() => {
    const onKey = (e) => {
      const target = e.target;
      const isInput = target instanceof HTMLElement && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if (isInput) return;
      if (e.key === 'n' || e.key === 'N') {
        if (location.pathname !== '/invoices') navigate('/invoices?new=1');
        else window.dispatchEvent(new CustomEvent('mj:new-invoice'));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate, location]);

  // Left padding for the main column:
  //   - Mobile: 0 (sidebar is an overlay drawer)
  //   - Desktop: matches sidebar width (240/72)
  const mainPaddingCls = collapsed ? 'md:pl-[72px]' : 'md:pl-[240px]';

  return (
    <div className="min-h-screen bg-page">
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div className={mainPaddingCls}>
        <Header onMenuClick={() => setMobileOpen(true)} />
        <main className="p-4 md:p-6 print-area">
          <Outlet />
        </main>
      </div>
      <Toaster />
    </div>
  );
}
