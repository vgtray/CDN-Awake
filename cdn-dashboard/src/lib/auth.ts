import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AdminUser } from '@/types';
import { api } from './api';

interface AuthState {
  user: AdminUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Actions
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  loadSession: () => void;
  setUser: (user: AdminUser | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,

      login: async (username: string, password: string) => {
        try {
          const response = await api.login(username, password);
          if (response.success) {
            set({
              user: response.data.user,
              isAuthenticated: true,
              isLoading: false,
            });
            return true;
          }
          return false;
        } catch {
          return false;
        }
      },

      logout: async () => {
        await api.logout();
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
      },

      loadSession: () => {
        const token = api.loadToken();
        if (token && typeof window !== 'undefined') {
          const userStr = localStorage.getItem('admin_user');
          if (userStr) {
            try {
              const user = JSON.parse(userStr);
              set({
                user,
                isAuthenticated: true,
                isLoading: false,
              });
              return;
            } catch {
              // Invalid user data
            }
          }
        }
        set({ isLoading: false });
      },

      setUser: (user) => {
        set({ user, isAuthenticated: !!user });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ 
        user: state.user,
        isAuthenticated: state.isAuthenticated 
      }),
    }
  )
);

// Helper hook for superadmin check
export const useIsSuperadmin = () => {
  const user = useAuthStore((state) => state.user);
  return user?.role === 'superadmin';
};
