import { cleanText } from "./cleanText";

export type LayoutMode = "sentence" | "paragraph";

export interface Line {
  text: string;
  /** Index of the paragraph this line came from; the UI adds spacing when it changes. */
  paragraph: number;
}

const ABBREVIATIONS = new Set([
  "mr", "mrs", "ms", "dr", "prof", "sr", "jr", "st", "vs", "etc", "e.g", "i.e",
  "fig", "no", "vol", "pp", "cf", "al", "inc", "ltd", "co", "u.s", "u.k",
]);

/** Split a paragraph into sentences without breaking on abbreviations or initials. */
export function splitSentences(paragraph: string): string[] {
  const words = paragraph.split(/\s+/).filter(Boolean);
  const sentences: string[] = [];
  let current: string[] = [];

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    current.push(word);
    const next = words[i + 1];
    if (next === undefined) break;
    if (endsSentence(word) && /^["“‘(\[]?[A-Z0-9]/.test(next)) {
      sentences.push(current.join(" "));
      current = [];
    }
  }
  if (current.length) sentences.push(current.join(" "));
  return sentences;
}

function endsSentence(word: string): boolean {
  const m = word.match(/^(.*?)([.!?])["”’')\]]*$/);
  if (!m) return false;
  if (m[2] !== ".") return true;
  const stem = m[1].toLowerCase().replace(/^["“‘(\[]+/, "");
  if (ABBREVIATIONS.has(stem)) return false;
  if (/^[a-z]$/i.test(stem)) return false; // single-letter initial: "J. Smith"
  if (/^\d+$/.test(stem) && stem.length <= 2) return false; // "No. 5", list numbers
  return true;
}

export function layoutText(raw: string, mode: LayoutMode): Line[] {
  const paragraphs = cleanText(raw);
  const lines: Line[] = [];

  paragraphs.forEach((para, p) => {
    const rows = mode === "sentence" ? splitSentences(para) : [para];
    for (const text of rows) lines.push({ text, paragraph: p });
  });

  return lines;
}
