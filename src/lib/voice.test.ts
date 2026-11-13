import { describe, expect, it, vi } from "vitest";

vi.mock("expo-speech", () => ({}));
const { estimateWordTimes, queuedVoice } = await import("./voice");

type Clip = { text: string; words: { at: number; t: number }[] };

function fake() {
  const generated: string[] = [];
  const discarded: string[] = [];
  let playing: { clip: Clip; onTime: (t: number) => void; onEnd: () => void } | null = null;
  const voice = queuedVoice<Clip>(
    {
      generate: async (text) => {
        generated.push(text);
        return { text, words: estimateWordTimes(text, 1) };
      },
      play: (clip, onTime, onEnd) => {
        playing = { clip, onTime, onEnd };
        return () => (playing = null);
      },
      discard: (clip) => discarded.push(clip.text),
    },
    () => {},
  );
  return { voice, generated, discarded, playing: () => playing };
}

const tick = () => new Promise((r) => setTimeout(r, 0));

describe("estimateWordTimes", () => {
  it("spreads word starts over the clip by character position", () => {
    expect(estimateWordTimes("ab cd", 1)).toEqual([
      { at: 0, t: 0 },
      { at: 3, t: 0.6 },
    ]);
  });
});

describe("queuedVoice", () => {
  it("reports words as the playhead passes them, then finishes", async () => {
    const f = fake();
    const words: number[] = [];
    const onDone = vi.fn();
    f.voice.speak("ab cd", { rate: 1, onWord: (i) => words.push(i), onDone });
    await tick();
    f.playing()!.onTime(0.1);
    expect(words).toEqual([0]);
    f.playing()!.onTime(0.7);
    expect(words).toEqual([0, 3]);
    f.playing()!.onEnd();
    expect(onDone).toHaveBeenCalled();
  });

  it("reuses a prepared utterance instead of generating it again", async () => {
    const f = fake();
    f.voice.prepare!("next one.", 1);
    f.voice.speak("next one.", { rate: 1, onWord: () => {}, onDone: () => {} });
    await tick();
    expect(f.generated).toEqual(["next one."]);
    expect(f.playing()!.clip.text).toBe("next one.");
  });

  it("drops results that arrive after stop", async () => {
    const f = fake();
    f.voice.speak("old.", { rate: 1, onWord: () => {}, onDone: () => {} });
    await f.voice.stop();
    await tick();
    expect(f.playing()).toBeNull();
    expect(f.discarded).toEqual(["old."]);
  });
});
