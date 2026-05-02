import { create } from "zustand";
import { persist } from "zustand/middleware";

interface HealthProfile {
  id: string;
  gender?: string;
  date_of_birth?: string;
  height_cm?: number;
  weight_kg?: number;
  blood_type?: string;
  chronic_conditions?: string[];
  allergies?: string[];
  current_medications?: string[];
  lifestyle_factors?: Record<string, unknown>;
  updated_at?: string;
}

interface User {
  user_id: string;
  username: string;
  email: string;
  role: string;
  created_at?: string;
  health_profile?: HealthProfile;
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  _hasHydrated: boolean;
  setUser: (user: User) => void;
  logout: () => void;
  setHasHydrated: (state: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      user: null,
      _hasHydrated: false,

      setUser: (user) => set({ isAuthenticated: true, user }),

      logout: () => set({ isAuthenticated: false, user: null }),
      setHasHydrated: (state) => set({ _hasHydrated: state }),
    }),
    {
      name: "health-navigator-auth",
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
