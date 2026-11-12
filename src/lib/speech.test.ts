import { describe, expect, it } from "vitest";
import { chunkAt, chunkStarts, utteranceAt } from "./speech";

const paras = ["One two. Three four five. Six.", "Seven eight."];

describe("chunkStarts", () => {
  it("finds sentences, which are joined by one space", () => {
    const lines = [
      { text: "One two.", paragraph: 0 },
      { text: "Three four five.", paragraph: 0 },
      { text: "Six.", paragraph: 0 },
      { text: "Seven eight.", paragraph: 1 },
    ];
    expect(chunkStarts(lines, paras)).toEqual([0, 9, 26, 0]);
  });

  it("finds on-screen line slices, which carry their own spaces", () => {
    const lines = [
      { text: "One two. Three ", paragraph: 0 },
      { text: "four five. Six.", paragraph: 0 },
      { text: "Seven eight.", paragraph: 1 },
    ];
    expect(chunkStarts(lines, paras)).toEqual([0, 15, 0]);
  });
});

describe("utteranceAt", () => {
  it("reads to the end of the sentence from the start", () => {
    expect(utteranceAt(paras[0], 0)).toEqual({ start: 0, text: "One two." });
  });

  it("reads the rest of the sentence when starting mid-sentence", () => {
    expect(utteranceAt(paras[0], 15)).toEqual({ start: 15, text: "four five." });
  });

  it("skips the space after a sentence", () => {
    expect(utteranceAt(paras[0], 8)).toEqual({ start: 9, text: "Three four five." });
  });

  it("returns null at the end of the paragraph", () => {
    expect(utteranceAt(paras[0], paras[0].length)).toBeNull();
  });
});

describe("chunkAt", () => {
  const lines = [
    { text: "One two. Three ", paragraph: 0 },
    { text: "four five. Six.", paragraph: 0 },
    { text: "Seven eight.", paragraph: 1 },
  ];
  const starts = chunkStarts(lines, paras);

  it("maps a spoken position to the line that contains it", () => {
    expect(chunkAt(lines, starts, 0, 9)).toBe(0); // "Three"
    expect(chunkAt(lines, starts, 0, 15)).toBe(1); // "four"
    expect(chunkAt(lines, starts, 1, 6)).toBe(2);
  });
});
