export const THEME_STORAGE_KEY = "codemaze-theme";
export const THEME_DARK = "dark";
export const THEME_LIGHT = "light";

export function isValidTheme(value) {
  return value === THEME_DARK || value === THEME_LIGHT;
}

export function resolveInitialTheme(windowLike = window) {
  if (!windowLike) {
    return THEME_DARK;
  }

  const storedTheme = windowLike.localStorage?.getItem?.(THEME_STORAGE_KEY);
  if (isValidTheme(storedTheme)) {
    return storedTheme;
  }

  const prefersDark = windowLike.matchMedia?.("(prefers-color-scheme: dark)")?.matches;
  return prefersDark ? THEME_DARK : THEME_LIGHT;
}

export function applyDocumentTheme(theme, documentLike = document) {
  if (!documentLike?.documentElement || !isValidTheme(theme)) {
    return;
  }

  documentLike.documentElement.dataset.theme = theme;
  documentLike.documentElement.style.colorScheme = theme;
}

export function persistTheme(theme, windowLike = window) {
  if (!windowLike?.localStorage || !isValidTheme(theme)) {
    return;
  }

  windowLike.localStorage.setItem(THEME_STORAGE_KEY, theme);
}
