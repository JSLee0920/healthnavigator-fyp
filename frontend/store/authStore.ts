import { create } from "zustand";
import { persist } from "zustand/middleware";

// Define the shape of user based on backend response
interface User {
  user_id: string;
  username: string;
  email: string;
  role: string;
}

// Define what the AuthStore holds
interface AuthState {
  token: string | null;
  user: User | null;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,

      setAuth: (token, user) => set({ token, user }),

      logout: () => set({ token: null, user: null }),
    }),
    {
      name: "health-navigator-auth",
    },
  ),
);
