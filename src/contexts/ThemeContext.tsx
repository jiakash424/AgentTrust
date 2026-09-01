import React, { createContext, useContext, useEffect, useState } from "react";

export type Theme = "agenttrust" | "dark" | "retro";

export interface ThemeConfig {
  id: Theme;
  name: string;
  description: string;
  previewBg: string;
  previewCard: string;
  previewAccent: string;
  previewBorder: string;
  previewText: string;
}

export const THEME_CONFIGS: ThemeConfig[] = [
  {
    id: "agenttrust",
    name: "AgentTrust",
    description: "Refined, warm off-white editorial light interface with coral accents",
    previewBg: "#f6f4ef",
    previewCard: "#ffffff",
    previewAccent: "#e8613c",
    previewBorder: "#e7e3da",
    previewText: "#1c1a17",
  },
  {
    id: "dark",
    name: "Dark Modern",
    description: "Deep obsidian dark mode with high contrast slate panels & vibrant coral glow",
    previewBg: "#0d0f12",
    previewCard: "#15181e",
    previewAccent: "#f97316",
    previewBorder: "#262a34",
    previewText: "#f3f4f6",
  },
  {
    id: "retro",
    name: "Retro Brutalist",
    description: "Neo-brutalist pastel editorial UI with bold black outlines, mint sage & offset shadows",
    previewBg: "#fcf8ec",
    previewCard: "#ffffff",
    previewAccent: "#ffd043",
    previewBorder: "#111827",
    previewText: "#0a0a0a",
  },
];

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = "agenttrust-theme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(THEME_STORAGE_KEY) as Theme;
      if (saved && (saved === "agenttrust" || saved === "dark" || saved === "retro")) {
        return saved;
      }
    }
    return "agenttrust";
  });

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
