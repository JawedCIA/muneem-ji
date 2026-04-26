import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
  PieChart, Pie, Cell,
} from 'recharts';
import { TrendingUp, TrendingDown, Wallet, Receipt, AlertTriangle, ArrowRight, Sparkles, X } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader.jsx';
import { StatusBadge } from '../components/ui/Badge.jsx';
import { SkeletonCard } from '../components/ui/Skeleton.jsx';
import Button from '../components/ui/Button.jsx';
import { api } from '../utils/api.js';
import { formatINR, formatINRCompact, formatDate } from '../utils/format.js';
import { toast } from '../store/toast.js';
import { useAuth } from '../store/auth.js';

const PIE_COLORS = ['#1a2b5e', '#f5a623', '#059669', '#2563eb', '#e11d48', '#7c3aed', '#0ea5e9', '#d97706'];

function KpiCard({ label, value, icon: Icon, accent = 'navy', hint }) {
  const colors = {
    navy: { bg: 'bg-navy/5', text: 'text-navy', icon: 'text-navy' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-700', icon: 'text-amber-500' },
    success: { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: 'text-emerald-600' },
    danger: { bg: 'bg-rose-50', text: 'text-rose-700', icon: 'text-rose-600' },
  }[accent];
  return (
    <div className="card flex items-start gap-4">
      <div className={`w-11 h-11 rounded-xl ${colors.bg} flex items-center justify-center shrink-0`}>
        <Icon size={20} className={colors.icon} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
        <div className="text-2xl font-extrabold text-navy mt-1 truncate">{value}</div>
        {hint && <div className="text-xs text-slate-400 mt-0.5">{hint}</div>}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const me = useAuth((s) => s.user);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [demoStatus, setDemoStatus] = useState(null);
  const [demoBannerHidden, setDemoBannerHidden] = useState(() => sessionStorage.getItem('mj-demo-banner-dismissed') === '1');
  const [loadingDemo, setLoadingDemo] = useState(false);

  useEffect(() => {
    api.get('/reports/dashboard')
      .then(setData)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
    api.get('/demo/status').then(setDemoStatus).catch(() => {});
  }, []);

  async function loadDemo() {
    setLoadingDemo(true);
    try {
      await api.post('/demo/load', { keepSettings: true });
      toast.success('Demo data loaded. Reloading…');
      setTimeout(() => window.location.reload(), 800);
    } catch (e) { toast.error(e.message); setLoadingDemo(false); }
  }

  function dismissBanner() {
    sessionStorage.setItem('mj-demo-banner-dismissed', '1');
    setDemoBannerHidden(true);
  }

  const showDemoBanner = !loading && demoStatus && !demoStatus.hasData && !demoBannerHidden && me?.role === 'admin';

  if (loading) {
    return (
      <div>
        <PageHeader title="Dashboard" subtitle="A snapshot of your business today" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Aapke business ka real-time overview" />

      {showDemoBanner && (
        <div className="mb-6 rounded-2xl border border-amber/30 bg-gradient-to-r from-amber/10 to-amber/5 p-5 flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber/20 flex items-center justify-center shrink-0">
            <Sparkles size={22} className="text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-navy text-base">First time using Muneem Ji?</div>
            <p className="text-sm text-slate-600 mt-1">
              Load a sample shop's data to see how every report, invoice, and POS receipt looks — then clear it from Settings → Data when you're ready to start your own books.
            </p>
            <div className="mt-3 flex gap-2">
              <Button onClick={loadDemo} disabled={loadingDemo}>
                <Sparkles size={14} /> {loadingDemo ? 'Loading…' : 'Load Demo Data'}
              </Button>
              <Button variant="ghost" onClick={dismissBanner}>I'll start fresh</Button>
            </div>
          </div>
          <button onClick={dismissBanner} className="text-slate-400 hover:text-navy" title="Dismiss">
            <X size={18} />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Sales This Month" value={formatINR(data.kpi.salesThisMonth)} icon={TrendingUp} accent="navy" />
        <KpiCard label="Amount Collected" value={formatINR(data.kpi.collectedThisMonth)} icon={Wallet} accent="success" />
        <KpiCard label="Outstanding Balance" value={formatINR(data.kpi.outstanding)} icon={Receipt} accent="amber" hint="All-time pending" />
        <KpiCard label="Total Expenses" value={formatINR(data.kpi.expensesThisMonth)} icon={TrendingDown} accent="danger" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-navy">Sales vs Expenses</h2>
            <span className="text-xs text-slate-400">Last 6 months</span>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.chartMonthly} barGap={6}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={formatINRCompact} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(v) => formatINR(v)}
                  contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                  labelStyle={{ color: '#1a2b5e', fontWeight: 700 }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="sales" name="Sales" fill="#1a2b5e" radius={[6, 6, 0, 0]} />
                <Bar dataKey="expenses" name="Expenses" fill="#f5a623" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-navy">Expense Breakdown</h2>
            <span className="text-xs text-slate-400">This month</span>
          </div>
          {data.expenseBreakdown.length === 0 ? (
            <div className="h-72 flex items-center justify-center text-sm text-slate-400">No expenses this month</div>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.expenseBreakdown}
                    dataKey="value"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={2}
                  >
                    {data.expenseBreakdown.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => formatINR(v)} contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-navy">Recent Invoices</h2>
            <Link to="/invoices" className="text-xs font-semibold text-amber hover:underline inline-flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          {data.recentInvoices.length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">No invoices yet</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {data.recentInvoices.map((inv) => (
                <Link to={`/invoices/${inv.id}`} key={inv.id} className="flex items-center justify-between py-3 hover:bg-slate-50 -mx-2 px-2 rounded-lg transition">
                  <div className="min-w-0">
                    <div className="font-mono text-xs text-slate-500">{inv.no}</div>
                    <div className="font-semibold text-navy text-sm truncate">{inv.party_name || 'Walk-in'}</div>
                    <div className="text-xs text-slate-400">{formatDate(inv.date)}</div>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <div className="font-bold text-navy">{formatINR(inv.total)}</div>
                    <StatusBadge status={inv.status} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-navy flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber" />
              Low Stock Alerts
            </h2>
            <Link to="/products" className="text-xs font-semibold text-amber hover:underline inline-flex items-center gap-1">
              Manage <ArrowRight size={12} />
            </Link>
          </div>
          {data.lowStock.length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">All stock levels are healthy 🎉</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {data.lowStock.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-3">
                  <div className="min-w-0">
                    <div className="font-semibold text-navy text-sm truncate">{p.name}</div>
                    <div className="font-mono text-xs text-slate-500">{p.sku}</div>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <div className="font-bold text-rose-600">{p.stock} {p.unit}</div>
                    <div className="text-xs text-slate-400">Min: {p.min_stock}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
