import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { apiRequest } from './api';

export type AuthUser = {
  id: string;
  username: string;
  displayName: string;
  email: string;
  avatarUrl?: string | null;
  bio?: string | null;
};

type AuthResponse = {
  success: boolean;
  message?: string;
  data: { user: AuthUser | null; token?: string };
};

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  error: string;
  updateUser: (user: AuthUser) => void;
  login: (values: { identifier: string; password: string }) => Promise<string>;
  register: (values: {
    username: string;
    email: string;
    password: string;
    securityQuestion?: string;
    securityAnswer?: string;
  }) => Promise<string>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiRequest<AuthResponse>('/auth/me')
      .then((response) => {
        if (!response.data.user) {
          localStorage.removeItem('bmf_token');
        }
        setUser(response.data.user);
      })
      .catch((reason: unknown) => {
        localStorage.removeItem('bmf_token');
        setError(reason instanceof Error ? reason.message : 'Impossible de vérifier la session.');
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (values: { identifier: string; password: string }) => {
    const response = await apiRequest<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(values),
    });
    if (!response.data.user) throw new Error('La réponse de connexion ne contient pas de compte.');
    if (response.data.token) {
      localStorage.setItem('bmf_token', response.data.token);
    }
    setUser(response.data.user);
    setError('');
    return response.message ?? 'Connexion réussie.';
  };

  const register = async (values: {
    username: string;
    email: string;
    password: string;
    securityQuestion?: string;
    securityAnswer?: string;
  }) => {
    const response = await apiRequest<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(values),
    });
    if (!response.data.user) throw new Error('La réponse de création ne contient pas de compte.');
    if (response.data.token) {
      localStorage.setItem('bmf_token', response.data.token);
    }
    setUser(response.data.user);
    setError('');
    return response.message ?? 'Compte créé avec succès.';
  };

  const logout = async () => {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } finally {
      localStorage.removeItem('bmf_token');
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, updateUser: setUser, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth doit être utilisé dans AuthProvider.');
  return context;
}
