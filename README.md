# FocusRead

A reading app for people who lose their place, drift off, or struggle to take in long text
(ADHD, dyslexia, and other focus or reading differences). Paste any text and FocusRead
cleans it up and lays it out one line at a time, with a highlighted focus line and the
rest dimmed.

Built with Expo (React Native) and TypeScript. One codebase runs on iOS, Android and the web.

## Features so far

- Paste text; copied-from-PDF line breaks, hyphenation and page numbers are cleaned up
- Four layouts: even lines, one sentence per row, short phrases, one paragraph per row
- Focus line with dimmed surroundings; tap a line, or use Prev/Next
- Auto-advance at a words-per-minute pace
- Web keyboard controls: arrow keys or j/k to move, space to play/pause
- Adjustable text size, line length and pace; light, sepia and dark themes

## Run it

```bash
npm install
npm run web        # browser
npm run ios        # or: npm run android (needs a simulator, or use the Expo Go app)
npm test           # unit tests for cleanup and layout
npm run typecheck
```

## Layout

- `src/lib/cleanText.ts`: turns pasted text into clean paragraphs
- `src/lib/layout.ts`: even-line wrapping, sentence and phrase splitting (plain TypeScript, tested)
- `src/components/`: paste screen, reader screen, themes
- `App.tsx`: switches between the two screens

## Roadmap

1. Read-along audio with word highlighting
2. Comprehension check-ins and a "lost me" button (LLM, called from a server)
3. EPUB and URL import, share-sheet integration
4. Accounts and sync
5. Gaze tracking to detect drift
