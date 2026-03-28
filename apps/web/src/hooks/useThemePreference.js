import { useEffect, useState } from "react";

import { applyDocumentTheme, persistTheme, resolveInitialTheme, THEME_DARK, THEME_LIGHT } from "../utils/theme";

export default function useThemePreference() {
  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") {
      return THEME_DARK;
    }
    return resolveInitialTheme(window);
  });

  useEffect(() => {
    applyDocumentTheme(theme, document);
    persistTheme(theme, window);
    console.debug("theme_applied", { theme });
  }, [theme]);

  return {
    theme,
    isDarkTheme: theme === THEME_DARK,
    setTheme,
    toggleTheme() {
      setTheme((currentTheme) => (currentTheme === THEME_DARK ? THEME_LIGHT : THEME_DARK));
    }
  };
}
