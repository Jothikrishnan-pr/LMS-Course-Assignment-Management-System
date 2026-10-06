import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import useAction from '../hooks/useAction';
import { ErrorMessage } from '../components/ui';
import AuthShell from '../components/AuthShell';

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { busy, error, run } = useAction();
  const [form, setForm] = useState({ email: '', password: '' });
  if (user) return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault();
    const ok = await run(() => login(form).then(() => true));
    if (ok) navigate(location.state?.from?.pathname || '/', { replace: true });
  };

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to continue." footer={<>New student? <Link to="/register">Create an account</Link></>}>
      <form onSubmit={submit}>
        <label htmlFor="email">Email</label>
        <input id="email" type="email" autoComplete="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <label htmlFor="password">Password</label>
        <input id="password" type="password" autoComplete="current-password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <ErrorMessage message={error} />
        <button disabled={busy}>{busy ? 'Signing in...' : 'Sign in'}</button>
      </form>
    </AuthShell>
  );
}
