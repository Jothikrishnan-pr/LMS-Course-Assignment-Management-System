import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import useFetch from '../hooks/useFetch';
import useAction from '../hooks/useAction';
import { coursesApi, usersApi } from '../api/services';
import { Async, ErrorMessage, Pagination, Success } from '../components/ui';

const empty = { title: '', description: '', trainerId: '' };

// Trainer Dashboard: create / update / delete own courses. Admin sees and manages all courses.
export default function ManageCourses() {
  const { user } = useAuth();
  const isAdmin = user.role === 'ADMIN';
  const [page, setPage] = useState(1);
  const state = useFetch(() => coursesApi.list({ page, limit: 8, mine: isAdmin ? undefined : 'true' }), [page]);
  const trainers = useFetch(() => (isAdmin ? usersApi.list({ role: 'TRAINER', limit: 100 }) : Promise.resolve({ data: [] })), [isAdmin]);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const action = useAction();
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    const { title, description, trainerId } = form;
    const res = await action.run(
      () => (editId ? coursesApi.update(editId, { title, description }) : coursesApi.create({ title, description, ...(isAdmin && { trainerId }) })),
      editId ? 'Course updated' : 'Course created'
    );
    if (res) { setForm(empty); setEditId(null); state.reload(); }
  };
  const edit = (c) => { setEditId(c._id); setForm({ title: c.title, description: c.description, trainerId: '' }); window.scrollTo(0, 0); };
  const remove = async (c) => {
    if (!window.confirm(`Delete "${c.title}" along with its assignments, submissions and enrollments?`)) return;
    if (await action.run(() => coursesApi.remove(c._id), 'Course deleted')) state.reload();
  };

  return (
    <>
      <h2>{isAdmin ? 'Manage Courses' : 'Trainer Dashboard'}</h2>
      <form className="card" onSubmit={submit}>
        <h3 style={{ marginTop: 0 }}>{editId ? 'Edit course' : 'Create course'}</h3>
        <label>Title</label><input required minLength={3} value={form.title} onChange={set('title')} />
        <label>Description</label><textarea required minLength={10} rows={3} value={form.description} onChange={set('description')} />
        {isAdmin && !editId && (
          <><label>Trainer</label>
            <select required value={form.trainerId} onChange={set('trainerId')}>
              <option value="">Select trainer</option>
              {(trainers.data || []).map((t) => <option key={t._id} value={t._id}>{t.name} ({t.email})</option>)}
            </select></>
        )}
        <ErrorMessage message={action.error} /><Success message={action.success} />
        <div className="row" style={{ marginTop: 8 }}>
          <button disabled={action.busy}>{editId ? 'Update' : 'Create'}</button>
          {editId && <button type="button" className="secondary" onClick={() => { setEditId(null); setForm(empty); }}>Cancel</button>}
        </div>
      </form>

      <Async state={state} empty="No courses yet.">
        {(courses) => (
          <table>
            <thead><tr><th>Title</th><th>Trainer</th><th>Actions</th></tr></thead>
            <tbody>
              {courses.map((c) => (
                <tr key={c._id}>
                  <td><Link to={`/courses/${c._id}`}>{c.title}</Link></td>
                  <td>{c.trainer?.name}</td>
                  <td className="row">
                    <button onClick={() => edit(c)}>Edit</button>
                    <button className="danger" onClick={() => remove(c)}>Delete</button>
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
