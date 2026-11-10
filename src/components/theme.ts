export type ThemeName = "light" | "sepia" | "dark";

export interface Theme {
  name: ThemeName;
  bg: string;
  panel: string;
  ink: string;
  muted: string;
  line: string;
  accent: string;
  band: string;
  onAccent: string;
}

export const THEMES: Record<ThemeName, Theme> = {
  light: {
    name: "light",
    bg: "#f6f8fb",
    panel: "#ffffff",
    ink: "#1c2a3b",
    muted: "#65738a",
    line: "#e1e7ef",
    accent: "#225bd2",
    band: "#e3ecff",
    onAccent: "#ffffff",
  },
  sepia: {
    name: "sepia",
    bg: "#f4ecd8",
    panel: "#fbf5e6",
    ink: "#3b2f1e",
    muted: "#7a6a52",
    line: "#e0d4b8",
    accent: "#a5541a",
    band: "#ecd9b0",
    onAccent: "#ffffff",
  },
  dark: {
    name: "dark",
    bg: "#0d1521",
    panel: "#152131",
    ink: "#e8eef6",
    muted: "#a7b5c6",
    line: "#2b3c4f",
    accent: "#8caeff",
    band: "#1d3251",
    onAccent: "#0d1521",
  },
};

export const THEME_ORDER: ThemeName[] = ["light", "sepia", "dark"];
