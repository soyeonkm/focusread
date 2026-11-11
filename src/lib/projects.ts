import AsyncStorage from "@react-native-async-storage/async-storage";

export interface ProjectMeta {
  id: string;
  title: string;
  /** ms since epoch; the list is sorted by this, newest first. */
  createdAt: number;
}

export interface Project extends ProjectMeta {
  /** Raw pasted text; the reader cleans it as it renders. */
  text: string;
}

// The index holds only titles; each text lives under its own key so one big value never has to be rewritten.
// ponytail: on web AsyncStorage is localStorage (~5 MB per site); move to expo-sqlite if users hit that.
const INDEX_KEY = "projects:index";
const textKey = (id: string) => `projects:text:${id}`;

function isMeta(x: unknown): x is ProjectMeta {
  const m = x as ProjectMeta;
  return typeof m?.id === "string" && typeof m.title === "string" && typeof m.createdAt === "number";
}

/** All saved projects, newest first. Missing or corrupt data reads as an empty list. */
export async function listProjects(): Promise<ProjectMeta[]> {
  try {
    const parsed: unknown = JSON.parse((await AsyncStorage.getItem(INDEX_KEY)) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter(isMeta).sort((a, b) => b.createdAt - a.createdAt) : [];
  } catch {
    return [];
  }
}

export async function getProject(id: string): Promise<Project | null> {
  const meta = (await listProjects()).find((p) => p.id === id);
  const text = meta && (await AsyncStorage.getItem(textKey(id)));
  return meta && text != null ? { ...meta, text } : null;
}

export async function createProject(text: string, title: string): Promise<Project> {
  const project: Project = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    title,
    text,
    createdAt: Date.now(),
  };
  // Text first: if the index write fails, nothing points at a missing text.
  await AsyncStorage.setItem(textKey(project.id), text);
  const { text: _, ...meta } = project;
  await AsyncStorage.setItem(INDEX_KEY, JSON.stringify([meta, ...(await listProjects())]));
  return project;
}
