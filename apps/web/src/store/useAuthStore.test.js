import { act } from "@testing-library/react";

import { useAuthStore } from "./useAuthStore";

describe("useAuthStore", () => {
  afterEach(() => {
    act(() => {
      useAuthStore.getState().clearAuthSession();
    });
  });

  it("keeps auth state in memory without writing tokens to localStorage", () => {
    act(() => {
      useAuthStore.getState().setAuthSession({
        user: { id: "user-1", username: "player-one" },
        access: "access-token-1"
      });
    });

    expect(useAuthStore.getState()).toMatchObject({
      user: { id: "user-1", username: "player-one" },
      accessToken: "access-token-1",
      isAuthenticated: true,
      authReady: true
    });
    expect(window.localStorage.length).toBe(0);
  });

  it("can mark bootstrap complete without authenticating the user", () => {
    act(() => {
      useAuthStore.getState().beginAuthBootstrap();
    });
    expect(useAuthStore.getState().authReady).toBe(false);

    act(() => {
      useAuthStore.getState().markAuthReady();
    });
    expect(useAuthStore.getState()).toMatchObject({
      isAuthenticated: false,
      authReady: true
    });
  });
});
