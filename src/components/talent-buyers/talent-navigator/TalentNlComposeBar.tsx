"use client";

import { useRef } from "react";
import { ArrowUp, Check, Loader2, Mic, X } from "lucide-react";

import { useTalentVoiceCapture } from "./use-talent-voice-capture";

type TalentNlComposeBarProps = {
  input: string;
  isPending: boolean;
  onInputChange: (value: string) => void;
  onInputKeyDown: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  onVoiceUnavailable?: () => void;
  onVoiceEmpty?: () => void;
};

export function TalentNlComposeBar({
  input,
  isPending,
  onInputChange,
  onInputKeyDown,
  inputRef,
  onVoiceUnavailable,
}: TalentNlComposeBarProps) {
  const voice = useTalentVoiceCapture();
  const inputAtRecordStart = useRef(input);
  const captureInProgress = voice.isRecording || voice.isCaptured || voice.isFinalizing || voice.isRequesting;

  async function handleMicClick(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    if (captureInProgress || isPending) return;
    if (!voice.isSupported) {
      onVoiceUnavailable?.();
      return;
    }

    inputAtRecordStart.current = input;
    await voice.startCapture();
  }

  async function handleVoiceConfirm(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    const text = await voice.confirmCapture();
    if (text) {
      onInputChange(inputAtRecordStart.current.trim() ? `${inputAtRecordStart.current.trim()} ${text}` : text);
      window.requestAnimationFrame(() => inputRef.current?.focus());
      return;
    }

    // The hook presents the specific capture/transcription error inline.
    // Cancellation deliberately leaves the typed query unchanged.
  }

  return (
    <div className="min-w-0">
    <div
      className={`talent-navigator__nl-compose-inner${
        voice.isRecording ? " talent-navigator__nl-compose-inner--recording" : ""
      }`}
    >
      {captureInProgress ? (
        <>
          <div className="talent-navigator__nl-voice" aria-live="polite">
            <div className="talent-navigator__nl-voice-row">
              <span className="talent-navigator__nl-voice-time">{voice.isRequesting ? "Allow microphone access" : voice.isFinalizing ? "Processing…" : voice.isCaptured ? `Ready · ${voice.elapsedLabel}` : voice.elapsedLabel}</span>
              <div className="talent-navigator__nl-voice-wave" aria-hidden>
                {voice.levels.map((level, index) => (
                <span
                  key={index}
                  className="talent-navigator__nl-voice-bar"
                  style={{ "--voice-scale": level } as React.CSSProperties}
                />
                ))}
              </div>
            </div>
            {voice.transcript ? <p className="mt-2 line-clamp-2 text-sm">{voice.transcript}</p> : null}
            <span className="sr-only">{voice.isRecording ? "Listening. Confirm when finished, or cancel." : voice.isCaptured ? "Recording is ready. Confirm or cancel." : "Voice input pending"}</span>
          </div>
          <div className="talent-navigator__nl-compose-actions">
            <button
              type="button"
              className="talent-navigator__nl-voice-btn talent-navigator__nl-voice-btn--cancel"
              onClick={voice.cancelCapture}
              aria-label="Cancel voice input"
            >
              <X className="size-4" />
            </button>
            <button
              type="button"
              className="talent-navigator__nl-voice-btn talent-navigator__nl-voice-btn--confirm"
              onClick={handleVoiceConfirm}
              disabled={voice.isFinalizing || voice.isRequesting}
              aria-label="Use voice input"
            >
              {voice.isFinalizing ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            </button>
          </div>
        </>
      ) : (
        <>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(event) => onInputChange(event.target.value)}
            onKeyDown={onInputKeyDown}
            placeholder="Who are you looking for?"
            className="talent-navigator__nl-input"
            aria-label="Describe talent to find"
            rows={1}
          />
          <div className="talent-navigator__nl-compose-actions">
            <button
              type="button"
              className="talent-navigator__nl-mic"
              onClick={handleMicClick}
              disabled={isPending}
              aria-label="Start voice input"
            >
              <Mic className="size-4" />
            </button>
            <button
              type="submit"
              disabled={isPending || !input.trim()}
              className="talent-navigator__nl-send"
              aria-label="Search talent"
            >
              {isPending ? <Loader2 className="size-4 animate-spin" /> : <ArrowUp className="size-4" />}
            </button>
          </div>
        </>
      )}
    </div>
    {voice.error ? <p role="alert" className="px-3 pt-2 text-sm text-[var(--ds-muted)]">{voice.error}</p> : null}
    </div>
  );
}
