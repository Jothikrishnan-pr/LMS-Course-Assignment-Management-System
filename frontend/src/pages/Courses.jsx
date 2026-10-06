import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import useFetch from '../hooks/useFetch';
import useAction from '../hooks/useAction';
import { coursesApi } from '../api/services';
import { Async, Badge, ErrorMessage, Pagination, Success } from '../components/ui';

// "Available Courses": browse/search all courses; students can enroll.
export default function Courses() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const state = useFetch(() => coursesApi.list({ page, limit: 6, q: search || undefined }), [page, search]);
  const action = useAction();

  const enroll = async (id) => {
    const res = await action.run(() => coursesApi.enroll(id), 'Enrolled successfully');
    if (res) state.reload();
  };

  return (
    <>
      <h2>Available Courses</h2>
      <form className="row" onSubmit={(e) => { e.preventDefault(); setPage(1); setSearch(q); }}>
        <input style={{ maxWidth: 300 }} placeholder="Search courses..." value={q} onChange={(e) => setQ(e.target.value)} />
        <button>Search</button>
        {search && <button type="button" className="secondary" onClick={() => { setQ(''); setSearch(''); setPage(1); }}>Clear</button>}
      </form>
      <ErrorMessage message={action.error} />
      <Success message={action.success} />
      <Async state={state} empty="No courses found.">
        {(courses) => (
          <div className="grid" style={{ marginTop: 12 }}>
            {courses.map((c) => (
              <div className="card" key={c._id}>
                <h3 style={{ marginTop: 0 }}><Link to={`/courses/${c._id}`}>{c.title}</Link></h3>
                <p>{c.description.slice(0, 110)}{c.description.length > 110 && '...'}</p>
                <p className="muted">Trainer: {c.trainer?.name}</p>
                {user.role === 'STUDENT' && (c.isEnrolled
                  ? <Badge kind="green">Enrolled</Badge>
                  : <button disabled={action.busy} onClick={() => enroll(c._id)}>Enroll</button>)}
              </div>
            ))}
          </div>
        )}
      </Async>
      <Pagination meta={state.meta} onPage={setPage} />
    </>
  );
}
