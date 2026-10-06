import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import useFetch from '../hooks/useFetch';
import useAction from '../hooks/useAction';
import { submissionsApi } from '../api/services';
import { Async, Badge, ErrorMessage, Pagination, fmtDate } from '../components/ui';

function EvaluateForm({ submission, onDone }) {
  const max = submission.assignment?.maxMarks;
  const [marks, setMarks] = useState(submission.marks ?? '');
  const [feedback, setFeedback] = useState(submission.feedback || '');
  const [status, setStatus] = useState(submission.status === 'SUBMITTED' ? 'EVALUATED' : submission.status);
  const { busy, error, run } = useAction();
  const submit = async (e) => {
    e.preventDefault();
    if (await run(() => submissionsApi.evaluate(submission._id, { marks: Number(marks), feedback, status }))) onDone();
  };
  return (
    <form onSubmit={submit} className="row" style={{ alignItems: 'flex-end' }}>
      <div style={{ width: 120 }}><label>Marks (0-{max})</label><input type="number" min="0" max={max} step="any" required value={marks} onChange={(e) => setMarks(e.target.value)} /></div>
      <div style={{ flex: 1, minWidth: 180 }}><label>Feedback</label><input value={feedback} onChange={(e) => setFeedback(e.target.value)} /></div>
      <div style={{ width: 140 }}><label>Status</label>
        <select value={status} onChange={(e) => setStatus(e.target.value)}><option>SUBMITTED</option><option>EVALUATED</option></select></div>
      <button disabled={busy}>{busy ? 'Saving...' : 'Save'}</button>
      <div style={{ width: '100%' }}><ErrorMessage message={error} /></div>
    </form>
  );
}

// Student: own submissions (read only). Trainer/Admin: submissions to evaluate.
export default function Submissions() {
  const { user } = useAuth();
  const canEvaluate = user.role !== 'STUDENT';
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const state = useFetch(() => submissionsApi.list({ page, limit: 8, status: status || undefined }), [page, status]);

  return (
    <>
      <h2>Submissions</h2>
      <div className="row">
        <label style={{ margin: 0 }}>Filter by status</label>
        <select style={{ width: 180 }} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All</option><option>SUBMITTED</option><option>EVALUATED</option>
        </select>
      </div>
      <Async state={state} empty="No submissions found.">
        {(list) => list.map((s) => (
          <div className="card" key={s._id}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <strong>{s.assignment?.title}</strong>
              <Badge kind={s.status === 'EVALUATED' ? 'green' : 'orange'}>{s.status}</Badge>
            </div>
            <p className="muted">
              {canEvaluate && <>Student: {s.student?.name} ({s.student?.email}) | </>}
              Course: {s.course?.title} | Submitted {fmtDate(s.submittedAt)}
            </p>
            <p style={{ whiteSpace: 'pre-wrap' }}>{s.content}</p>
            {s.fileUrl && <p><a href={s.fileUrl} target="_blank" rel="noreferrer">Attached link</a></p>}
            {s.status === 'EVALUATED' && <p>Marks: <strong>{s.marks}/{s.assignment?.maxMarks}</strong>{s.feedback && <> - {s.feedback}</>}</p>}
            {canEvaluate && <EvaluateForm submission={s} onDone={state.reload} />}
          </div>
        ))}
      </Async>
      <Pagination meta={state.meta} onPage={setPage} />
    </>
  );
}
