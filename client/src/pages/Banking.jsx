import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Building2, Plus, Upload, Check, X, Link2, Unlink, ArrowDown, ArrowUp, AlertCircle, Loader2 } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader.jsx';
import Button from '../components/ui/Button.jsx';
import Modal from '../components/ui/Modal.jsx';
import { Input, Select, Textarea } from '../components/ui/Input.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import { SkeletonTable } from '../components/ui/Skeleton.jsx';
import Confirm from '../components/ui/Confirm.jsx';
import Pagination from '../components/ui/Pagination.jsx';
import { api } from '../utils/api.js';
import { formatINR, formatDate } from '../utils/format.js';
import { toast } from '../store/toast.js';

const PAGE_SIZE = 50;

export default function Banking() {
  const [accounts, setAccounts] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [importOpen, setImportOpen] = useState(false);

  const [lines, setLines] = useState([]);
  const [linesTotal, setLinesTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('unmatched');
  const [linesLoading, setLinesLoading] = useState(false);
  const [matchOpen, setMatchOpen] = useState(null); // line being matched

  const loadAccounts = useCallback(async () => {
    try {
      const a = await api.get('/bank/accounts');
      setAccounts(a);
      if (!activeId && a[0]) setActiveId(a[0].id);
    } catch (e) { toast.error(e.message); }
  }, [activeId]);

  useEffect(() => { loadAccounts(); }, [loadAccounts]);

  const loadLines = useCallback(async () => {
    if (!activeId) { setLines([]); setLinesTotal(0); return; }
    setLinesLoading(true);
    const qs = new URLSearchParams({ account_id: activeId, page: String(page), pageSize: String(PAGE_SIZE) });
    if (statusFilter) qs.append('status', statusFilter);
    try {
      const r = await api.get(`/bank/lines?${qs}`);
      setLines(r.rows); setLinesTotal(r.total);
    } catch (e) { toast.error(e.message); }
    finally { setLinesLoading(false); }
  }, [activeId, page, statusFilter]);

  useEffect(() => { setPage(1); }, [activeId, statusFilter]);
  useEffect(() => { loadLines(); }, [loadLines]);

  const active = accounts.find((a) => a.id === activeId);

  return (
    <div>
      <PageHeader
        title="Banking"
        subtitle="Bank statements & reconciliation"
        actions={<Button onClick={() => { setEditingAccount(null); setAccountOpen(true); }}><Plus size={16} /> Add Account</Button>}
      />

      {accounts.length === 0 ? (
        <div className="card"><EmptyState
          title="No bank accounts yet"
          description="Add your shop's bank account to import statements and reconcile them against your payments + expenses."
          action={<Button onClick={() => setAccountOpen(true)}><Plus size={14} /> Add your first account</Button>}
        /></div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {accounts.map((a) => (
              <button
                key={a.id}
                onClick={() => setActiveId(a.id)}
                className={`text-left bg-white rounded-2xl border p-4 transition ${activeId === a.id ? 'border-amber shadow-card' : 'border-cardBorder hover:border-amber/50'}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-bold text-navy truncate">{a.name}</div>
                    <div className="text-xs text-slate-500 truncate">{a.bank_name || '—'}{a.account_no ? ` · ${a.account_no}` : ''}</div>
                  </div>
                  <Building2 size={18} className="text-amber shrink-0" />
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <div><div className="text-[10px] uppercase text-slate-500">Total</div><div className="font-bold text-sm text-navy">{a.total_lines || 0}</div></div>
                  <div><div className="text-[10px] uppercase text-emerald-600">Matched</div><div className="font-bold text-sm text-emerald-700">{a.reconciled_lines || 0}</div></div>
                  <div><div className="text-[10px] uppercase text-amber-700">Pending</div><div className="font-bold text-sm text-amber-700">{a.unreconciled_lines || 0}</div></div>
                </div>
              </button>
            ))}
          </div>

          {active && (
            <div className="card mb-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-navy">{active.name}</div>
                  <div className="text-xs text-slate-500">{active.last_line_date ? `Last imported transaction: ${formatDate(active.last_line_date)}` : 'No statements imported yet'}</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" onClick={() => setImportOpen(true)}><Upload size={14} /> Import Statement</Button>
                  <Button variant="ghost" onClick={() => { setEditingAccount(active); setAccountOpen(true); }}>Edit</Button>
                </div>
              </div>
            </div>
          )}

          <div className="card mb-3">
            <div className="flex flex-wrap items-center gap-2">
              {[
                { v: 'unmatched', label: 'Pending', count: active?.unreconciled_lines },
                { v: 'matched',   label: 'Matched', count: active?.reconciled_lines },
                { v: '',          label: 'All',     count: active?.total_lines },
              ].map((t) => (
                <button
                  key={t.v}
                  onClick={() => setStatusFilter(t.v)}
                  className={`px-4 py-1.5 text-sm rounded-xl font-semibold transition ${statusFilter === t.v ? 'bg-navy text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  {t.label} {t.count != null ? <span className="ml-1 opacity-70">({t.count})</span> : null}
                </button>
              ))}
            </div>
          </div>

          {linesLoading ? <SkeletonTable /> : lines.length === 0 ? (
            <div className="card"><EmptyState
              title={statusFilter === 'unmatched' ? 'Nothing to reconcile' : 'No lines yet'}
              description={statusFilter === 'unmatched' ? 'All statement lines on this tab are reconciled.' : 'Import a CSV statement to get started.'}
            /></div>
          ) : (
            <>
              <div className="card overflow-hidden p-0">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="text-left px-4 py-3">Date</th>
                      <th className="text-left px-4 py-3">Description</th>
                      <th className="text-left px-4 py-3 hidden sm:table-cell">Reference</th>
                      <th className="text-right px-4 py-3">Money out</th>
                      <th className="text-right px-4 py-3">Money in</th>
                      <th className="text-right px-4 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((l) => (
                      <tr key={l.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-4 py-2 whitespace-nowrap text-xs">{formatDate(l.date)}</td>
                        <td className="px-4 py-2"><div className="text-sm text-navy">{l.description || '—'}</div></td>
                        <td className="px-4 py-2 hidden sm:table-cell text-xs font-mono text-slate-500">{l.reference || '—'}</td>
                        <td className="px-4 py-2 text-right">{l.debit > 0 ? <span className="font-semibold text-rose-700 inline-flex items-center gap-1"><ArrowUp size={12} />{formatINR(l.debit)}</span> : '—'}</td>
                        <td className="px-4 py-2 text-right">{l.credit > 0 ? <span className="font-semibold text-emerald-700 inline-flex items-center gap-1"><ArrowDown size={12} />{formatINR(l.credit)}</span> : '—'}</td>
                        <td className="px-4 py-2 text-right">
                          {l.match_id ? (
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-1">
                              <Check size={12} /> Matched
                              <button className="ml-1 text-emerald-700 hover:text-rose-600" onClick={() => unmatch(l.match_id)} title="Unmatch"><Unlink size={12} /></button>
                            </span>
                          ) : (
                            <Button size="sm" variant="secondary" onClick={() => setMatchOpen(l)}><Link2 size={12} /> Match</Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="px-4 py-3 border-t border-slate-100">
                  <Pagination page={page} pageSize={PAGE_SIZE} total={linesTotal} onChange={setPage} />
                </div>
              </div>
            </>
          )}
        </>
      )}

      <AccountForm open={accountOpen} initial={editingAccount} onClose={() => { setAccountOpen(false); setEditingAccount(null); }} onSaved={() => { setAccountOpen(false); setEditingAccount(null); loadAccounts(); }} />
      <ImportModal open={importOpen} accountId={activeId} onClose={() => setImportOpen(false)} onImported={() => { setImportOpen(false); loadAccounts(); loadLines(); }} />
      <MatchModal line={matchOpen} onClose={() => setMatchOpen(null)} onMatched={() => { setMatchOpen(null); loadAccounts(); loadLines(); }} />
    </div>
  );

  async function unmatch(matchId) {
    try { await api.delete(`/bank/match/${matchId}`); toast.success('Unmatched'); loadAccounts(); loadLines(); }
    catch (e) { toast.error(e.message); }
  }
}

function AccountForm({ open, initial, onClose, onSaved }) {
  const [form, setForm] = useState({ name: '', bank_name: '', account_no: '', currency: 'INR', opening_bal: 0, notes: '' });
  const [saving, setSaving] = useState(false);
  useEffect(() => { setForm(initial || { name: '', bank_name: '', account_no: '', currency: 'INR', opening_bal: 0, notes: '' }); }, [initial, open]);

  async function submit() {
    if (!form.name.trim()) { toast.error('Account name required'); return; }
    setSaving(true);
    try {
      if (initial?.id) await api.put(`/bank/accounts/${initial.id}`, form);
      else await api.post('/bank/accounts', form);
      toast.success('Bank account saved');
      onSaved?.();
    } catch (e) { toast.error(e.message); }
    finally { setSaving(false); }
  }

  return (
    <Modal open={open} onClose={onClose} title={initial ? `Edit ${initial.name}` : 'Add Bank Account'} actions={<>
      <Button variant="secondary" onClick={onClose}>Cancel</Button>
      <Button onClick={submit} disabled={saving}>{saving ? 'Saving…' : 'Save Account'}</Button>
    </>}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Input label="Display Name *" placeholder="e.g. HDFC Current 1234" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
        <Input label="Bank Name" placeholder="HDFC Bank" value={form.bank_name || ''} onChange={(e) => setForm({ ...form, bank_name: e.target.value })} />
        <Input label="Account No (last 4 OK)" value={form.account_no || ''} onChange={(e) => setForm({ ...form, account_no: e.target.value })} className="font-mono" />
        <Input label="Currency" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} />
        <Input type="number" label="Opening Balance" value={form.opening_bal} onChange={(e) => setForm({ ...form, opening_bal: parseFloat(e.target.value) || 0 })} />
        <div className="md:col-span-2"><Textarea label="Notes" rows="2" value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
      </div>
    </Modal>
  );
}

function ImportModal({ open, accountId, onClose, onImported }) {
  const fileRef = useRef(null);
  const [file, setFile] = useState(null);
  const [peek, setPeek] = useState(null);
  const [mapping, setMapping] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (!open) { setFile(null); setPeek(null); setMapping({}); } }, [open]);

  async function pick(f) {
    setFile(f); setPeek(null); setBusy(true);
    try {
      const fd = new FormData(); fd.append('file', f);
      const r = await api.post('/bank/peek', fd);
      setPeek(r); setMapping(r.detected || {});
    } catch (e) { toast.error(e.message); }
    finally { setBusy(false); }
  }

  async function commit() {
    if (!file || !mapping.date) { toast.error('Pick the date column at minimum'); return; }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('account_id', accountId);
      fd.append('mapping', JSON.stringify(mapping));
      const r = await api.post('/bank/import', fd);
      toast.success(`Imported ${r.inserted} statement line${r.inserted === 1 ? '' : 's'}`);
      onImported?.();
    } catch (e) { toast.error(e.message); }
    finally { setBusy(false); }
  }

  return (
    <Modal open={open} onClose={onClose} title="Import Bank Statement (CSV)" size="lg" actions={<>
      <Button variant="secondary" onClick={onClose}>Cancel</Button>
      <Button onClick={commit} disabled={busy || !peek}><Upload size={14} /> {busy ? 'Working…' : `Import ${peek?.rowCount || ''} rows`}</Button>
    </>}>
      <div className="space-y-4">
        <div>
          <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) pick(f); e.target.value = ''; }} />
          <Button variant="secondary" onClick={() => fileRef.current?.click()} disabled={busy}>
            {busy && !peek ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} {file ? `Replace file (${file.name})` : 'Choose CSV file'}
          </Button>
          <p className="text-xs text-slate-500 mt-2">Most Indian bank exports work — we'll auto-detect the columns and let you confirm. Max 5 MB.</p>
        </div>

        {peek && (
          <>
            <div className="border-t border-slate-100 pt-4">
              <div className="text-sm font-semibold text-navy mb-2">Confirm column mapping</div>
              <div className="text-xs text-slate-500 mb-3">{peek.rowCount} data row{peek.rowCount === 1 ? '' : 's'} detected.</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { key: 'date', label: 'Date *', required: true },
                  { key: 'description', label: 'Description / Narration' },
                  { key: 'reference', label: 'Reference / UTR / Cheque' },
                  { key: 'debit', label: 'Debit (money out)' },
                  { key: 'credit', label: 'Credit (money in)' },
                  { key: 'balance', label: 'Running Balance' },
                ].map((f) => (
                  <Select key={f.key} label={f.label} value={mapping[f.key] || ''} onChange={(e) => setMapping({ ...mapping, [f.key]: e.target.value || null })}>
                    <option value="">— None —</option>
                    {peek.headers.map((h) => <option key={h} value={h}>{h}</option>)}
                  </Select>
                ))}
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Sample (first {peek.sample.length} rows)</div>
              <div className="overflow-x-auto border border-slate-200 rounded-lg max-h-48">
                <table className="text-[11px] w-full">
                  <thead className="bg-slate-50">
                    <tr>{peek.headers.map((h) => <th key={h} className="px-2 py-1 text-left font-bold text-slate-600 whitespace-nowrap">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {peek.sample.map((row, i) => (
                      <tr key={i} className="border-t border-slate-100">
                        {peek.headers.map((h) => <td key={h} className="px-2 py-1 whitespace-nowrap text-slate-700">{row[h]}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

function MatchModal({ line, onClose, onMatched }) {
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!line) { setData(null); return; }
    api.get(`/bank/suggestions/${line.id}`).then(setData).catch((e) => toast.error(e.message));
  }, [line]);

  async function match(matchType, id) {
    setBusy(true);
    try {
      await api.post('/bank/match', {
        line_id: line.id,
        match_type: matchType,
        payment_id: matchType === 'payment' ? id : null,
        expense_id: matchType === 'expense' ? id : null,
      });
      toast.success('Matched');
      onMatched?.();
    } catch (e) { toast.error(e.message); }
    finally { setBusy(false); }
  }

  if (!line) return null;
  const incoming = line.credit > 0;
  const amount = incoming ? line.credit : line.debit;

  return (
    <Modal open onClose={onClose} title="Match Statement Line" size="lg">
      <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 mb-4 text-sm">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-semibold text-navy">{line.description || '(no description)'}</div>
            <div className="text-xs text-slate-500">{formatDate(line.date)}{line.reference ? ` · ${line.reference}` : ''}</div>
          </div>
          <div className={`text-lg font-extrabold ${incoming ? 'text-emerald-700' : 'text-rose-700'}`}>
            {incoming ? '+' : '−'} {formatINR(amount)}
          </div>
        </div>
      </div>

      {!data ? (
        <div className="text-sm text-slate-400 py-6 text-center">Loading suggestions…</div>
      ) : (
        <>
          {incoming ? (
            <SuggestList
              type="payment"
              title="Suggested customer payments (matching amount, ±7 days)"
              empty="No matching customer payments found in the date window."
              items={data.payments}
              renderItem={(p) => (<>
                <div className="font-semibold text-navy">{p.party_name || 'Walk-in'}{p.invoice_no ? ` — ${p.invoice_no}` : ''}</div>
                <div className="text-xs text-slate-500 capitalize">{p.mode}{p.reference ? ` · ${p.reference}` : ''} · {formatDate(p.date)}</div>
              </>)}
              onPick={(p) => match('payment', p.id)}
              busy={busy}
            />
          ) : (
            <SuggestList
              type="expense"
              title="Suggested expenses (matching amount, ±7 days)"
              empty="No matching expenses found in the date window."
              items={data.expenses}
              renderItem={(e) => (<>
                <div className="font-semibold text-navy">{e.category}{e.vendor ? ` — ${e.vendor}` : ''}</div>
                <div className="text-xs text-slate-500">{e.description || ''} · {formatDate(e.date)}</div>
              </>)}
              onPick={(e) => match('expense', e.id)}
              busy={busy}
            />
          )}

          <div className="text-xs text-slate-400 mt-4 inline-flex items-center gap-1">
            <AlertCircle size={12} /> Don't see it? Manually search by going to the {incoming ? 'Payments' : 'Expenses'} page; we'll add full search here in a later update.
          </div>
        </>
      )}
    </Modal>
  );
}

function SuggestList({ title, empty, items, renderItem, onPick, busy }) {
  return (
    <>
      <div className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-2">{title}</div>
      {items.length === 0 ? (
        <div className="text-sm text-slate-400 py-4 text-center bg-slate-50 rounded-lg">{empty}</div>
      ) : (
        <ul className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
          {items.map((it) => (
            <li key={it.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="flex-1 min-w-0">{renderItem(it)}</div>
              <div className="flex items-center gap-3">
                <div className="text-sm font-bold text-navy">{formatINR(it.amount)}</div>
                <Button size="sm" onClick={() => onPick(it)} disabled={busy}>Match</Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
