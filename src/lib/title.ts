import { cleanText } from "./cleanText";
import { splitSentences } from "./layout";

const MAX_WORDS = 6;
const MAX_HEADING_WORDS = 10;

/**
 * Short title for a pasted text: its heading if it starts with one, otherwise its first sentence
 * cut to a few words. Kept as one function so an AI summary can replace it later.
 */
export function makeTitle(raw: string): string {
  const heading = findHeading(raw);
  const source = heading ?? splitSentences(cleanText(raw)[0] ?? "")[0] ?? "";
  // Leading list markers and opening quotes make poor title starts.
  const words = source.replace(/^[\s\-*•–—"“‘'(\[]+/, "").split(/\s+/).filter(Boolean);
  if (words.length === 0) return "Untitled";
  const limit = heading ? MAX_HEADING_WORDS : MAX_WORDS;
  // Drop trailing commas, colons, full stops and stray quotes; keep ? and ! since they change the meaning.
  const title = words.slice(0, limit).join(" ").replace(/[\s.,;:—–\-"”’']+$/, "");
  return words.length > limit ? `${title}…` : title;
}

/**
 * A heading is a short first line without sentence punctuation that is set apart: a blank line
 * follows it, or it is much shorter than the next line. Hard-wrapped PDF lines are neither.
 */
function findHeading(raw: string): string | null {
  const lines = raw.split(/\r?\n/).map((l) => l.trim());
  const start = lines.findIndex(Boolean);
  if (start < 0) return null;
  const first = lines[start];
  const next = lines[start + 1];
  const nextText = lines.slice(start + 1).find(Boolean);
  if (nextText === undefined) return null;
  if (first.split(/\s+/).length > MAX_HEADING_WORDS || /[.!?,;]$/.test(first)) return null;
  return next === "" || first.length < nextText.length * 0.6 ? first : null;
}
