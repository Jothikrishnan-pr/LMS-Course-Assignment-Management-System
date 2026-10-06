import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import useAction from '../hooks/useAction';
import { ErrorMessage } from '../components/ui';
import AuthShell from '../components/AuthShell';

export default function Register() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const { busy, error, run } = useAction();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  if (user) return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault();
    const ok = await run(() => register(form).then(() => true));
    if (ok) navigate('/');
  };
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <AuthShell title="Create your account" subtitle="Student registration." footer={<>Already registered? <Link to="/login">Sign in</Link></>}>
      <form onSubmit={submit}>
        <label htmlFor="name">Name</label>
        <input id="name" required minLength={2} autoComplete="name" value={form.name} onChange={set('name')} />
        <label htmlFor="email">Email</label>
        <input id="email" type="email" autoComplete="email" required value={form.email} onChange={set('email')} />
        <label htmlFor="password">Password (min 8 characters)</label>
        <input id="password" type="password" autoComplete="new-password" required minLength={8} value={form.password} onChange={set('password')} />
        <ErrorMessage message={error} />
        <button disabled={busy}>{busy ? 'Creating...' : 'Create account'}</button>
      </form>
    </AuthShell>
  );
}
