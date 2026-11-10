/**
 * Turns pasted text (often copied from a PDF or web page) into clean paragraphs.
 * Returns an array of paragraphs, each a single line of text with no hard wraps.
 */

const TERMINAL = /[.!?:"”’')\]]$/;
const PAGE_NUMBER_LINE = /^\s*(page\s+)?\d{1,4}\s*$/i;

export function cleanText(raw: string): string[] {
  let text = raw
    .replace(/\r\n?/g, "\n")
    .replace(/ /g, " ")
    .replace(/[\t\f\v]+/g, " ")
    // Re-join words split by a hyphen at a line break: "compre-\nhension"
    .replace(/(\p{L})-\n(\p{L})/gu, "$1$2");

  const lines = text
    .split("\n")
    .map((l) => l.replace(/ {2,}/g, " ").trim())
    // Drop lines that are only a page number.
    .filter((l, i, all) => !(PAGE_NUMBER_LINE.test(l) && l !== "" && isIsolated(all, i)));

  const hasBlankLines = lines.some((l) => l === "");
  const paragraphs: string[] = [];
  let current: string[] = [];

  const flush = () => {
    if (current.length) {
      paragraphs.push(current.join(" ").replace(/ {2,}/g, " ").trim());
      current = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line === "") {
      flush();
      continue;
    }
    current.push(line);
    if (!hasBlankLines) {
      // No blank lines at all: guess paragraph ends. A line that finishes a sentence
      // and is noticeably shorter than the longest line probably ends a paragraph.
      const next = lines[i + 1];
      const endsSentence = TERMINAL.test(line);
      if (next === undefined || (endsSentence && startsNewParagraph(line, next, lines))) {
        flush();
      }
    }
  }
  flush();

  return paragraphs.filter((p) => p.length > 0);
}

/** A page-number line only counts as noise when blank lines or text edges surround it. */
function isIsolated(all: string[], i: number): boolean {
  const prev = all[i - 1];
  const next = all[i + 1];
  return prev === undefined || next === undefined || prev === "" || next === "" || all.length > 3;
}

function startsNewParagraph(line: string, next: string, all: string[]): boolean {
  const longest = all.reduce((m, l) => Math.max(m, l.length), 0);
  const shortLine = line.length < longest * 0.7;
  const nextStartsUpper = /^["“‘(\[]?[A-Z0-9]/.test(next);
  return shortLine && nextStartsUpper;
}
