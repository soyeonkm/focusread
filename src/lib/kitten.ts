import { useSyncExternalStore } from "react";
import { createStatus, type Voice } from "./voice";

// Natural voice (Kitten TTS). Platform files fill this in: kitten.native.ts for iOS and Android.
// This default (web for now) reports "unsupported", so the reader uses the device voice.

const status = createStatus({ state: "unsupported", percent: 0 });

export const useKittenStatus = () => useSyncExternalStore(status.subscribe, status.get, status.get);
export function loadKitten() {}
export const kittenVoice: Voice | null = null;
