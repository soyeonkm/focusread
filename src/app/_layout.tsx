import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeContext, ThemeName, THEMES } from "../components/theme";

export default function RootLayout() {
  const [themeName, setThemeName] = useState<ThemeName>("light");
  const theme = THEMES[themeName];

  return (
    <SafeAreaProvider>
      <ThemeContext value={{ theme, setThemeName }}>
        <StatusBar style={themeName === "dark" ? "light" : "dark"} />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.bg } }} />
      </ThemeContext>
    </SafeAreaProvider>
  );
}
