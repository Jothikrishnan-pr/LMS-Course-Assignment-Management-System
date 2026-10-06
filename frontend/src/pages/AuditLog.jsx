import { useState } from 'react';
import useFetch from '../hooks/useFetch';
import { auditApi } from '../api/services';
import { Async, Pagination, fmtDate } from '../components/ui';

export default function AuditLog() {
  const [page, setPage] = useState(1);
  const state = useFetch(() => auditApi.list({ page, limit: 15 }), [page]);
  return (
    <>
      <h2>Audit History</h2>
      <Async state={state} empty="No activity recorded yet.">
        {(logs) => (
          <table>
            <thead><tr><th>When</th><th>User</th><th>Action</th><th>Entity</th></tr></thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l._id}><td>{fmtDate(l.createdAt)}</td><td>{l.actor ? `${l.actor.name} (${l.actor.role})` : '-'}</td><td>{l.action}</td><td>{l.entity}</td></tr>
              ))}
            </tbody>
          </table>
        )}
      </Async>
      <Pagination meta={state.meta} onPage={setPage} />
    </>
  );
}
