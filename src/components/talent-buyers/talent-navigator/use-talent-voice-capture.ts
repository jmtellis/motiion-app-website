"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { transcribeNavigatorVoiceAudio } from "@/app/(buyer-app)/(paid)/talent/actions";
import { createVoiceCaptureSession, observeVoiceRecorder, preferredVoiceMimeType, voiceCaptureSupported, voiceTranscriptionResult, MAX_VOICE_DURATION_MS, validateVoiceAudio, voiceAudioExtension, voiceCaptureError } from "@/lib/talent-navigator/voice-capture";

type SpeechResult = { isFinal: boolean; [index: number]: { transcript: string } };
type SpeechRecognitionLike = {
  continuous: boolean; interimResults: boolean; lang: string;
  start: () => void; stop: () => void; abort: () => void;
  onresult: ((event: { results: ArrayLike<SpeechResult> }) => void) | null;
  onerror: (() => void) | null; onend: (() => void) | null;
};
const BAR_COUNT = 32;
const quietLevels = () => Array.from({ length: BAR_COUNT }, () => 0.14);
type CaptureState = "idle" | "requesting" | "recording" | "captured" | "processing";

export function useTalentVoiceCapture() {
  const [state, setState] = useState<CaptureState>("idle");
  const stateRef = useRef<CaptureState>("idle");
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [levels, setLevels] = useState(quietLevels);
  // Checked after hydration: SSR must not permanently decide browser capability.
  const [isSupported, setIsSupported] = useState(false);
  const session = useRef(createVoiceCaptureSession());
  const recordingId = useRef(0);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const frameRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mimeRef = useRef("");
  const recorderCompletion = useRef<ReturnType<typeof observeVoiceRecorder> | null>(null);
  const finalizeRef = useRef<Promise<string> | null>(null);

  const changeState = useCallback((next: CaptureState) => { stateRef.current = next; setState(next); }, []);
  const stopMedia = useCallback(() => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    if (recognition) {
      recognition.onresult = null; recognition.onerror = null; recognition.onend = null;
      try { recognition.abort(); } catch { /* Already ended. */ }
    }
    recorderCompletion.current?.cancel();
    recorderCompletion.current = null;
    const recorder = recorderRef.current;
    recorderRef.current = null;
    if (recorder) {
      recorder.ondataavailable = null; recorder.onerror = null; recorder.onstop = null;
      if (recorder.state !== "inactive") { try { recorder.stop(); } catch { /* Already stopped. */ } }
    }
    for (const track of streamRef.current?.getTracks() ?? []) { track.onended = null; track.stop(); }
    streamRef.current = null;
    if (audioContextRef.current) void audioContextRef.current.close().catch(() => {});
    audioContextRef.current = null;
  }, []);

  const cancelCapture = useCallback(() => {
    session.current.cancel();
    stopMedia();
    finalizeRef.current = null;
    chunksRef.current = [];
    setTranscript(""); setError(null); setElapsedMs(0); setLevels(quietLevels());
    changeState("idle");
  }, [changeState, stopMedia]);

  const startCapture = useCallback(async () => {
    if (stateRef.current !== "idle") return { ok: false as const, reason: "busy" };
    if (!voiceCaptureSupported({ secureContext: window.isSecureContext, getUserMedia: Boolean(navigator.mediaDevices?.getUserMedia), mediaRecorder: typeof MediaRecorder !== "undefined" })) {
      setError("Voice input isn't supported in this browser. You can type your search instead.");
      return { ok: false as const, reason: "unsupported" };
    }
    const id = session.current.begin();
    recordingId.current = id;
    changeState("requesting");
    setError(null); setTranscript(""); setElapsedMs(0);
    chunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!session.current.isCurrent(id)) {
        stream.getTracks().forEach((track) => track.stop());
        return { ok: false as const, reason: "cancelled" };
      }
      streamRef.current = stream;
      const mime = preferredVoiceMimeType(typeof MediaRecorder.isTypeSupported === "function" ? (type) => MediaRecorder.isTypeSupported(type) : undefined);
      const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      mimeRef.current = recorder.mimeType || mime || "";
      recorderCompletion.current = observeVoiceRecorder(recorder);
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (session.current.isCurrent(id) && event.data.size) {
          if (event.data.type) mimeRef.current = event.data.type;
          chunksRef.current.push(event.data);
        }
      };
      recorder.onerror = () => {
        if (!session.current.isCurrent(id)) return;
        session.current.cancel(); stopMedia(); changeState("idle");
        setError("Recording was interrupted. Try again, or type your search.");
      };
      recorder.onstop = () => {
        if (session.current.isCurrent(id) && stateRef.current === "recording") {
          stopMedia(); changeState("captured"); setLevels(quietLevels());
        }
      };
      recorder.start(250);
      changeState("recording");
      const startedAt = Date.now();
      timerRef.current = setInterval(() => {
        if (!session.current.isCurrent(id)) return;
        setElapsedMs(Math.min(Date.now() - startedAt, MAX_VOICE_DURATION_MS));
        if (Date.now() - startedAt >= MAX_VOICE_DURATION_MS) {
          // Stop capturing at the limit; the user can still confirm or discard the recording.
          if (recorder.state === "recording") recorder.stop();
          for (const track of stream.getTracks()) track.stop();
          if (timerRef.current) clearInterval(timerRef.current);
          timerRef.current = null;
        }
      }, 200);
      for (const track of stream.getTracks()) track.onended = () => {
        if (session.current.isCurrent(id) && stateRef.current === "recording") {
          setError("Microphone stopped. Use the captured audio or cancel and try again.");
          if (recorder.state !== "inactive") recorder.stop();
        }
      };

      const win = window as Window & { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike };
      const Ctor = win.SpeechRecognition ?? win.webkitSpeechRecognition;
      if (Ctor) {
        try {
          const recognition = new Ctor();
          recognition.continuous = true; recognition.interimResults = true; recognition.lang = "en-US";
          recognition.onresult = (event) => {
            if (!session.current.isCurrent(id)) return;
            const text = Array.from(event.results).map((result) => result[0]?.transcript ?? "").join(" ").trim();
            setTranscript(text);
          };
          recognition.onerror = () => {}; // Recorded audio remains available for server transcription.
          recognitionRef.current = recognition;
          recognition.start();
        } catch { /* Optional browser transcription; recorded audio is the fallback. */ }
      }
      // The waveform is optional: a blocked AudioContext must never prevent recording.
      if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches && typeof AudioContext !== "undefined") {
        try {
          const context = new AudioContext(); audioContextRef.current = context;
          const analyser = context.createAnalyser(); analyser.fftSize = 128;
          context.createMediaStreamSource(stream).connect(analyser);
          void context.resume().catch(() => {});
          const buffer = new Uint8Array(analyser.frequencyBinCount);
          let lastFrame = 0;
          const tick = (now: number) => {
            if (!session.current.isCurrent(id) || stateRef.current !== "recording") return;
            if (now - lastFrame > 80) {
              analyser.getByteFrequencyData(buffer);
              setLevels(Array.from({ length: BAR_COUNT }, (_, index) => 0.14 + (buffer[index * 2] ?? 0) / 255 * 0.78));
              lastFrame = now;
            }
            frameRef.current = requestAnimationFrame(tick);
          };
          frameRef.current = requestAnimationFrame(tick);
        } catch { /* Audio visualization is enhancement only. */ }
      }
      return { ok: true as const };
    } catch (cause) {
      if (!session.current.isCurrent(id)) return { ok: false as const, reason: "cancelled" };
      stopMedia(); changeState("idle"); setError(voiceCaptureError(cause));
      return { ok: false as const, reason: "unavailable" };
    }
  }, [changeState, stopMedia]);

  const confirmCapture = useCallback((): Promise<string> => {
    if (finalizeRef.current) return finalizeRef.current;
    if (stateRef.current !== "recording" && stateRef.current !== "captured") return Promise.resolve("");
    const id = recordingId.current;
    changeState("processing"); setError(null);
    const task = (async () => {
      try {
        await recorderCompletion.current?.finish();
        if (!session.current.isCurrent(id)) return "";
        const blob = new Blob(chunksRef.current, { type: mimeRef.current });
        stopMedia();
        const invalid = validateVoiceAudio(blob.size, blob.type);
        if (invalid) throw new Error(invalid);
        const form = new FormData();
        form.append("audio", blob, `voice.${voiceAudioExtension(blob.type)}`);
        // Browser recognition is an optional interim preview. The entire recorded
        // utterance is transcribed so an unfinished preview cannot truncate it.
        const response = await transcribeNavigatorVoiceAudio(form);
        if (!session.current.isCurrent(id)) return "";
        if (response.error) throw new Error(response.error);
        const result = voiceTranscriptionResult(response);
        if (result.error) throw new Error(result.error);
        return result.text;
      } catch (cause) {
        if (session.current.isCurrent(id)) setError(cause instanceof Error ? cause.message : "Could not process voice input. Try again.");
        return "";
      } finally {
        if (session.current.isCurrent(id)) {
          stopMedia(); changeState("idle"); setLevels(quietLevels());
          chunksRef.current = []; finalizeRef.current = null;
        }
      }
    })();
    finalizeRef.current = task;
    return task;
  }, [changeState, stopMedia]);

  useEffect(() => {
    // Browser-only capabilities must be checked after the matching server render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsSupported(voiceCaptureSupported({ secureContext: window.isSecureContext, getUserMedia: Boolean(navigator.mediaDevices?.getUserMedia), mediaRecorder: typeof MediaRecorder !== "undefined" }));
    const currentSession = session.current;
    return () => { currentSession.cancel(); stopMedia(); };
  }, [stopMedia]);

  const seconds = Math.floor(elapsedMs / 1000);
  return { isRecording: state === "recording", isCaptured: state === "captured", isRequesting: state === "requesting", isFinalizing: state === "processing",
    isSupported, transcript, error, elapsedLabel: `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`,
    levels, startCapture, cancelCapture, confirmCapture };
}
