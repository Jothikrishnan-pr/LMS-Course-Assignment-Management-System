import { useState } from 'react';
import useAction from '../hooks/useAction';
import { assignmentsApi } from '../api/services';
import { ErrorMessage } from './ui';

export default function AssignmentForm({ courseId, onCreated }) {
  const [form, setForm] = useState({ title: '', description: '', dueDate: '', maxMarks: 100 });
  const { busy, error, run } = useAction();
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    const body = { ...form, maxMarks: Number(form.maxMarks), dueDate: new Date(form.dueDate).toISOString() };
    if (await run(() => assignmentsApi.create(courseId, body))) onCreated();
  };

  return (
    <form className="card" onSubmit={submit}>
      <label>Title</label><input required value={form.title} onChange={set('title')} />
      <label>Description</label><textarea required rows={3} value={form.description} onChange={set('description')} />
      <div className="row">
        <div style={{ flex: 1 }}><label>Due date</label><input type="datetime-local" required value={form.dueDate} onChange={set('dueDate')} /></div>
        <div style={{ flex: 1 }}><label>Maximum marks</label><input type="number" min="1" required value={form.maxMarks} onChange={set('maxMarks')} /></div>
      </div>
      <ErrorMessage message={error} />
      <button disabled={busy}>{busy ? 'Saving...' : 'Create assignment'}</button>
    </form>
  );
}
