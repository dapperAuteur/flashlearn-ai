// components/providers/TempAuthProvider.tsx
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Define user and auth context types
interface User {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
}

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthContextType {
  user: User | null;
  status: AuthStatus;
  signIn: (credentials: { email: string; password: string }) => Promise<boolean>;
  signOut: () => void;
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider component
export function TempAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  // Check for existing session on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
        setStatus('authenticated');
      } catch (error) {
        console.error('Failed to parse stored user:', error);
        setStatus('unauthenticated');
      }
    } else {
      setStatus('unauthenticated');
    }
  }, []);

  // Sign in function
  const signIn = async (credentials: { email: string; password: string }) => {
    // For demo, just check if email is test@example.com
    if (credentials.email === 'test@example.com') {
      const user = {
        id: '1',
        name: 'Test User',
        email: credentials.email,
        role: 'free',
      };
      
      // Store user in localStorage for persistence
      localStorage.setItem('user', JSON.stringify(user));
      
      // Update state
      setUser(user);
      setStatus('authenticated');
      return true;
    }
    
    return false;
  };

  // Sign out function
  const signOut = () => {
    localStorage.removeItem('user');
    setUser(null);
    setStatus('unauthenticated');
  };

  return (
    <AuthContext.Provider value={{ user, status, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook for using auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within a TempAuthProvider');
  }
  return context;
}