import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, FileText, FileSignature, Users, Package,
  Wallet, ShoppingCart, BarChart3, Settings as SettingsIcon, ChevronsLeft, ChevronsRight, X, Repeat, Building2,
} from 'lucide-react';
import clsx from 'clsx';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/invoices', label: 'Invoices', icon: FileText },
  { to: '/quotations', label: 'Quotations', icon: FileSignature },
  { to: '/recurring', label: 'Recurring', icon: Repeat },
  { to: '/parties', label: 'Parties', icon: Users },
  { to: '/products', label: 'Products', icon: Package },
  { to: '/expenses', label: 'Expenses', icon: Wallet },
  { to: '/banking', label: 'Banking', icon: Building2 },
  { to: '/pos', label: 'POS', icon: ShoppingCart },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
];

/**
 * Sidebar:
 *   - Desktop (md+): always-visible static rail, collapsible via the chevron at the bottom
 *   - Mobile (<md):  hidden by default; slides in as an overlay drawer when `mobileOpen`
 *                    Backdrop dismisses on tap. Collapsed state is ignored on mobile.
 */
export default function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }) {
  return (
    <>
      {/* Mobile backdrop — only visible when drawer is open on small screens */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-navy/50 backdrop-blur-sm z-40 md:hidden no-print"
          onClick={onMobileClose}
        />
      )}

      <aside
        className={clsx(
          'fixed top-0 left-0 h-screen bg-sidebar-bg text-sidebar-text flex flex-col transition-transform duration-200 z-50 no-print',
          'md:transition-all',
          // mobile width is always the full expanded width when open
          'w-[260px]',
          // desktop collapses
          collapsed ? 'md:w-[72px]' : 'md:w-[240px]',
          // mobile slide
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        )}
      >
        <div className={clsx('flex items-center gap-3 px-4 py-5 border-b border-white/5', collapsed && 'md:justify-center md:px-2')}>
          <img src="/logo.png" alt="Muneem Ji" className="w-10 h-10 rounded-lg shrink-0 bg-white/5 p-0.5 object-contain" />
          {/* Branding text — always shown on mobile, hidden on desktop when collapsed */}
          <div className={clsx('leading-tight', collapsed && 'md:hidden')}>
            <div className="font-extrabold text-lg">
              <span className="text-white">Muneem</span><span className="text-amber"> Ji</span>
            </div>
            <div className="text-[11px] text-sidebar-text/80">Aapka Digital Muneem</div>
          </div>
          <button
            onClick={onMobileClose}
            className="ml-auto md:hidden text-white/70 hover:text-white p-1"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={onMobileClose}
                className={({ isActive }) => clsx(
                  'nav-link',
                  isActive && 'nav-link-active',
                  collapsed && 'md:justify-center md:px-2',
                )}
                title={collapsed ? item.label : undefined}
              >
                {({ isActive }) => (
                  <>
                    <Icon size={18} className={clsx(isActive ? 'text-amber' : 'text-white')} />
                    <span className={clsx(collapsed && 'md:hidden')}>{item.label}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Collapse toggle — desktop only */}
        <button
          onClick={onToggle}
          className={clsx('mx-3 mt-2 nav-link justify-center text-white/70 hover:text-white hidden md:flex', collapsed && 'md:px-2')}
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}
          {!collapsed && <span className="text-xs">Collapse</span>}
        </button>

        {/* Build attribution — always present, hidden when collapsed */}
        <div className={clsx('px-4 pb-3 pt-1 text-[10px] text-white/40 text-center', collapsed && 'md:hidden')}>
          Built by <a href="https://mannatai.com" target="_blank" rel="noopener noreferrer" className="text-white/60 hover:text-amber underline-offset-2 hover:underline">mannatai.com</a>
        </div>
      </aside>
    </>
  );
}
