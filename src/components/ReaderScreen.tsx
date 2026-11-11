import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LayoutChangeEvent, Platform, Pressable, ScrollView, ScrollViewInstance, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Line, LayoutMode, layoutText } from "../lib/layout";
import { SidebarToggle } from "./Sidebar";
import { SERIF, Theme, ThemeName } from "./theme";

type Mode = LayoutMode | "lines";

const MODES: { key: Mode; label: string }[] = [
  { key: "lines", label: "Lines" },
  { key: "sentence", label: "Sentences" },
  { key: "paragraph", label: "Paragraphs" },
];

/** Web has no onTextLayout, so find where the browser wrapped a paragraph by checking each character's position. */
function measureLineLengthsWeb(el: HTMLElement): number[] {
  // ponytail: one Range per character, fine for article-sized text; switch to per-word if paragraphs get huge.
  const lens: number[] = [];
  const range = document.createRange();
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let top: number | null = null;
  let len = 0;
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const s = n.textContent ?? "";
    for (let i = 0; i < s.length; i++) {
      range.setStart(n, i);
      range.setEnd(n, i + 1);
      const rect = range.getClientRects()[0];
      if (rect && top !== null && rect.top > top + 1 && len > 0) {
        lens.push(len);
        len = 0;
      }
      if (rect) top = rect.top;
      len++;
    }
  }
  if (len > 0) lens.push(len);
  return lens;
}

/** Cut a paragraph into its on-screen lines; the last piece takes any remainder so the text always adds up. */
function sliceByLengths(text: string, lens: number[] | undefined): string[] {
  if (!lens?.length) return [text];
  const out: string[] = [];
  let at = 0;
  lens.forEach((n, i) => {
    const piece = i === lens.length - 1 ? text.slice(at) : text.slice(at, at + n);
    if (piece) out.push(piece);
    at += n;
  });
  return out;
}

interface Props {
  text: string;
  theme: Theme;
  onSetTheme: (name: ThemeName) => void;
}

