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
    let foundUser: User | null = null;
    try {
      const storedUserString = localStorage.getItem('authUser');
      if (storedUserString) {
        const parsedUser = JSON.parse(storedUserString);
        // Validate the parsed user object
        if (parsedUser && typeof parsedUser.id === 'string' &&
            (parsedUser.role === 'instructor' || parsedUser.role === 'student')) {
          foundUser = parsedUser as User;
        } else {
          console.warn('Invalid user data in localStorage. Clearing authUser.');
          localStorage.removeItem('authUser');
        }
      }
    } catch (error) {
      console.error("Error processing authUser from localStorage:", error);
      localStorage.removeItem('authUser'); // Clear corrupted data
    }
    
    setUser(foundUser); // Set user (or null if not found/invalid)
    setIsLoading(false); // Indicate loading is complete
  }, []); // Empty dependency array ensures this runs once on mount

  const login = useCallback((id: string, role: 'instructor' | 'student') => {
    const userData = { id, role };
    localStorage.setItem('authUser', JSON.stringify(userData));
    setUser(userData);
    // Redirection will be handled by the useEffect below
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('authUser');
    setUser(null);
    // Redirection will be handled by the useEffect below
  }, []);

  // Effect to handle route protection and redirection
  useEffect(() => {
    if (isLoading) return; // Don't do anything while loading auth state

    const publicPaths = ['/login'];
    const isPublicPath = publicPaths.includes(pathname);

    if (!user && !isPublicPath) {
      // If no user and not on a public path, redirect to login
      router.replace('/login');
    } else if (user && isPublicPath) {
      // If user exists and is on a public path (e.g. login page), redirect to their dashboard
      if (user.role === 'instructor') {
        router.replace('/');
      } else {
        router.replace('/student/dashboard');
      }
    } else if (user && pathname === '/' && user.role === 'student') {
        // If student tries to access instructor dashboard
        router.replace('/student/dashboard');
    } else if (user && pathname === '/student/dashboard' && user.role === 'instructor') {
        // If instructor tries to access student dashboard
        router.replace('/');
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

