import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import useFetch from '../hooks/useFetch';
import { assignmentsApi, coursesApi, submissionsApi } from '../api/services';
import { ErrorMessage, Loader } from '../components/ui';

export default function Dashboard() {
  const { user } = useAuth();
  const stats = useFetch(async () => {
    const [courses, assignments, submissions] = await Promise.all([
      coursesApi.mine({ limit: 1 }), assignmentsApi.list({ limit: 1 }), submissionsApi.list({ limit: 1 }),
    ]);
    return { data: { courses: courses.meta.total, assignments: assignments.meta.total, submissions: submissions.meta.total } };
  });
  const labels = {
    STUDENT: ['Enrolled courses', 'Assignments', 'My submissions'],
    TRAINER: ['My courses', 'My assignments', 'Student submissions'],
    ADMIN: ['All courses', 'All assignments', 'All submissions'],
  }[user.role];

  return (
    <>
      <h2>Welcome, {user.name}</h2>
      <p className="muted">Role: {user.role}</p>
      {stats.loading && <Loader />}
      <ErrorMessage message={stats.error} onRetry={stats.reload} />
      {stats.data && (
        <div className="grid">
          {[['courses', '/my-courses'], ['assignments', '/assignments'], ['submissions', '/submissions']].map(([k, to], i) => (
            <Link key={k} to={to} className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="stat">{stats.data[k]}</div><div className="muted">{labels[i]}</div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
