import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '../api/services';
import { setAuthFailureHandler, tokenStore } from '../api/client';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!tokenStore.get()); // restoring session

  const clearSession = useCallback(() => { tokenStore.clear(); setUser(null); }, []);

  useEffect(() => {
    setAuthFailureHandler(clearSession);
    if (!tokenStore.get()) return;
    authApi.me().then((r) => setUser(r.data)).catch(clearSession).finally(() => setLoading(false));
  }, [clearSession]);

  const login = async (credentials) => {
    const res = await authApi.login(credentials);
    tokenStore.set({ accessToken: res.data.accessToken, refreshToken: res.data.refreshToken });
    setUser(res.data.user);
  };
  const register = async (body) => {
    const res = await authApi.register(body);
    tokenStore.set({ accessToken: res.data.accessToken, refreshToken: res.data.refreshToken });
    setUser(res.data.user);
  };
  const logout = async () => {
    await authApi.logout(tokenStore.get()?.refreshToken);
    clearSession();
  };

  const value = useMemo(() => ({ user, loading, login, register, logout }), [user, loading]); // eslint-disable-line
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
