import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { api } from '../api/client';
import { connectSocket, disconnectSocket } from '../socket';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => api.getUser());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && api.getToken()) {
      connectSocket(api.getToken());
    }
    return () => disconnectSocket();
  }, [user]);

  const setAuth = useCallback((data) => {
    api.setAuth(data.token, data);
    setUser(data);
  }, []);

  const logout = useCallback(() => {
    api.clearAuth();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const me = await api.request('/api/auth/me');
      api.setAuth(api.getToken(), me);
      setUser(me);
    } catch {
      // token invalid -> clear
      api.clearAuth();
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, setAuth, logout, refreshUser, loading, setLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
