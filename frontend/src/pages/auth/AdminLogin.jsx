import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, KeyRound } from 'lucide-react';
import { AuthShell, Field } from './Login';
import { useAuth } from '../../context/AuthContext';
import { toast } from '../../utils/toast';

export default function AdminLogin() {
  const { adminLogin } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [submitting, setSubmitting] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const fillAdmin = () => {
    setForm({ email: 'admin@kurnoolfitness.com', password: 'Admin@123' });
    toast.success('Admin demo credentials populated!');
  };

  const submit = async () => {
    if (!form.email || !form.password) return toast.error('Enter admin credentials');
    setSubmitting(true);
    try {
      await adminLogin(form);
      toast.success('Welcome back, System Admin');
      navigate('/admin');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell title="Admin Operations Portal" subtitle="Protected access for facility administrators">
      {/* 1-Click Demo Admin Credentials */}
      <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/20 p-3 text-xs">
        <div className="mb-2 flex items-center justify-between">
          <span className="flex items-center gap-1.5 font-semibold text-emerald-400">
            <KeyRound className="h-3.5 w-3.5" />
            Admin Demo Credentials
          </span>
          <button
            type="button"
            onClick={fillAdmin}
            className="rounded border border-emerald-500/50 bg-emerald-500/20 px-2 py-0.5 text-[11px] font-medium text-emerald-300 transition hover:bg-emerald-500/30"
          >
            Auto-fill
          </button>
        </div>
        <code className="text-[11px] text-gray-300">admin@kurnoolfitness.com / Admin@123</code>
      </div>

      <Field label="Admin Email" type="email" value={form.email} onChange={set('email')} onEnter={submit} />
      <Field label="Password" type="password" value={form.password} onChange={set('password')} onEnter={submit} />

      <button onClick={submit} disabled={submitting} className="btn-primary mt-2 w-full py-3 shadow-glow">
        <ShieldCheck className="h-4 w-4" />
        {submitting ? 'Authenticating…' : 'Authenticate Admin'}
      </button>
    </AuthShell>
  );
}
