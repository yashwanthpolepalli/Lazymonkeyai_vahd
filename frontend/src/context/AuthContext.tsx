import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { User, Role } from '@/types';
import { api } from '@/services/api';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string, role?: string) => Promise<User>;
  signup: (data: { full_name: string; email: string; password: string; phone?: string; gym_name?: string }) => Promise<User>;
  updateUser: (data: Partial<User>) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('fitclub_token');
    if (token) {
      api.auth.me()
        .then((u) => {
          if (u) {
            setUser(u);
            localStorage.setItem('fitclub_user', JSON.stringify(u));
          } else {
            logout();
          }
        })
        .catch(() => {
          logout();
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      const stored = localStorage.getItem('fitclub_user');
      if (stored) {
        try { setUser(JSON.parse(stored)); } catch (_err) { /* ignore */ }
      }
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string, role?: string) => {
    const u = await api.auth.login(email, password, role);
    setUser(u);
    localStorage.setItem('fitclub_user', JSON.stringify(u));
    if (!localStorage.getItem('fitclub_token')) {
      localStorage.setItem('fitclub_token', `token_${u.id}_${Date.now()}`);
    }
    return u;
  };

  const signup = async (data: { full_name: string; email: string; password: string; phone?: string; gym_name?: string }) => {
    const u = await api.auth.signup(data);
    setUser(u);
    localStorage.setItem('fitclub_user', JSON.stringify(u));
    if (!localStorage.getItem('fitclub_token')) {
      localStorage.setItem('fitclub_token', `token_${u.id}_${Date.now()}`);
    }
    return u;
  };

  const updateUser = (data: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...data };
      localStorage.setItem('fitclub_user', JSON.stringify(updated));
      return updated;
    });
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('fitclub_user');
    localStorage.removeItem('fitclub_token');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, updateUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export type { Role };
