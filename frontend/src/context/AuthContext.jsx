import { createContext, useContext, useEffect, useState } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }

    api.get('/api/auth/me')
      .then(({ data }) => {
        setUser(data);
      })
      .catch(() => {
        localStorage.removeItem('token');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const login = async (credentials) => {
    if (credentials?.token) {
      localStorage.setItem('token', credentials.token);
      setUser(credentials);
      return credentials;
    }

    const { data } = await api.post('/api/auth/login', credentials);
    localStorage.setItem('token', data.token);
    setUser(data);
    return data;
  };

  const signup = async (userData) => {
    if (userData?.token) {
      localStorage.setItem('token', userData.token);
      setUser(userData);
      return userData;
    }

    const { data } = await api.post('/api/auth/signup', userData);
    if (data.token) {
      localStorage.setItem('token', data.token);
      setUser(data);
    }
    return data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const updateUser = (updates) => {
    setUser((prev) => ({ ...prev, ...updates }));
  };

  const refreshUser = async () => {
    const { data } = await api.get('/api/auth/me');
    setUser(data);
    return data;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, updateUser, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
