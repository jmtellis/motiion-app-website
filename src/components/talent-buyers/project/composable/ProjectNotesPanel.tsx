"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/talent-buyers/dashboard/Modal";
import { saveProjectNotes } from "@/app/(buyer-app)/(paid)/projects/composable-actions";
export function ProjectNotesPanel({ projectId, body, canEdit }: { projectId: string; body: string; canEdit: boolean }) {
  const router = useRouter();
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [pending, startTransition] = useTransition();
  const dirty = draft !== null && draft !== body;
  useEffect(() => { if (!dirty) return; const warn = (event: BeforeUnloadEvent) => event.preventDefault(); window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn); }, [dirty]);
  function close() { if (!pending && (!dirty || window.confirm("Discard unsaved project notes?"))) { setDraft(null); setError(null); } }
  return <section className="ability-section"><header className="ability-section__header"><h2>Project notes</h2>{canEdit && <button className="bd-btn-secondary" onClick={() => { setDraft(body); setError(null); setNotice(""); }}>{body ? "Edit notes" : "Add notes"}</button>}</header>
    <p style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{body || "Keep the brief, team context, and next steps together. These notes stay inside the project."}</p>
    {notice && <p role="status">{notice}</p>}
    <Modal open={draft !== null} onClose={close} title="Project notes" description="Shared with people who have access to this project." placement="drawer" footer={<><button className="bd-btn-secondary" onClick={close} disabled={pending}>Cancel</button><button className="bd-btn-primary" disabled={pending} onClick={() => { if (draft === null) return; startTransition(async () => { const result = await saveProjectNotes(projectId, draft); if (!result.ok) { setError(result.error); return; } setDraft(null); setNotice("Project notes saved."); router.refresh(); }); }}>{pending ? "Saving…" : "Save notes"}</button></>}>
      <label className="composable-field"><span className="composable-field__label">Notes</span><textarea className="composable-input" rows={16} maxLength={50000} value={draft ?? ""} onChange={(event) => setDraft(event.target.value)} /></label>
      {error && <p role="alert" className="composable-field__error">{error}</p>}
    </Modal>
  </section>;
}
