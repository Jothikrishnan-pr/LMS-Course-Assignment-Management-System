import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import useFetch from '../hooks/useFetch';
import useAction from '../hooks/useAction';
import { usersApi } from '../api/services';
import { Async, Badge, ErrorMessage, Pagination, Success } from '../components/ui';

const empty = { name: '', email: '', password: '', role: 'TRAINER' };

export default function AdminUsers() {
  const { user: me } = useAuth();
  const [page, setPage] = useState(1);
  const [role, setRole] = useState('');
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const state = useFetch(() => usersApi.list({ page, limit: 10, role: role || undefined, q: search || undefined }), [page, role, search]);
  const [form, setForm] = useState(empty);
  const action = useAction();
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const create = async (e) => {
    e.preventDefault();
    if (await action.run(() => usersApi.create(form), 'User created')) { setForm(empty); state.reload(); }
  };
  const update = async (u, patch, msg) => { if (await action.run(() => usersApi.update(u._id, patch), msg)) state.reload(); };
  const remove = async (u) => {
    if (window.confirm(`Delete ${u.email}?`) && (await action.run(() => usersApi.remove(u._id), 'User deleted'))) state.reload();
  };

  return (
    <>
      <h2>User Management</h2>
      <form className="card" onSubmit={create}>
        <h3 style={{ marginTop: 0 }}>Create user</h3>
        <div className="row">
          <input required placeholder="Name" value={form.name} onChange={set('name')} style={{ flex: 1 }} />
          <input required type="email" placeholder="Email" value={form.email} onChange={set('email')} style={{ flex: 1 }} />
          <input required type="password" minLength={8} placeholder="Password" value={form.password} onChange={set('password')} style={{ flex: 1 }} />
          <select value={form.role} onChange={set('role')} style={{ width: 130 }}><option>ADMIN</option><option>TRAINER</option><option>STUDENT</option></select>
          <button disabled={action.busy}>Create</button>
        </div>
        <ErrorMessage message={action.error} /><Success message={action.success} />
      </form>

      <form className="row" onSubmit={(e) => { e.preventDefault(); setPage(1); setSearch(q); }}>
        <input style={{ maxWidth: 260 }} placeholder="Search name or email" value={q} onChange={(e) => setQ(e.target.value)} />
        <select style={{ width: 150 }} value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }}>
          <option value="">All roles</option><option>ADMIN</option><option>TRAINER</option><option>STUDENT</option>
        </select>
        <button>Search</button>
      </form>

      <Async state={state} empty="No users found.">
        {(users) => (
          <table style={{ marginTop: 12 }}>
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id}>
                  <td>{u.name}</td><td>{u.email}</td>
                  <td>
                    <select value={u.role} disabled={u._id === me._id} onChange={(e) => update(u, { role: e.target.value }, 'Role updated')}>
                      <option>ADMIN</option><option>TRAINER</option><option>STUDENT</option>
                    </select>
                  </td>
                  <td><Badge kind={u.isActive ? 'green' : 'red'}>{u.isActive ? 'Active' : 'Disabled'}</Badge></td>
                  <td className="row">
                    <button className="secondary" disabled={u._id === me._id} onClick={() => update(u, { isActive: !u.isActive }, 'Status updated')}>{u.isActive ? 'Deactivate' : 'Activate'}</button>
                    <button className="danger" disabled={u._id === me._id} onClick={() => remove(u)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Async>
      <Pagination meta={state.meta} onPage={setPage} />
    </>
  );
}
