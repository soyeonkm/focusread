import { Redirect, useRouter } from "expo-router";
import { use } from "react";
import { ReaderScreen } from "../../components/ReaderScreen";
import { ThemeContext } from "../../components/theme";
import { getDraft } from "../../lib/draft";

export default function Reader() {
  const { theme, setThemeName } = use(ThemeContext);
  const router = useRouter();
  const text = getDraft();
  // Nothing in memory (e.g. page reloaded): start over until ticket 5 loads saved projects.
  if (!text) return <Redirect href="/" />;
  return (
    <ReaderScreen
      text={text}
      theme={theme}
      onSetTheme={setThemeName}
      onBack={() => (router.canGoBack() ? router.back() : router.replace("/"))}
    />
  );
}
