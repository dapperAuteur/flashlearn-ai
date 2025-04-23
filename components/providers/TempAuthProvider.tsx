// components/providers/TempAuthProvider.tsx
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Define user and auth context types
interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthContextType {
  user: User | null;
  status: AuthStatus;
  signIn: (credentials: { email: string; password: string }) => Promise<{ success: boolean; error?: string }>;
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
    // Check if we're in a browser environment
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
          setStatus('authenticated');
        } catch (error) {
          console.error('Failed to parse stored user:', error);
          localStorage.removeItem('user');
          setStatus('unauthenticated');
        }
      } else {
        setStatus('unauthenticated');
      }
    }
  }, []);

  // Sign in function
  const signIn = async (credentials: { email: string; password: string }) => {
    try {
      console.log('Attempting to sign in with:', credentials.email);
      
      // For demo, accept a test user
      if (credentials.email === 'test@example.com') {
        const newUser = {
          id: '1',
          name: 'Test User',
          email: credentials.email,
          role: 'free',
        };
        
        // Store user in localStorage for persistence
        localStorage.setItem('user', JSON.stringify(newUser));
        
        // Update state
        setUser(newUser);
        setStatus('authenticated');
        return { success: true };
      }
      
      return { success: false, error: 'Invalid email or password' };
    } catch (error) {
      console.error('Sign in error:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
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