import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import useFetch from '../hooks/useFetch';
import { coursesApi } from '../api/services';
import { Async, Pagination } from '../components/ui';

export default function MyCourses() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const state = useFetch(() => coursesApi.mine({ page, limit: 6 }), [page]);
  return (
    <>
      <h2>My Courses</h2>
      <Async state={state} empty={user.role === 'STUDENT' ? "You haven't enrolled in any course yet." : 'No courses yet.'}>
        {(courses) => (
          <div className="grid">
            {courses.map((c) => (
              <div className="card" key={c._id}>
                <h3 style={{ marginTop: 0 }}><Link to={`/courses/${c._id}`}>{c.title}</Link></h3>
                <p className="muted">Trainer: {c.trainer?.name}</p>
              </div>
            ))}
          </div>
        )}
      </Async>
      <Pagination meta={state.meta} onPage={setPage} />
    </>
  );
}
