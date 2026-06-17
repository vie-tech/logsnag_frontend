import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { User } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('rp_token'));
  const [user, setUser] = useState<User | null>(() => {
    try {
      const u = localStorage.getItem('rp_user');
      return u ? (JSON.parse(u) as User) : null;
    } catch {
      return null;
    }
  });

  const saveAuth = (t: string, u: User) => {
    localStorage.setItem('rp_token', t);
    localStorage.setItem('rp_user', JSON.stringify(u));
    setToken(t);
    setUser(u);
  };

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json() as { token?: string; user?: User; error?: string };
    if (!res.ok) throw new Error(data.error || 'Login failed');
    saveAuth(data.token!, data.user!);
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json() as { token?: string; user?: User; error?: string };
    if (!res.ok) throw new Error(data.error || 'Registration failed');
    saveAuth(data.token!, data.user!);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('rp_token');
    localStorage.removeItem('rp_user');
    localStorage.removeItem('rp_active_project');
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}