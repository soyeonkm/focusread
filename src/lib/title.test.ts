import { describe, expect, it } from "vitest";
import { makeTitle } from "./title";

describe("makeTitle", () => {
  it("uses a short first sentence whole, without the full stop", () => {
    expect(makeTitle("Replicas catch up later. They learn what they missed.")).toBe("Replicas catch up later");
  });

  it("cuts a long first sentence to six words with an ellipsis", () => {
    expect(makeTitle("Paxos gets agreement right even if some of the replicas are unavailable.")).toBe(
      "Paxos gets agreement right even if…",
    );
  });

  it("drops trailing punctuation before the ellipsis", () => {
    expect(makeTitle("When the primary fails, the backup takes over and keeps going.")).toBe("When the primary fails, the backup…");
    expect(makeTitle("One two three four five six, seven eight.")).toBe("One two three four five six…");
  });

  it("keeps question marks", () => {
    expect(makeTitle("Why does consensus matter? Because replicas disagree.")).toBe("Why does consensus matter?");
  });

  it("uses a heading line when the text starts with one", () => {
    expect(makeTitle("The Part-Time Parliament\n\nRecent archaeological discoveries on the island of Paxos reveal...")).toBe(
      "The Part-Time Parliament",
    );
    expect(makeTitle("  \nChapter 3: Consensus\nThe first paragraph starts here and keeps going.")).toBe("Chapter 3: Consensus");
  });

  it("keeps a headline whole even past six words", () => {
    expect(makeTitle("City council approves new bike lanes downtown\n\nThe council voted 7-2 on Tuesday.")).toBe(
      "City council approves new bike lanes downtown",
    );
  });

  it("does not treat a hard-wrapped first line as a heading", () => {
    const pdf = "In this paper we present a new algorithm for\nreaching consensus among a set of processes that\ncommunicate over a network. It tolerates crashes.";
    expect(makeTitle(pdf)).toBe("In this paper we present a…");
  });

  it("strips leading list markers and quotes", () => {
    expect(makeTitle("- buy milk\n- call mom")).toBe("buy milk - call mom");
    expect(makeTitle('"It was the best of times, it was the worst of times," wrote Dickens.')).toBe("It was the best of times…");
  });

  it("does not treat a lone short line as a heading", () => {
    expect(makeTitle("Just a note")).toBe("Just a note");
  });

  it("does not split on abbreviations", () => {
    expect(makeTitle("Dr. Lamport wrote it. Then others followed.")).toBe("Dr. Lamport wrote it");
  });

  it("falls back to Untitled for empty text", () => {
    expect(makeTitle("")).toBe("Untitled");
    expect(makeTitle("   \n\n  ")).toBe("Untitled");
  });
});
