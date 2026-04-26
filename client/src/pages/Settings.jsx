import { useEffect, useRef, useState, Fragment } from 'react';
import { Save, Database, Upload, Download, Trash2, RefreshCw, Users, Sparkles, Eraser, Image as ImageIcon, X, ScrollText, ChevronRight, ChevronDown, Lock, Unlock, AlertTriangle, ShieldCheck, ShieldOff, Smartphone } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader.jsx';
import Button from '../components/ui/Button.jsx';
import { Input, Select, Textarea } from '../components/ui/Input.jsx';
import Confirm from '../components/ui/Confirm.jsx';
import { useSettings } from '../store/settings.js';
import { useAuth } from '../store/auth.js';
import { STATES } from '../utils/gst.js';
import { isValidGSTIN, isValidPAN, isValidPincode, isValidEmail } from '../utils/validators.js';
import { api } from '../utils/api.js';
import { toast } from '../store/toast.js';

const SECTIONS = [
  { key: 'business', label: 'Business Profile' },
  { key: 'invoice', label: 'Invoice Configuration' },
  { key: 'tax', label: 'Tax Settings' },
  { key: 'security', label: 'Security & Users' },
  { key: 'audit', label: 'Audit Log', adminOnly: true },
  { key: 'data', label: 'Data Management' },
];

