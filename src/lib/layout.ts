import { cleanText } from "./cleanText";

export type LayoutMode = "even" | "sentence" | "phrase" | "paragraph";

export interface Line {
  text: string;
  /** Index of the paragraph this line came from; the UI adds spacing when it changes. */
  paragraph: number;
}

export interface LayoutOptions {
  /** Target maximum characters per line (used by "even" and "phrase"). */
  maxChars: number;
}

export const DEFAULT_OPTIONS: LayoutOptions = { maxChars: 52 };

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

/**
 * Wrap text into lines of similar length. Finds the narrowest width that still fits in the
 * same number of lines as a greedy wrap at maxChars, so lines come out balanced instead of
 * ending with one long line and one stub.
 */
export function wrapEven(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const longestWord = words.reduce((m, w) => Math.max(m, w.length), 0);
  const limit = Math.max(maxChars, longestWord);
  const target = greedy(words, limit).length;

  let lo = longestWord;
  let hi = limit;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (greedy(words, mid).length <= target) hi = mid;
    else lo = mid + 1;
  }
  return greedy(words, lo);
}

function greedy(words: string[], width: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    if (line === "") line = w;
    else if (line.length + 1 + w.length <= width) line += " " + w;
    else {
      lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** Break a sentence into short idea-sized chunks at punctuation. */
export function splitPhrases(sentence: string, maxChars: number, minChars = 18): string[] {
  // Avoids regex lookbehind, which some mobile JS engines do not support.
  const pieces = (sentence.match(/[^,;:—–]+[,;:—–]*\s*/g) ?? [sentence]).map((p) => p.trim()).filter(Boolean);
  const merged: string[] = [];
  for (const piece of pieces) {
    const last = merged[merged.length - 1];
    if (last !== undefined && (last.length < minChars || piece.length < minChars) && last.length + 1 + piece.length <= maxChars) {
      merged[merged.length - 1] = last + " " + piece;
    } else {
      merged.push(piece);
    }
  }
  return merged.flatMap((m) => (m.length > maxChars ? wrapEven(m, maxChars) : [m]));
}

export function layoutText(raw: string, mode: LayoutMode, options: LayoutOptions = DEFAULT_OPTIONS): Line[] {
  const paragraphs = cleanText(raw);
  const lines: Line[] = [];

  paragraphs.forEach((para, p) => {
    let rows: string[];
    switch (mode) {
      case "even":
        rows = wrapEven(para, options.maxChars);
        break;
      case "sentence":
        rows = splitSentences(para);
        break;
      case "phrase":
        rows = splitSentences(para).flatMap((s) => splitPhrases(s, options.maxChars));
        break;
      case "paragraph":
        rows = [para];
        break;
    }
    for (const text of rows) lines.push({ text, paragraph: p });
  });

  return lines;
}
