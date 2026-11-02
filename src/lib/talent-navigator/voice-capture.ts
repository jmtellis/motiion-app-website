/** Limits are shared by browser recording and the authenticated transcription action. */
export const MAX_VOICE_DURATION_MS = 60_000;
export const MAX_VOICE_BYTES = 3 * 1024 * 1024;

export function voiceCaptureError(error: unknown): string {
  const name = error && typeof error === "object" && "name" in error ? String(error.name) : "";
  if (name === "NotAllowedError" || name === "SecurityError") {
    return "Microphone access was denied. Allow microphone access in your browser, or type your search.";
  }
  if (name === "NotSupportedError") return "Audio recording isn’t supported in this browser. Try another browser, or type your search.";
  if (name === "NotFoundError") return "No microphone was found. Connect a microphone, or type your search.";
  if (name === "NotReadableError") return "Your microphone is in use or unavailable. Close other recording apps and try again.";
  return "Voice input was interrupted. Try again, or type your search.";
}

export function voiceAudioExtension(mime: string): string | null {
  const type = mime.toLowerCase().split(";")[0].trim();
  return ({ "audio/webm": "webm", "audio/mp4": "mp4", "audio/ogg": "ogg", "audio/wav": "wav", "audio/mpeg": "mp3" } as Record<string, string>)[type] ?? null;
}

export function validateVoiceAudio(size: number, mime: string): string | null {
  if (!size) return "No audio was captured. Try again, or type your search.";
  if (size > MAX_VOICE_BYTES) return "That recording is too large. Keep voice searches under one minute.";
  if (!voiceAudioExtension(mime)) return "This audio format isn't supported. Try another browser or type your search.";
  return null;
}

/** Each start/cancel invalidates all earlier permission and transcription completions. */
export function createVoiceCaptureSession() {
  let generation = 0;
  return {
    begin: () => ++generation,
    cancel: () => { generation += 1; },
    isCurrent: (id: number) => generation === id,
  };
}


/** A missing probe is allowed: older engines can still choose their own format. */
export function preferredVoiceMimeType(isSupported?: (mime: string) => boolean): string | undefined {
  if (!isSupported) return undefined;
  return ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"].find((mime) => {
    try { return isSupported(mime); } catch { return false; }
  });
}

export function voiceCaptureSupported(capabilities: { secureContext: boolean; getUserMedia: boolean; mediaRecorder: boolean }) {
  return capabilities.secureContext && capabilities.getUserMedia && capabilities.mediaRecorder;
}

export function voiceTranscriptionResult(payload: unknown): { text: string; error?: string } {
  if (!payload || typeof payload !== "object" || !("text" in payload) || typeof payload.text !== "string") {
    return { text: "", error: "Could not transcribe audio. Please try again, or type your search." };
  }
  // Whisper can emit a word even for silence. Only reject a whole recording
  // when every returned segment has high no-speech confidence; keep mixed speech.
  const segments = "segments" in payload && Array.isArray(payload.segments) ? payload.segments : [];
  const silent = segments.length > 0 && segments.every((segment: unknown) => segment && typeof segment === "object" && "no_speech_prob" in segment && typeof segment.no_speech_prob === "number" && segment.no_speech_prob >= 0.9);
  const text = silent ? "" : payload.text.trim();
  return text ? { text } : { text: "", error: "No speech was detected. Try again, or type your search." };
}

/** Observe before start: `inactive` changes synchronously, but final data arrives
 * before a later stop event. Waiting only while state=recording can lose audio. */
export function observeVoiceRecorder(recorder: Pick<MediaRecorder, "state" | "stop" | "addEventListener" | "removeEventListener">) {
  let finished = false;
  let resolve!: () => void;
  const completed = new Promise<void>((done) => { resolve = done; });
  const onStop = () => { finished = true; recorder.removeEventListener("stop", onStop); resolve(); };
  recorder.addEventListener("stop", onStop);
  return {
    async finish(timeoutMs = 3000) {
      if (finished) return;
      if (recorder.state !== "inactive") recorder.stop();
      let timeout: ReturnType<typeof setTimeout> | undefined;
      try {
        await Promise.race([completed, new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new Error("Recording could not finish. Try again, or type your search.")), timeoutMs); })]);
      } finally { if (timeout) clearTimeout(timeout); }
    },
    cancel() { recorder.removeEventListener("stop", onStop); finished = true; resolve(); },
  };
}
