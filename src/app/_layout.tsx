import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Sidebar, SidebarContext, WIDE_MIN } from "../components/Sidebar";
import { ThemeContext, ThemeName, THEMES } from "../components/theme";
import type { ProjectMeta } from "../lib/projects";

// ponytail: placeholder list for the static layout; ticket 5 loads real projects.
const SAMPLE_PROJECTS: ProjectMeta[] = [
  { id: "a", title: "Paxos gets agreement right even if…", createdAt: 3 },
  { id: "b", title: "City council approves new bike lanes downtown", createdAt: 2 },
  { id: "c", title: "The mitochondrion is an organelle found…", createdAt: 1 },
];

export default function RootLayout() {
  const [themeName, setThemeName] = useState<ThemeName>("light");
  const theme = THEMES[themeName];
  const router = useRouter();
  const { width } = useWindowDimensions();
  const wide = width >= WIDE_MIN;
  // Until the user toggles it, the sidebar starts open on wide screens and closed on narrow ones.
  const [openChoice, setOpen] = useState<boolean | null>(null);
  const open = openChoice ?? wide;

  const sidebar = (
    <Sidebar
      theme={theme}
      projects={SAMPLE_PROJECTS}
      activeId="a"
      onNew={() => {
        router.dismissTo("/");
        if (!wide) setOpen(false);
      }}
      onSelect={() => !wide && setOpen(false)}
    />
  );

  return (
    <SafeAreaProvider>
      <ThemeContext value={{ theme, setThemeName }}>
        <SidebarContext value={{ open, setOpen, wide }}>
          <StatusBar style={themeName === "dark" ? "light" : "dark"} />
          <View style={[styles.row, { backgroundColor: theme.bg }]}>
            {wide && open && <View style={styles.docked}>{sidebar}</View>}
            <View style={styles.page}>
              <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.bg } }} />
            </View>
            {!wide && open && (
              <View style={StyleSheet.absoluteFill}>
                <Pressable accessibilityRole="button" accessibilityLabel="Close sidebar" onPress={() => setOpen(false)} style={[StyleSheet.absoluteFill, styles.backdrop]} />
                <View style={[styles.drawer, { width: Math.min(300, width * 0.85) }]}>{sidebar}</View>
              </View>
            )}
          </View>
        </SidebarContext>
      </ThemeContext>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  row: { flex: 1, flexDirection: "row" },
  docked: { width: 264 },
  page: { flex: 1 },
  backdrop: { backgroundColor: "rgba(0,0,0,0.35)" },
  drawer: { position: "absolute", left: 0, top: 0, bottom: 0 },
});
