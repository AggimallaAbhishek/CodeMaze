import { describe, expect, it, vi } from "vitest";

import {
  applyDocumentTheme,
  isValidTheme,
  persistTheme,
  resolveInitialTheme,
  THEME_DARK,
  THEME_LIGHT,
  THEME_STORAGE_KEY
} from "../theme";

function createWindowLike({ storedTheme, prefersDark = false } = {}) {
  return {
    localStorage: {
      getItem: vi.fn(() => storedTheme ?? null),
      setItem: vi.fn()
    },
    matchMedia: vi.fn(() => ({ matches: prefersDark }))
  };
}

describe("theme utilities", () => {
  it("accepts only the supported theme values", () => {
    expect(isValidTheme(THEME_DARK)).toBe(true);
    expect(isValidTheme(THEME_LIGHT)).toBe(true);
    expect(isValidTheme("sepia")).toBe(false);
  });

  it("prefers stored theme when present", () => {
    const windowLike = createWindowLike({ storedTheme: THEME_LIGHT, prefersDark: true });
    expect(resolveInitialTheme(windowLike)).toBe(THEME_LIGHT);
  });

  it("falls back to system preference when no stored theme exists", () => {
    const darkWindow = createWindowLike({ prefersDark: true });
    const lightWindow = createWindowLike({ prefersDark: false });

    expect(resolveInitialTheme(darkWindow)).toBe(THEME_DARK);
    expect(resolveInitialTheme(lightWindow)).toBe(THEME_LIGHT);
  });

  it("defaults to dark when no browser context is available", () => {
    expect(resolveInitialTheme(null)).toBe(THEME_DARK);
  });

  it("applies theme to the document root and persists it", () => {
    const documentLike = {
      documentElement: {
        dataset: {},
        style: {}
      }
    };
    const windowLike = createWindowLike();

    applyDocumentTheme(THEME_LIGHT, documentLike);
    persistTheme(THEME_LIGHT, windowLike);

    expect(documentLike.documentElement.dataset.theme).toBe(THEME_LIGHT);
    expect(documentLike.documentElement.style.colorScheme).toBe(THEME_LIGHT);
    expect(windowLike.localStorage.setItem).toHaveBeenCalledWith(THEME_STORAGE_KEY, THEME_LIGHT);
  });

  it("ignores invalid themes when applying or persisting", () => {
    const documentLike = {
      documentElement: {
        dataset: {},
        style: {}
      }
    };
    const windowLike = createWindowLike();

    applyDocumentTheme("sepia", documentLike);
    persistTheme("sepia", windowLike);

    expect(documentLike.documentElement.dataset.theme).toBeUndefined();
    expect(windowLike.localStorage.setItem).not.toHaveBeenCalled();
  });
});
