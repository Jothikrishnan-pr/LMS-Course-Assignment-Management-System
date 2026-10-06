import { Link } from 'react-router-dom';

// Skeleton placeholder while data loads (keeps layout stable, feels faster than text).
export const Loader = ({ text = 'Loading...' }) => (
  <div aria-busy="true" role="status">
    <span className="sr">{text}</span>
    {[0, 1, 2].map((i) => (
      <div className="card" key={i}><div className="sk w35" /><div className="sk" /><div className="sk w60" /></div>
    ))}
  </div>
);
export const ErrorMessage = ({ message, onRetry }) =>
  message ? (
    <div className="alert error" role="alert">
      {message} {onRetry && <button className="link" onClick={onRetry}>Retry</button>}
    </div>
  ) : null;
export const Success = ({ message }) => (message ? <div className="alert success" role="status">{message}</div> : null);
export const Empty = ({ text }) => <div className="empty">{text}</div>;
export const Badge = ({ children, kind = '' }) => <span className={`badge ${kind}`}>{children}</span>;
export const fmtDate = (d) => (d ? new Date(d).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '-');

export function Pagination({ meta, onPage }) {
  if (!meta || meta.totalPages <= 1) return null;
  return (
    <div className="pager">
      <button disabled={meta.page <= 1} onClick={() => onPage(meta.page - 1)}>Prev</button>
      <span className="muted">Page {meta.page} of {meta.totalPages} ({meta.total} items)</span>
      <button disabled={meta.page >= meta.totalPages} onClick={() => onPage(meta.page + 1)}>Next</button>
    </div>
  );
}

// Handles loading / error / empty states for list pages.
export function Async({ state, empty = 'Nothing to show.', children }) {
  if (state.loading && !state.data) return <Loader />;
  if (state.error) return <ErrorMessage message={state.error} onRetry={state.reload} />;
  if (Array.isArray(state.data) && !state.data.length) return <Empty text={empty} />;
  return children(state.data);
}

export const CourseLink = ({ course }) => (course ? <Link to={`/courses/${course._id || course}`}>{course.title || 'Course'}</Link> : '-');
