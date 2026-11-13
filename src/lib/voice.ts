import * as Speech from "expo-speech";

export type KittenState = "idle" | "downloading" | "ready" | "failed" | "unsupported";
export type KittenStatus = { state: KittenState; percent: number };

export function createStatus(initial: KittenStatus) {
  let status = initial;
  const subs = new Set<() => void>();
  return {
    get: () => status,
    set(s: KittenStatus) {
      status = s;
      subs.forEach((f) => f());
    },
    subscribe(f: () => void) {
      subs.add(f);
      return () => void subs.delete(f);
    },
  };
}

export interface Voice {
  /** Speak one utterance. onWord gets offsets into `text` where spoken words start. */
  speak(text: string, o: { rate: number; onWord: (charIndex: number) => void; onDone: () => void }): void;
  /** Hint that `text` is probably next, so it can be prepared while the current one plays. */
  prepare?(text: string, rate: number): void;
  stop(): Promise<void>;
}

export const deviceVoice: Voice = {
  speak: (text, { rate, onWord, onDone }) =>
    Speech.speak(text, { rate, onBoundary: (e: { charIndex: number }) => onWord(e.charIndex), onDone }),
  stop: () => Speech.stop(),
};

/** A word: where it starts in the text and when (seconds into the audio) it is spoken. */
export type WordTime = { at: number; t: number };

/** Word start times when only the clip length is known: spread by character position. */
export function estimateWordTimes(text: string, seconds: number): WordTime[] {
  return [...text.matchAll(/\S+/g)].map((m) => ({ at: m.index, t: (seconds * m.index) / text.length }));
}

export interface Backend<C extends { words: WordTime[] }> {
  generate(text: string, rate: number): Promise<C>;
  /** Start playing; report the playhead in seconds; return a function that stops playback. */
  play(clip: C, onTime: (t: number) => void, onEnd: () => void): () => void;
  /** Free a clip that will not be played. */
  discard(clip: C): void;
}

/**
 * Turns a generate-then-play engine into a Voice: one generation at a time, the next utterance
 * generated while the current one plays, and stale results dropped after stop().
 */
export function queuedVoice<C extends { words: WordTime[] }>(b: Backend<C>, onError: (e: unknown) => void): Voice {
  const cache = new Map<string, Promise<C>>();
  let chain: Promise<unknown> = Promise.resolve();
  let gen = 0;
  let stopPlaying: (() => void) | null = null;

  const get = (text: string, rate: number) => {
    const key = `${rate}|${text}`;
    let p = cache.get(key);
    if (!p) {
      p = chain.then(() => b.generate(text, rate));
      chain = p.catch(() => {});
      cache.set(key, p);
    }
    return { key, p };
  };

  return {
    prepare: (text, rate) => void get(text, rate).p.catch(() => {}),
    speak(text, { rate, onWord, onDone }) {
      const my = ++gen;
      const { key, p } = get(text, rate);
      p.then(
        (clip) => {
          const ours = cache.get(key) === p; // stop() clears the cache and discards what was in it.
          cache.delete(key);
          if (my !== gen) return ours && b.discard(clip);
          let next = 0;
          stopPlaying = b.play(
            clip,
            (t) => {
              while (next < clip.words.length && clip.words[next].t <= t) onWord(clip.words[next++].at);
            },
            () => {
              stopPlaying = null;
              onDone();
            },
          );
        },
        (e) => {
          cache.delete(key);
          if (my === gen) onError(e);
        },
      );
    },
    async stop() {
      gen++;
      stopPlaying?.();
      stopPlaying = null;
      for (const p of cache.values()) p.then(b.discard, () => {});
      cache.clear();
    },
  };
}
