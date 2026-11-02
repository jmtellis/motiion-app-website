import assert from "node:assert/strict";
import { test } from "node:test";
import { createVoiceCaptureSession, MAX_VOICE_BYTES, validateVoiceAudio, voiceAudioExtension, voiceCaptureError } from "../src/lib/talent-navigator/voice-capture";

test("cancelled microphone permission and transcription completions cannot affect a new capture", async () => {
  const session = createVoiceCaptureSession();
  const initial = session.begin();
  let resolve!: () => void;
  const permission = new Promise<void>((done) => { resolve = done; });
  const completion = permission.then(() => session.isCurrent(initial));
  session.cancel();
  const retry = session.begin();
  resolve();
  assert.equal(await completion, false);
  assert.equal(session.isCurrent(retry), true);
  session.cancel();
  assert.equal(session.isCurrent(retry), false);
});

test("recorded MIME type determines a real transcription filename", () => {
  assert.equal(voiceAudioExtension("audio/webm;codecs=opus"), "webm");
  assert.equal(voiceAudioExtension("audio/mp4"), "mp4");
  assert.equal(voiceAudioExtension("audio/ogg;codecs=opus"), "ogg");
});

test("rejects empty, oversized, and unsupported recordings while accepting browser audio", () => {
  assert.match(validateVoiceAudio(0, "audio/webm")!, /No audio/);
  assert.match(validateVoiceAudio(MAX_VOICE_BYTES + 1, "audio/webm")!, /too large/);
  assert.match(validateVoiceAudio(200, "text/html")!, /format/);
  assert.equal(validateVoiceAudio(200, "audio/mp4"), null);
});

test("microphone failure states have specific recovery and a typed alternative", () => {
  assert.match(voiceCaptureError({ name: "NotAllowedError" }), /denied.*type your search/);
  assert.match(voiceCaptureError({ name: "NotFoundError" }), /No microphone/);
  assert.match(voiceCaptureError({ name: "NotReadableError" }), /in use/);
  assert.match(voiceCaptureError(new Error("private diagnostic")), /interrupted/);
});

test("voice support requires secure media capture, not optional speech recognition", async () => {
  const { voiceCaptureSupported } = await import("../src/lib/talent-navigator/voice-capture");
  assert.equal(voiceCaptureSupported({ secureContext: true, getUserMedia: true, mediaRecorder: true }), true);
  for (const missing of ["secureContext", "getUserMedia", "mediaRecorder"] as const) {
    assert.equal(voiceCaptureSupported({ secureContext: true, getUserMedia: true, mediaRecorder: true, [missing]: false }), false);
  }
});

test("MIME selection supports MP4-only and Ogg-only engines without assuming WebM", async () => {
  const { preferredVoiceMimeType } = await import("../src/lib/talent-navigator/voice-capture");
  assert.equal(preferredVoiceMimeType(mime => mime === "audio/mp4"), "audio/mp4");
  assert.equal(preferredVoiceMimeType(mime => mime === "audio/ogg;codecs=opus"), "audio/ogg;codecs=opus");
  assert.equal(preferredVoiceMimeType(() => false), undefined);
  assert.equal(preferredVoiceMimeType(), undefined);
  assert.equal(preferredVoiceMimeType(() => { throw new Error("unsupported probe"); }), undefined);
  assert.match(voiceCaptureError({ name: "NotSupportedError" }), /another browser.*type your search/);
});

class Recorder extends EventTarget {
  state: RecordingState = "recording";
  stops = 0;
  stop() { this.stops += 1; this.state = "inactive"; }
  finish() { this.dispatchEvent(new Event("dataavailable")); this.dispatchEvent(new Event("stop")); }
}

test("inactive recorder waits for its final chunk and stop after a device interruption", async () => {
  const { observeVoiceRecorder } = await import("../src/lib/talent-navigator/voice-capture");
  const recorder = new Recorder();
  const observation = observeVoiceRecorder(recorder);
  const chunks: string[] = [];
  recorder.addEventListener("dataavailable", () => chunks.push("last audio"));
  recorder.state = "inactive"; // Tracks ended, event dispatch is still queued.
  let settled = false;
  const finish = observation.finish().then(() => { settled = true; return [...chunks]; });
  await Promise.resolve();
  assert.equal(settled, false);
  assert.equal(recorder.stops, 0);
  recorder.finish();
  assert.deepEqual(await finish, ["last audio"]);
});

test("manual finish stops once and also waits for the final audio event", async () => {
  const { observeVoiceRecorder } = await import("../src/lib/talent-navigator/voice-capture");
  const recorder = new Recorder();
  const observation = observeVoiceRecorder(recorder);
  const first = observation.finish();
  const second = observation.finish();
  assert.equal(recorder.stops, 1);
  recorder.finish();
  await Promise.all([first, second]);
  await observation.finish();
  assert.equal(recorder.stops, 1);
});

test("cancel releases a waiting recorder and a missing stop event reports recovery", async () => {
  const { observeVoiceRecorder } = await import("../src/lib/talent-navigator/voice-capture");
  const recorder = new Recorder();
  const observation = observeVoiceRecorder(recorder);
  const waiting = observation.finish();
  observation.cancel();
  await waiting;
  const stalled = observeVoiceRecorder(new Recorder());
  await assert.rejects(stalled.finish(1), /could not finish.*type your search/);
  stalled.cancel();
});

test("empty speech and malformed provider responses have distinct recovery", async () => {
  const { voiceTranscriptionResult } = await import("../src/lib/talent-navigator/voice-capture");
  assert.deepEqual(voiceTranscriptionResult({ text: "  Find dancers  " }), { text: "Find dancers" });
  assert.match(voiceTranscriptionResult({ text: "  " }).error!, /No speech.*type your search/);
  assert.match(voiceTranscriptionResult({ error: "private diagnostic" }).error!, /Could not transcribe/);
  assert.equal(voiceTranscriptionResult(null).text, "");
});


test("high-confidence silence cannot become a hallucinated search query", async () => {
  const { voiceTranscriptionResult } = await import("../src/lib/talent-navigator/voice-capture");
  assert.match(voiceTranscriptionResult({ text: "you", segments: [{ no_speech_prob: 0.9425907731056213 }] }).error!, /No speech/);
  assert.deepEqual(voiceTranscriptionResult({ text: "Find contemporary dancers", segments: [{ no_speech_prob: 0.0013 }] }), { text: "Find contemporary dancers" });
  assert.deepEqual(voiceTranscriptionResult({ text: "Find dancers", segments: [{ no_speech_prob: 0.95 }, { no_speech_prob: 0.01 }] }), { text: "Find dancers" });
});
