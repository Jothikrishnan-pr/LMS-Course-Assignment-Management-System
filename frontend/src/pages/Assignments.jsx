import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import useFetch from '../hooks/useFetch';
import useAction from '../hooks/useAction';
import { assignmentsApi } from '../api/services';
import { Async, Badge, ErrorMessage, Pagination, Success, fmtDate } from '../components/ui';

function SubmitBox({ assignment, onDone }) {
  const [content, setContent] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const { busy, error, success, run } = useAction();
  const submit = async (e) => {
    e.preventDefault();
    const res = await run(() => assignmentsApi.submit(assignment._id, { content, ...(fileUrl && { fileUrl }) }), 'Submitted!');
    if (res) onDone();
  };
  return (
    <form onSubmit={submit} style={{ marginTop: 8 }}>
      <textarea required rows={3} placeholder="Your answer..." value={content} onChange={(e) => setContent(e.target.value)} />
      <input placeholder="Optional link to your work (https://...)" value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} />
      <ErrorMessage message={error} /><Success message={success} />
      <button disabled={busy}>{busy ? 'Submitting...' : 'Submit'}</button>
    </form>
  );
}

export default function Assignments() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const state = useFetch(() => assignmentsApi.list({ page, limit: 8 }), [page]);
  const [open, setOpen] = useState(null);

  return (
    <>
      <h2>Assignments</h2>
      <Async state={state} empty={user.role === 'STUDENT' ? 'No assignments. Enroll in a course to see its assignments.' : 'No assignments yet.'}>
        {(list) => list.map((a) => {
          const overdue = new Date(a.dueDate) < new Date();
          const sub = a.mySubmission;
          return (
            <div className="card" key={a._id}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <strong>{a.title}</strong>
                <span className="muted">Course: <Link to={`/courses/${a.course?._id}`}>{a.course?.title}</Link></span>
              </div>
              <p>{a.description}</p>
              <p className="muted">Due {fmtDate(a.dueDate)} {overdue && <Badge kind="red">Past due</Badge>} | Max marks {a.maxMarks}</p>
              {user.role === 'STUDENT' && (sub ? (
                <p>
                  <Badge kind={sub.status === 'EVALUATED' ? 'green' : 'orange'}>{sub.status}</Badge>{' '}
                  {sub.status === 'EVALUATED' && <>Marks: <strong>{sub.marks}/{a.maxMarks}</strong>{sub.feedback && <> - {sub.feedback}</>}</>}
                </p>
              ) : overdue ? <p className="muted">Submission closed.</p> : (
                <>
                  <button onClick={() => setOpen(open === a._id ? null : a._id)}>{open === a._id ? 'Cancel' : 'Submit assignment'}</button>
                  {open === a._id && <SubmitBox assignment={a} onDone={() => { setOpen(null); state.reload(); }} />}
                </>
              ))}
            </div>
          );
        })}
      </Async>
      <Pagination meta={state.meta} onPage={setPage} />
    </>
  );
}
