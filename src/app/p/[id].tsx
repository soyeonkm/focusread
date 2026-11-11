import { Link, useLocalSearchParams } from "expo-router";
import { use, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ReaderScreen } from "../../components/ReaderScreen";
import { SidebarToggle } from "../../components/Sidebar";
import { ThemeContext } from "../../components/theme";
import { getProject, Project } from "../../lib/projects";

export default function Reader() {
  const { theme, setThemeName } = use(ThemeContext);
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  // undefined while loading, null when no project has this id.
  const [project, setProject] = useState<Project | null | undefined>(undefined);

  useEffect(() => {
    let current = true;
    getProject(id).then((p) => current && setProject(p));
    return () => {
      current = false;
    };
  }, [id]);

  if (project === undefined || (project && project.id !== id)) return <View style={{ flex: 1, backgroundColor: theme.bg }} />;

  if (project === null) {
    return (
      <View style={[styles.missing, { backgroundColor: theme.bg }]}>
        <View style={[styles.toggle, { top: insets.top + 10 }]}>
          <SidebarToggle theme={theme} />
        </View>
        <Text style={[styles.title, { color: theme.ink }]}>Project not found</Text>
        <Text style={{ color: theme.muted, fontSize: 15, marginBottom: 16, textAlign: "center" }}>It may have been saved on another device or browser.</Text>
        <Link href="/" style={{ color: theme.ink, fontSize: 15, fontWeight: "600", textDecorationLine: "underline" }}>
          Start a new project
        </Link>
      </View>
    );
  }

  return <ReaderScreen key={project.id} text={project.text} theme={theme} onSetTheme={setThemeName} />;
}

const styles = StyleSheet.create({
  missing: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  toggle: { position: "absolute", left: 12 },
  title: { fontSize: 22, fontWeight: "600", marginBottom: 6 },
});
