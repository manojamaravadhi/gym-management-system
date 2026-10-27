import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Dumbbell, LogIn, Eye, EyeOff, ShieldCheck, UserCheck, KeyRound } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { toast } from '../../utils/toast';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [submitting, setSubmitting] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const fillCredentials = (email, password) => {
    setForm({ email, password });
    toast.success(`Populated ${email}`);
  };

  const submit = async () => {
    if (!form.email || !form.password) return toast.error('Enter email and password');
    setSubmitting(true);
    try {
      const user = await login(form);
      toast.success('Welcome back!');
      const destination = location.state?.returnUrl || location.state?.from?.pathname || (user.role === 'admin' ? '/admin' : '/');
      navigate(user.role === 'admin' && !location.state?.returnUrl ? '/admin' : destination);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell title="Portal Sign In" subtitle="Sign in to access Member or Admin operations">
      {/* 1-Click Demo Evaluator Credentials Box */}
      <div className="rounded-lg border border-sky-500/30 bg-sky-950/20 p-3 text-xs">
        <div className="mb-2 flex items-center gap-1.5 font-semibold text-sky-400">
          <KeyRound className="h-3.5 w-3.5" />
          <span>Quick Evaluator Demo Credentials</span>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => fillCredentials('admin@kurnoolfitness.com', 'Admin@123')}
            className="flex items-center justify-between rounded border border-ink-700 bg-ink-850 px-2.5 py-1.5 text-left text-gray-200 transition hover:border-emerald-500 hover:text-emerald-300"
          >
            <span className="flex items-center gap-1">
              <ShieldCheck className="h-3 w-3 text-emerald-400" />
              <strong>Admin</strong>
            </span>
            <span className="text-[10px] text-gray-400">Auto-fill</span>
          </button>

          <button
            type="button"
            onClick={() => fillCredentials('member@kurnoolfitness.com', 'Member@123')}
            className="flex items-center justify-between rounded border border-ink-700 bg-ink-850 px-2.5 py-1.5 text-left text-gray-200 transition hover:border-emerald-500 hover:text-emerald-300"
          >
            <span className="flex items-center gap-1">
              <UserCheck className="h-3 w-3 text-emerald-400" />
              <strong>Member</strong>
            </span>
            <span className="text-[10px] text-gray-400">Auto-fill</span>
          </button>
        </div>
        <div className="mt-2 text-[10px] text-gray-400">
          <code>Admin: admin@kurnoolfitness.com / Admin@123</code><br />
          <code>Member: member@kurnoolfitness.com / Member@123</code>
        </div>
      </div>

      <Field label="Email" type="email" value={form.email} onChange={set('email')} onEnter={submit} />
      <Field label="Password" type="password" value={form.password} onChange={set('password')} onEnter={submit} />

      <button onClick={submit} disabled={submitting} className="btn-primary mt-2 w-full py-3 shadow-glow">
        <LogIn className="h-4 w-4" />
        {submitting ? 'Signing in…' : 'Sign In'}
      </button>

      <div className="flex items-center justify-between pt-2 text-xs text-gray-400">
        <p>No account? <Link to="/signup" className="text-sky-400 hover:underline">Create one</Link></p>
        <Link to="/admin/login" className="text-gray-400 hover:text-sky-400">Admin Portal →</Link>
      </div>
    </AuthShell>
  );
}

export function AuthShell({ title, subtitle, children }) {
  return (
    <div className="grid min-h-screen place-items-center bg-ink-950 px-4 py-8">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-700 text-slate-950 shadow-glow">
            <Dumbbell className="h-5 w-5" />
          </span>
          <span className="font-heading text-lg font-bold tracking-wider text-white">
            KURNOOL FITNESS
            <span className="block text-[10px] font-semibold tracking-widest text-emerald-400">CENTRE • PORTAL</span>
          </span>
        </Link>
        <div className="card p-8 shadow-card">
          <h1 className="font-heading text-2xl uppercase tracking-wide text-white">{title}</h1>
          <p className="mb-6 mt-1 text-sm text-gray-400">{subtitle}</p>
          <div className="space-y-4">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function Field({ label, onEnter, type, ...props }) {
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword ? (show ? 'text' : 'password') : type;
  return (
    <div>
      <label className="label">{label}</label>
      <div className="relative">
        <input
          {...props}
          type={inputType}
          onKeyDown={(e) => e.key === 'Enter' && onEnter?.()}
          className={`input ${isPassword ? 'pr-11' : ''}`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            tabIndex={-1}
            aria-label={show ? 'Hide password' : 'Show password'}
            className="absolute inset-y-0 right-0 grid w-11 place-items-center text-gray-500 hover:text-sky-400"
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
    </div>
  );
}
