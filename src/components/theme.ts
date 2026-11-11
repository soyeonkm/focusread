import { createContext } from "react";
import { Platform } from "react-native";

export type ThemeName = "light" | "sepia" | "dark";

export interface Theme {
  name: ThemeName;
  bg: string;
  ink: string;
  muted: string;
  line: string;
  accent: string;
  /** Highlighter wash behind the focused text. */
  band: string;
  onInk: string;
}

export const THEMES: Record<ThemeName, Theme> = {
  light: {
    name: "light",
    bg: "#fbfaf7",
    ink: "#1d1c1a",
    muted: "#85817a",
    line: "#e4e0d8",
    accent: "#a8431f",
    band: "#f6e6b4",
    onInk: "#fbfaf7",
  },
  sepia: {
    name: "sepia",
    bg: "#f3ead6",
    ink: "#3a2f22",
    muted: "#8a7a62",
    line: "#ddd0b4",
    accent: "#9a3f1c",
    band: "#e9d08f",
    onInk: "#f3ead6",
  },
  dark: {
    name: "dark",
    bg: "#171614",
    ink: "#e9e4da",
    muted: "#8f897e",
    line: "#2e2c28",
    accent: "#e08a5f",
    band: "#3d3524",
    onInk: "#171614",
  },
};


/** System serif for reading text; no font files to ship. */
export const SERIF = Platform.select({ ios: "Georgia", android: "serif", default: "Georgia, 'Iowan Old Style', 'Times New Roman', serif" });

/** Current theme for every screen; provided by the root layout. */
export const ThemeContext = createContext<{ theme: Theme; setThemeName: (name: ThemeName) => void }>({
  theme: THEMES.light,
  setThemeName: () => {},
});
