import { createContext } from "react";

export type Theme = "dark" | "light";

export interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

/** Where the choice is persisted. Also read by the boot script in index.html. */
export const THEME_STORAGE_KEY = "hirelens-theme";

/** Reads the stored preference, falling back to what the OS asks for. */
export function resolveInitialTheme(): Theme {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "dark" || stored === "light") return stored;
  } catch {
    // Private mode and blocked storage both throw here; the OS default is fine.
  }
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

// Kept apart from ThemeProvider so that file exports only a component, which is
// what Vite's fast refresh requires.
export const ThemeContext = createContext<ThemeContextValue | null>(null);
