'use client';

import type { ReactNode } from 'react';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface User {
  id: string;
  role: 'instructor' | 'student';
}

interface AuthContextType {
  user: User | null;
  login: (id: string, role: 'instructor' | 'student') => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('authUser');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error("Failed to parse authUser from localStorage", error);
      localStorage.removeItem('authUser'); // Clear corrupted data
    }
    setIsLoading(false);
  }, []);

  const login = useCallback((id: string, role: 'instructor' | 'student') => {
    const userData = { id, role };
    localStorage.setItem('authUser', JSON.stringify(userData));
    setUser(userData);
    if (role === 'instructor') {
      router.push('/');
    } else {
      router.push('/student/dashboard');
    }
  }, [router]);

  const logout = useCallback(() => {
    localStorage.removeItem('authUser');
    setUser(null);
    router.push('/login');
  }, [router]);

  // Effect to handle route protection and redirection
  useEffect(() => {
    if (isLoading) return; // Don't do anything while loading auth state

    const publicPaths = ['/login'];
    const isPublicPath = publicPaths.includes(pathname);

    if (!user && !isPublicPath) {
      // If no user and not on a public path, redirect to login
      router.push('/login');
    } else if (user && isPublicPath) {
      // If user exists and is on a public path (e.g. login page), redirect to their dashboard
      if (user.role === 'instructor') {
        router.push('/');
      } else {
        router.push('/student/dashboard');
      }
    } else if (user && pathname === '/' && user.role === 'student') {
        // If student tries to access instructor dashboard
        router.push('/student/dashboard');
    } else if (user && pathname === '/student/dashboard' && user.role === 'instructor') {
        // If instructor tries to access student dashboard
        router.push('/');
    }

  }, [user, isLoading, pathname, router]);


  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
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
