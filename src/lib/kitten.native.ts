import { CachesDirectoryPath, DocumentDirectoryPath, downloadFile, exists, unlink, writeFile } from "@dr.pogodin/react-native-fs";
import { createAudioPlayer, setAudioModeAsync } from "expo-audio";
import { useSyncExternalStore } from "react";
import { extractArchive } from "react-native-sherpa-onnx/extraction";
import { createTTS, saveAudioToFile } from "react-native-sherpa-onnx/tts";
import { createStatus, estimateWordTimes, queuedVoice, WordTime } from "./voice";

const MODEL = "kitten-mini-en-v0_8";
// Fetched directly: the wrapper's model registry reads a GitHub listing that is cut off before Kitten.
const URL = `https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/${MODEL}.tar.bz2`; // ~68 MB
const DIR = `${DocumentDirectoryPath}/voices`;
const SPEAKER = 1; // expr-voice-2-f

const status = createStatus({ state: "idle", percent: 0 });
let tts: Awaited<ReturnType<typeof createTTS>> | null = null;
let clipNo = 0;

export const useKittenStatus = () => useSyncExternalStore(status.subscribe, status.get, status.get);

/** Download (first time only) and load the model. Safe to call repeatedly; retries after a failure. */
export function loadKitten() {
  const { state } = status.get();
  if (state === "downloading" || state === "ready") return;
  status.set({ state: "downloading", percent: 0 });
  (async () => {
    if (!(await exists(`${DIR}/${MODEL}.ready`))) {
      const archive = `${CachesDirectoryPath}/${MODEL}.tar.bz2`;
      const progress = (pct: number) => status.set({ state: "downloading", percent: Math.round(pct) });
      const { promise } = downloadFile({
        fromUrl: URL,
        toFile: archive,
        progressInterval: 500,
        progress: (r) => progress((90 * r.bytesWritten) / (r.contentLength || 1)),
      });
      const res = await promise;
      if (res.statusCode !== 200) throw new Error(`Voice download failed: HTTP ${res.statusCode}`);
      await extractArchive({ modelId: MODEL, archivePath: archive, format: "tar.bz2" }, DIR, {
        showNotificationsEnabled: false,
        onProgress: (e) => progress(90 + e.percent / 10),
      });
      await unlink(archive).catch(() => {});
      await writeFile(`${DIR}/${MODEL}.ready`, "");
    }
    tts ??= await createTTS({ modelPath: { type: "file", path: `${DIR}/${MODEL}` }, modelType: "kitten", numThreads: 2 });
    await setAudioModeAsync({ playsInSilentMode: true });
    status.set({ state: "ready", percent: 100 });
  })().catch((e) => {
    console.warn("Natural voice failed to load", e);
    status.set({ state: "failed", percent: 0 });
  });
}

type Clip = { path: string; words: WordTime[] };
const remove = (path: string) => void unlink(path).catch(() => {});

export const kittenVoice = queuedVoice<Clip>(
  {
    async generate(text, rate) {
      // Kitten reports no word times through this wrapper, so they are estimated from the clip length.
      const audio = await tts!.generateSpeech(text, { sid: SPEAKER, speed: rate });
      const path = `${CachesDirectoryPath}/kitten-${clipNo++}.wav`;
      await saveAudioToFile(audio, path);
      return { path, words: estimateWordTimes(text, audio.samples.length / audio.sampleRate) };
    },
    play(clip, onTime, onEnd) {
      const player = createAudioPlayer({ uri: `file://${clip.path}` }, { updateInterval: 50 });
      const done = () => {
        sub.remove();
        player.release();
        remove(clip.path);
      };
      const sub = player.addListener("playbackStatusUpdate", (s) => {
        onTime(s.currentTime);
        if (s.didJustFinish) {
          done();
          onEnd();
        }
      });
      player.play();
      return () => {
        player.pause();
        done();
      };
    },
    discard: (clip) => remove(clip.path),
  },
  (e) => {
    // Generation broke mid-read: drop to the device voice for this session.
    console.warn("Natural voice failed", e);
    status.set({ state: "failed", percent: 0 });
  },
);
