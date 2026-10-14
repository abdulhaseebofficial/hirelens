import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import {
  resolveInitialTheme,
  THEME_STORAGE_KEY,
  ThemeContext,
  type Theme,
} from "@/context/theme-context";

/**
 * Owns the light/dark choice.
 *
 * The attribute is written to <html>, where the palette overrides in index.css
 * are keyed. index.html sets the same attribute before first paint, so this
 * effect is a no-op on load and there is no flash of the wrong theme.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(resolveInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Not being able to remember the choice is not worth breaking render for.
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  }, []);

  const value = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
