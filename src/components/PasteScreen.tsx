import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Theme } from "./theme";

const SAMPLE = `Paxos gets agreement right even if some of the replicas are unavailable, have unreliable network connections, or are isolated in their own network partitions. As long as a peer can assemble a majority of replicas, it can process client operations.

Replicas that were not in the majority can catch up later by learning the operations that they missed. Dr. Lamport's insight was that agreement on a single value is enough, if you repeat it once for every slot in a log.

The result is a system where every replica applies the same operations in the same order, even though clients may contact any of them.`;

interface Props {
  theme: Theme;
  initialText: string;
  onRead: (text: string) => void;
}

export function PasteScreen({ theme, initialText, onRead }: Props) {
  const [text, setText] = useState(initialText);
  const insets = useSafeAreaInsets();
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const empty = words === 0;

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: theme.bg, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={[styles.kicker, { color: theme.accent }]}>FOCUSREAD</Text>
        <Text style={[styles.title, { color: theme.ink }]}>Paste something to read</Text>
        <Text style={[styles.sub, { color: theme.muted }]}>
          Paste an article, a chapter or notes. We will clean it up and lay it out so it is easy to follow, one line at a time.
        </Text>

        <TextInput
          value={text}
          onChangeText={setText}
          multiline
          placeholder="Paste text here…"
          placeholderTextColor={theme.muted}
          textAlignVertical="top"
          accessibilityLabel="Text to read"
          style={[styles.input, { color: theme.ink, backgroundColor: theme.panel, borderColor: theme.line }]}
        />

        <View style={styles.row}>
          <Text style={[styles.count, { color: theme.muted }]}>{words.toLocaleString()} words</Text>
          <View style={styles.actions}>
            <Pressable accessibilityRole="button" onPress={() => setText(SAMPLE)} style={[styles.ghost, { borderColor: theme.line }]}>
              <Text style={{ color: theme.ink }}>Try sample</Text>
            </Pressable>
            {!empty && (
              <Pressable accessibilityRole="button" onPress={() => setText("")} style={[styles.ghost, { borderColor: theme.line }]}>
                <Text style={{ color: theme.ink }}>Clear</Text>
              </Pressable>
            )}
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          disabled={empty}
          onPress={() => onRead(text)}
          style={[styles.primary, { backgroundColor: theme.accent, opacity: empty ? 0.4 : 1 }]}
        >
          <Text style={[styles.primaryText, { color: theme.onAccent }]}>Start reading</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 20, maxWidth: 760, width: "100%", alignSelf: "center" },
  kicker: { fontSize: 12, fontWeight: "800", letterSpacing: 2, marginBottom: 8 },
  title: { fontSize: 30, fontWeight: "800", marginBottom: 8 },
  sub: { fontSize: 15, lineHeight: 22, marginBottom: 20 },
  input: { minHeight: 260, borderWidth: 1, borderRadius: 14, padding: 16, fontSize: 16, lineHeight: 24 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginVertical: 14 },
  actions: { flexDirection: "row", gap: 8 },
  count: { fontSize: 13 },
  ghost: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  primary: { borderRadius: 14, paddingVertical: 16, alignItems: "center" },
  primaryText: { fontSize: 17, fontWeight: "700" },
});
