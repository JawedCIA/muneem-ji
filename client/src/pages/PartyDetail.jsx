import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, MapPin, FileText } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader.jsx';
import Table from '../components/ui/Table.jsx';
import { StatusBadge } from '../components/ui/Badge.jsx';
import { api } from '../utils/api.js';
import { formatINR, formatDate } from '../utils/format.js';
import { toast } from '../store/toast.js';

export default function PartyDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [ledger, setLedger] = useState(null);

  useEffect(() => {
    api.get(`/parties/${id}`).then(setData).catch((e) => toast.error(e.message));
    api.get(`/reports/party-ledger/${id}`).then(setLedger).catch(() => {});
  }, [id]);

  if (!data) return <div className="text-slate-400 text-sm">Loading…</div>;

  return (
    <div>
      <Link to="/parties" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-navy mb-4">
        <ArrowLeft size={14} /> Back to parties
      </Link>

      <PageHeader title={data.name} subtitle={<span className="capitalize">{data.type}</span>} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="card lg:col-span-2 space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <Detail label="GSTIN" value={data.gstin || '—'} mono />
            <Detail label="Phone" value={data.phone || '—'} icon={Phone} />
            <Detail label="Email" value={data.email || '—'} icon={Mail} />
            <Detail label="State" value={`${data.state_code || ''} · ${data.state_name || '—'}`} />
            <Detail label="Address" value={`${data.address || ''}${data.city ? ', ' + data.city : ''}${data.pincode ? ' - ' + data.pincode : ''}` || '—'} icon={MapPin} fullWidth />
          </div>
        </div>
        <div className="card">
          <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Outstanding</div>
          <div className="text-3xl font-extrabold text-amber mt-2">{formatINR(data.outstanding)}</div>
          <div className="text-xs text-slate-500 mt-1">Opening: {formatINR(data.opening_bal)}</div>
          <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-3 text-center">
            <div>
              <div className="text-xs text-slate-500">Invoices</div>
              <div className="text-xl font-bold text-navy">{data.invoices.length}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Payments</div>
              <div className="text-xl font-bold text-navy">{data.payments.length}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card mb-6">
        <h3 className="text-base font-bold text-navy mb-3 flex items-center gap-2"><FileText size={16} /> Ledger</h3>
        {ledger ? (
          <Table
            columns={[
              { key: 'date', label: 'Date', render: (r) => formatDate(r.date) },
              { key: 'type', label: 'Type', render: (r) => <span className="capitalize">{r.type}</span> },
              { key: 'ref', label: 'Reference' },
              { key: 'debit', label: 'Debit', align: 'right', render: (r) => r.debit ? formatINR(r.debit) : '—' },
              { key: 'credit', label: 'Credit', align: 'right', render: (r) => r.credit ? formatINR(r.credit) : '—' },
              { key: 'balance', label: 'Balance', align: 'right', render: (r) => <span className={r.balance > 0 ? 'font-bold text-amber-700' : 'text-slate-500'}>{formatINR(r.balance)}</span> },
            ]}
            rows={ledger.entries}
            empty="No transactions"
          />
        ) : <div className="text-sm text-slate-400">Loading ledger…</div>}
      </div>

      <div className="card">
        <h3 className="text-base font-bold text-navy mb-3">Invoices</h3>
        <Table
          columns={[
            { key: 'no', label: 'No.', render: (r) => <Link to={`/invoices/${r.id}`} className="font-mono font-semibold text-navy hover:text-amber">{r.no}</Link> },
            { key: 'date', label: 'Date', render: (r) => formatDate(r.date) },
            { key: 'total', label: 'Total', align: 'right', render: (r) => formatINR(r.total) },
            { key: 'paid', label: 'Paid', align: 'right', render: (r) => formatINR(r.amount_paid) },
            { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
          ]}
          rows={data.invoices}
          empty="No invoices for this party"
        />
      </div>
    </div>
  );
}

function Detail({ label, value, icon: Icon, mono, fullWidth }) {
  return (
    <div className={fullWidth ? 'col-span-2' : ''}>
      <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">{label}</div>
      <div className={`text-navy font-medium flex items-center gap-2 ${mono ? 'font-mono text-sm' : ''}`}>
        {Icon && <Icon size={14} className="text-slate-400 shrink-0" />}
        <span>{value}</span>
      </div>
    </div>
  );
}
