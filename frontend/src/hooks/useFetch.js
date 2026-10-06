import { useCallback, useEffect, useRef, useState } from 'react';
import { getErrorMessage } from '../api/client';

// Generic data-loading hook: { data, meta, loading, error, reload }.
export default function useFetch(fn, deps = []) {
  const [state, setState] = useState({ data: null, meta: null, loading: true, error: '' });
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: '' }));
    try {
      const res = await fnRef.current();
      setState({ data: res.data, meta: res.meta || null, loading: false, error: '' });
    } catch (err) {
      setState({ data: null, meta: null, loading: false, error: getErrorMessage(err) });
    }
  }, []); // eslint-disable-line

  useEffect(() => { load(); }, [load, ...deps]); // eslint-disable-line
  return { ...state, reload: load };
}
