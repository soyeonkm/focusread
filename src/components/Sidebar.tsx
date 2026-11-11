import { createContext, use } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { ProjectMeta } from "../lib/projects";
import { Theme } from "./theme";

/** Below this width the sidebar opens as an overlay drawer instead of sitting beside the page. */
export const WIDE_MIN = 768;

export const SidebarContext = createContext<{ open: boolean; setOpen: (open: boolean) => void; wide: boolean }>({
  open: false,
  setOpen: () => {},
  wide: false,
});

interface Props {
  theme: Theme;
  projects: ProjectMeta[];
  activeId?: string;
  onNew: () => void;
  onSelect: (id: string) => void;
}

export function Sidebar({ theme, projects, activeId, onNew, onSelect }: Props) {
  const insets = useSafeAreaInsets();
  const { setOpen } = use(SidebarContext);

  return (
    <View style={[styles.root, { backgroundColor: theme.panel, borderRightColor: theme.line, paddingTop: insets.top + 10, paddingBottom: insets.bottom }]}>
      <View style={styles.header}>
        <Text style={[styles.brand, { color: theme.ink }]}>FocusRead</Text>
        <IconButton theme={theme} label="Close sidebar" onPress={() => setOpen(false)} />
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={onNew}
        style={({ pressed }) => [styles.item, styles.newItem, { opacity: pressed ? 0.6 : 1 }]}
      >
        <Text style={[styles.plus, { color: theme.ink }]}>+</Text>
        <Text style={[styles.itemText, { color: theme.ink, fontWeight: "600" }]}>New project</Text>
      </Pressable>

      <View style={[styles.divider, { backgroundColor: theme.line }]} />

      <Text style={[styles.section, { color: theme.muted }]}>Projects</Text>
      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {projects.map((p) => {
          const active = p.id === activeId;
          return (
            <Pressable
              key={p.id}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => onSelect(p.id)}
              style={({ pressed }) => [styles.item, { backgroundColor: active ? theme.line : "transparent", opacity: pressed ? 0.6 : 1 }]}
            >
              <Text numberOfLines={1} style={[styles.itemText, { color: theme.ink }]}>
                {p.title}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

/** The button that opens the sidebar; screens put it at their top-left. Hidden while the sidebar is open. */
export function SidebarToggle({ theme }: { theme: Theme }) {
  const { open, setOpen } = use(SidebarContext);
  if (open) return null;
  return <IconButton theme={theme} label="Open sidebar" onPress={() => setOpen(true)} />;
}

function IconButton({ theme, label, onPress }: { theme: Theme; label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      onPress={onPress}
      style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.5 : 1 }]}
    >
      {/* Panel-with-left-column glyph, drawn so there is no icon dependency. */}
      <View style={[styles.glyph, { borderColor: theme.ink }]}>
        <View style={[styles.glyphBar, { backgroundColor: theme.ink }]} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, borderRightWidth: StyleSheet.hairlineWidth, paddingHorizontal: 10 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingLeft: 8, marginBottom: 10 },
  brand: { fontSize: 15, fontWeight: "600" },
  item: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 10, paddingVertical: 9, borderRadius: 8 },
  newItem: { marginBottom: 6 },
  plus: { fontSize: 18, lineHeight: 20, width: 16, textAlign: "center" },
  itemText: { fontSize: 14, flexShrink: 1 },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: 6, marginBottom: 12 },
  section: { fontSize: 12, fontWeight: "500", paddingHorizontal: 10, marginBottom: 4 },
  list: { flex: 1 },
  listContent: { paddingBottom: 16, gap: 2 },
  iconBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center", borderRadius: 8 },
  glyph: { width: 18, height: 15, borderWidth: 1.5, borderRadius: 3.5 },
  glyphBar: { position: "absolute", left: 4, top: 0, bottom: 0, width: 1.5 },
});
