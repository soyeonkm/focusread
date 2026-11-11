import { beforeEach, describe, expect, it, vi } from "vitest";

const store = new Map<string, string>();
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: async (k: string) => store.get(k) ?? null,
    setItem: async (k: string, v: string) => void store.set(k, v),
  },
}));

const { createProject, getProject, listProjects } = await import("./projects");

describe("projects", () => {
  beforeEach(() => store.clear());

  it("starts empty", async () => {
    expect(await listProjects()).toEqual([]);
  });

  it("creates, lists newest first, and gets by id", async () => {
    const a = await createProject("first text", "First");
    await new Promise((r) => setTimeout(r, 2));
    const b = await createProject("second text", "Second");
    expect((await listProjects()).map((p) => p.title)).toEqual(["Second", "First"]);
    expect(await getProject(a.id)).toEqual(a);
    expect((await getProject(b.id))?.text).toBe("second text");
  });

  it("returns null for an unknown id", async () => {
    expect(await getProject("nope")).toBeNull();
  });

  it("treats corrupt saved data as an empty list and still saves", async () => {
    store.set("projects:index", "{not json");
    expect(await listProjects()).toEqual([]);
    store.set("projects:index", JSON.stringify([{ id: 1 }, "junk"]));
    expect(await listProjects()).toEqual([]);
    await createProject("text", "Ok");
    expect((await listProjects()).map((p) => p.title)).toEqual(["Ok"]);
  });
});
