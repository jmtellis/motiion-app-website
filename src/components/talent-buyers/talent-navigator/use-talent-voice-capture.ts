"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { transcribeNavigatorVoiceAudio } from "@/app/(buyer-app)/(paid)/talent/actions";

const BAR_COUNT = 52;

type SpeechRecognitionResultList = {
  length: number;
  [index: number]: {
    isFinal: boolean;
    [index: number]: { transcript: string };
  };
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: SpeechRecognitionResultList;
};

type SpeechRecognitionErrorEventLike = Event & {
  error?: string;
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
};

function getSpeechRecognitionCtor():
  | (new () => SpeechRecognitionLike)
  | undefined {
  if (typeof window === "undefined") return undefined;
  const win = window as Window & {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return win.SpeechRecognition ?? win.webkitSpeechRecognition;
}

function formatElapsed(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function pickRecorderMimeType() {
  if (typeof window === "undefined" || typeof MediaRecorder === "undefined") {
    return "";
  }

  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];

  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

function readTranscriptFromResults(results: SpeechRecognitionResultList) {
  let finalText = "";
  let interim = "";

  for (let i = 0; i < results.length; i += 1) {
    const result = results[i];
    const chunk = result[0]?.transcript ?? "";
    if (!chunk) continue;
    if (result.isFinal) {
      finalText = `${finalText} ${chunk}`.trim();
    } else {
      interim = `${interim} ${chunk}`.trim();
    }
  }

  return `${finalText} ${interim}`.trim();
}

export function useTalentVoiceCapture() {
  const [isRecording, setIsRecording] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [levels, setLevels] = useState<number[]>(() => Array.from({ length: BAR_COUNT }, () => 0.14));
  const [isSupported] = useState(
    () =>
      typeof window !== "undefined" &&
      Boolean(navigator.mediaDevices?.getUserMedia) &&
      typeof MediaRecorder !== "undefined",
  );

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recorderMimeRef = useRef("audio/webm");
  const rafRef = useRef<number | null>(null);
  const startedAtRef = useRef<number>(0);
  const timerRef = useRef<number | null>(null);
  const transcriptRef = useRef("");
  const recordingActiveRef = useRef(false);
  const speechEnabledRef = useRef(false);
  const restartTimerRef = useRef<number | null>(null);

  const stopLevelLoop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const clearRestartTimer = useCallback(() => {
    if (restartTimerRef.current !== null) {
      window.clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
  }, []);

  const stopRecognition = useCallback(() => {
    clearRestartTimer();
    speechEnabledRef.current = false;

    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    if (!recognition) return;

    recognition.onresult = null;
    recognition.onerror = null;
    recognition.onend = null;

    try {
      recognition.stop();
    } catch {
      try {
        recognition.abort();
      } catch {
        // Ignore teardown races from the browser speech service.
      }
    }
  }, [clearRestartTimer]);

  const stopMedia = useCallback(() => {
    stopLevelLoop();

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // Recorder may already be stopped during confirm.
      }
    }
    mediaRecorderRef.current = null;

    analyserRef.current = null;
    if (audioContextRef.current) {
      void audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop();
      }
      streamRef.current = null;
    }
  }, [stopLevelLoop]);

  const resetState = useCallback(() => {
    setIsRecording(false);
    setIsFinalizing(false);
    setTranscript("");
    setElapsedMs(0);
    setLevels(Array.from({ length: BAR_COUNT }, () => 0.14));
    transcriptRef.current = "";
    audioChunksRef.current = [];
  }, []);

  const stopCapture = useCallback(() => {
    recordingActiveRef.current = false;
    stopRecognition();
    stopMedia();
    setIsRecording(false);
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [stopMedia, stopRecognition]);

  const updateTranscript = useCallback((next: string) => {
    transcriptRef.current = next;
    setTranscript(next);
  }, []);

  const startLevelLoop = useCallback(() => {
    stopLevelLoop();

    const analyser = analyserRef.current;
    if (!analyser) return;

    const buffer = new Uint8Array(analyser.frequencyBinCount);

    const tick = () => {
      if (!recordingActiveRef.current || !analyserRef.current) return;

      analyser.getByteFrequencyData(buffer);
      const sliceWidth = Math.max(1, Math.floor(buffer.length / BAR_COUNT));
      const nextLevels = Array.from({ length: BAR_COUNT }, (_, index) => {
        const start = index * sliceWidth;
        let sum = 0;
        for (let i = start; i < start + sliceWidth; i += 1) {
          sum += buffer[i] ?? 0;
        }
        const average = sum / sliceWidth;
        const normalized = Math.max(0, Math.min(1, average / 210));
        const curved = Math.pow(normalized, 0.62);
        return 0.14 + curved * 0.78;
      });

      setLevels(nextLevels);
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
  }, [stopLevelLoop]);

  const attachSpeechRecognition = useCallback(
    (recognition: SpeechRecognitionLike) => {
      recognition.onresult = (event) => {
        const latest = readTranscriptFromResults(event.results);
        if (latest) {
          updateTranscript(latest);
        }
      };

      recognition.onerror = (event) => {
        const code = event.error ?? "";
        if (code === "aborted" || code === "no-speech") return;
        if (code === "audio-capture" || code === "not-allowed") {
          speechEnabledRef.current = false;
        }
      };

      recognition.onend = () => {
        if (!recordingActiveRef.current || recognitionRef.current !== recognition) return;
        if (!speechEnabledRef.current) return;

        clearRestartTimer();
        restartTimerRef.current = window.setTimeout(() => {
          restartTimerRef.current = null;
          if (!recordingActiveRef.current || recognitionRef.current !== recognition) return;
          try {
            recognition.start();
          } catch {
            speechEnabledRef.current = false;
          }
        }, 140);
      };
    },
    [clearRestartTimer, updateTranscript],
  );

  const startSpeechRecognition = useCallback(
    (Ctor: new () => SpeechRecognitionLike) => {
      try {
        const recognition = new Ctor();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";
        recognitionRef.current = recognition;
        speechEnabledRef.current = true;
        attachSpeechRecognition(recognition);
        recognition.start();
      } catch {
        speechEnabledRef.current = false;
        recognitionRef.current = null;
      }
    },
    [attachSpeechRecognition],
  );

  const waitForRecorderStop = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") {
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      const handleStop = () => {
        recorder.removeEventListener("stop", handleStop);
        resolve();
      };
      recorder.addEventListener("stop", handleStop);
      try {
        recorder.stop();
      } catch {
        recorder.removeEventListener("stop", handleStop);
        resolve();
      }
    });
  }, []);

  const waitForSpeechFinalize = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition || !speechEnabledRef.current) {
      return Promise.resolve(transcriptRef.current.trim());
    }

    return new Promise<string>((resolve) => {
      let settled = false;

      const finish = (value: string) => {
        if (settled) return;
        settled = true;
        recognition.onresult = null;
        recognition.onend = null;
        resolve(value.trim());
      };

      recognition.onresult = (event) => {
        const latest = readTranscriptFromResults(event.results);
        if (latest) {
          updateTranscript(latest);
        }
      };

      recognition.onend = () => {
        window.setTimeout(() => finish(transcriptRef.current), 40);
      };

      try {
        recognition.stop();
      } catch {
        finish(transcriptRef.current);
      }

      window.setTimeout(() => finish(transcriptRef.current), 900);
    });
  }, [updateTranscript]);

  const transcribeRecordedAudio = useCallback(async () => {
    if (!audioChunksRef.current.length) return "";

    const blob = new Blob(audioChunksRef.current, {
      type: recorderMimeRef.current || "audio/webm",
    });
    if (!blob.size) return "";

    const formData = new FormData();
    formData.append("audio", blob, "voice.webm");
    const result = await transcribeNavigatorVoiceAudio(formData);
    return result.text?.trim() ?? "";
  }, []);

  const startCapture = useCallback(async () => {
    if (!isSupported) return { ok: false as const, reason: "unsupported" as const };

    stopCapture();
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = pickRecorderMimeType();
      recorderMimeRef.current = mimeType || "audio/webm";
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      recorder.start(250);

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      await audioContext.resume();

      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.78;
      source.connect(analyser);
      analyserRef.current = analyser;

      recordingActiveRef.current = true;
      updateTranscript("");
      setElapsedMs(0);
      startedAtRef.current = Date.now();
      setIsRecording(true);

      timerRef.current = window.setInterval(() => {
        setElapsedMs(Date.now() - startedAtRef.current);
      }, 200);

      startLevelLoop();

      const SpeechCtor = getSpeechRecognitionCtor();
      if (SpeechCtor) {
        window.setTimeout(() => startSpeechRecognition(SpeechCtor), 120);
      }

      return { ok: true as const };
    } catch {
      stopCapture();
      resetState();
      return { ok: false as const, reason: "unavailable" as const };
    }
  }, [isSupported, resetState, startLevelLoop, startSpeechRecognition, stopCapture, updateTranscript]);

  const cancelCapture = useCallback(() => {
    stopCapture();
    resetState();
  }, [resetState, stopCapture]);

  const confirmCapture = useCallback(async () => {
    if (!recordingActiveRef.current && !isFinalizing) {
      return transcriptRef.current.trim();
    }

    recordingActiveRef.current = false;
    speechEnabledRef.current = false;
    clearRestartTimer();
    setIsFinalizing(true);

    const speechText = await waitForSpeechFinalize();
    stopRecognition();
    await waitForRecorderStop();
    stopMedia();

    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }

    let text = speechText || transcriptRef.current.trim();
    if (!text) {
      text = await transcribeRecordedAudio();
      if (text) {
        updateTranscript(text);
      }
    }

    setIsRecording(false);
    setIsFinalizing(false);
    setLevels(Array.from({ length: BAR_COUNT }, () => 0.14));
    audioChunksRef.current = [];
    transcriptRef.current = "";
    setTranscript("");

    return text;
  }, [
    clearRestartTimer,
    isFinalizing,
    stopMedia,
    stopRecognition,
    transcribeRecordedAudio,
    updateTranscript,
    waitForRecorderStop,
    waitForSpeechFinalize,
  ]);

  useEffect(() => {
    return () => {
      recordingActiveRef.current = false;
      stopRecognition();
      stopMedia();
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
      }
    };
  }, [stopMedia, stopRecognition]);

  return {
    isRecording,
    isFinalizing,
    isSupported,
    transcript,
    elapsedLabel: formatElapsed(elapsedMs),
    levels,
    startCapture,
    cancelCapture,
    confirmCapture,
  };
}
