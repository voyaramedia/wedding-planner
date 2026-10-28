import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, CoupleRegistrationPayload } from '../types/index.ts';
import { api, getStoredToken, setStoredToken, clearStoredToken } from '../lib/api.ts';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<User>;
  registerCouple: (data: CoupleRegistrationPayload) => Promise<{ user: User; weddingId: string }>;
  register: (data: {
    name: string;
    mobile: string;
    email?: string;
    password: string;
    role: string;
    relation?: string;
    groomName?: string;
    brideName?: string;
  }) => Promise<User>;
  logout: () => Promise<void>;
  updateCurrentUser: (updated: Partial<User>) => void;
  canEditBudget: boolean;
  canManageVendors: boolean;
  canManageTasks: boolean;
  canManageGuests: boolean;
  canEditEvents: boolean;
  canManageUsers: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(getStoredToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const initAuth = async () => {
      const stored = getStoredToken();
      if (!stored) {
        setIsLoading(false);
        return;
      }
      try {
        const res = await api.getMe();
        setUser(res.user);
        setToken(stored);
      } catch (err) {
        console.warn('Session verification failed, clearing token');
        clearStoredToken();
        setUser(null);
        setToken(null);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (identifier: string, password: string): Promise<User> => {
    setIsLoading(true);
    try {
      const res = await api.login(identifier, password);
      setStoredToken(res.token);
      setToken(res.token);
      setUser(res.user);
      return res.user;
    } finally {
      setIsLoading(false);
    }
  };

  const registerCouple = async (data: CoupleRegistrationPayload): Promise<{ user: User; weddingId: string }> => {
    setIsLoading(true);
    try {
      const res = await api.registerCouple(data);
      setStoredToken(res.token);
      setToken(res.token);
      setUser(res.user);
      return { user: res.user, weddingId: res.weddingId };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: {
    name: string;
    mobile: string;
    email?: string;
    password: string;
    role: string;
    relation?: string;
    groomName?: string;
    brideName?: string;
  }): Promise<User> => {
    setIsLoading(true);
    try {
      const res = await api.register(data);
      setStoredToken(res.token);
      setToken(res.token);
      setUser(res.user);
      return res.user;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await api.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      clearStoredToken();
      setUser(null);
      setToken(null);
      setIsLoading(false);
    }
  };

  const updateCurrentUser = (updated: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...updated });
    }
  };

  const isAdmin = user?.role === 'admin';
  const isGroomOrBride = user?.role === 'groom' || user?.role === 'bride';

  const canEditBudget = isAdmin || isGroomOrBride || !!user?.permissions?.canEditBudget;
  const canManageVendors = isAdmin || isGroomOrBride || !!user?.permissions?.canManageVendors;
  const canManageTasks = isAdmin || isGroomOrBride || !!user?.permissions?.canManageTasks;
  const canManageGuests = isAdmin || isGroomOrBride || !!user?.permissions?.canManageGuests;
  const canEditEvents = isAdmin || isGroomOrBride || !!user?.permissions?.canEditEvents;
  const canManageUsers = isAdmin || !!user?.permissions?.canManageUsers;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        registerCouple,
        register,
        logout,
        updateCurrentUser,
        canEditBudget,
        canManageVendors,
        canManageTasks,
        canManageGuests,
        canEditEvents,
        canManageUsers,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
