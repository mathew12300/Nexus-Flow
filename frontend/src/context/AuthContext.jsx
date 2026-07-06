import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { authApi } from '../lib/endpoints';
import { tokenStore } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function bootstrap() {
      if (!tokenStore.getAccess()) {
        const localGuest = localStorage.getItem('nexusflow_guest_user');
        if (localGuest) {
          setUser(JSON.parse(localGuest));
        } else {
          const defaultGuest = {
            id: 'guest-user-id',
            email: 'guest@nexusflow.dev',
            full_name: 'Guest User',
            display_name: 'Guest'
          };
          localStorage.setItem('nexusflow_guest_user', JSON.stringify(defaultGuest));
          setUser(defaultGuest);
        }
        setLoading(false);
        return;
      }
      try {
        const me = await authApi.me();
        setUser(me);
      } catch {
        tokenStore.clear();
      } finally {
        setLoading(false);
      }
    }
    bootstrap();
  }, []);

  const login = useCallback(async (credentials) => {
    await authApi.login(credentials);
    const me = await authApi.me();
    setUser(me);
    return me;
  }, []);

  const register = useCallback(async (payload) => {
    await authApi.register(payload);
    return login({ email: payload.email, password: payload.password });
  }, [login]);

  const logout = useCallback(() => {
    authApi.logout();
    const defaultGuest = {
      id: 'guest-user-id',
      email: 'guest@nexusflow.dev',
      full_name: 'Guest User',
      display_name: 'Guest'
    };
    localStorage.setItem('nexusflow_guest_user', JSON.stringify(defaultGuest));
    setUser(defaultGuest);
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