export default function Settings() {
  const settings = useSettings((s) => s.settings);
  const update = useSettings((s) => s.update);
  const me = useAuth((s) => s.user);
  const [active, setActive] = useState('business');
  const [form, setForm] = useState({});
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmImport, setConfirmImport] = useState(null);
  const [pwd, setPwd] = useState({ current: '', next: '', confirm: '' });
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'cashier' });
  const [backups, setBackups] = useState([]);
  const [demoStatus, setDemoStatus] = useState(null);
  const [confirmLoadDemo, setConfirmLoadDemo] = useState(false);
  const [confirmClearDemo, setConfirmClearDemo] = useState(false);
  const fileInputRef = useRef(null);
  const isAdmin = me?.role === 'admin';

  useEffect(() => { setForm(settings); }, [settings]);

  useEffect(() => {
    if (active === 'security' && isAdmin) {
      api.get('/auth/users').then(setUsers).catch(() => {});
    }
    if (active === 'data') {
      api.get('/backup/list').then(setBackups).catch(() => {});
      api.get('/demo/status').then(setDemoStatus).catch(() => {});
    }
  }, [active, isAdmin]);

  async function uploadLogo(file) {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error('Logo must be under 2 MB'); return; }
    if (!['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'].includes(file.type)) {
      toast.error('Logo must be PNG, JPG, WebP, or SVG'); return;
    }
    try {
      const fd = new FormData();
      fd.append('file', file);
      const r = await api.post('/settings/logo', fd);
      // Refresh settings store with the new logo URL
      await useSettings.getState().load();
      setForm((f) => ({ ...f, logoUrl: r.logoUrl }));
      toast.success('Logo uploaded');
    } catch (e) { toast.error(e.message); }
  }

  async function removeLogo() {
    try {
      await api.delete('/settings/logo');
      await useSettings.getState().load();
      setForm((f) => ({ ...f, logoUrl: null }));
      toast.success('Logo removed');
    } catch (e) { toast.error(e.message); }
  }

  async function loadDemo() {
    try {
      const r = await api.post('/demo/load', { keepSettings: true });
      const total = Object.values(r.counts || {}).reduce((s, n) => s + (n || 0), 0);
      toast.success(`Loaded ${total} demo records. Reloading…`);
      setTimeout(() => window.location.reload(), 1000);
    } catch (e) { toast.error(e.message); }
  }

  async function clearDemo() {
    try {
      await api.post('/demo/clear', { keepSettings: true });
      toast.success('All business data cleared. Reloading…');
      setTimeout(() => window.location.reload(), 1000);
    } catch (e) { toast.error(e.message); }
  }

  async function changePassword() {
    if (pwd.next.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    if (pwd.next !== pwd.confirm) { toast.error('Passwords do not match'); return; }
    try {
      await api.post('/auth/change-password', { currentPassword: pwd.current, newPassword: pwd.next });
      toast.success('Password updated');
      setPwd({ current: '', next: '', confirm: '' });
    } catch (e) { toast.error(e.message); }
  }

  async function createUser() {
    if (!newUser.name || !newUser.email || newUser.password.length < 8) {
      toast.error('Name, email, and 8+ char password required'); return;
    }
    try {
      const u = await api.post('/auth/users', newUser);
      setUsers((arr) => [...arr, u]);
      setNewUser({ name: '', email: '', password: '', role: 'cashier' });
      toast.success(`User ${u.email} created`);
    } catch (e) { toast.error(e.message); }
  }

  async function toggleUserActive(u) {
    try {
      const updated = await api.put(`/auth/users/${u.id}`, { active: !u.active });
      setUsers((arr) => arr.map((x) => x.id === u.id ? updated : x));
    } catch (e) { toast.error(e.message); }
  }

  async function deleteUser(u) {
    if (!confirm(`Delete user ${u.email}?`)) return;
    try {
      await api.delete(`/auth/users/${u.id}`);
      setUsers((arr) => arr.filter((x) => x.id !== u.id));
    } catch (e) { toast.error(e.message); }
  }

  async function runBackupNow() {
    try {
      const r = await api.post('/backup/run-now');
      toast.success(`Backup written: ${r.file.split(/[\\/]/).pop()}`);
      const list = await api.get('/backup/list');
      setBackups(list);
    } catch (e) { toast.error(e.message); }
  }

  async function importBackup(file) {
    try {
      const fd = new FormData();
      fd.append('file', file);
      const r = await api.post('/backup/import', fd);
      const total = Object.values(r.restored || {}).reduce((s, n) => s + (n || 0), 0);
      toast.success(`Restored ${total} records. Reloading…`);
      setTimeout(() => window.location.reload(), 1200);
    } catch (e) { toast.error(e.message); }
  }

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  function validate() {
    const e = {};
    if (form.gstin && !isValidGSTIN(form.gstin)) e.gstin = 'Invalid GSTIN format';
    if (form.pan && !isValidPAN(form.pan)) e.pan = 'Invalid PAN format';
    if (form.pincode && !isValidPincode(form.pincode)) e.pincode = 'Invalid pincode';
    if (form.email && !isValidEmail(form.email)) e.email = 'Invalid email';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function save() {
    if (!validate()) return;
    setSaving(true);
    try {
      const stateName = STATES.find((s) => s[0] === form.stateCode)?.[1] || form.stateName;
      await update({ ...form, stateName, gstin: (form.gstin || '').toUpperCase(), pan: (form.pan || '').toUpperCase() });
      toast.success('Settings saved');
    } catch (e) { toast.error(e.message); }
    finally { setSaving(false); }
  }

  async function exportData() {
    try {
      const res = await fetch('/api/backup/export', { credentials: 'include' });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `muneemji-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Backup downloaded');
    } catch (e) { toast.error(e.message); }
  }

  return (
    <div>
      <PageHeader title="Settings" subtitle="Configure your business and Muneem Ji preferences" />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="card lg:col-span-1 h-fit">
          <div className="space-y-1">
            {SECTIONS.filter((s) => !s.adminOnly || isAdmin).map((s) => (
              <button
                key={s.key}
                onClick={() => setActive(s.key)}
                className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition ${active === s.key ? 'bg-amber/10 text-amber-700 font-bold' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-3 space-y-4">
          {active === 'business' && (
            <div className="card space-y-4">
              <h3 className="text-base font-bold text-navy flex items-center gap-2"><ImageIcon size={16} /> Logo</h3>
              <LogoUploader
                currentLogo={form.logoUrl}
                onUpload={uploadLogo}
                onRemove={removeLogo}
                canEdit={isAdmin}
                businessName={form.businessName}
              />

              <h3 className="text-base font-bold text-navy pt-2">Business Profile</h3>
              <p className="text-xs text-slate-500 -mt-2">All these details appear on your printed invoices, PDFs, and POS receipts.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input label="Business Name" value={form.businessName || ''} onChange={(e) => set('businessName', e.target.value)} />
                <Input label="Phone" value={form.phone || ''} onChange={(e) => set('phone', e.target.value)} />
                <Input label="Email" value={form.email || ''} onChange={(e) => set('email', e.target.value)} error={errors.email} />
                <Input label="Website" value={form.website || ''} onChange={(e) => set('website', e.target.value)} />
                <Input label="GSTIN" value={form.gstin || ''} onChange={(e) => set('gstin', e.target.value)} error={errors.gstin} className="font-mono" />
                <Input label="PAN Number" value={form.pan || ''} onChange={(e) => set('pan', e.target.value)} error={errors.pan} className="font-mono" />
                <div className="md:col-span-2">
                  <Textarea label="Address" rows="2" value={form.address || ''} onChange={(e) => set('address', e.target.value)} />
                </div>
                <Input label="City" value={form.city || ''} onChange={(e) => set('city', e.target.value)} />
                <Input label="Pincode" value={form.pincode || ''} onChange={(e) => set('pincode', e.target.value)} error={errors.pincode} />
                <Select label="State" value={form.stateCode || ''} onChange={(e) => set('stateCode', e.target.value)} className="md:col-span-2">
                  <option value="">— Select state —</option>
                  {STATES.map(([code, name]) => <option key={code} value={code}>{code} · {name}</option>)}
                </Select>
              </div>
            </div>
          )}

          {active === 'invoice' && (
            <div className="card space-y-4">
              <h3 className="text-base font-bold text-navy">Invoice Configuration</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input label="Invoice Prefix" value={form.invoicePrefix || 'INV'} onChange={(e) => set('invoicePrefix', e.target.value)} />
                <Input label="Quotation Prefix" value={form.quotationPrefix || 'QUO'} onChange={(e) => set('quotationPrefix', e.target.value)} />
                <Input label="Default Payment Terms (days)" type="number" value={form.paymentTerms || 15} onChange={(e) => set('paymentTerms', e.target.value)} />
                <Select label="Invoice Theme" value={form.invoiceTheme || 'modern'} onChange={(e) => set('invoiceTheme', e.target.value)}>
                  <option value="classic">Classic</option>
                  <option value="modern">Modern</option>
                  <option value="minimal">Minimal</option>
                </Select>
                <div className="md:col-span-2">
                  <Textarea label="Default Notes / Terms" rows="3" value={form.defaultNotes || ''} onChange={(e) => set('defaultNotes', e.target.value)} />
                </div>
                <div className="md:col-span-2">
                  <Textarea
                    label="WhatsApp Share Message"
                    rows="4"
                    value={form.shareMessageTemplate || ''}
                    onChange={(e) => set('shareMessageTemplate', e.target.value)}
                    placeholder="Hi {customer}, here is your {kind} {number} for {amount} from {business}. View: {link}"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Placeholders: <code className="font-mono">{'{customer}'}</code>, <code className="font-mono">{'{kind}'}</code>, <code className="font-mono">{'{number}'}</code>, <code className="font-mono">{'{amount}'}</code>, <code className="font-mono">{'{business}'}</code>, <code className="font-mono">{'{link}'}</code>. Leave blank to use the default.
                  </p>
                </div>
              </div>
            </div>
          )}

          {active === 'tax' && (
            <div className="space-y-4">
              <div className="card space-y-4">
                <h3 className="text-base font-bold text-navy">Tax Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Select label="Default GST Rate (new products)" value={form.defaultTaxRate || '18'} onChange={(e) => set('defaultTaxRate', e.target.value)}>
                    {['0', '5', '12', '18', '28'].map((r) => <option key={r}>{r}</option>)}
                  </Select>
                  <Select label="Business Type" value={form.businessType || 'regular'} onChange={(e) => set('businessType', e.target.value)}>
                    <option value="regular">Regular</option>
                    <option value="composition">Composition Dealer</option>
                  </Select>
                </div>
              </div>

              <PeriodLockCard
                lockBeforeDate={form.lockBeforeDate || ''}
                onChange={(v) => set('lockBeforeDate', v)}
                onSave={save}
                saving={saving}
                canEdit={isAdmin}
              />
            </div>
          )}

          {active === 'security' && (
            <div className="space-y-4">
              <div className="card space-y-3">
                <h3 className="text-base font-bold text-navy">Change your password</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Input type="password" label="Current password" value={pwd.current} onChange={(e) => setPwd({ ...pwd, current: e.target.value })} autoComplete="current-password" />
                  <Input type="password" label="New password" value={pwd.next} onChange={(e) => setPwd({ ...pwd, next: e.target.value })} autoComplete="new-password" />
                  <Input type="password" label="Confirm new password" value={pwd.confirm} onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })} autoComplete="new-password" />
                </div>
                <div><Button variant="secondary" onClick={changePassword}>Update Password</Button></div>
              </div>

              <TwoFactorCard />

              {isAdmin && (
                <div className="card space-y-3">
                  <h3 className="text-base font-bold text-navy flex items-center gap-2"><Users size={16} /> Team Members</h3>
                  <p className="text-sm text-slate-500">Add cashier accounts for staff. Cashiers can run POS and create invoices but can't manage users or restore data.</p>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-xs uppercase text-slate-500 border-b border-slate-200">
                        <tr><th className="text-left py-2">Name</th><th className="text-left py-2">Email</th><th className="text-left py-2">Role</th><th className="text-left py-2">Last login</th><th></th></tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {users.map((u) => (
                          <tr key={u.id} className={u.active ? '' : 'opacity-50'}>
                            <td className="py-2 font-semibold">{u.name}</td>
                            <td className="py-2 text-slate-600">{u.email}</td>
                            <td className="py-2"><span className="text-[10px] uppercase tracking-wider font-bold text-amber">{u.role}</span></td>
                            <td className="py-2 text-xs text-slate-500">{u.last_login_at ? new Date(u.last_login_at).toLocaleString() : 'Never'}</td>
                            <td className="py-2 text-right space-x-2 whitespace-nowrap">
                              {u.id !== me?.id && (
                                <>
                                  <button className="text-xs text-slate-600 hover:text-navy" onClick={() => toggleUserActive(u)}>{u.active ? 'Disable' : 'Enable'}</button>
                                  <button className="text-xs text-rose-600 hover:text-rose-700" onClick={() => deleteUser(u)}>Delete</button>
                                </>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="border-t border-slate-100 pt-4 space-y-3">
                    <div className="text-sm font-semibold text-navy">Add a team member</div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                      <Input placeholder="Name" value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} />
                      <Input placeholder="Email" type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} />
                      <Input placeholder="Password (8+ chars)" type="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} />
                      <Select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}>
                        <option value="cashier">Cashier</option>
                        <option value="admin">Admin</option>
                      </Select>
                    </div>
                    <div><Button variant="secondary" onClick={createUser}>Add User</Button></div>
                  </div>
                </div>
              )}
            </div>
          )}

          {active === 'audit' && isAdmin && <AuditLogTab />}

          {active === 'data' && (
            <div className="space-y-4">
              {isAdmin && (
                <div className="card space-y-3 border-amber/30 bg-amber/5">
                  <h3 className="text-base font-bold text-navy flex items-center gap-2"><Sparkles size={16} className="text-amber" /> Demo Data</h3>
                  <p className="text-sm text-slate-600">
                    Want to see what Muneem Ji looks like with a real shop's data? Load a sample dataset of 5 customers, 10 products, 17 invoices, payments, and expenses to explore every report and screen — then clear it all when you're done.
                  </p>
                  {demoStatus && (
                    <div className="text-xs text-slate-500">
                      Currently in your DB: <span className="font-semibold text-navy">{demoStatus.counts.parties}</span> parties · <span className="font-semibold text-navy">{demoStatus.counts.products}</span> products · <span className="font-semibold text-navy">{demoStatus.counts.invoices}</span> invoices · <span className="font-semibold text-navy">{demoStatus.counts.expenses}</span> expenses
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => setConfirmLoadDemo(true)}><Sparkles size={14} /> Load Demo Data</Button>
                    {demoStatus?.hasData && (
                      <Button variant="danger" onClick={() => setConfirmClearDemo(true)}><Eraser size={14} /> Clear All Business Data</Button>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">Loading demo data REPLACES all parties, products, invoices, payments, and expenses. Your business profile, users, and settings are preserved.</p>
                </div>
              )}

              <div className="card space-y-4">
                <h3 className="text-base font-bold text-navy flex items-center gap-2"><Database size={16} /> Data Management</h3>
                <p className="text-sm text-slate-500">Backup and restore all your Muneem Ji data. Stored locally — no cloud.</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Button variant="secondary" onClick={exportData}><Download size={14} /> Export Backup (JSON)</Button>
                  {isAdmin && (
                    <>
                      <Button variant="secondary" onClick={() => fileInputRef.current?.click()}><Upload size={14} /> Import Backup</Button>
                      <input ref={fileInputRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) setConfirmImport(f);
                        e.target.value = '';
                      }} />
                      <Button variant="secondary" onClick={runBackupNow}><RefreshCw size={14} /> Run Backup Now</Button>
                    </>
                  )}
                </div>
                <div className="text-xs text-slate-400">Auto-backups run daily at 2:00 AM and are kept for 7 days. Always download a copy before importing.</div>
              </div>

              {isAdmin && backups.length > 0 && (
                <div className="card space-y-2">
                  <h3 className="text-base font-bold text-navy">Server-side Backups</h3>
                  <div className="text-xs text-slate-500">Latest {backups.length} files in the backup directory</div>
                  <ul className="divide-y divide-slate-100 text-sm">
                    {backups.map((b) => (
                      <li key={b.name} className="py-2 flex items-center justify-between">
                        <div>
                          <div className="font-mono text-xs">{b.name}</div>
                          <div className="text-[11px] text-slate-500">{(b.size / 1024).toFixed(1)} KB · {new Date(b.created).toLocaleString()}</div>
                        </div>
                        <a href={`/api/backup/download/${b.name}`} className="text-xs text-amber font-semibold hover:underline" download>Download</a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {active !== 'data' && active !== 'security' && (
            <div className="flex justify-end">
              <Button onClick={save} disabled={saving}><Save size={14} /> {saving ? 'Saving…' : 'Save Settings'}</Button>
            </div>
          )}
        </div>
      </div>

      <Confirm
        open={!!confirmImport}
        onClose={() => setConfirmImport(null)}
        onConfirm={() => { const f = confirmImport; setConfirmImport(null); if (f) importBackup(f); }}
        title="Restore from backup?"
        description="This will REPLACE all parties, products, invoices, payments, and expenses with the data in the backup file. User accounts are kept. This cannot be undone — make sure you have a current export first."
        confirmText="Restore"
        danger
      />

      <Confirm
        open={confirmLoadDemo}
        onClose={() => setConfirmLoadDemo(false)}
        onConfirm={() => { setConfirmLoadDemo(false); loadDemo(); }}
        title="Load demo data?"
        description="This will REPLACE all your current parties, products, invoices, payments, and expenses with the sample dataset. Your business profile, users, and settings are kept. Take a backup first if you have any real data."
        confirmText="Load Demo Data"
      />

      <Confirm
        open={confirmClearDemo}
        onClose={() => setConfirmClearDemo(false)}
        onConfirm={() => { setConfirmClearDemo(false); clearDemo(); }}
        title="Clear all business data?"
        description="This will DELETE every party, product, invoice, payment, and expense. Your business profile, users, and settings are kept. This cannot be undone."
        confirmText="Delete Everything"
        danger
      />
    </div>
  );
}

function TwoFactorCard() {
  const [status, setStatus] = useState(null); // { enabled, backupCodesRemaining }
  const [stage, setStage] = useState('idle'); // idle | setup | confirmDisable
  const [secret, setSecret] = useState(null);
  const [otpauth, setOtpauth] = useState(null);
  const [code, setCode] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [backupCodes, setBackupCodes] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { api.get('/auth/2fa/status').then(setStatus).catch(() => {}); }, []);

  async function startSetup() {
    setLoading(true);
    try {
      const r = await api.post('/auth/2fa/setup');
      setSecret(r.secret); setOtpauth(r.otpauth); setCode(''); setStage('setup');
    } catch (e) { toast.error(e.message); }
    finally { setLoading(false); }
  }

  async function enableNow() {
    if (code.length !== 6) { toast.error('Enter the 6-digit code'); return; }
    setLoading(true);
    try {
      const r = await api.post('/auth/2fa/enable', { code });
      setBackupCodes(r.backupCodes);
      setStage('codes');
      const s = await api.get('/auth/2fa/status'); setStatus(s);
      toast.success('Two-factor authentication enabled');
    } catch (e) { toast.error(e.message); }
    finally { setLoading(false); }
  }

  async function disable() {
    if (disableCode.length !== 6) { toast.error('Enter the 6-digit code from your authenticator'); return; }
    setLoading(true);
    try {
      await api.post('/auth/2fa/disable', { code: disableCode });
      setStatus({ enabled: false, backupCodesRemaining: 0 });
      setStage('idle');
      setDisableCode('');
      toast.success('Two-factor authentication disabled');
    } catch (e) { toast.error(e.message); }
    finally { setLoading(false); }
  }

  function downloadBackupCodes() {
    const blob = new Blob([
      `Muneem Ji — backup codes\nGenerated: ${new Date().toISOString()}\n\nKeep these somewhere safe. Each code works exactly once.\n\n${backupCodes.join('\n')}\n`,
    ], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'muneemji-backup-codes.txt';
    a.click(); URL.revokeObjectURL(url);
  }

  // QR code via Google Charts API (no extra dep). Renders the otpauth:// URI.
  const qrUrl = otpauth ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauth)}` : null;

  return (
    <div className="card space-y-3">
      <h3 className="text-base font-bold text-navy flex items-center gap-2">
        {status?.enabled
          ? <ShieldCheck size={16} className="text-emerald-600" />
          : <ShieldOff size={16} className="text-slate-400" />}
        Two-Factor Authentication
      </h3>

      {!status && <div className="text-sm text-slate-400">Loading…</div>}

      {status?.enabled && stage !== 'confirmDisable' && stage !== 'codes' && (
        <>
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 flex items-start gap-3">
            <ShieldCheck size={18} className="text-emerald-600 mt-0.5 shrink-0" />
            <div className="flex-1 text-sm">
              <div className="font-bold text-navy">2FA is on</div>
              <div className="text-xs text-slate-600 mt-0.5">{status.backupCodesRemaining} backup code{status.backupCodesRemaining === 1 ? '' : 's'} remaining</div>
            </div>
            <Button variant="secondary" onClick={() => setStage('confirmDisable')}>Disable</Button>
          </div>
        </>
      )}

      {stage === 'confirmDisable' && (
        <div className="space-y-3 border border-rose-200 bg-rose-50 rounded-xl p-4">
          <div className="text-sm font-bold text-navy">Confirm to disable 2FA</div>
          <p className="text-xs text-slate-600">Enter the current 6-digit code from your authenticator to confirm. This protects against someone with just your password.</p>
          <Input
            placeholder="000000"
            inputMode="numeric"
            maxLength={6}
            value={disableCode}
            onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            className="font-mono tracking-widest text-center text-xl"
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => { setStage('idle'); setDisableCode(''); }}>Cancel</Button>
            <Button variant="danger" onClick={disable} disabled={loading || disableCode.length !== 6}>Disable 2FA</Button>
          </div>
        </div>
      )}

      {!status?.enabled && stage === 'idle' && (
        <>
          <p className="text-sm text-slate-600">Add a second step to your sign-in. After your password, you'll enter a 6-digit code from an authenticator app on your phone (Google Authenticator, Authy, Microsoft Authenticator, or similar).</p>
          <div><Button variant="secondary" onClick={startSetup} disabled={loading}><Smartphone size={14} /> Set Up 2FA</Button></div>
        </>
      )}

      {stage === 'setup' && (
        <div className="space-y-4">
          <div className="text-sm font-semibold text-navy">Step 1 — Scan with your authenticator app</div>
          <div className="flex flex-col sm:flex-row gap-4 items-start">
            <div className="bg-white border border-slate-200 rounded-xl p-2 shrink-0">
              {qrUrl && <img src={qrUrl} alt="2FA QR code" width={200} height={200} />}
            </div>
            <div className="text-xs text-slate-600 space-y-2 flex-1">
              <p>Open your authenticator app, tap +, and scan this QR code.</p>
              <p>Can't scan? Type this secret manually:</p>
              <div className="font-mono text-sm bg-slate-100 rounded px-3 py-2 break-all">{secret}</div>
            </div>
          </div>
          <div className="text-sm font-semibold text-navy pt-2">Step 2 — Enter the 6-digit code your app shows</div>
          <Input
            placeholder="000000"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            className="font-mono tracking-widest text-center text-2xl"
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setStage('idle')}>Cancel</Button>
            <Button onClick={enableNow} disabled={loading || code.length !== 6}><ShieldCheck size={14} /> Enable 2FA</Button>
          </div>
        </div>
      )}

      {stage === 'codes' && backupCodes && (
        <div className="space-y-3 border border-amber/30 bg-amber/5 rounded-xl p-4">
          <div className="text-sm font-bold text-navy flex items-center gap-2"><AlertTriangle size={14} className="text-amber-600" /> Save your backup codes</div>
          <p className="text-xs text-slate-600">Each code works exactly once. Use one if you ever lose your phone. <span className="font-semibold">This is the only time we'll show them.</span></p>
          <div className="grid grid-cols-2 gap-2 font-mono text-sm">
            {backupCodes.map((c) => <div key={c} className="bg-white border border-slate-200 rounded px-2 py-1.5 text-center tracking-wider">{c}</div>)}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={downloadBackupCodes}><Download size={14} /> Download as .txt</Button>
            <Button onClick={() => setStage('idle')}>I've saved them</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function PeriodLockCard({ lockBeforeDate, onChange, onSave, saving, canEdit }) {
  const [confirmOpen, setConfirmOpen] = useState(null); // 'set' | 'unlock' | null
  const [pendingDate, setPendingDate] = useState('');
  const isLocked = !!lockBeforeDate;
  const friendly = isLocked ? new Date(lockBeforeDate + 'T00:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }) : null;

  function attemptSet() {
    if (!pendingDate) { toast.error('Pick a lock date first'); return; }
    setConfirmOpen('set');
  }
  function attemptUnlock() { setConfirmOpen('unlock'); }

  async function applySet() {
    setConfirmOpen(null);
    onChange(pendingDate);
    await onSave();
    setPendingDate('');
  }
  async function applyUnlock() {
    setConfirmOpen(null);
    onChange('');
    await onSave();
  }

  return (
    <div className={`card space-y-3 ${isLocked ? 'border-amber/40 bg-amber/5' : ''}`}>
      <h3 className="text-base font-bold text-navy flex items-center gap-2">
        {isLocked ? <Lock size={16} className="text-amber" /> : <Unlock size={16} />} Period Lock
      </h3>
      <p className="text-sm text-slate-600">
        Once you've filed GSTR-1 (or any tax return) for a period, lock it so nobody — including you — can change those entries by mistake. Invoices, payments, and expenses dated on or before the lock date become read-only.
      </p>

      {isLocked ? (
        <div className="rounded-xl bg-amber/10 border border-amber/30 px-4 py-3 flex items-start gap-3">
          <Lock size={18} className="text-amber-700 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0 text-sm">
            <div className="font-bold text-navy">Locked through {friendly}</div>
            <div className="text-xs text-slate-600 mt-0.5">Entries dated on or before <span className="font-mono">{lockBeforeDate}</span> can't be edited or deleted. New entries must use a date after the lock.</div>
          </div>
          {canEdit && (
            <Button variant="secondary" onClick={attemptUnlock}><Unlock size={14} /> Unlock</Button>
          )}
        </div>
      ) : (
        <div className="text-sm text-slate-500 italic">No lock set — every entry can still be edited.</div>
      )}

      {canEdit && (
        <div className="border-t border-slate-100 pt-4 space-y-2">
          <div className="text-sm font-semibold text-navy">{isLocked ? 'Move the lock forward' : 'Set a lock date'}</div>
          <p className="text-xs text-slate-500">Common choice: the last day of the most recent filed quarter or month.</p>
          <div className="flex flex-wrap items-end gap-2">
            <Input type="date" label="Lock entries on or before" value={pendingDate} onChange={(e) => setPendingDate(e.target.value)} className="w-48" />
            <Button onClick={attemptSet} disabled={saving || !pendingDate}><Lock size={14} /> {isLocked ? 'Update Lock' : 'Apply Lock'}</Button>
          </div>
        </div>
      )}

      <Confirm
        open={confirmOpen === 'set'}
        onClose={() => setConfirmOpen(null)}
        onConfirm={applySet}
        title="Lock this period?"
        description={`All invoices, payments, and expenses dated on or before ${pendingDate} will become read-only. You can move the lock forward or unlock anytime.`}
        confirmText="Lock Period"
      />
      <Confirm
        open={confirmOpen === 'unlock'}
        onClose={() => setConfirmOpen(null)}
        onConfirm={applyUnlock}
        title="Remove the period lock?"
        description="All entries will be editable again. Use this only if you actually need to amend filed records."
        confirmText="Unlock"
        danger
      />
    </div>
  );
}

function AuditLogTab() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [facets, setFacets] = useState({ users: [], entities: [], actions: [], knownEntities: [], knownActions: [] });
  const [filters, setFilters] = useState({ entity: '', action: '', user_id: '', q: '', from: '', to: '' });
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    api.get('/audit/facets').then(setFacets).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const qs = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    for (const [k, v] of Object.entries(filters)) if (v) qs.append(k, v);
    api.get(`/audit?${qs.toString()}`)
      .then((r) => { setRows(r.rows); setTotal(r.total); })
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, [filters, page]);

  function applyFilter(patch) { setFilters((f) => ({ ...f, ...patch })); setPage(1); setExpanded(null); }
  function reset() { setFilters({ entity: '', action: '', user_id: '', q: '', from: '', to: '' }); setPage(1); }

  function exportCsv() {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(filters)) if (v) qs.append(k, v);
    const url = `/api/audit/csv${qs.toString() ? '?' + qs.toString() : ''}`;
    window.location.href = url;
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const fmtTs = (ts) => { try { return new Date(ts.replace(' ', 'T') + 'Z').toLocaleString(); } catch { return ts; } };

  return (
    <div className="space-y-4">
      <div className="card space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h3 className="text-base font-bold text-navy flex items-center gap-2"><ScrollText size={16} /> Audit Log</h3>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={reset}><X size={14} /> Clear filters</Button>
            <Button variant="secondary" onClick={exportCsv}><Download size={14} /> Export CSV</Button>
          </div>
        </div>
        <p className="text-sm text-slate-500">Append-only history of every change made by every user. Useful for compliance and debugging ("who deleted INV-247 last Tuesday?").</p>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
          <Select value={filters.entity} onChange={(e) => applyFilter({ entity: e.target.value })}>
            <option value="">All entities</option>
            {facets.knownEntities.map((e) => <option key={e} value={e}>{e}</option>)}
          </Select>
          <Select value={filters.action} onChange={(e) => applyFilter({ action: e.target.value })}>
            <option value="">All actions</option>
            {facets.knownActions.map((a) => <option key={a} value={a}>{a}</option>)}
          </Select>
          <Select value={filters.user_id} onChange={(e) => applyFilter({ user_id: e.target.value })}>
            <option value="">All users</option>
            {facets.users.map((u) => <option key={u.user_id} value={u.user_id}>{u.user_email || u.user_id}</option>)}
          </Select>
          <Input type="date" value={filters.from} onChange={(e) => applyFilter({ from: e.target.value })} />
          <Input type="date" value={filters.to} onChange={(e) => applyFilter({ to: e.target.value })} />
          <Input placeholder="Search summary…" value={filters.q} onChange={(e) => applyFilter({ q: e.target.value })} />
        </div>
      </div>

      <div className="card overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 w-8"></th>
              <th className="text-left px-4 py-3">When</th>
              <th className="text-left px-4 py-3">User</th>
              <th className="text-left px-4 py-3">Action</th>
              <th className="text-left px-4 py-3">Entity</th>
              <th className="text-left px-4 py-3">Summary</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="text-center text-slate-400 py-12">Loading…</td></tr>}
            {!loading && rows.length === 0 && <tr><td colSpan={6} className="text-center text-slate-400 py-12">No matching events.</td></tr>}
            {!loading && rows.map((r) => (
              <Fragment key={r.id}>
                <tr className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer" onClick={() => setExpanded(expanded === r.id ? null : r.id)}>
                  <td className="px-4 py-2 text-slate-400">{expanded === r.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</td>
                  <td className="px-4 py-2 text-xs text-slate-600 whitespace-nowrap">{fmtTs(r.ts)}</td>
                  <td className="px-4 py-2">
                    <div className="text-xs font-semibold text-navy">{r.user_email || '—'}</div>
                    {r.user_role && <div className="text-[10px] uppercase tracking-wider text-amber font-bold">{r.user_role}</div>}
                  </td>
                  <td className="px-4 py-2"><span className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded">{r.action}</span></td>
                  <td className="px-4 py-2 text-xs text-slate-700">{r.entity}</td>
                  <td className="px-4 py-2 text-sm">{r.summary || <span className="text-slate-400">—</span>}</td>
                </tr>
                {expanded === r.id && (
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <td></td>
                    <td colSpan={5} className="px-4 py-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <DiffPanel label="Before" json={r.before_json} />
                        <DiffPanel label="After" json={r.after_json} />
                      </div>
                      <div className="text-[11px] text-slate-500 mt-2">
                        IP: <span className="font-mono">{r.ip || '—'}</span> · Entity ID: <span className="font-mono">{r.entity_id || '—'}</span>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-sm">
          <div className="text-slate-500">{total.toLocaleString()} event{total === 1 ? '' : 's'}</div>
          <div className="flex items-center gap-2">
            <button className="text-xs text-slate-600 hover:text-navy disabled:opacity-30" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>← Prev</button>
            <span className="text-xs text-slate-500">Page {page} / {totalPages}</span>
            <button className="text-xs text-slate-600 hover:text-navy disabled:opacity-30" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next →</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DiffPanel({ label, json }) {
  if (!json) return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">{label}</div>
      <div className="text-xs text-slate-400 italic">—</div>
    </div>
  );
  let pretty = json;
  try { pretty = JSON.stringify(JSON.parse(json), null, 2); } catch {}
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">{label}</div>
      <pre className="bg-white border border-slate-200 rounded-lg p-2 text-[11px] text-slate-700 overflow-x-auto max-h-64 whitespace-pre-wrap">{pretty}</pre>
    </div>
  );
}

function LogoUploader({ currentLogo, onUpload, onRemove, canEdit, businessName }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const initials = (businessName || 'M').split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase();

  function handleFile(file) {
    if (!file) return;
    onUpload(file);
  }

  return (
    <div className="flex items-center gap-5">
      <div className="w-24 h-24 rounded-2xl bg-slate-50 border border-cardBorder flex items-center justify-center overflow-hidden shrink-0">
        {currentLogo ? (
          <img src={currentLogo} alt="Business logo" className="max-w-full max-h-full object-contain" />
        ) : (
          <div className="text-3xl font-extrabold text-amber">{initials}</div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-600 mb-2">
          {currentLogo ? 'This logo appears on your invoices, PDFs, and POS receipts.' : 'No logo uploaded — your business initials show as a placeholder.'}
        </p>
        {canEdit ? (
          <div className="flex items-center gap-2 flex-wrap">
            <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = ''; }} />
            <Button variant="secondary" onClick={() => inputRef.current?.click()}><Upload size={14} /> {currentLogo ? 'Replace logo' : 'Upload logo'}</Button>
            {currentLogo && <Button variant="ghost" onClick={onRemove}><X size={14} /> Remove</Button>}
            <span className="text-xs text-slate-400">PNG / JPG / WebP / SVG · Max 2 MB · Square works best (~512×512)</span>
          </div>
        ) : (
          <p className="text-xs text-slate-400">Only admins can change the logo.</p>
        )}
      </div>
    </div>
  );
}
