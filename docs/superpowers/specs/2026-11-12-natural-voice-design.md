# Natural voice (Kitten TTS)

Read aloud uses a realistic on-device voice (Kitten mini v0.8, female, speaker id 1) instead of
the device's built-in voice, on iOS, Android and web. The device voice stays as the fallback.

## What the user sees

- Settings: **Read aloud** On/Off (exists), plus **Voice**: Natural | Device. Natural is the default.
- First use of Natural downloads the model once (~64 MB native, ~110 MB web incl. runtime) with
  progress shown in the settings row ("Downloading voice… 40%"). It is kept on the device.
- Until the download finishes, or if it fails or the device is offline, the Device voice reads.
  A failed download shows "Voice download failed, tap to retry". No other UI changes.
- Play, Pause, Next, Previous, tapping a chunk and changing mode behave exactly as they do today.

## Delivery: three PRs

1. **Device voice** — the existing `tts` branch (expo-speech, highlight follows the voice). Ships as is.
2. **Natural voice, iOS + Android.**
3. **Natural voice, web.**

PR 2 and 3 each get their own plan. PR 1 needs no plan.

## Architecture

One engine interface; the reader only chooses which one to use.

```ts
// src/lib/voice/types.ts
interface Voice {
  /** Speak one utterance. onWord gets char offsets into `text` as they are spoken. */
  speak(text: string, opts: { rate: number; onWord(charIndex: number): void; onDone(): void }): void;
  stop(): void;
}
```

- `deviceVoice` wraps expo-speech (today's code moved behind the interface).
- `kittenVoice` (`kitten.native.ts` / `kitten.web.ts`, platform files picked by Metro).
- `useVoice(setting)` returns Kitten when its model is ready, else `deviceVoice`.
- ReaderScreen's speak effect calls `voice.speak` / `voice.stop` instead of `Speech.*`.
  `utteranceAt`, `chunkAt`, the remap-on-mode-change logic and the `gen` guard stay unchanged.

### Kitten engine behaviour (both platforms)

- Generate one sentence at a time. While a sentence plays, generate the next one (prefetch 1)
  so there is no gap. `stop()` drops queued audio and any in-flight result (generation counter).
- First sentence after Play has a delay of up to ~2–3 s on a phone; acceptable for v1.
- Rate: Kitten `speed` = the same `wpm/180` value, clamped 0.5–2.
- Word timing → `onWord(charIndex)` fired from the audio clock (polled every ~50 ms against the
  word start times).

### Native (PR 2)

- `react-native-sherpa-onnx@0.4.4`, patched with `patch-package` so its iOS build uses the
  prebuilt `sherpa-onnx-ios-v1.13.8-1` (1.12.35 cannot load Kitten v0.8:
  `style_dim[0] should be 1, given: 400`). Patch = release tag + header/library symlinks found in
  the spike. Android: check whether the bundled AAR has the same problem; patch the same way.
- Model: the sherpa-onnx `kitten-mini-en-v0_8` release archive, downloaded and unpacked into the
  app's document directory (use the wrapper's download helper if it unpacks; otherwise
  expo-file-system + the wrapper's extract). Ready = marker file written after unpack.
- Timing: wrapper's `estimated` timestamps (proportional). Good enough for line highlighting.
- Audio: play each generated buffer with expo-audio (worked in the spike) unless the wrapper's
  own player is simpler.
- Requires a development build (`npx expo run:ios|android`); Expo Go no longer runs the app.
  Config goes through app.json/config plugins only.

### Web (PR 3)

- `onnxruntime-web` (wasm, 4 threads) + piper-phonemize (espeak-ng wasm), in a Web Worker.
- Pipeline (from the spike): espeak en-us phonemes → split with
  `/[\p{L}\p{N}\p{M}_]+|[^\p{L}\p{N}\p{M}_\s]/gu`, join with spaces → map chars via tokens.txt,
  wrap `[0, …, 10, 0]` → style = voices.bin row `(sid*400 + min(len,399)) * 256`, shape [1,256];
  speed [1] → drop last 5000 output samples → play at 24 kHz via Web Audio.
- Word timing: model `duration` output (600 samples per token); token 16 (space) marks word
  boundaries. Align phoneme words to text words; where counts differ (numbers, abbreviations)
  spread the gap proportionally.
- Threads need `crossOriginIsolated`. As built: a small service worker (`public/coi-sw.js`) adds COOP
  `same-origin` + COEP `require-corp` to the site's own responses, because Expo's dev server ignores
  header config for single-page web output. Works on any host; the first visit reloads once.
  Without it: 1 thread (~real time).
- Model files cached with the Cache API after first download.

## Errors

- Model download fails or is interrupted → partial files deleted, Device voice used, retry offered.
- Engine init or generation throws → log, switch to Device voice for the session, keep reading
  from the current chunk.

## Licensing

espeak-ng / piper-phonemize are GPL-3.0. The repo LICENSE (currently the Expo template's MIT)
becomes GPL-3.0 in PR 2. Kitten weights are Apache-2.0.

## Testing

- Unit (vitest): word-timing alignment (web), queue/prefetch/stop logic against a fake generator,
  `useVoice` fallback choice.
- Web: Playwright run on the dev server with COOP/COEP; check audio is produced and the
  highlight advances per line.
- iOS simulator and Android emulator: play/pause/next/mode-switch by hand with a short text;
  first download with network on, then a run offline.

## Out of scope

Choosing among the other Kitten speakers, voice speed separate from WPM, accurate (wav2vec2)
native word alignment, a lexicon frontend to drop espeak, WebGPU.

## Verify during planning

- Exact download URLs for the native archive and the web files (model.onnx, voices.bin,
  tokens.txt) and that the web host sends CORS headers.
- Whether the Android AAR in 0.4.4 has the 1.12.35 problem.
- How to set COOP/COEP on the Expo SDK 58 web dev server.