export function ReaderScreen({ text, theme, onSetTheme }: Props) {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<Mode>("lines");
  // Character count of each on-screen line, per paragraph, as last rendered.
  const [lineLens, setLineLens] = useState<Record<number, number[]>>({});
  const [fontSize, setFontSize] = useState(20);
  const [dim, setDim] = useState(true);
  const [wpm, setWpm] = useState(220);
  const [playing, setPlaying] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [index, setIndex] = useState(0);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });

  const scrollRef = useRef<ScrollViewInstance>(null);
  const paraBox = useRef<{ y: number; h: number }[]>([]);
  const paraEls = useRef<unknown[]>([]);

  const lines = useMemo(
    () =>
      mode === "lines"
        ? layoutText(text, "paragraph").flatMap((l) => sliceByLengths(l.text, lineLens[l.paragraph]).map((t) => ({ text: t, paragraph: l.paragraph })))
        : layoutText(text, mode),
    [text, mode, lineLens],
  );

  const saveLineLens = (p: number, lens: number[]) =>
    setLineLens((m) => (m[p]?.join() === lens.join() ? m : { ...m, [p]: lens }));

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
    const words = lines[safeIndex].text.trim().split(/\s+/).length;
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
        {/* Same width as "Aa" so the mode switch stays centred. */}
        <View style={styles.left}>
          <SidebarToggle theme={theme} />
        </View>
        <Segmented theme={theme} options={MODES} value={mode} onChange={setMode} />
        <TextButton theme={theme} label={showSettings ? "Done" : "Aa"} accessibilityLabel="Reading settings" onPress={() => setShowSettings((s) => !s)} />
      </View>

      {showSettings && (
        <View style={[styles.settings, { borderBottomColor: theme.line }]}>
          <Stepper theme={theme} label="Text size" value={`${fontSize}`} onMinus={() => setFontSize((s) => Math.max(14, s - 2))} onPlus={() => setFontSize((s) => Math.min(36, s + 2))} />
          <Stepper theme={theme} label="Words per minute" value={`${wpm}`} onMinus={() => setWpm((w) => Math.max(80, w - 20))} onPlus={() => setWpm((w) => Math.min(500, w + 20))} />
          <SettingRow theme={theme} label="Fade other text">
            <Segmented theme={theme} options={ON_OFF} value={dim} onChange={setDim} />
          </SettingRow>
          <SettingRow theme={theme} label="Theme">
            <Segmented theme={theme} options={THEME_OPTIONS} value={theme.name} onChange={onSetTheme} />
          </SettingRow>
        </View>
      )}

      <View style={[styles.progressTrack, { backgroundColor: theme.line }]}>
        <View style={{ height: 2, width: `${progress * 100}%`, backgroundColor: theme.accent }} />
      </View>

      <ScrollView ref={scrollRef} style={styles.scroll} onLayout={onScrollLayout} contentContainerStyle={styles.content}>
        <View style={styles.column}>
          {paragraphs.map((g, p) => (
            <Text
              key={p}
              ref={(el) => {
                paraEls.current[p] = el;
              }}
              onLayout={(e) => {
                paraBox.current[p] = { y: e.nativeEvent.layout.y, h: e.nativeEvent.layout.height };
                const el = paraEls.current[p];
                if (Platform.OS === "web" && el) saveLineLens(p, measureLineLengthsWeb(el as unknown as HTMLElement));
              }}
              onTextLayout={(e) => saveLineLens(p, e.nativeEvent.lines.map((l) => l.text.length))}
              style={{ color: theme.ink, fontFamily: SERIF, fontSize, lineHeight: fontSize * 1.6, marginTop: p > 0 ? fontSize * 1.2 : 0 }}
            >
              {g.lines.map((line, j) => {
                const i = g.start + j;
                const focused = i === safeIndex;
                return (
                  <Text
                    key={i}
                    // No accessibilityRole="button": on web it renders an inline-block <button>, breaking the paragraph flow.
                    onPress={() => setIndex(i)}
                    style={{
                      backgroundColor: focused ? theme.band : "transparent",
                      // Nested spans ignore opacity on native, so dim with an alpha color (#rrggbb + 47 ≈ 28%).
                      color: dim && !focused ? theme.ink + "47" : theme.ink,
                    }}
                  >
                    {/* Line slices already carry their own spaces; sentences/paragraphs need one between them. */}
                    {j > 0 && mode !== "lines" ? " " : ""}
                    {line.text}
                  </Text>
                );
              })}
            </Text>
          ))}
        </View>
      </ScrollView>

      <View style={[styles.controls, { borderTopColor: theme.line, paddingBottom: insets.bottom + 12 }]}>
        <Text style={[styles.status, { color: theme.muted }]}>
          {lines.length ? safeIndex + 1 : 0} of {lines.length}
        </Text>
        <View style={styles.ctlRow}>
          <Pressable accessibilityRole="button" accessibilityLabel="Previous" onPress={() => go(-1)} style={({ pressed }) => [styles.ctl, { borderColor: theme.line, opacity: pressed ? 0.6 : 1 }]}>
            <Text style={[styles.ctlText, { color: theme.ink }]}>Previous</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={playing ? "Pause" : "Play at set pace"}
            onPress={() => setPlaying((p) => !p)}
            style={({ pressed }) => [styles.ctl, styles.ctlMain, { backgroundColor: theme.ink, borderColor: theme.ink, opacity: pressed ? 0.8 : 1 }]}
          >
            <Text style={[styles.ctlText, { color: theme.onInk }]}>{playing ? "Pause" : "Play"}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Next" onPress={() => go(1)} style={({ pressed }) => [styles.ctl, { borderColor: theme.line, opacity: pressed ? 0.6 : 1 }]}>
            <Text style={[styles.ctlText, { color: theme.ink }]}>Next</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const ON_OFF: { key: boolean; label: string }[] = [
  { key: true, label: "On" },
  { key: false, label: "Off" },
];

