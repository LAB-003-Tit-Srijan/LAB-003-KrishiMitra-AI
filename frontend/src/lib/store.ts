import { create } from "zustand";

type UserProfile = {
  id: string;
  name: string;
  email: string;
  plan: "free" | "pro" | "institution";
  studyStreak?: number;
  xp?: number;
};

type AppState = {
  accessToken: string | null;
  refreshToken: string | null;
  user: UserProfile | null;
  setAccessToken: (token: string | null) => void;
  setRefreshToken: (token: string | null) => void;
  setUser: (user: UserProfile | null) => void;
};

export const useAppStore = create<AppState>((set) => ({
  accessToken: null,
  refreshToken: null,
  user: null,
  setAccessToken: (token) => set({ accessToken: token }),
  setRefreshToken: (token) => set({ refreshToken: token }),
  setUser: (user) => set({ user })
}));
