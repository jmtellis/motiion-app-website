"use client";

import { Mic } from "lucide-react";
import { useState } from "react";
import { Modal } from "@/components/talent-buyers/dashboard/Modal";
import { useTalentVoiceCapture } from "@/components/talent-buyers/talent-navigator/use-talent-voice-capture";

/** Captures only after an explicit click. The transcript remains editable before searching. */
export function VoiceSearchControl({ onTranscript }: { onTranscript: (text: string) => void }) {
  const voice = useTalentVoiceCapture();
  const [open, setOpen] = useState(false);
  function close() { voice.cancelCapture(); setOpen(false); }
  return <>
    <button type="button" className="ui-icon-button" aria-label="Search with voice" title="Search with voice"
      onClick={() => { setOpen(true); void voice.startCapture(); }}><Mic size={18} aria-hidden /></button>
    <Modal open={open} onClose={close} title="Voice search" description="Describe a name, style, skill, or credit. Review and edit the transcript before searching.">
      <div className="space-y-4">
        <p role="status" className="text-sm text-[var(--ui-text)]">{voice.isRequesting ? "Allow microphone access in your browser, or cancel to type." : voice.isFinalizing ? "Preparing your transcript…" : voice.isCaptured ? `Recording ready · ${voice.elapsedLabel}` : voice.isRecording ? `Listening · ${voice.elapsedLabel}` : "Ready to try again."}</p>
        {voice.transcript ? <p className="rounded-xl bg-[var(--ui-surface-soft)] p-3 text-[var(--ui-text)]">{voice.transcript}</p> : null}
        {voice.error ? <p role="alert" className="text-sm text-[var(--ui-danger)]">{voice.error}</p> : null}
        <div className="flex flex-wrap gap-2">
          <button type="button" className="ui-button ui-button--secondary" onClick={close}>Cancel and type</button>
          {voice.isRecording || voice.isCaptured || voice.isFinalizing ? <button type="button" className="ui-button" disabled={voice.isFinalizing} onClick={async () => {
            const text = await voice.confirmCapture();
            if (text) { onTranscript(text); setOpen(false); }
          }}>{voice.isFinalizing ? "Processing…" : "Use recording"}</button> : !voice.isRequesting && voice.isSupported ? <button type="button" className="ui-button" onClick={() => void voice.startCapture()}>Try again</button> : null}
        </div>
      </div>
    </Modal>
  </>;
}
