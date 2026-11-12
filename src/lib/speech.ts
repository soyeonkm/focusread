import { Line, splitSentences } from "./layout";

/** Where each chunk starts within its paragraph's text. */
export function chunkStarts(lines: Line[], paragraphs: string[]): number[] {
  let para = -1;
  let at = 0;
  return lines.map((l) => {
    if (l.paragraph !== para) {
      para = l.paragraph;
      at = 0;
    }
    const i = paragraphs[para].indexOf(l.text, at);
    at = i + l.text.length;
    return i;
  });
}

/** What to speak from `offset` in a paragraph: the rest of the sentence there. Null at the paragraph's end. */
export function utteranceAt(paragraph: string, offset: number): { start: number; text: string } | null {
  let end = 0;
  for (const s of splitSentences(paragraph)) {
    const start = paragraph.indexOf(s, end);
    end = start + s.length;
    if (offset < end) {
      const from = Math.max(offset, start);
      return { start: from, text: paragraph.slice(from, end) };
    }
  }
  return null;
}

/** The chunk in paragraph `p` that contains character `pos`. */
export function chunkAt(lines: Line[], starts: number[], p: number, pos: number): number {
  let found = -1;
  lines.forEach((l, i) => {
    if (l.paragraph === p && (found < 0 || starts[i] <= pos)) found = i;
  });
  return found;
}
