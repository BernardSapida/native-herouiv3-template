import { create } from 'zustand';

type User = {
  id: string;
  email: string;
  firstname: string;
  lastname: string;
  role: string;
};

type Session = { user: User };

type AuthStore = {
  session: Session | null;
  token: string | null;
  isLoading: boolean;
  setAuth: (session: Session, token: string) => void;
  clearAuth: () => void;
  setLoading: (v: boolean) => void;
};

export const useAuthStore = create<AuthStore>((set) => ({
  session: null,
  token: null,
  isLoading: true,
  setAuth: (session, token) => set({ session, token, isLoading: false }),
  clearAuth: () => set({ session: null, token: null, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),
}));
