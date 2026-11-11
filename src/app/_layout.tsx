import { Stack, usePathname, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Sidebar, SidebarContext, WIDE_MIN } from "../components/Sidebar";
import { ThemeContext, ThemeName, THEMES } from "../components/theme";
import { listProjects, ProjectMeta } from "../lib/projects";

export default function RootLayout() {
  const [themeName, setThemeName] = useState<ThemeName>("light");
  const theme = THEMES[themeName];
  const router = useRouter();
  const { width } = useWindowDimensions();
  const wide = width >= WIDE_MIN;
  // Until the user toggles it, the sidebar starts open on wide screens and closed on narrow ones.
  const [openChoice, setOpen] = useState<boolean | null>(null);
  const open = openChoice ?? wide;

  const [projects, setProjects] = useState<ProjectMeta[]>([]);
  useEffect(() => {
    listProjects().then(setProjects);
  }, []);
  const addProject = (p: ProjectMeta) => setProjects((list) => [p, ...list]);

  const pathname = usePathname();
  const activeId = pathname.match(/^\/p\/([^/]+)$/)?.[1];

  const sidebar = (
    <Sidebar
      theme={theme}
      projects={projects}
      activeId={activeId}
      onNew={() => {
        router.dismissTo("/");
        if (!wide) setOpen(false);
      }}
      onSelect={(id) => {
        // Swap reader for reader so switching projects doesn't pile up screens; push from the paste screen.
        if (activeId) router.replace(`/p/${id}`);
        else router.push(`/p/${id}`);
        if (!wide) setOpen(false);
      }}
    />
  );

  return (
    <SafeAreaProvider>
      <ThemeContext value={{ theme, setThemeName }}>
        <SidebarContext value={{ open, setOpen, wide, addProject }}>
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
