import { useRouter } from "expo-router";
import { use } from "react";
import { PasteScreen } from "../components/PasteScreen";
import { SidebarContext } from "../components/Sidebar";
import { ThemeContext } from "../components/theme";
import { createProject } from "../lib/projects";
import { makeTitle } from "../lib/title";

export default function NewProject() {
  const { theme } = use(ThemeContext);
  const { addProject } = use(SidebarContext);
  const router = useRouter();
  return (
    <PasteScreen
      theme={theme}
      onRead={async (text) => {
        const { text: _, ...meta } = await createProject(text, makeTitle(text));
        addProject(meta);
        router.push(`/p/${meta.id}`);
      }}
    />
  );
}
