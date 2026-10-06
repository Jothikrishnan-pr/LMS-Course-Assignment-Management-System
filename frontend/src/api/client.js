import axios from 'axios';

const baseURL = (import.meta.env.VITE_API_URL || '') + '/api';
const KEY = 'lms_auth';

export const tokenStore = {
  get: () => { try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; } },
  set: (v) => localStorage.setItem(KEY, JSON.stringify(v)),
  clear: () => localStorage.removeItem(KEY),
};

const api = axios.create({ baseURL });
let onAuthFailure = () => {};
export const setAuthFailureHandler = (fn) => { onAuthFailure = fn; };

api.interceptors.request.use((config) => {
  const auth = tokenStore.get();
  if (auth?.accessToken) config.headers.Authorization = `Bearer ${auth.accessToken}`;
  return config;
});

// Single in-flight refresh shared by all concurrent 401s.
let refreshPromise = null;
const refreshTokens = () => {
  if (!refreshPromise) {
    const auth = tokenStore.get();
    refreshPromise = axios
      .post(`${baseURL}/auth/refresh`, { refreshToken: auth?.refreshToken })
      .then((res) => { tokenStore.set(res.data.data); return res.data.data; })
      .finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
};

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const code = error.response?.data?.code;
    const isAuthRoute = original?.url?.startsWith('/auth/');
    const canRefresh = error.response?.status === 401 && !original._retry && !isAuthRoute && tokenStore.get()?.refreshToken;
    if (canRefresh && ['TOKEN_EXPIRED', 'INVALID_TOKEN'].includes(code)) {
      original._retry = true;
      try {
        await refreshTokens();
        return api(original);
      } catch {
        tokenStore.clear();
        onAuthFailure();
      }
    } else if (error.response?.status === 401 && !isAuthRoute) {
      tokenStore.clear();
      onAuthFailure();
    }
    return Promise.reject(error);
  }
);

// Normalise any error into a user-friendly message.
export const getErrorMessage = (err) => {
  const d = err.response?.data;
  if (d?.details?.length) return d.details.map((x) => `${x.field}: ${x.message}`).join('; ');
  if (d?.message) return d.message;
  if (err.code === 'ERR_NETWORK') return 'Cannot reach the server. Please try again.';
  return err.message || 'Something went wrong';
};

export default api;
