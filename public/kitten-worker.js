/* global importScripts, ort, piperPhonemize, piperPhonemizeInitialize -- worker built-in, and globals from the scripts loaded below */
// Natural voice for the web: Kitten mini v0.8 on onnxruntime-web, phonemes from espeak-ng (piper-phonemize wasm).
// Started from a blob by src/lib/kitten.ts so it shares the page's cross-origin isolation (needed for threads).
// Messages in:  {type:"init"} | {type:"gen", id, text, speed}
// Messages out: {type:"progress", percent} | {type:"ready"} | {type:"audio", id, samples, words} | {type:"error", id?, message}

const ORT = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.31.1/dist/";
const MODEL = "https://huggingface.co/csukuangfj2/kitten-mini-en-v0_8/resolve/main/";
const PHONEMIZE = "https://huggingface.co/spaces/csukuangfj/piper-phonemize/resolve/main/";
const SPEAKER = 1; // expr-voice-2-f
const SPACE = 16; // token id of " "

// Keep every download in the Cache API so the ~110 MB arrive only once. Wraps fetch so the
// emscripten and onnxruntime loaders get cached too.
const netFetch = self.fetch.bind(self);
self.fetch = async (input, init) => {
  const url = typeof input === "string" ? input : input.url;
  if (!/^https:\/\/(huggingface\.co|cdn\.jsdelivr\.net)\//.test(url)) return netFetch(input, init);
  const cache = await caches.open("kitten-v0_8");
  const hit = await cache.match(url);
  if (hit) return hit;
  const res = await netFetch(url);
  if (res.ok) await cache.put(url, res.clone());
  return res;
};

// Fetched (with CORS) and run from a blob: importScripts straight from these hosts would need CORP headers.
const evalScript = async (url) => {
  const blob = new Blob([await (await fetch(url)).text()], { type: "text/javascript" });
  importScripts(URL.createObjectURL(blob));
};

let session, tokens, voices;

async function fetchWithProgress(url, onBytes) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const reader = res.body.getReader();
  const chunks = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    onBytes(value.length);
  }
  return new Blob(chunks).arrayBuffer();
}

async function init() {
  const total = 78268913 + 3276800 + 17991651; // model + voices + espeak data, for the progress bar
  let got = 0;
  const bump = (n) => {
    got += n;
    postMessage({ type: "progress", percent: Math.min(99, Math.round((100 * got) / total)) });
  };

  // espeak-ng: the emscripten build reads `Module` and fetches its .data/.wasm through locateFile.
  const phonReady = new Promise((resolve) => {
    self.Module = { locateFile: (p) => PHONEMIZE + p, onRuntimeInitialized: resolve };
  });
  await evalScript(PHONEMIZE + "piper-phonemize.js");
  await evalScript(PHONEMIZE + "piper-phonemize-wasm-main.js");

  await evalScript(ORT + "ort.wasm.min.js");
  ort.env.wasm.wasmPaths = ORT;
  ort.env.wasm.numThreads = self.crossOriginIsolated ? Math.min(4, navigator.hardwareConcurrency || 1) : 1;

  const [model, voicesBuf, tokensTxt] = await Promise.all([
    fetchWithProgress(MODEL + "model.onnx", bump),
    fetchWithProgress(MODEL + "voices.bin", bump),
    fetch(MODEL + "tokens.txt").then((r) => r.text()),
  ]);
  voices = new Float32Array(voicesBuf);
  tokens = new Map();
  for (const line of tokensTxt.split("\n")) {
    const m = line.match(/^(.*) (\d+)$/s);
    if (m) tokens.set(m[1], +m[2]);
  }
  session = await ort.InferenceSession.create(model, { executionProviders: ["wasm"] });
  await phonReady;
  bump(17991651);
  piperPhonemizeInitialize();
}

async function generate(text, speed) {
  // Same preprocessing as KittenTTS: phonemes, words and punctuation split apart and joined by spaces.
  const phon = piperPhonemize(text, "en-us")
    .filter((s) => s.length)
    .map((s) => String.fromCodePoint(...s))
    .join(" ");
  const parts = (phon.match(/[\p{L}\p{N}\p{M}_]+|[^\p{L}\p{N}\p{M}_\s]/gu) || []).join(" ");
  const chars = [...parts].filter((c) => tokens.has(c));
  const ids = [0, ...chars.map((c) => tokens.get(c)), 10, 0];

  const row = SPEAKER * 400 + Math.min(text.length, 399);
  const out = await session.run({
    input_ids: new ort.Tensor("int64", BigInt64Array.from(ids.map(BigInt)), [1, ids.length]),
    style: new ort.Tensor("float32", voices.slice(row * 256, row * 256 + 256), [1, 256]),
    speed: new ort.Tensor("float32", new Float32Array([speed]), [1]),
  });
  const wave = out.waveform.data;
  const dur = Array.from(out.duration.data, Number);
  const secsPerFrame = wave.length / dur.reduce((a, b) => a + b, 0) / 24000;

  // Spoken word start times: a run of tokens between spaces is a word (skip punctuation-only runs).
  const spoken = [];
  let frames = dur[0];
  let word = null;
  chars.forEach((c, i) => {
    if (ids[i + 1] === SPACE) {
      if (word && /[\p{L}\p{N}]/u.test(word.s)) spoken.push(word.t);
      word = null;
    } else {
      word ??= { t: frames * secsPerFrame, s: "" };
      word.s += c;
    }
    frames += dur[i + 1];
  });
  if (word && /[\p{L}\p{N}]/u.test(word.s)) spoken.push(word.t);

  // Map onto the written words. espeak can say one written word as several ("2019"), so when the
  // counts differ, line them up by position.
  const written = [...text.matchAll(/\S+/g)];
  const words = written.map((m, i) => ({
    at: m.index,
    t: spoken.length ? spoken[Math.floor((i * spoken.length) / written.length)] : 0,
  }));
  return { samples: wave.slice(0, Math.max(0, wave.length - 5000)), words }; // last 5000 samples are padding
}

let ready;
self.onmessage = async ({ data }) => {
  if (data.type === "init") {
    ready ??= init();
    ready.then(
      () => postMessage({ type: "ready" }),
      (e) => postMessage({ type: "error", message: String(e?.message || e) }),
    );
  } else if (data.type === "gen") {
    try {
      await ready;
      const { samples, words } = await generate(data.text, data.speed);
      postMessage({ type: "audio", id: data.id, samples, words }, [samples.buffer]);
    } catch (e) {
      postMessage({ type: "error", id: data.id, message: String(e?.message || e) });
    }
  }
};
