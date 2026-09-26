import { create } from 'zustand';
import { api } from '@/lib/api';

export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  displayName?: string;
  avatarUrl?: string;
  coverImageUrl?: string;
  bio?: string;
  level?: number;
  studentId?: string;
  matricNo?: string;
  interests: string[];
  skills: string[];
  faculty?: { id: string; name: string; shortName?: string };
  department?: { id: string; name: string; shortName?: string };
  programme?: { id: string; name: string; shortName?: string };
}

export interface AuthUser {
  id: string;
  email: string;
  role: 'STUDENT' | 'UNIVERSITY_ADMIN' | 'SUPER_ADMIN';
  verificationStatus: 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED';
  isEmailVerified: boolean;
  institutionId: string;
  profile: UserProfile | null;
  institution?: {
    id: string;
    name: string;
    slug: string;
    shortName?: string;
    logoUrl?: string;
  };
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (user: AuthUser, token: string, refreshToken: string) => void;
  logout: () => void;
  fetchCurrentUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,

  setAuth: (user, token, refreshToken) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('interakt_token', token);
      localStorage.setItem('interakt_refresh_token', refreshToken);
    }
    set({ user, token, isAuthenticated: true, isLoading: false });
  },

  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('interakt_token');
      localStorage.removeItem('interakt_refresh_token');
    }
    set({ user: null, token: null, isAuthenticated: false, isLoading: false });
  },

  fetchCurrentUser: async () => {
    try {
      const res = await api.get('/auth/me');
      if (res.data?.success && res.data?.data) {
        const token = typeof window !== 'undefined' ? localStorage.getItem('interakt_token') : null;
        set({
          user: res.data.data,
          token,
          isAuthenticated: true,
          isLoading: false,
        });
        return res.data.data;
      }
    } catch {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('interakt_token');
        localStorage.removeItem('interakt_refresh_token');
      }
      set({ user: null, token: null, isAuthenticated: false, isLoading: false });
      return null;
    }
  },
}));
