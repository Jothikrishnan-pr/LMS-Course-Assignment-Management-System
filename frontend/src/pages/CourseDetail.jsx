import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import useFetch from '../hooks/useFetch';
import useAction from '../hooks/useAction';
import { assignmentsApi, coursesApi } from '../api/services';
import { Async, Badge, ErrorMessage, Loader, Success, fmtDate } from '../components/ui';
import AssignmentForm from '../components/AssignmentForm';

export default function CourseDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const course = useFetch(() => coursesApi.get(id), [id]);
  const isOwner = user.role === 'ADMIN' || (user.role === 'TRAINER' && course.data?.trainer?._id === user._id);
  const canSeeAssignments = isOwner || course.data?.isEnrolled;
  const assignments = useFetch(
    () => (canSeeAssignments ? assignmentsApi.byCourse(id) : Promise.resolve({ data: [] })),
    [id, canSeeAssignments]
  );
  const students = useFetch(() => (isOwner ? coursesApi.enrollments(id) : Promise.resolve({ data: [] })), [id, isOwner]);
  const action = useAction();
  const [showForm, setShowForm] = useState(false);

  if (course.loading && !course.data) return <Loader />;
  if (course.error) return <ErrorMessage message={course.error} onRetry={course.reload} />;
  const c = course.data;

  const enroll = async () => { if (await action.run(() => coursesApi.enroll(id), 'Enrolled successfully')) course.reload(); };
  const removeAssignment = async (aid) => {
    if (!window.confirm('Delete this assignment and its submissions?')) return;
    if (await action.run(() => assignmentsApi.remove(aid), 'Assignment deleted')) assignments.reload();
  };

  return (
    <>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>{c.title}</h2>
        <p>{c.description}</p>
        <p className="muted">Trainer: {c.trainer?.name} | Enrolled students: {c.enrolledCount}</p>
        {user.role === 'STUDENT' && (c.isEnrolled ? <Badge kind="green">Enrolled</Badge> : <button disabled={action.busy} onClick={enroll}>Enroll</button>)}
      </div>
      <ErrorMessage message={action.error} />
      <Success message={action.success} />

      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h3>Assignments</h3>
        {isOwner && <button onClick={() => setShowForm((s) => !s)}>{showForm ? 'Close' : 'New assignment'}</button>}
      </div>
      {showForm && <AssignmentForm courseId={id} onCreated={() => { setShowForm(false); assignments.reload(); }} />}
      {!canSeeAssignments && <p className="muted">Enroll in this course to view its assignments.</p>}
      {canSeeAssignments && (
        <Async state={assignments} empty="No assignments yet.">
          {(list) => list.map((a) => (
            <div className="card" key={a._id}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <strong>{a.title}</strong>
                <span className="muted">Due {fmtDate(a.dueDate)} | Max marks {a.maxMarks}</span>
              </div>
              <p>{a.description}</p>
              {a.mySubmission && <Badge kind={a.mySubmission.status === 'EVALUATED' ? 'green' : 'orange'}>{a.mySubmission.status}</Badge>}
              {isOwner && <button className="danger" onClick={() => removeAssignment(a._id)}>Delete</button>}
            </div>
          ))}
        </Async>
      )}

      {isOwner && (
        <>
          <h3>Enrolled students</h3>
          <Async state={students} empty="No students enrolled yet.">
            {(list) => (
              <table><thead><tr><th>Name</th><th>Email</th><th>Enrolled</th></tr></thead>
                <tbody>{list.map((e) => <tr key={e._id}><td>{e.student?.name}</td><td>{e.student?.email}</td><td>{fmtDate(e.createdAt)}</td></tr>)}</tbody></table>
            )}
          </Async>
        </>
      )}
    </>
  );
}
