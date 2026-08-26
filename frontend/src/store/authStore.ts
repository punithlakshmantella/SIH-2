import { create } from 'zustand';
import { User, AuthState, UserRole } from '../types';

export const useAuthStore = create<AuthState>((set, get) => {
  // Load initial state from localStorage
  const savedToken = localStorage.getItem('cityvision_token');
  const savedUser = localStorage.getItem('cityvision_user');

  let initialUser: User | null = null;
  if (savedUser) {
    try {
      initialUser = JSON.parse(savedUser);
    } catch {
      initialUser = null;
    }
  }

  return {
    token: savedToken,
    user: initialUser,
    isAuthenticated: !!savedToken && !!initialUser,

    login: (token: string, user: User) => {
      localStorage.setItem('cityvision_token', token);
      localStorage.setItem('cityvision_user', JSON.stringify(user));
      set({ token, user, isAuthenticated: true });
    },

    logout: () => {
      localStorage.removeItem('cityvision_token');
      localStorage.removeItem('cityvision_user');
      set({ token: null, user: null, isAuthenticated: false });
    },
  };
});

// Helper for checking role access
export const hasRole = (user: User | null, allowedRoles?: UserRole[]): boolean => {
  if (!user) return false;
  if (user.role === 'System Administrator') return true; // Superuser override
  if (!allowedRoles || allowedRoles.length === 0) return true;
  return allowedRoles.includes(user.role);
};
