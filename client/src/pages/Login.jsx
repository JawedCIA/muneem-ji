import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, Loader2, ShieldCheck, KeyRound } from 'lucide-react';
import { Input } from '../components/ui/Input.jsx';
import Button from '../components/ui/Button.jsx';
import { useAuth } from '../store/auth.js';

export default function Login() {
  const login = useAuth((s) => s.login);
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [stage, setStage] = useState('credentials'); // 'credentials' | 'totp'
  const [totp, setTotp] = useState('');
  const [backupCode, setBackupCode] = useState('');
  const [useBackup, setUseBackup] = useState(false);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(email.trim().toLowerCase(), password, { totp: totp || undefined, backupCode: backupCode || undefined });
      navigate('/', { replace: true });
    } catch (err) {
      if (err.requires2fa) {
        setStage('totp');
        setError(stage === 'totp' ? err.message : null);
      } else {
        setError(err.message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-page flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/logo.png" alt="Muneem Ji" className="w-16 h-16 mx-auto mb-3" />
          <h1 className="text-2xl font-extrabold text-navy">Muneem Ji</h1>
          <p className="text-sm text-slate-500 italic">Aapka Digital Muneem</p>
        </div>

        <div className="card">
          {stage === 'credentials' ? (
            <>
              <h2 className="text-lg font-bold text-navy mb-1">Welcome back</h2>
              <p className="text-sm text-slate-500 mb-5">Sign in to your shop's books</p>
              <form onSubmit={onSubmit} className="space-y-3">
                <Input label="Email" type="email" autoComplete="email" autoFocus required value={email} onChange={(e) => setEmail(e.target.value)} />
                <Input label="Password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                {error && (
                  <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</div>
                )}
                <Button type="submit" disabled={submitting} className="w-full justify-center">
                  {submitting ? <><Loader2 size={14} className="animate-spin" /> Signing in…</> : <><LogIn size={14} /> Sign in</>}
                </Button>
              </form>
            </>
          ) : (
            <>
              <h2 className="text-lg font-bold text-navy mb-1 flex items-center gap-2"><ShieldCheck size={18} className="text-emerald-600" /> Two-factor verification</h2>
              <p className="text-sm text-slate-500 mb-5">
                {useBackup
                  ? 'Enter one of your saved backup codes.'
                  : 'Open your authenticator app and enter the 6-digit code for Muneem Ji.'}
              </p>
              <form onSubmit={onSubmit} className="space-y-3">
                {useBackup ? (
                  <Input
                    label="Backup code"
                    autoFocus
                    autoComplete="one-time-code"
                    placeholder="XXXXXXXX"
                    value={backupCode}
                    onChange={(e) => setBackupCode(e.target.value.toUpperCase())}
                    className="font-mono tracking-widest text-center text-lg"
                  />
                ) : (
                  <Input
                    label="6-digit code"
                    autoFocus
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    placeholder="000000"
                    value={totp}
                    onChange={(e) => setTotp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="font-mono tracking-widest text-center text-2xl"
                  />
                )}
                {error && (
                  <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</div>
                )}
                <Button type="submit" disabled={submitting || (useBackup ? !backupCode : totp.length !== 6)} className="w-full justify-center">
                  {submitting ? <><Loader2 size={14} className="animate-spin" /> Verifying…</> : <><LogIn size={14} /> Verify & Sign in</>}
                </Button>
                <button
                  type="button"
                  onClick={() => { setUseBackup((v) => !v); setError(null); setTotp(''); setBackupCode(''); }}
                  className="text-xs text-slate-500 hover:text-amber-700 inline-flex items-center gap-1 w-full justify-center"
                >
                  <KeyRound size={12} /> {useBackup ? 'Use authenticator code instead' : 'Lost your phone? Use a backup code'}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          Self-hosted · Your data stays on your server
        </p>
        <p className="text-center text-[11px] text-slate-400 mt-1">
          Built by <a href="https://mannatai.com" target="_blank" rel="noopener noreferrer" className="hover:text-amber underline-offset-2 hover:underline">mannatai.com</a>
        </p>
      </div>
    </div>
  );
}
