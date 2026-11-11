# Epic: Project sidebar

A left sidebar that lists saved reading projects, like the conversation list in Claude.
Each "project" is one pasted text that was opened with **Start reading**.

## Status

| # | Ticket | Status |
|---|--------|--------|
| 1 | Move navigation to Expo Router | Not started |
| 2 | Project storage | Not started |
| 3 | Automatic project titles | Not started |
| 4 | Sidebar layout (static) | Not started |
| 5 | Wire sidebar to projects | Not started |
| 6 | Polish and mobile pass | Not started |

Update this table as each ticket lands. One branch + PR per ticket.

## What the user sees when it's done

- Opening the site lands on a **new project**: the paste screen, with the sidebar on the left.
- The sidebar is always there on the left. A button collapses it; when collapsed, a button in the
  top-left corner opens it again.
- Sidebar, top to bottom: **New project** button, a horizontal divider, then every saved project,
  newest first.
- Pressing **Start reading** saves the project (text + generated title) and opens the reader.
  Nothing is saved before that.
- Clicking a project in the list opens it in the reader. The open project is highlighted.
- Projects survive a page reload.

## Decisions

| Topic | Decision | Why |
|-------|----------|-----|
| Navigation | Expo Router. `/` = new project, `/p/[id]` = reader for a project. | AGENTS.md requires Expo Router; per-project URLs make reload and browser back work. |
| Storage | Local to the device (no server, no accounts). Library chosen in ticket 2 after checking the SDK 58 docs (`expo-sqlite` key-value store vs. AsyncStorage). | No backend exists; keeps it simple. |
| Titles | Local heuristic for now (first sentence, trimmed). AI summary comes later as its own ticket; `makeTitle` is the only thing it replaces. | Instant, free, offline. AI needs a small server to hold the API key. |
| Narrow screens | Below ~768px the sidebar opens as an overlay drawer that closes after choosing a project, instead of pushing the text aside. | A permanent sidebar on a phone would leave no room to read. |
| Same text twice | Each **Start reading** press creates a new project. | Matches "save when user clicks Start reading"; no dedupe logic. |

## Data model

```ts
interface Project {
  id: string;        // random id, used in the URL
  title: string;
  text: string;      // raw pasted text; the reader cleans it as it does today
  createdAt: number; // ms since epoch; list is sorted by this, newest first
}
```

Reading position, rename and delete are **out of scope** for this epic (see Later).

---

## Ticket 1: Move navigation to Expo Router

**Goal:** same app, same look, but screens are routes. No sidebar yet.

- Install `expo-router` with `npx expo install` and follow the SDK 58 install docs (entry point,
  `app.json` scheme, web output).
- `src/app/_layout.tsx`: root layout. Holds theme state (React context) and `SafeAreaProvider`.
- `src/app/index.tsx`: paste screen.
- `src/app/p/[id].tsx`: reader. Temporary: pass the text in memory until ticket 5 loads it from storage.
- Delete `App.tsx` / `index.ts` once the router entry works.

**Done when:** paste → Start reading → reader works on web; browser back returns to paste;
lint, typecheck, tests pass.

## Ticket 2: Project storage

**Goal:** a small module to save and read projects. No UI.

- `src/lib/projects.ts`: `listProjects()`, `getProject(id)`, `createProject(text, title)`.
- Pick the storage library after reading the SDK 58 docs; must work on web, iOS and Android.
- Handle missing or corrupt saved data by treating it as an empty list (never crash on load).
- Tests for create → list order (newest first) → get by id, and the corrupt-data case.

**Done when:** tests pass; data survives a reload in a quick manual check.

## Ticket 3: Automatic project titles

**Goal:** `makeTitle(text): string`.

- Heuristic: clean the text, take the first sentence, cut to ~6 words at a word boundary,
  add "…" if cut. Fallback "Untitled" for empty text.
- Tests: short text, long first sentence, text that starts with a heading-like line, empty text.

**Done when:** tests pass; titles for 3 to 4 real pasted articles look sensible.

## Ticket 4: Sidebar layout (static)

**Goal:** the sidebar UI with hard-coded sample projects. Nothing saved or loaded yet.

- `src/components/Sidebar.tsx`, rendered from `src/app/_layout.tsx` beside the page content.
- Header: collapse button. Then **New project**, a divider, then the project list (scrolls on its own).
- Collapsed: sidebar hidden, a toggle button pinned top-left that opens it again.
- Narrow screens: overlay drawer with a dimmed backdrop; tap the backdrop to close.
- Match the current look: theme colors, hairline borders, system font, no extra decoration.
- Accessibility: buttons have labels; the toggle says whether it opens or closes the sidebar.

**Done when:** screenshots at 390px and 1280px wide look right in light, sepia and dark;
collapse and expand work at both widths.

## Ticket 5: Wire sidebar to projects

**Goal:** the real feature.

- **Start reading**: `createProject(text, makeTitle(text))`, then go to `/p/<id>`.
- Sidebar list reads `listProjects()` and refreshes after a save.
- Clicking a project goes to `/p/<id>`; the reader loads text with `getProject(id)`.
  Unknown id: show "Project not found" with a link to start a new one.
- **New project** goes to `/` with an empty paste box.
- Highlight the open project in the list.
- Reader's **Back** button: remove it or point it to **New project** (decide here; the sidebar now covers it).

**Done when:** full flow works on web: paste, Start reading, project appears at the top of the list,
reload keeps it, clicking it reopens it, New project gives an empty paste screen.

## Ticket 6: Polish and mobile pass

- Remember collapsed or open sidebar between visits.
- Empty state in the list ("Projects you start reading appear here").
- Long titles truncate to one line with "…".
- Run on iOS or Android (Expo Go or a development build) and fix anything that differs from web.

**Done when:** checked on web plus at least one phone.

---

## Later (not in this epic)

- Rename and delete projects.
- Save reading position per project and resume there.
- AI-generated titles (summary via the Claude API), replacing `makeTitle`.
- Search the project list.
