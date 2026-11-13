import { useSyncExternalStore } from "react";
import { createStatus, queuedVoice, type WordTime } from "./voice";

// Natural voice (Kitten TTS) on the web. iOS and Android use kitten.native.ts.
// The model runs in public/kitten-worker.js; this side plays the audio and reports words.

// Threads need cross-origin isolation. A service worker adds the headers for it; the first visit
// reloads once so the worker can take over the page.
if (typeof navigator !== "undefined" && "serviceWorker" in navigator && !globalThis.crossOriginIsolated) {
  navigator.serviceWorker.register("/coi-sw.js").then(
    () => {
      try {
        if (sessionStorage.getItem("coi-reloaded")) return; // Never loop if isolation still fails.
        sessionStorage.setItem("coi-reloaded", "1");
      } catch {
        return;
      }
      if (navigator.serviceWorker.controller) location.reload();
      else navigator.serviceWorker.addEventListener("controllerchange", () => location.reload());
    },
    () => {}, // No service worker: the voice runs on one thread.
  );
}

const supported = typeof Worker !== "undefined" && typeof WebAssembly !== "undefined" && typeof AudioContext !== "undefined";
const status = createStatus({ state: supported ? "idle" : "unsupported", percent: 0 });
export const useKittenStatus = () => useSyncExternalStore(status.subscribe, status.get, status.get);

let worker: Worker | null = null;
let nextId = 0;
const pending = new Map<number, { resolve: (c: Clip) => void; reject: (e: Error) => void }>();

/** Download (first time only; then from the Cache API) and load the model. Retries after a failure. */
export function loadKitten() {
  const { state } = status.get();
  if (state !== "idle" && state !== "failed") return;
  status.set({ state: "downloading", percent: 0 });
  worker?.terminate();
  (async () => {
    // From a blob so the worker shares the page's cross-origin isolation (threads need it).
    const src = await (await fetch("/kitten-worker.js")).text();
    worker = new Worker(URL.createObjectURL(new Blob([src], { type: "text/javascript" })));
    worker.onmessage = ({ data }) => {
      if (data.type === "progress") status.set({ state: "downloading", percent: data.percent });
      else if (data.type === "ready") status.set({ state: "ready", percent: 100 });
      else if (data.type === "audio") pending.get(data.id)?.resolve({ samples: data.samples, words: data.words });
      else if (data.type === "error") {
        const p = data.id === undefined ? undefined : pending.get(data.id);
        if (p) p.reject(new Error(data.message));
        else fail(data.message);
      }
      if (data.id !== undefined) pending.delete(data.id);
    };
    worker.postMessage({ type: "init" });
  })().catch(fail);
}

function fail(e: unknown) {
  console.warn("Natural voice failed", e);
  status.set({ state: "failed", percent: 0 });
}

type Clip = { samples: Float32Array; words: WordTime[] };
let audio: AudioContext | null = null;

export const kittenVoice = queuedVoice<Clip>(
  {
    generate: (text, rate) =>
      new Promise((resolve, reject) => {
        const id = nextId++;
        pending.set(id, { resolve, reject });
        worker!.postMessage({ type: "gen", id, text, speed: rate });
      }),
    play(clip, onTime, onEnd) {
      audio ??= new AudioContext();
      void audio.resume();
      const ctx = audio;
      const buf = ctx.createBuffer(1, clip.samples.length, 24000);
      buf.copyToChannel(clip.samples as Float32Array<ArrayBuffer>, 0);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      const startedAt = ctx.currentTime;
      const timer = setInterval(() => onTime(ctx.currentTime - startedAt), 50);
      src.onended = () => {
        clearInterval(timer);
        onEnd();
      };
      src.start();
      return () => {
        clearInterval(timer);
        src.onended = null;
        src.stop();
      };
    },
    discard: () => {},
  },
  fail,
);
