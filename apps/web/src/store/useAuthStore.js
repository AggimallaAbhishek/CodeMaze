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
      updateUserProfile: (profile) => {
        console.debug("auth_update_profile", { userId: profile?.id });
        set((state) => ({
          user: state.user ? { ...state.user, ...profile } : profile
        }));
      },
      mergeProgressionSnapshot: ({ totalXp, progression, awardedBadges = [] }) => {
        set((state) => {
          if (!state.user) {
            return state;
          }

          const existingBadges = Array.isArray(state.user.badges) ? state.user.badges : [];
          const badgesByCode = new Map(existingBadges.map((badge) => [badge.code, badge]));
          for (const badge of awardedBadges) {
            badgesByCode.set(badge.code, badge);
          }

          return {
            user: {
              ...state.user,
              total_xp: totalXp ?? state.user.total_xp,
              progression: progression ?? state.user.progression,
              badges: Array.from(badgesByCode.values())
            }
          };
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
