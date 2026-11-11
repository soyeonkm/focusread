import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { PasteScreen } from "./src/components/PasteScreen";
import { ReaderScreen } from "./src/components/ReaderScreen";
import { THEMES, ThemeName } from "./src/components/theme";

export default function App() {
  const [themeName, setThemeName] = useState<ThemeName>("light");
  const [text, setText] = useState("");
  const [reading, setReading] = useState(false);
  const theme = THEMES[themeName];

  return (
    <SafeAreaProvider>
      <StatusBar style={themeName === "dark" ? "light" : "dark"} />
      {reading ? (
        <ReaderScreen text={text} theme={theme} onSetTheme={setThemeName} onBack={() => setReading(false)} />
      ) : (
        <PasteScreen
          theme={theme}
          initialText={text}
          onRead={(t) => {
            setText(t);
            setReading(true);
          }}
        />
      )}
    </SafeAreaProvider>
  );
}