const THEME_OPTIONS: { key: ThemeName; label: string }[] = [
  { key: "light", label: "Light" },
  { key: "sepia", label: "Sepia" },
  { key: "dark", label: "Dark" },
];

function TextButton({ theme, label, onPress, accessibilityLabel }: { theme: Theme; label: string; onPress: () => void; accessibilityLabel?: string }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? label} hitSlop={10} onPress={onPress} style={({ pressed }) => [styles.textBtn, { opacity: pressed ? 0.5 : 1 }]}>
      <Text style={{ color: theme.ink, fontSize: 15, fontWeight: "500" }}>{label}</Text>
    </Pressable>
  );
}

function Segmented<K extends string | boolean>({ theme, options, value, onChange }: { theme: Theme; options: { key: K; label: string }[]; value: K; onChange: (k: K) => void }) {
  return (
    <View style={[styles.seg, { backgroundColor: theme.line }]}>
      {options.map((o) => {
        const active = o.key === value;
        return (
          <Pressable
            key={String(o.key)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(o.key)}
            style={[styles.segItem, active && { backgroundColor: theme.bg }]}
          >
            <Text style={{ color: active ? theme.ink : theme.muted, fontSize: 13, fontWeight: active ? "600" : "500" }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function SettingRow({ theme, label, children }: { theme: Theme; label: string; children: ReactNode }) {
  return (
    <View style={styles.settingRow}>
      <Text style={{ color: theme.ink, flex: 1, fontSize: 15 }}>{label}</Text>
      {children}
    </View>
  );
}

function Stepper({ theme, label, value, onMinus, onPlus }: { theme: Theme; label: string; value: string; onMinus: () => void; onPlus: () => void }) {
  const btn = (text: string, a11y: string, onPress: () => void) => (
    <Pressable accessibilityRole="button" accessibilityLabel={a11y} onPress={onPress} style={({ pressed }) => [styles.stepBtn, { borderColor: theme.line, opacity: pressed ? 0.5 : 1 }]}>
      <Text style={{ color: theme.ink, fontSize: 18 }}>{text}</Text>
    </Pressable>
  );
  return (
    <SettingRow theme={theme} label={label}>
      {btn("−", `Decrease ${label.toLowerCase()}`, onMinus)}
      <Text style={{ color: theme.ink, width: 48, textAlign: "center", fontSize: 15, fontVariant: ["tabular-nums"] }}>{value}</Text>
      {btn("+", `Increase ${label.toLowerCase()}`, onPlus)}
    </SettingRow>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  left: { minWidth: 44 },
  textBtn: { minWidth: 44, minHeight: 32, justifyContent: "center", alignItems: "center" },
  seg: { flexDirection: "row", borderRadius: 9, padding: 2, flexShrink: 1 },
  segItem: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 7, alignItems: "center" },
  settings: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 12, gap: 10, borderBottomWidth: StyleSheet.hairlineWidth, alignSelf: "center", width: "100%", maxWidth: 560 },
  settingRow: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 36 },
  stepBtn: { width: 36, height: 36, borderRadius: 8, borderWidth: StyleSheet.hairlineWidth, alignItems: "center", justifyContent: "center" },
  progressTrack: { height: 2 },
  scroll: { flex: 1 },
  content: { paddingTop: 40, paddingHorizontal: 24, paddingBottom: 260 },
  column: { alignSelf: "center", maxWidth: 680, width: "100%" },
  controls: { borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 16, paddingTop: 8, gap: 8 },
  status: { textAlign: "center", fontSize: 12, fontVariant: ["tabular-nums"] },
  ctlRow: { flexDirection: "row", gap: 10, alignSelf: "center", width: "100%", maxWidth: 480 },
  ctl: { flex: 1, borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, paddingVertical: 13, alignItems: "center" },
  ctlMain: { flex: 1.3 },
  ctlText: { fontSize: 15, fontWeight: "600" },
});
