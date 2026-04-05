"use client";

import * as React from "react";

export type ThemeName = "light" | "dark";

const STORAGE_KEY = "theme";

type ThemeContextValue = {
  theme: ThemeName;
  setTheme: (theme: string) => void;
  resolvedTheme: ThemeName;
  themes: string[];
};

const ThemeContext = React.createContext<ThemeContextValue | undefined>(
  undefined,
);

export type ThemeProviderProps = React.PropsWithChildren<{
  defaultTheme?: ThemeName;
}>;

export function ThemeProvider({
  children,
  defaultTheme = "dark",
}: ThemeProviderProps) {
  const [theme, setThemeState] = React.useState<ThemeName>(defaultTheme);

  React.useEffect(() => {
    const root = document.documentElement;
    const stored = localStorage.getItem(STORAGE_KEY) as ThemeName | null;
    const next: ThemeName =
      stored === "light" || stored === "dark" ? stored : defaultTheme;
    setThemeState(next);
    root.classList.toggle("dark", next === "dark");
  }, [defaultTheme]);

  const setTheme = React.useCallback((next: string) => {
    if (next !== "light" && next !== "dark") return;
    setThemeState(next);
    localStorage.setItem(STORAGE_KEY, next);
    document.documentElement.classList.toggle("dark", next === "dark");
  }, []);

  const value: ThemeContextValue = {
    theme,
    setTheme,
    resolvedTheme: theme,
    themes: ["light", "dark"],
  };

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return {
    theme: ctx.theme,
    setTheme: ctx.setTheme,
    resolvedTheme: ctx.resolvedTheme,
    themes: ctx.themes,
    systemTheme: undefined as "dark" | "light" | undefined,
  };
}
