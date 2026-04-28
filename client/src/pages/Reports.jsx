import { useEffect, useState } from 'react';
import { AlertTriangle, Download, FileSpreadsheet } from 'lucide-react';
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
  { key: 'gstr1', label: 'GSTR-1 Returns' },
  { key: 'gstr3b', label: 'GSTR-3B Summary' },
  { key: 'pl', label: 'Profit & Loss' },
  { key: 'party-ledger', label: 'Party Ledger' },
  { key: 'expense', label: 'Expense Report' },
];

const lastMonthPeriod = () => {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const monthStart = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`; };
const today = () => new Date().toISOString().slice(0, 10);

export default function Reports() {
  const [active, setActive] = useState('sales-register');
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(today());
  const [period, setPeriod] = useState(lastMonthPeriod());
  const [parties, setParties] = useState([]);
  const [partyId, setPartyId] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const isPeriodReport = active === 'gstr1' || active === 'gstr3b';

  useEffect(() => { api.get('/parties?all=1').then(setParties); }, []);

  useEffect(() => {
    setLoading(true);
    const qs = new URLSearchParams({ from, to });
    let url = '';
    if (active === 'sales-register') url = `/reports/sales-register?${qs}`;
    else if (active === 'gst-summary') url = `/reports/gst-summary?${qs}`;
    else if (active === 'gstr1') url = `/reports/gstr1?period=${period}`;
    else if (active === 'gstr3b') url = `/reports/gstr3b?period=${period}`;
    else if (active === 'pl') url = `/reports/pl?${qs}`;
    else if (active === 'party-ledger') url = partyId ? `/reports/party-ledger/${partyId}` : '';
    else if (active === 'expense') url = `/reports/expense-summary?${qs}`;
    if (!url) { setData(null); setLoading(false); return; }
    api.get(url).then(setData).catch((e) => toast.error(e.message)).finally(() => setLoading(false));
  }, [active, from, to, period, partyId]);

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
              ) : isPeriodReport ? (
                <div>
                  <label className="label">Filing period</label>
                  <input type="month" className="input" value={period} onChange={(e) => setPeriod(e.target.value)} />
                  <p className="text-xs text-slate-400 mt-1">Defaults to last calendar month — what you'd file this month.</p>
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
              {!isPeriodReport && (
                <div className="ml-auto">
                  <Button variant="secondary" onClick={exportCurrent} disabled={!data}><Download size={14} /> Export CSV</Button>
                </div>
              )}
            </div>
          </div>

          {loading && <div className="card text-sm text-slate-400">Loading…</div>}
          {!loading && data && (
            <ReportRenderer active={active} data={data} from={from} to={to} period={period} />
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
  if (active === 'gstr1') return <Gstr1View data={data} />;
  if (active === 'gstr3b') return <Gstr3bView data={data} />;
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

const GSTR1_SECTIONS = [
  { key: 'b2b',   label: 'B2B',   hint: 'Sales to GSTIN-holders (one row per invoice + rate)' },
  { key: 'b2cl',  label: 'B2CL',  hint: 'Interstate B2C above ₹1,00,000 invoice value' },
  { key: 'b2cs',  label: 'B2CS',  hint: 'B2C aggregated by place-of-supply + rate' },
  { key: 'cdnr',  label: 'CDNR',  hint: 'Credit/debit notes for registered parties' },
  { key: 'cdnur', label: 'CDNUR', hint: 'Credit/debit notes for unregistered parties' },
  { key: 'hsn',   label: 'HSN',   hint: 'HSN-wise summary of all outward supplies' },
  { key: 'docs',  label: 'DOCS',  hint: 'Documents issued — invoice number ranges + cancelled' },
];

function Gstr1View({ data }) {
  const [section, setSection] = useState('b2b');
  const totals = data.totals || {};
  const counts = data.counts || {};
  const warnings = data.warnings || [];

  function downloadSection(key) {
    const a = document.createElement('a');
    a.href = `/api/reports/gstr1/csv?period=${data.period}&section=${key}`;
    a.download = `gstr1_${key}_${data.period}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  return (
    <div className="space-y-4">
      <div className="card grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
        <Stat label="Taxable" value={formatINR(totals.taxable || 0)} />
        <Stat label="CGST" value={formatINR(totals.cgst || 0)} />
        <Stat label="SGST" value={formatINR(totals.sgst || 0)} />
        <Stat label="IGST" value={formatINR(totals.igst || 0)} accent />
      </div>

      {warnings.length > 0 && (
        <div className="card border-l-4 border-amber bg-amber-50">
          <div className="flex items-start gap-2">
            <AlertTriangle size={16} className="text-amber-700 mt-0.5 flex-shrink-0" />
            <div className="text-xs">
              <div className="font-bold text-amber-800 mb-1">{warnings.length} warning(s) — review before filing</div>
              <ul className="space-y-1 text-amber-900">
                {warnings.slice(0, 8).map((w, i) => (
                  <li key={i}>{w.invoice_no ? <span className="font-mono font-bold">{w.invoice_no}: </span> : null}{w.message}</li>
                ))}
                {warnings.length > 8 && <li className="italic text-amber-700">…and {warnings.length - 8} more</li>}
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="flex flex-wrap gap-2 mb-4 border-b border-slate-200 pb-3">
          {GSTR1_SECTIONS.map((s) => (
            <button
              key={s.key}
              onClick={() => setSection(s.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold ${section === s.key ? 'bg-navy text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {s.label} <span className={`ml-1 ${section === s.key ? 'text-amber' : 'text-slate-400'}`}>{counts[s.key] ?? 0}</span>
            </button>
          ))}
          <div className="ml-auto">
            <Button variant="secondary" onClick={() => downloadSection(section)} disabled={(counts[section] ?? 0) === 0}>
              <FileSpreadsheet size={14} /> Download {section.toUpperCase()} CSV
            </Button>
          </div>
        </div>
        <p className="text-xs text-slate-500 mb-3">{GSTR1_SECTIONS.find(s => s.key === section)?.hint}</p>
        <Gstr1SectionTable section={section} rows={data[section] || []} />
      </div>
    </div>
  );
}

function Gstr1SectionTable({ section, rows }) {
  if (!rows || rows.length === 0) {
    return <div className="text-sm text-slate-400 text-center py-8">No rows in this section for the selected period.</div>;
  }

  const cols = {
    b2b: [
      { key: 'gstin', label: 'GSTIN', render: (r) => <span className="font-mono">{r.gstin}</span> },
      { key: 'party_name', label: 'Receiver' },
      { key: 'invoice_no', label: 'Invoice', render: (r) => <span className="font-mono">{r.invoice_no}</span> },
      { key: 'invoice_date', label: 'Date', render: (r) => formatDate(r.invoice_date) },
      { key: 'place_of_supply', label: 'POS' },
      { key: 'rate', label: 'Rate', align: 'right', render: (r) => `${r.rate}%` },
      { key: 'taxable_value', label: 'Taxable', align: 'right', render: (r) => formatINR(r.taxable_value) },
      { key: 'cgst', label: 'CGST', align: 'right', render: (r) => formatINR(r.cgst) },
      { key: 'sgst', label: 'SGST', align: 'right', render: (r) => formatINR(r.sgst) },
      { key: 'igst', label: 'IGST', align: 'right', render: (r) => formatINR(r.igst) },
    ],
    b2cl: [
      { key: 'invoice_no', label: 'Invoice', render: (r) => <span className="font-mono">{r.invoice_no}</span> },
      { key: 'invoice_date', label: 'Date', render: (r) => formatDate(r.invoice_date) },
      { key: 'place_of_supply', label: 'POS' },
      { key: 'rate', label: 'Rate', align: 'right', render: (r) => `${r.rate}%` },
      { key: 'invoice_value', label: 'Invoice Value', align: 'right', render: (r) => formatINR(r.invoice_value) },
      { key: 'taxable_value', label: 'Taxable', align: 'right', render: (r) => formatINR(r.taxable_value) },
      { key: 'igst', label: 'IGST', align: 'right', render: (r) => formatINR(r.igst) },
    ],
    b2cs: [
      { key: 'place_of_supply', label: 'POS' },
      { key: 'rate', label: 'Rate', align: 'right', render: (r) => `${r.rate}%` },
      { key: 'taxable_value', label: 'Taxable', align: 'right', render: (r) => formatINR(r.taxable_value) },
      { key: 'cgst', label: 'CGST', align: 'right', render: (r) => formatINR(r.cgst) },
      { key: 'sgst', label: 'SGST', align: 'right', render: (r) => formatINR(r.sgst) },
      { key: 'igst', label: 'IGST', align: 'right', render: (r) => formatINR(r.igst) },
    ],
    cdnr: [
      { key: 'gstin', label: 'GSTIN', render: (r) => <span className="font-mono">{r.gstin}</span> },
      { key: 'note_no', label: 'Note No', render: (r) => <span className="font-mono">{r.note_no}</span> },
      { key: 'note_date', label: 'Date', render: (r) => formatDate(r.note_date) },
      { key: 'original_invoice_no', label: 'Original Inv', render: (r) => r.original_invoice_no ? <span className="font-mono">{r.original_invoice_no}</span> : <span className="text-amber-700 text-xs">missing</span> },
      { key: 'rate', label: 'Rate', align: 'right', render: (r) => `${r.rate}%` },
      { key: 'taxable_value', label: 'Taxable', align: 'right', render: (r) => formatINR(r.taxable_value) },
      { key: 'cgst', label: 'CGST', align: 'right', render: (r) => formatINR(r.cgst) },
      { key: 'sgst', label: 'SGST', align: 'right', render: (r) => formatINR(r.sgst) },
      { key: 'igst', label: 'IGST', align: 'right', render: (r) => formatINR(r.igst) },
    ],
    cdnur: [
      { key: 'ut', label: 'UR Type' },
      { key: 'note_no', label: 'Note No', render: (r) => <span className="font-mono">{r.note_no}</span> },
      { key: 'note_date', label: 'Date', render: (r) => formatDate(r.note_date) },
      { key: 'original_invoice_no', label: 'Original Inv', render: (r) => r.original_invoice_no ? <span className="font-mono">{r.original_invoice_no}</span> : <span className="text-amber-700 text-xs">missing</span> },
      { key: 'rate', label: 'Rate', align: 'right', render: (r) => `${r.rate}%` },
      { key: 'taxable_value', label: 'Taxable', align: 'right', render: (r) => formatINR(r.taxable_value) },
      { key: 'igst', label: 'IGST', align: 'right', render: (r) => formatINR(r.igst) },
    ],
    hsn: [
      { key: 'hsn', label: 'HSN', render: (r) => r.hsn || <span className="text-amber-700 text-xs">missing</span> },
      { key: 'description', label: 'Description' },
      { key: 'unit', label: 'UQC' },
      { key: 'qty', label: 'Qty', align: 'right' },
      { key: 'rate', label: 'Rate', align: 'right', render: (r) => `${r.rate}%` },
      { key: 'taxable_value', label: 'Taxable', align: 'right', render: (r) => formatINR(r.taxable_value) },
      { key: 'cgst', label: 'CGST', align: 'right', render: (r) => formatINR(r.cgst) },
      { key: 'sgst', label: 'SGST', align: 'right', render: (r) => formatINR(r.sgst) },
      { key: 'igst', label: 'IGST', align: 'right', render: (r) => formatINR(r.igst) },
      { key: 'total_value', label: 'Total', align: 'right', render: (r) => <span className="font-bold">{formatINR(r.total_value)}</span> },
    ],
    docs: [
      { key: 'doc_type', label: 'Nature of Document' },
      { key: 'from_no', label: 'From', render: (r) => <span className="font-mono">{r.from_no}</span> },
      { key: 'to_no', label: 'To', render: (r) => <span className="font-mono">{r.to_no}</span> },
      { key: 'total', label: 'Total', align: 'right' },
      { key: 'cancelled', label: 'Cancelled', align: 'right' },
      { key: 'net', label: 'Net Issued', align: 'right', render: (r) => <span className="font-bold">{r.net}</span> },
    ],
  };

  return <Table columns={cols[section] || []} rows={rows} />;
}

function Gstr3bView({ data }) {
  const s31a = data.s31a || {};
  const s31c = data.s31c || {};
  const s32 = data.s32 || { rows: [] };
  const s4 = data.s4 || {};
  const s61 = data.s61 || {};

  return (
    <div className="space-y-4">
      <div className="card">
        <h3 className="text-sm font-bold text-navy mb-1">3.1(a) — {s31a.label}</h3>
        <p className="text-xs text-slate-400 mb-3">Type these into the GSTR-3B portal.</p>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center">
          <Stat label="Taxable" value={formatINR(s31a.taxable || 0)} />
          <Stat label="IGST" value={formatINR(s31a.igst || 0)} />
          <Stat label="CGST" value={formatINR(s31a.cgst || 0)} />
          <Stat label="SGST" value={formatINR(s31a.sgst || 0)} />
          <Stat label="Cess" value={formatINR(s31a.cess || 0)} />
        </div>
      </div>

      <div className="card">
        <h3 className="text-sm font-bold text-navy mb-1">3.1(c) — {s31c.label}</h3>
        <div className="text-2xl font-extrabold text-navy mt-2">{formatINR(s31c.taxable || 0)}</div>
      </div>

      <div className="card">
        <h3 className="text-sm font-bold text-navy mb-1">3.2 — {s32.label}</h3>
        {s32.rows.length === 0 ? (
          <div className="text-sm text-slate-400 mt-2">No interstate B2C supplies in this period.</div>
        ) : (
          <Table
            columns={[
              { key: 'place_of_supply', label: 'Place of supply' },
              { key: 'taxable', label: 'Taxable', align: 'right', render: (r) => formatINR(r.taxable) },
              { key: 'igst', label: 'IGST', align: 'right', render: (r) => formatINR(r.igst) },
            ]}
            rows={s32.rows}
          />
        )}
      </div>

      <div className="card">
        <h3 className="text-sm font-bold text-navy mb-1">4(A)(5) — {s4.label}</h3>
        <p className="text-xs text-slate-400 mb-3">From purchase invoices. Verify against your supplier bills before filing.</p>
        <div className="grid grid-cols-3 gap-3 text-center">
          <Stat label="CGST ITC" value={formatINR(s4.cgst || 0)} />
          <Stat label="SGST ITC" value={formatINR(s4.sgst || 0)} />
          <Stat label="IGST ITC" value={formatINR(s4.igst || 0)} />
        </div>
      </div>

      <div className="card border-l-4 border-amber">
        <h3 className="text-sm font-bold text-navy mb-1">6.1 — {s61.label}</h3>
        <p className="text-xs text-slate-500 mb-3">Output liability minus eligible ITC. Negative = refund/carry-forward.</p>
        <div className="grid grid-cols-3 gap-3 text-center">
          <Stat label="CGST payable" value={formatINR(s61.cgst || 0)} accent={s61.cgst > 0} />
          <Stat label="SGST payable" value={formatINR(s61.sgst || 0)} accent={s61.sgst > 0} />
          <Stat label="IGST payable" value={formatINR(s61.igst || 0)} accent={s61.igst > 0} />
        </div>
      </div>
    </div>
  );
}
