import { create } from 'zustand';

interface ForgotPasswordState {
  email: string;
  isLoading: boolean;
  error: string;
  success: boolean;

  setEmail: (email: string) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string) => void;
  setSuccess: (success: boolean) => void;
  reset: () => void;
}

const initialState = {
  email: "",
  isLoading: false,
  error: "",
  success: false,
};

export const useForgotPasswordStore = create<ForgotPasswordState>((set) => ({
  ...initialState,

  setEmail: (email) => set({ email }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  setSuccess: (success) => set({ success }),
  reset: () => set(initialState),
}));
