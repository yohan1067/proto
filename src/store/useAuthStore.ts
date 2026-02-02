import { create } from 'zustand';
import { type Session } from '@supabase/supabase-js';

interface AuthState {
  session: Session | null;
  isAdmin: boolean;
  nickname: string | null;
  isLoggingIn: boolean;
  isInitialLoading: boolean;
  setSession: (session: Session | null) => void;
  setIsAdmin: (isAdmin: boolean) => void;
  setNickname: (nickname: string | null) => void;
  setIsLoggingIn: (isLoggingIn: boolean) => void;
  setIsInitialLoading: (isInitialLoading: boolean) => void;
  resetAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  isAdmin: false,
  nickname: null,
  isLoggingIn: false,
  isInitialLoading: true,
  setSession: (session) => set({ session }),
  setIsAdmin: (isAdmin) => set({ isAdmin }),
  setNickname: (nickname) => set({ nickname }),
  setIsLoggingIn: (isLoggingIn) => set({ isLoggingIn }),
  setIsInitialLoading: (isInitialLoading) => set({ isInitialLoading }),
  resetAuth: () => set({ 
    session: null, 
    isAdmin: false, 
    nickname: null, 
    isLoggingIn: false, 
    isInitialLoading: false 
  }),
}));
