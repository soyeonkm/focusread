import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LayoutChangeEvent, Platform, Pressable, ScrollView, ScrollViewInstance, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DEFAULT_OPTIONS, Line, LayoutMode, layoutText } from "../lib/layout";
import { Theme } from "./theme";

const MODES: { key: LayoutMode; label: string }[] = [
  { key: "even", label: "Even lines" },
  { key: "sentence", label: "Sentences" },
  { key: "phrase", label: "Phrases" },
  { key: "paragraph", label: "Paragraphs" },
];

interface Props {
  text: string;
  theme: Theme;
  onCycleTheme: () => void;
  onBack: () => void;
}

export function ReaderScreen({ text, theme, onCycleTheme, onBack }: Props) {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<LayoutMode>("even");
  const [maxChars, setMaxChars] = useState(DEFAULT_OPTIONS.maxChars);
  const [fontSize, setFontSize] = useState(20);
  const [dim, setDim] = useState(true);
  const [wpm, setWpm] = useState(220);
  const [playing, setPlaying] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [index, setIndex] = useState(0);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });

  const scrollRef = useRef<ScrollViewInstance>(null);
  const paraBox = useRef<{ y: number; h: number }[]>([]);

  const lines = useMemo(() => layoutText(text, mode, { maxChars }), [text, mode, maxChars]);

  // Text always flows as paragraphs; the mode only decides which chunk gets highlighted.
  const paragraphs = useMemo(() => {
    const out: { start: number; lines: Line[] }[] = [];
    lines.forEach((l, i) => {
      if (i > 0 && lines[i - 1].paragraph === l.paragraph) out[out.length - 1].lines.push(l);
      else out.push({ start: i, lines: [l] });
    });
    return out;
  }, [lines]);
  const safeIndex = Math.min(index, Math.max(0, lines.length - 1));

  // Keep the reader in the same paragraph when the layout changes (adjusting state during render).
  const [prevLines, setPrevLines] = useState(lines);
  if (prevLines !== lines) {
    setPrevLines(lines);
    const para = prevLines[Math.min(index, prevLines.length - 1)]?.paragraph ?? 0;
    setIndex(Math.max(0, lines.findIndex((l) => l.paragraph === para)));
  }

  const go = useCallback(
    (delta: number) => setIndex((i) => Math.min(Math.max(0, i + delta), Math.max(0, lines.length - 1))),
    [lines.length],
  );

  // Scroll the focused chunk to about a third of the way down the screen. Nested text spans
  // can't be measured, so estimate its y from how far into the paragraph it starts.
  useEffect(() => {
    const p = paragraphs.findIndex((g) => safeIndex >= g.start && safeIndex < g.start + g.lines.length);
    const box = paraBox.current[p];
    if (!box || viewport.height === 0) return;
    const g = paragraphs[p];
    const len = (ls: Line[]) => ls.reduce((n, l) => n + l.text.length + 1, 0);
    const y = box.y + box.h * (len(g.lines.slice(0, safeIndex - g.start)) / len(g.lines));
    scrollRef.current?.scrollTo({ y: Math.max(0, y - viewport.height * 0.33), animated: true });
  }, [safeIndex, viewport.height, paragraphs]);

  // Auto-advance at the chosen reading speed.
  useEffect(() => {
    if (!playing || safeIndex >= lines.length - 1) return;
    const words = lines[safeIndex].text.split(/\s+/).length;
    const ms = Math.max(700, (words / wpm) * 60000);
    const t = setTimeout(() => {
      setIndex(safeIndex + 1);
      if (safeIndex + 1 >= lines.length - 1) setPlaying(false);
    }, ms);
    return () => clearTimeout(t);
  }, [playing, safeIndex, wpm, lines]);

  // Keyboard controls on the web.
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "ArrowRight" || e.key === "j") {
        e.preventDefault();
        go(1);
      } else if (e.key === "ArrowUp" || e.key === "ArrowLeft" || e.key === "k") {
        e.preventDefault();
        go(-1);
      } else if (e.key === " ") {
        e.preventDefault();
        setPlaying((p) => !p);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  const onScrollLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setViewport((v) => (v.width === width && v.height === height ? v : { width, height }));
  };

  const progress = lines.length > 1 ? safeIndex / (lines.length - 1) : lines.length ? 1 : 0;

  return (
    <View style={[styles.root, { backgroundColor: theme.bg, paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Chip theme={theme} label="← Back" onPress={onBack} />
        <View style={styles.modes}>
          {MODES.map((m) => (
            <Chip key={m.key} theme={theme} label={m.label} active={mode === m.key} onPress={() => setMode(m.key)} />
          ))}
        </View>
        <Chip theme={theme} label={showSettings ? "Close" : "Settings"} onPress={() => setShowSettings((s) => !s)} />
      </View>

      {showSettings && (
        <View style={[styles.settings, { backgroundColor: theme.panel, borderColor: theme.line }]}>
          <Stepper theme={theme} label="Text size" value={`${fontSize}`} onMinus={() => setFontSize((s) => Math.max(14, s - 2))} onPlus={() => setFontSize((s) => Math.min(36, s + 2))} />
          <Stepper theme={theme} label="Chunk length" value={`${maxChars}`} onMinus={() => setMaxChars((c) => Math.max(24, c - 4))} onPlus={() => setMaxChars((c) => Math.min(90, c + 4))} />
          <Stepper theme={theme} label="Pace (words/min)" value={`${wpm}`} onMinus={() => setWpm((w) => Math.max(80, w - 20))} onPlus={() => setWpm((w) => Math.min(500, w + 20))} />
          <View style={styles.settingRow}>
            <Chip theme={theme} label={`Dim other lines: ${dim ? "on" : "off"}`} onPress={() => setDim((d) => !d)} />
            <Chip theme={theme} label={`Theme: ${theme.name}`} onPress={onCycleTheme} />
          </View>
        </View>
      )}

      <View style={[styles.progressTrack, { backgroundColor: theme.line }]}>
        <View style={{ height: 3, width: `${progress * 100}%`, backgroundColor: theme.accent }} />
      </View>

      <ScrollView ref={scrollRef} style={styles.scroll} onLayout={onScrollLayout} contentContainerStyle={styles.content}>
        <View style={styles.column}>
          {paragraphs.map((g, p) => (
            <Text
              key={p}
              onLayout={(e) => {
                paraBox.current[p] = { y: e.nativeEvent.layout.y, h: e.nativeEvent.layout.height };
              }}
              style={{ color: theme.ink, fontSize, lineHeight: fontSize * 1.55, marginTop: p > 0 ? fontSize * 1.1 : 0 }}
            >
              {g.lines.map((line, j) => {
                const i = g.start + j;
                const focused = i === safeIndex;
                return (
                  <Text
                    key={i}
                    accessibilityRole="button"
                    onPress={() => setIndex(i)}
                    style={{
                      backgroundColor: focused ? theme.band : "transparent",
                      // Nested spans ignore opacity on native, so dim with an alpha color (#rrggbb + 47 ≈ 28%).
                      color: dim && !focused ? theme.ink + "47" : theme.ink,
                    }}
                  >
                    {j > 0 ? " " : ""}
                    {line.text}
                  </Text>
                );
              })}
            </Text>
          ))}
        </View>
      </ScrollView>

      <View style={[styles.controls, { borderTopColor: theme.line, backgroundColor: theme.panel, paddingBottom: insets.bottom + 10 }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Previous line" onPress={() => go(-1)} style={[styles.ctl, { borderColor: theme.line }]}>
          <Text style={[styles.ctlText, { color: theme.ink }]}>↑ Prev</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={playing ? "Pause" : "Play at set pace"}
          onPress={() => setPlaying((p) => !p)}
          style={[styles.ctl, styles.ctlMain, { backgroundColor: theme.accent, borderColor: theme.accent }]}
        >
          <Text style={[styles.ctlText, { color: theme.onAccent }]}>{playing ? "Pause" : "Play"}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Next line" onPress={() => go(1)} style={[styles.ctl, { borderColor: theme.line }]}>
          <Text style={[styles.ctlText, { color: theme.ink }]}>Next ↓</Text>
        </Pressable>
        <Text style={[styles.status, { color: theme.muted }]}>
          {lines.length ? safeIndex + 1 : 0} / {lines.length}
        </Text>
      </View>
    </View>
  );
}

function Chip({ theme, label, onPress, active }: { theme: Theme; label: string; onPress: () => void; active?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      onPress={onPress}
      style={[styles.chip, { borderColor: active ? theme.accent : theme.line, backgroundColor: active ? theme.band : "transparent" }]}
    >
      <Text style={{ color: active ? theme.accent : theme.ink, fontSize: 13, fontWeight: active ? "700" : "500" }}>{label}</Text>
    </Pressable>
  );
}

function Stepper({ theme, label, value, onMinus, onPlus }: { theme: Theme; label: string; value: string; onMinus: () => void; onPlus: () => void }): ReactNode {
  return (
    <View style={styles.settingRow}>
      <Text style={{ color: theme.ink, flex: 1, fontSize: 14 }}>{label}</Text>
      <Chip theme={theme} label="−" onPress={onMinus} />
      <Text style={{ color: theme.ink, width: 44, textAlign: "center", fontVariant: ["tabular-nums"] }}>{value}</Text>
      <Chip theme={theme} label="+" onPress={onPlus} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, paddingVertical: 10, gap: 8, flexWrap: "wrap" },
  modes: { flexDirection: "row", gap: 6, flexWrap: "wrap", flexShrink: 1 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  settings: { marginHorizontal: 12, marginBottom: 8, borderWidth: 1, borderRadius: 14, padding: 12, gap: 10 },
  settingRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  progressTrack: { height: 3 },
  scroll: { flex: 1 },
  content: { paddingVertical: 40, paddingHorizontal: 16, paddingBottom: 260 },
  column: { alignSelf: "center", maxWidth: 820, width: "100%" },
  controls: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, paddingTop: 10, borderTopWidth: 1 },
  ctl: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, minWidth: 84, alignItems: "center" },
  ctlMain: { minWidth: 96 },
  ctlText: { fontSize: 15, fontWeight: "700" },
  status: { marginLeft: "auto", fontSize: 13, fontVariant: ["tabular-nums"] },
});
