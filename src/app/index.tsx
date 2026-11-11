import { useRouter } from "expo-router";
import { use } from "react";
import { PasteScreen } from "../components/PasteScreen";
import { ThemeContext } from "../components/theme";
import { setDraft } from "../lib/draft";

export default function NewProject() {
  const { theme } = use(ThemeContext);
  const router = useRouter();
  return (
    <PasteScreen
      theme={theme}
      initialText=""
      onRead={(text) => {
        setDraft(text);
        router.push("/p/draft");
      }}
    />
  );
}
