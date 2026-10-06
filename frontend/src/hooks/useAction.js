import { useState } from 'react';
import { getErrorMessage } from '../api/client';

// Wraps a mutation with busy/error/success state.
export default function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const run = async (fn, successMsg = '') => {
    setBusy(true); setError(''); setSuccess('');
    try {
      const res = await fn();
      setSuccess(successMsg);
      return res;
    } catch (err) {
      setError(getErrorMessage(err));
      return null;
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, success, run, reset: () => { setError(''); setSuccess(''); } };
}
