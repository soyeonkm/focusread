import { describe, expect, it } from "vitest";
import { cleanText } from "./cleanText";
import { layoutText, splitPhrases, splitSentences, wrapEven } from "./layout";

describe("cleanText", () => {
  it("joins hard-wrapped lines inside a paragraph", () => {
    const raw = "The quick brown fox jumps over\nthe lazy dog and keeps going\nuntil the end.\n\nSecond paragraph here.";
    expect(cleanText(raw)).toEqual([
      "The quick brown fox jumps over the lazy dog and keeps going until the end.",
      "Second paragraph here.",
    ]);
  });

  it("repairs words hyphenated across a line break", () => {
    expect(cleanText("This improves compre-\nhension a lot.")).toEqual(["This improves comprehension a lot."]);
  });

  it("keeps real hyphens that are not at a line break", () => {
    expect(cleanText("A well-known result.")).toEqual(["A well-known result."]);
  });

  it("removes lone page numbers", () => {
    const raw = "First paragraph ends here.\n\n12\n\nSecond paragraph starts here.";
    expect(cleanText(raw)).toEqual(["First paragraph ends here.", "Second paragraph starts here."]);
  });

  it("splits paragraphs when the text has no blank lines", () => {
    const raw = [
      "This is a long line of text that wraps around because the page was narrow and",
      "continues on the next line until the sentence ends at last.",
      "Short ending.",
      "A new paragraph begins here and also runs long enough to look like a full line of",
      "text before it finishes.",
    ].join("\n");
    const out = cleanText(raw);
    expect(out).toHaveLength(2);
    expect(out[0]).toMatch(/^This is a long line .* Short ending\.$/);
  });

  it("handles empty input", () => {
    expect(cleanText("")).toEqual([]);
    expect(cleanText("  \n \n")).toEqual([]);
  });
});

describe("splitSentences", () => {
  it("splits on sentence ends", () => {
    expect(splitSentences("It works. Does it? Yes! Great.")).toEqual(["It works.", "Does it?", "Yes!", "Great."]);
  });

  it("does not split on abbreviations, initials, or decimals", () => {
    expect(splitSentences("Dr. Smith met J. Doe at 3.5 percent, e.g. Tuesday. Then they left.")).toEqual([
      "Dr. Smith met J. Doe at 3.5 percent, e.g. Tuesday.",
      "Then they left.",
    ]);
  });

  it("keeps closing quotes with their sentence", () => {
    expect(splitSentences('He said "stop." Then he left.')).toEqual(['He said "stop."', "Then he left."]);
  });
});

describe("wrapEven", () => {
  const text =
    "Paxos gets agreement right even if some of the replicas are unavailable, have unreliable network connections, or are isolated in partitions.";

  it("never exceeds the max width unless a single word is longer", () => {
    for (const line of wrapEven(text, 40)) expect(line.length).toBeLessThanOrEqual(40);
  });

  it("balances line lengths", () => {
    const lines = wrapEven(text, 40);
    const lengths = lines.map((l) => l.length);
    expect(Math.max(...lengths) - Math.min(...lengths)).toBeLessThanOrEqual(12);
  });

  it("uses no more lines than a greedy wrap", () => {
    expect(wrapEven(text, 40).join(" ")).toBe(text);
  });

  it("handles words longer than the width", () => {
    expect(wrapEven("a supercalifragilistic word", 5)).toEqual(["a", "supercalifragilistic", "word"]);
  });
});

describe("splitPhrases", () => {
  it("breaks at commas and merges tiny fragments", () => {
    const out = splitPhrases(
      "When the primary fails, the backup takes over, and clients retry their requests on another server.",
      52,
    );
    expect(out.join(" ")).toBe(
      "When the primary fails, the backup takes over, and clients retry their requests on another server.",
    );
    expect(out.length).toBeGreaterThan(1);
    for (const p of out) expect(p.length).toBeLessThanOrEqual(52);
  });
});

describe("layoutText", () => {
  const raw = "First sentence here. Second one follows, with a clause.\n\nNew paragraph starts.";

  it("sentence mode gives one row per sentence with paragraph indices", () => {
    expect(layoutText(raw, "sentence")).toEqual([
      { text: "First sentence here.", paragraph: 0 },
      { text: "Second one follows, with a clause.", paragraph: 0 },
      { text: "New paragraph starts.", paragraph: 1 },
    ]);
  });

  it("paragraph mode gives one row per paragraph", () => {
    expect(layoutText(raw, "paragraph")).toHaveLength(2);
  });

  it("every mode preserves all the words", () => {
    const words = (s: string) => s.split(/\s+/).filter(Boolean).join(" ");
    for (const mode of ["even", "sentence", "phrase", "paragraph"] as const) {
      const joined = layoutText(raw, mode).map((l) => l.text).join(" ");
      expect(words(joined)).toBe(words(raw));
    }
  });
});
