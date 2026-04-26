import { useEffect, useState } from 'react';
import { Download, FileSpreadsheet } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import PageHeader from '../components/ui/PageHeader.jsx';
import Button from '../components/ui/Button.jsx';
import Table from '../components/ui/Table.jsx';
import { api } from '../utils/api.js';
import { formatINR, formatINRCompact, formatDate, downloadCSV } from '../utils/format.js';
import { toast } from '../store/toast.js';

const REPORTS = [
  { key: 'sales-register', label: 'Sales Register' },
  { key: 'gst-summary', label: 'GST Summary' },
  { key: 'gstr1', label: 'GSTR-1 Format' },
  { key: 'pl', label: 'Profit & Loss' },
  { key: 'party-ledger', label: 'Party Ledger' },
  { key: 'expense', label: 'Expense Report' },
];

const monthStart = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`; };
const today = () => new Date().toISOString().slice(0, 10);

export default function Reports() {
  const [active, setActive] = useState('sales-register');
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(today());
  const [parties, setParties] = useState([]);
  const [partyId, setPartyId] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { api.get('/parties?all=1').then(setParties); }, []);

  useEffect(() => {
    setLoading(true);
    const qs = new URLSearchParams({ from, to });
    let url = '';
    if (active === 'sales-register') url = `/reports/sales-register?${qs}`;
    else if (active === 'gst-summary' || active === 'gstr1') url = `/reports/gst-summary?${qs}`;
    else if (active === 'pl') url = `/reports/pl?${qs}`;
    else if (active === 'party-ledger') url = partyId ? `/reports/party-ledger/${partyId}` : '';
    else if (active === 'expense') url = `/reports/expense-summary?${qs}`;
    if (!url) { setData(null); setLoading(false); return; }
    api.get(url).then(setData).catch((e) => toast.error(e.message)).finally(() => setLoading(false));
  }, [active, from, to, partyId]);

  function exportCurrent() {
    if (!data) return;
    if (active === 'sales-register' && Array.isArray(data)) {
      downloadCSV(`sales-register-${from}-${to}.csv`, data.map((r) => ({
        Date: r.date, 'Invoice No': r.no, Party: r.party_name, Taxable: r.subtotal, CGST: r.cgst_total, SGST: r.sgst_total, IGST: r.igst_total, Total: r.total, Status: r.status,
      })));
    } else if (active === 'gst-summary' && Array.isArray(data)) {
      downloadCSV(`gst-summary-${from}-${to}.csv`, data.map((r) => ({
        'Tax Rate': `${r.tax_rate}%`, Taxable: r.taxable, CGST: r.cgst, SGST: r.sgst, IGST: r.igst, 'Total Tax': r.total_tax,
      })));
    }
  }

  return (
    <div>
      <PageHeader title="Reports" subtitle="Sales, GST, P&L and ledger reports" />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="card lg:col-span-1 h-fit">
          <div className="space-y-1">
            {REPORTS.map((r) => (
              <button
                key={r.key}
                onClick={() => setActive(r.key)}
                className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition ${active === r.key ? 'bg-amber/10 text-amber-700 font-bold' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-3">
          <div className="card mb-4">
            <div className="flex flex-wrap items-end gap-3">
              {active === 'party-ledger' ? (
                <div className="flex-1 min-w-[200px]">
                  <label className="label">Party</label>
                  <select className="input" value={partyId} onChange={(e) => setPartyId(e.target.value)}>
                    <option value="">— Select party —</option>
                    {parties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              ) : (<>
                <div>
                  <label className="label">From</label>
                  <input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} />
                </div>
                <div>
                  <label className="label">To</label>
                  <input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} />
                </div>
              </>)}
              <div className="ml-auto">
                <Button variant="secondary" onClick={exportCurrent} disabled={!data}><Download size={14} /> Export CSV</Button>
              </div>
            </div>
          </div>

          {loading && <div className="card text-sm text-slate-400">Loading…</div>}
          {!loading && data && (
            <ReportRenderer active={active} data={data} from={from} to={to} />
          )}
          {!loading && !data && active === 'party-ledger' && (
            <div className="card text-sm text-slate-400 text-center py-12">Select a party to view ledger</div>
          )}
        </div>
      </div>
    </div>
  );
}

function ReportRenderer({ active, data }) {
  if (active === 'sales-register') {
    return (
      <Table
        columns={[
          { key: 'date', label: 'Date', render: (r) => formatDate(r.date) },
          { key: 'no', label: 'Invoice', render: (r) => <span className="font-mono">{r.no}</span> },
          { key: 'party_name', label: 'Party' },
          { key: 'subtotal', label: 'Taxable', align: 'right', render: (r) => formatINR(r.subtotal) },
          { key: 'cgst_total', label: 'CGST', align: 'right', render: (r) => formatINR(r.cgst_total) },
          { key: 'sgst_total', label: 'SGST', align: 'right', render: (r) => formatINR(r.sgst_total) },
          { key: 'igst_total', label: 'IGST', align: 'right', render: (r) => formatINR(r.igst_total) },
          { key: 'total', label: 'Total', align: 'right', render: (r) => <span className="font-bold">{formatINR(r.total)}</span> },
        ]}
        rows={data}
      />
    );
  }
  if (active === 'gst-summary') {
    const totals = data.reduce((acc, r) => ({
      taxable: acc.taxable + r.taxable, cgst: acc.cgst + r.cgst, sgst: acc.sgst + r.sgst,
      igst: acc.igst + r.igst, total_tax: acc.total_tax + r.total_tax,
    }), { taxable: 0, cgst: 0, sgst: 0, igst: 0, total_tax: 0 });
    return (
      <div>
        <Table
          columns={[
            { key: 'tax_rate', label: 'Tax Rate', render: (r) => <span className="font-bold">{r.tax_rate}%</span> },
            { key: 'taxable', label: 'Taxable Value', align: 'right', render: (r) => formatINR(r.taxable) },
            { key: 'cgst', label: 'CGST', align: 'right', render: (r) => formatINR(r.cgst) },
            { key: 'sgst', label: 'SGST', align: 'right', render: (r) => formatINR(r.sgst) },
            { key: 'igst', label: 'IGST', align: 'right', render: (r) => formatINR(r.igst) },
            { key: 'total_tax', label: 'Total Tax', align: 'right', render: (r) => <span className="font-bold">{formatINR(r.total_tax)}</span> },
          ]}
          rows={data}
        />
        <div className="card mt-4 grid grid-cols-2 md:grid-cols-5 gap-3 text-center">
          <Stat label="Taxable" value={formatINR(totals.taxable)} />
          <Stat label="CGST" value={formatINR(totals.cgst)} />
          <Stat label="SGST" value={formatINR(totals.sgst)} />
          <Stat label="IGST" value={formatINR(totals.igst)} />
          <Stat label="Total Tax" value={formatINR(totals.total_tax)} accent />
        </div>
      </div>
    );
  }
  if (active === 'gstr1') {
    return (
      <div className="card">
        <h3 className="text-base font-bold text-navy mb-1">GSTR-1 Summary</h3>
        <p className="text-sm text-slate-500 mb-4">Tax-rate-wise breakdown for GSTR-1 filing (B2B and B2C will be split by GSTIN presence in your invoices).</p>
        <Table
          columns={[
            { key: 'tax_rate', label: 'Rate', render: (r) => `${r.tax_rate}%` },
            { key: 'taxable', label: 'Taxable Value', align: 'right', render: (r) => formatINR(r.taxable) },
            { key: 'igst', label: 'IGST', align: 'right', render: (r) => formatINR(r.igst) },
            { key: 'cgst', label: 'CGST', align: 'right', render: (r) => formatINR(r.cgst) },
            { key: 'sgst', label: 'SGST', align: 'right', render: (r) => formatINR(r.sgst) },
          ]}
          rows={data}
        />
      </div>
    );
  }
  if (active === 'pl') {
    return (
      <div className="card">
        <h3 className="text-base font-bold text-navy mb-4">Profit & Loss</h3>
        <div className="space-y-2 text-sm">
          <PLRow label="Revenue (Sales taxable)" value={formatINR(data.revenue)} />
          <PLRow label="Cost of Goods Sold" value={`− ${formatINR(data.cogs)}`} />
          <PLRow label="Gross Profit" value={formatINR(data.grossProfit)} bold />
          <PLRow label="Operating Expenses" value={`− ${formatINR(data.expenses)}`} />
          <div className="border-t-2 border-navy pt-3 mt-2">
            <PLRow label="Net Profit / Loss" value={formatINR(data.netProfit)} hero />
          </div>
        </div>
      </div>
    );
  }
  if (active === 'party-ledger') {
    return (
      <div>
        <div className="card mb-4">
          <h3 className="text-base font-bold text-navy">{data.party.name}</h3>
          <div className="text-sm text-slate-500">Opening: {formatINR(data.opening)} · Closing: <span className="font-bold text-amber-700">{formatINR(data.closing)}</span></div>
        </div>
        <Table
          columns={[
            { key: 'date', label: 'Date', render: (r) => formatDate(r.date) },
            { key: 'type', label: 'Type', render: (r) => <span className="capitalize">{r.type}</span> },
            { key: 'ref', label: 'Reference' },
            { key: 'debit', label: 'Debit', align: 'right', render: (r) => r.debit ? formatINR(r.debit) : '—' },
            { key: 'credit', label: 'Credit', align: 'right', render: (r) => r.credit ? formatINR(r.credit) : '—' },
            { key: 'balance', label: 'Balance', align: 'right', render: (r) => formatINR(r.balance) },
          ]}
          rows={data.entries}
        />
      </div>
    );
  }
  if (active === 'expense') {
    return (
      <div>
        <div className="card mb-4">
          <h3 className="text-base font-bold text-navy mb-3">Monthly Trend</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.byMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={formatINRCompact} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => formatINR(v)} contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Bar dataKey="total" fill="#f5a623" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <Table
          columns={[
            { key: 'category', label: 'Category', render: (r) => <span className="font-bold text-navy">{r.category}</span> },
            { key: 'total', label: 'Total', align: 'right', render: (r) => formatINR(r.total) },
          ]}
          rows={data.byCategory}
        />
      </div>
    );
  }
  return null;
}

function Stat({ label, value, accent }) {
  return (
    <div>
      <div className="text-xs text-slate-500 font-semibold">{label}</div>
      <div className={`text-lg font-extrabold mt-1 ${accent ? 'text-amber-700' : 'text-navy'}`}>{value}</div>
    </div>
  );
}

function PLRow({ label, value, bold, hero }) {
  return (
    <div className="flex items-center justify-between">
      <span className={hero ? 'text-base font-bold text-navy' : bold ? 'font-bold text-navy' : 'text-slate-500'}>{label}</span>
      <span className={hero ? 'text-2xl font-extrabold text-amber-700' : bold ? 'font-extrabold text-navy' : 'font-semibold text-navy'}>{value}</span>
    </div>
  );
}
