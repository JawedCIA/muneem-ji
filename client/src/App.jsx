import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import Layout from './components/layout/Layout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Invoices from './pages/Invoices.jsx';
import InvoiceDetail from './pages/InvoiceDetail.jsx';
import Quotations from './pages/Quotations.jsx';
import Recurring from './pages/Recurring.jsx';
import Banking from './pages/Banking.jsx';
import Parties from './pages/Parties.jsx';
import PartyDetail from './pages/PartyDetail.jsx';
import Products from './pages/Products.jsx';
import Expenses from './pages/Expenses.jsx';
import POS from './pages/POS.jsx';
import Reports from './pages/Reports.jsx';
import Settings from './pages/Settings.jsx';
import Login from './pages/Login.jsx';
import Setup from './pages/Setup.jsx';
import PublicInvoice from './pages/PublicInvoice.jsx';
import { useAuth } from './store/auth.js';
import { setUnauthorizedHandler } from './utils/api.js';

export default function App() {
  const status = useAuth((s) => s.status);
  const bootstrap = useAuth((s) => s.bootstrap);
  const expire = useAuth((s) => s.expire);
  const location = useLocation();

  useEffect(() => {
    setUnauthorizedHandler(() => expire());
    bootstrap();
  }, [bootstrap, expire]);

  // Public share-link routes bypass the auth gate entirely — recipients
  // (customers) won't have an account on this server.
  const isPublicRoute = location.pathname.startsWith('/i/') || location.pathname.startsWith('/q/');
  if (isPublicRoute) {
    return (
      <Routes>
        <Route path="/i/:token" element={<PublicInvoice kind="invoice" />} />
        <Route path="/q/:token" element={<PublicInvoice kind="quotation" />} />
      </Routes>
    );
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-page">
        <Loader2 size={28} className="animate-spin text-amber" />
      </div>
    );
  }

  if (status === 'setup-required') {
    if (location.pathname !== '/setup') return <Navigate to="/setup" replace />;
    return <Routes><Route path="/setup" element={<Setup />} /></Routes>;
  }

  if (status === 'unauth') {
    if (location.pathname !== '/login') return <Navigate to="/login" replace />;
    return <Routes><Route path="/login" element={<Login />} /></Routes>;
  }

  // authed
  if (location.pathname === '/login' || location.pathname === '/setup') {
    return <Navigate to="/" replace />;
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/invoices" element={<Invoices />} />
        <Route path="/invoices/:id" element={<InvoiceDetail />} />
        <Route path="/quotations" element={<Quotations />} />
        <Route path="/recurring" element={<Recurring />} />
        <Route path="/parties" element={<Parties />} />
        <Route path="/parties/:id" element={<PartyDetail />} />
        <Route path="/products" element={<Products />} />
        <Route path="/expenses" element={<Expenses />} />
        <Route path="/banking" element={<Banking />} />
        <Route path="/pos" element={<POS />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
