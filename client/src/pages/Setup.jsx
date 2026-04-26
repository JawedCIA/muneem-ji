import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowLeft, Check, Loader2, Sparkles } from 'lucide-react';
import { Input, Select, Textarea } from '../components/ui/Input.jsx';
import Button from '../components/ui/Button.jsx';
import { useAuth } from '../store/auth.js';
import { STATES } from '../utils/gst.js';
import { isValidGSTIN, isValidPAN, isValidPincode, isValidEmail } from '../utils/validators.js';

const STEPS = ['Welcome', 'Admin Account', 'Business Profile', 'Done'];

export default function Setup() {
  const setup = useAuth((s) => s.setup);
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState(null);

  const [admin, setAdmin] = useState({ name: '', email: '', password: '', confirm: '' });
  const [biz, setBiz] = useState({
    businessName: '', gstin: '', pan: '', phone: '', email: '',
    address: '', city: '', pincode: '', stateCode: '',
  });
  const [errors, setErrors] = useState({});

  function validateAdmin() {
    const e = {};
    if (!admin.name.trim()) e.name = 'Required';
    if (!admin.email.trim() || !isValidEmail(admin.email)) e.email = 'Valid email required';
    if (admin.password.length < 8) e.password = 'At least 8 characters';
    if (admin.password !== admin.confirm) e.confirm = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function validateBiz() {
    const e = {};
    if (!biz.businessName.trim()) e.businessName = 'Required';
    if (biz.gstin && !isValidGSTIN(biz.gstin)) e.gstin = 'Invalid GSTIN format';
    if (biz.pan && !isValidPAN(biz.pan)) e.pan = 'Invalid PAN format';
    if (biz.pincode && !isValidPincode(biz.pincode)) e.pincode = 'Invalid pincode';
    if (biz.email && !isValidEmail(biz.email)) e.email = 'Invalid email';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit() {
    if (!validateBiz()) return;
    setSubmitting(true);
    setServerError(null);
    try {
      const stateName = STATES.find((s) => s[0] === biz.stateCode)?.[1] || '';
      await setup({
        email: admin.email.trim().toLowerCase(),
        password: admin.password,
        name: admin.name.trim(),
        business: {
          ...biz,
          gstin: (biz.gstin || '').toUpperCase(),
          pan: (biz.pan || '').toUpperCase(),
          stateName,
        },
      });
      setStep(3);
    } catch (e) {
      setServerError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-page py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <img src="/logo.png" alt="Muneem Ji" className="w-16 h-16 mx-auto mb-3" />
          <h1 className="text-2xl font-extrabold text-navy">Muneem Ji</h1>
          <p className="text-sm text-slate-500 italic">Aapka Digital Muneem · First-Time Setup</p>
        </div>

        <div className="flex items-center justify-between mb-6">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center flex-1 last:flex-none">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                i < step ? 'bg-emerald-500 text-white'
                : i === step ? 'bg-amber text-white'
                : 'bg-slate-200 text-slate-500'
              }`}>
                {i < step ? <Check size={14} /> : i + 1}
              </div>
              <div className={`ml-2 text-xs font-semibold ${i === step ? 'text-navy' : 'text-slate-400'}`}>{label}</div>
              {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 mx-2 ${i < step ? 'bg-emerald-500' : 'bg-slate-200'}`} />}
            </div>
          ))}
        </div>

        <div className="card">
          {step === 0 && (
            <div className="text-center py-6 space-y-4">
              <div className="w-14 h-14 mx-auto rounded-full bg-amber/10 flex items-center justify-center">
                <Sparkles size={24} className="text-amber" />
              </div>
              <h2 className="text-xl font-bold text-navy">Welcome to your shop's books</h2>
              <p className="text-slate-600 text-sm max-w-md mx-auto">
                We'll set up your admin account and business profile in two quick steps. After that you can start raising
                invoices, tracking payments, and running your shop — all on your own server.
              </p>
              <div className="grid grid-cols-3 gap-3 max-w-md mx-auto pt-2 text-left">
                <Feature title="Your data, your laptop" />
                <Feature title="GST-ready out of the box" />
                <Feature title="No subscription, ever" />
              </div>
              <div className="pt-4">
                <Button onClick={() => setStep(1)}>Get Started <ArrowRight size={14} /></Button>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-navy">Create the admin account</h2>
              <p className="text-sm text-slate-500">This account can manage everything — including adding cashier accounts later.</p>
              <Input label="Your Name" value={admin.name} onChange={(e) => setAdmin({ ...admin, name: e.target.value })} error={errors.name} autoFocus />
              <Input label="Email" type="email" autoComplete="email" value={admin.email} onChange={(e) => setAdmin({ ...admin, email: e.target.value })} error={errors.email} />
              <Input label="Password" type="password" autoComplete="new-password" value={admin.password} onChange={(e) => setAdmin({ ...admin, password: e.target.value })} error={errors.password} hint="At least 8 characters" />
              <Input label="Confirm Password" type="password" autoComplete="new-password" value={admin.confirm} onChange={(e) => setAdmin({ ...admin, confirm: e.target.value })} error={errors.confirm} />
              <div className="flex justify-between pt-2">
                <Button variant="secondary" onClick={() => setStep(0)}><ArrowLeft size={14} /> Back</Button>
                <Button onClick={() => { if (validateAdmin()) setStep(2); }}>Next <ArrowRight size={14} /></Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-navy">Tell us about your business</h2>
              <p className="text-sm text-slate-500">This appears on your invoices. You can edit any of it later in Settings.</p>
              <Input label="Business Name *" value={biz.businessName} onChange={(e) => setBiz({ ...biz, businessName: e.target.value })} error={errors.businessName} autoFocus />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input label="GSTIN" value={biz.gstin} onChange={(e) => setBiz({ ...biz, gstin: e.target.value })} error={errors.gstin} className="font-mono" hint="Optional, but required for GST invoices" />
                <Input label="PAN" value={biz.pan} onChange={(e) => setBiz({ ...biz, pan: e.target.value })} error={errors.pan} className="font-mono" />
                <Input label="Phone" value={biz.phone} onChange={(e) => setBiz({ ...biz, phone: e.target.value })} />
                <Input label="Email" value={biz.email} onChange={(e) => setBiz({ ...biz, email: e.target.value })} error={errors.email} />
              </div>
              <Textarea label="Address" rows="2" value={biz.address} onChange={(e) => setBiz({ ...biz, address: e.target.value })} />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Input label="City" value={biz.city} onChange={(e) => setBiz({ ...biz, city: e.target.value })} />
                <Input label="Pincode" value={biz.pincode} onChange={(e) => setBiz({ ...biz, pincode: e.target.value })} error={errors.pincode} />
                <Select label="State" value={biz.stateCode} onChange={(e) => setBiz({ ...biz, stateCode: e.target.value })}>
                  <option value="">— Select —</option>
                  {STATES.map(([code, name]) => <option key={code} value={code}>{code} · {name}</option>)}
                </Select>
              </div>
              {serverError && (
                <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{serverError}</div>
              )}
              <div className="flex justify-between pt-2">
                <Button variant="secondary" onClick={() => setStep(1)} disabled={submitting}><ArrowLeft size={14} /> Back</Button>
                <Button onClick={submit} disabled={submitting}>
                  {submitting ? <><Loader2 size={14} className="animate-spin" /> Creating…</> : <>Finish Setup <Check size={14} /></>}
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 flex items-center justify-center">
                <Check size={32} className="text-emerald-600" />
              </div>
              <h2 className="text-xl font-bold text-navy">All set!</h2>
              <p className="text-slate-600 text-sm">Your shop is ready. Take a quick tour or jump straight in.</p>
              <Button onClick={() => navigate('/', { replace: true })}>Open Dashboard <ArrowRight size={14} /></Button>
            </div>
          )}
        </div>

        <p className="text-center text-[11px] text-slate-400 mt-6">
          Built by <a href="https://mannatai.com" target="_blank" rel="noopener noreferrer" className="hover:text-amber underline-offset-2 hover:underline">mannatai.com</a>
        </p>
      </div>
    </div>
  );
}

function Feature({ title }) {
  return (
    <div className="text-xs bg-slate-50 rounded-lg px-3 py-2 border border-slate-200">
      <div className="font-semibold text-navy">{title}</div>
    </div>
  );
}
