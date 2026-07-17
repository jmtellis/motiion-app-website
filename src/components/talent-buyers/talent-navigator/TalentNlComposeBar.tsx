"use client";

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
  onVoiceEmpty,
}: TalentNlComposeBarProps) {
  const voice = useTalentVoiceCapture();

  async function handleMicClick(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    if (voice.isRecording || voice.isFinalizing || isPending) return;
    if (!voice.isSupported) {
      onVoiceUnavailable?.();
      return;
    }

    const result = await voice.startCapture();
    if (!result.ok) {
      onVoiceUnavailable?.();
    }
  }

  async function handleVoiceConfirm(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    const text = await voice.confirmCapture();
    if (text) {
      onInputChange(input.trim() ? `${input.trim()} ${text}` : text);
      window.requestAnimationFrame(() => inputRef.current?.focus());
      return;
    }

    onVoiceEmpty?.();
  }

  return (
    <div
      className={`talent-navigator__nl-compose-inner${
        voice.isRecording ? " talent-navigator__nl-compose-inner--recording" : ""
      }`}
    >
      {voice.isRecording ? (
        <>
          <div className="talent-navigator__nl-voice" aria-live="polite">
            <div className="talent-navigator__nl-voice-row">
              <span className="talent-navigator__nl-voice-time">{voice.elapsedLabel}</span>
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
          </div>
          <div className="talent-navigator__nl-compose-actions">
            <button
              type="button"
              className="talent-navigator__nl-voice-btn talent-navigator__nl-voice-btn--cancel"
              onClick={voice.cancelCapture}
              disabled={voice.isFinalizing}
              aria-label="Cancel voice input"
            >
              <X className="size-4" />
            </button>
            <button
              type="button"
              className="talent-navigator__nl-voice-btn talent-navigator__nl-voice-btn--confirm"
              onClick={handleVoiceConfirm}
              disabled={voice.isFinalizing}
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
              aria-label="Send message"
            >
              {isPending ? <Loader2 className="size-4 animate-spin" /> : <ArrowUp className="size-4" />}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
