"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition, type FormEvent } from "react";
import { saveProjectSettings, setComposableProjectArchived } from "@/app/(buyer-app)/(paid)/projects/composable-actions";
import { Modal } from "@/components/talent-buyers/dashboard/Modal";
import { useToast } from "@/components/talent-buyers/dashboard/ToastProvider";
import { CastingScheduleStep } from "@/components/talent-buyers/casting/wizard-steps/CastingScheduleStep";
import { ClientEntityAutocomplete } from "@/components/talent-buyers/casting/wizard-steps/ClientEntityAutocomplete";
import { createDefaultCastingComposerForm } from "@/lib/talent-buyers/casting-composer-defaults";
import type { CastingComposerForm, CastingScheduleCategoryCodable } from "@/types/casting";
import { ProjectCoverPanel } from "../ProjectCoverPanel";
import "./composable-project.css";

export type EditableProjectShell = {
  id: string; title: string; location: string | null; startDate: string | null; endDate: string | null;
  coverImageUrl: string | null; archivedAt: string | null; canArchive?: boolean; details?: Record<string, unknown>;
};
function initialForm(project: EditableProjectShell): CastingComposerForm {
  const details = project.details ?? {};
  const text = (key: string, fallback = "") => typeof details[key] === "string" ? details[key] as string : fallback;
  const form = createDefaultCastingComposerForm();
  return { ...form, title: project.title, description: text("description"), productionCompany: text("production_company"),
    productionCompanyLogoUrl: text("production_company_logo_url"), location: text("location", project.location ?? ""),
    startDate: text("start_date", project.startDate ?? "").slice(0, 10), endDate: text("end_date", project.endDate ?? "").slice(0, 10),
    coverImageUrl: project.coverImageUrl ?? "", configuration: { ...form.configuration,
      schedule_categories: (details.schedule_categories as CastingScheduleCategoryCodable[] | undefined) ?? [],
      production_dates_not_known_confirmed: details.dates_not_confirmed === true,
    } };
}
export function EditProjectShellModal({ open, onClose, project }: { open: boolean; onClose: () => void; project: EditableProjectShell }) {
  const router = useRouter();
  const { showToast } = useToast();
  const formId = useId();
  const [form, setForm] = useState(() => initialForm(project));
  const [coverPath, setCoverPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [wasOpen, setWasOpen] = useState(false);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) { setForm(initialForm(project)); setCoverPath(null); setError(null); }
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    startTransition(async () => {
      try {
        const result = await saveProjectSettings(project.id, {
          title: form.title, description: form.description, productionCompany: form.productionCompany,
          productionCompanyLogoUrl: form.productionCompanyLogoUrl ?? "", location: form.location,
          coverImageUrl: form.coverImageUrl, startDate: form.startDate, endDate: form.endDate,
          datesNotConfirmed: form.configuration.production_dates_not_known_confirmed ?? false,
          scheduleCategories: form.configuration.schedule_categories,
        });
        if (!result.ok) { setError(result.error); return; }
        showToast({ message: "Project updated", variant: "success" }); onClose(); router.refresh();
      } catch { setError("Could not save settings. Your changes are still here. Please retry."); }
    });
  }
  function toggleArchived() {
    startTransition(async () => {
      const result = await setComposableProjectArchived({ projectId: project.id, archived: !project.archivedAt });
      if (!result.ok) { setError(result.error); return; }
      onClose(); router.refresh();
    });
  }
  return <Modal open={open} onClose={() => { if (!pending) onClose(); }} title="Project settings" size="lg" footer={
    <div className="composable-sheet__footer composable-sheet__footer--split">
      {project.canArchive !== false ? <button type="button" className="bd-btn-secondary" onClick={toggleArchived} disabled={pending}>{project.archivedAt ? "Restore project" : "Archive project"}</button> : <span />}
      <span className="composable-sheet__footer-group"><button type="button" className="bd-btn-secondary" onClick={onClose} disabled={pending}>Cancel</button>
      <button type="submit" form={formId} className="buyer-chrome-bar__cta" disabled={pending || !form.title.trim()}>{pending ? "Saving…" : "Save"}</button></span>
    </div>
  }>
    <form id={formId} className="composable-sheet" onSubmit={submit}>
      <fieldset disabled={pending} className="contents">
        <label className="composable-field"><span className="composable-field__label">Title</span><input className="composable-input" required maxLength={120} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
        <ProjectCoverPanel draftSessionId={formId.replace(/:/g, "")} coverImageUrl={form.coverImageUrl} coverStoragePath={coverPath}
          onCoverChange={(url, path) => { setForm((previous) => ({ ...previous, coverImageUrl: url })); setCoverPath(path); }} onError={setError} />
        <div><h3 className="composable-field__label">Artist or client</h3><ClientEntityAutocomplete kind={form.clientEntityKind ?? "company"} onKindChange={(kind) => setForm({ ...form, clientEntityKind: kind })}
          value={form.productionCompany} imageUrl={form.productionCompanyLogoUrl ?? ""} onChange={(value) => setForm({ ...form, productionCompany: value, productionCompanyLogoUrl: "" })}
          onSelect={(client) => setForm({ ...form, productionCompany: client.name, productionCompanyLogoUrl: client.imageUrl ?? "", clientEntityKind: client.kind })} /></div>
        <label className="composable-field"><span className="composable-field__label">Description</span><textarea className="composable-input" rows={4} maxLength={10000} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
        <label className="composable-field"><span className="composable-field__label">Location</span><input className="composable-input" maxLength={255} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></label>
        <CastingScheduleStep projectOnly form={form} onFormChange={setForm} updateConfiguration={(patch) => setForm((previous) => ({ ...previous, configuration: { ...previous.configuration, ...patch } }))} />
        {!form.configuration.schedule_categories.length ? <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.configuration.production_dates_not_known_confirmed ?? false}
          onChange={(e) => setForm({ ...form, startDate: e.target.checked ? "" : form.startDate, endDate: e.target.checked ? "" : form.endDate, configuration: { ...form.configuration, production_dates_not_known_confirmed: e.target.checked } })} />Dates not confirmed yet</label> : null}
      </fieldset>
      {error ? <p className="composable-field__error" role="alert">{error}</p> : null}
    </form>
  </Modal>;
}
