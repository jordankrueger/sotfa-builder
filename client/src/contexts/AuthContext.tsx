import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi } from '../utils/api';

interface User {
  id: number;
  username: string;
  email: string;
  displayName: string;
  role: 'admin' | 'ship_contributor' | 'taskforce_lead' | 'reviewer';
  shipAssignment?: string;
  taskforceAssignment?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isAdmin: boolean;
  canEdit: (sectionType: string, sectionKey?: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const token = localStorage.getItem('sotfa_token');
    const savedUser = localStorage.getItem('sotfa_user');

    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
      // Verify token is still valid
      authApi.me()
        .then((res) => setUser(res.data.user))
        .catch(() => {
          localStorage.removeItem('sotfa_token');
          localStorage.removeItem('sotfa_user');
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (username: string, password: string) => {
    const response = await authApi.login(username, password);
    const { user, token } = response.data;

    localStorage.setItem('sotfa_token', token);
    localStorage.setItem('sotfa_user', JSON.stringify(user));
    setUser(user);
  };

  const logout = () => {
    localStorage.removeItem('sotfa_token');
    localStorage.removeItem('sotfa_user');
    setUser(null);
  };

  const isAdmin = user?.role === 'admin';

  const canEdit = (sectionType: string, sectionKey?: string): boolean => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    if (user.role === 'reviewer') return false;

    if (user.role === 'ship_contributor' && sectionType === 'ship_report') {
      // Check if user's ship assignment matches
      if (sectionKey && user.shipAssignment) {
        return sectionKey.toLowerCase().includes(user.shipAssignment.toLowerCase().replace(/\s+/g, '_'));
      }
    }

    if (user.role === 'taskforce_lead' && sectionType === 'taskforce') {
      if (sectionKey && user.taskforceAssignment) {
        return sectionKey.toLowerCase().includes(user.taskforceAssignment.toLowerCase());
      }
    }

    return false;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAdmin, canEdit }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
