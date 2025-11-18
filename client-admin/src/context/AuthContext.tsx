'use client'

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api, setAuthToken } from '@/lib/api';

interface AuthContextType {
  user: any;
  token: string | null;
  companyId: string | null;
  company: any | null;
  login: (email: string, password: string) => Promise<void>;
  loginAdmin: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [company, setCompany] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Restore session from localStorage
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    const storedCompany = localStorage.getItem('company');
    if (storedToken) {
      setToken(storedToken);
      setAuthToken(storedToken);
    }
    if (storedUser) {
      const userData = JSON.parse(storedUser);
      setUser(userData);
      setCompanyId(userData.companyId);
    }
    if (storedCompany) {
      try {
        setCompany(JSON.parse(storedCompany));
      } catch {
        // ignore parse errors
      }
    }
    setIsLoading(false);
  }, []);

  // Helper to fetch company info by ID
  const fetchCompanyById = async (id: string) => {
    try {
      const res = await api.get(`/companies/${id}/getcompanybyId`);
      setCompany(res.data);
      localStorage.setItem('company', JSON.stringify(res.data));
    } catch (err) {
      // If fetching fails, clear any stale company info
      setCompany(null);
      localStorage.removeItem('company');
    }
  };

  // When we have both token and companyId (e.g., after restore), fetch company if missing
  useEffect(() => {
    if (token && companyId && !company) {
      fetchCompanyById(companyId);
    }
  }, [token, companyId]);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      setToken(res.data.token);
      setUser(res.data.user);
      setCompanyId(res.data.user.companyId);
      setAuthToken(res.data.token);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      if (res.data.user?.companyId) {
        await fetchCompanyById(res.data.user.companyId);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loginAdmin = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await api.post('/auth/admin-login', { email, password });
      setToken(res.data.token);
      setUser(res.data.user);
      setCompanyId(res.data.user.companyId);
      setAuthToken(res.data.token);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      if (res.data.user?.companyId) {
        await fetchCompanyById(res.data.user.companyId);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setCompanyId(null);
    setCompany(null);
    setAuthToken();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('company');
    window.location.href = '/';
  };

  return (
    <AuthContext.Provider value={{ user, token, companyId, company, login, loginAdmin, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}; 