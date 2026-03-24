import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      accessToken: "",
      refreshToken: "",
      isAuthenticated: false,
      setAuthSession: ({ user, access, refresh }) => {
        console.debug("auth_set_session", { userId: user?.id });
        set({
          user,
          accessToken: access,
          refreshToken: refresh ?? "",
          isAuthenticated: Boolean(access)
        });
      },
      clearAuthSession: () => {
        console.debug("auth_clear_session");
        set({ user: null, accessToken: "", refreshToken: "", isAuthenticated: false });
      }
    }),
    {
      name: "apg-auth-store",
      storage: createJSONStorage(() => localStorage)
    }
  )
);
