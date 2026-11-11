import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SidebarToggle } from "./Sidebar";
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
      style={[styles.root, { backgroundColor: theme.bg, paddingTop: insets.top + 10, paddingBottom: insets.bottom + 16 }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.header}>
        <SidebarToggle theme={theme} />
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={[styles.mark, { color: theme.accent }]}>FocusRead</Text>
        <Text style={[styles.title, { color: theme.ink }]}>What are you reading?</Text>
        <Text style={[styles.sub, { color: theme.muted }]}>
          Paste an article, a chapter or your notes. Broken line wraps and page numbers get tidied up.
        </Text>

        <TextInput
          value={text}
          onChangeText={setText}
          multiline
          placeholder="Paste text here"
          placeholderTextColor={theme.muted}
          textAlignVertical="top"
          accessibilityLabel="Text to read"
          style={[styles.input, { color: theme.ink, borderColor: theme.line }]}
        />

        <View style={styles.row}>
          <Text style={[styles.small, { color: theme.muted }]}>
            {words.toLocaleString()} {words === 1 ? "word" : "words"}
          </Text>
          <View style={styles.links}>
            <Pressable accessibilityRole="button" hitSlop={8} onPress={() => setText(SAMPLE)}>
              <Text style={[styles.small, { color: theme.ink, fontWeight: "500" }]}>Use sample text</Text>
            </Pressable>
            {!empty && (
              <Pressable accessibilityRole="button" hitSlop={8} onPress={() => setText("")}>
                <Text style={[styles.small, { color: theme.ink, fontWeight: "500" }]}>Clear</Text>
              </Pressable>
            )}
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          disabled={empty}
          onPress={() => onRead(text)}
          style={({ pressed }) => [styles.primary, { backgroundColor: theme.ink, opacity: empty ? 0.3 : pressed ? 0.8 : 1 }]}
        >
          <Text style={[styles.primaryText, { color: theme.onInk }]}>Start reading</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { height: 36, paddingHorizontal: 16, flexDirection: "row", alignItems: "center" },
  content: { paddingHorizontal: 24, paddingVertical: 16, maxWidth: 640, width: "100%", alignSelf: "center" },
  mark: { fontSize: 15, fontWeight: "600", marginBottom: 32 },
  title: { fontSize: 28, lineHeight: 34, fontWeight: "600", letterSpacing: -0.4, marginBottom: 8 },
  sub: { fontSize: 15, lineHeight: 22, marginBottom: 24 },
  input: { minHeight: 280, borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, padding: 16, fontSize: 16, lineHeight: 24 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12, marginBottom: 28 },
  links: { flexDirection: "row", gap: 20 },
  small: { fontSize: 14 },
  primary: { borderRadius: 10, paddingVertical: 15, alignItems: "center" },
  primaryText: { fontSize: 16, fontWeight: "600", letterSpacing: 0.2 },
});
