import { create } from "zustand";

const initialState = {
  user: null,
  accessToken: "",
  isAuthenticated: false,
  authReady: false
};

export const useAuthStore = create((set) => ({
  ...initialState,
  beginAuthBootstrap: () => {
    console.debug("auth_bootstrap_started");
    set({ authReady: false });
  },
  markAuthReady: () => {
    set({ authReady: true });
  },
  setAuthSession: ({ user, access }) => {
    console.debug("auth_set_session", { userId: user?.id });
    set({
      user,
      accessToken: access ?? "",
      isAuthenticated: Boolean(access),
      authReady: true
    });
  },
  setAccessToken: (access) => {
    console.debug("auth_set_access_token");
    set((state) => ({
      accessToken: access ?? "",
      isAuthenticated: Boolean(access),
      authReady: true,
      user: access ? state.user : null
    }));
  },
  updateUserProfile: (profile) => {
    console.debug("auth_update_profile", { userId: profile?.id });
    set((state) => ({
      user: state.user ? { ...state.user, ...profile } : profile,
      authReady: true
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
    set({ ...initialState, authReady: true });
  }
}));
