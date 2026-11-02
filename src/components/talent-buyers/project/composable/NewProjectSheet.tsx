"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition, type FormEvent } from "react";

import { createComposableProject } from "@/app/(buyer-app)/(paid)/projects/composable-actions";
import { useHydrated } from "@/hooks/use-hydrated";
import { Modal } from "@/components/talent-buyers/dashboard/Modal";

import "./composable-project.css";

type FieldErrors = Partial<Record<"name" | "location" | "startDate" | "endDate" | "form", string>>;

type NewProjectProps = { open: boolean; onClose: () => void; userId: string; intent?: "casting" | null };
function storedDraft(userId: string) {
  try {
    const value = JSON.parse(sessionStorage.getItem(`motiion:new-project:${userId}`) ?? "null");
    if (value && typeof value === "object" && typeof value.requestId === "string" && /^[0-9a-f-]{36}$/i.test(value.requestId)) return value as { requestId: string; name?: string; location?: string; startDate?: string; endDate?: string };
  } catch { /* Storage is optional. */ }
  return { requestId: crypto.randomUUID() };
}
export function NewProjectSheet(props: NewProjectProps) {
  const hydrated = useHydrated();
  return hydrated ? <NewProjectForm key={props.userId} {...props} /> : null;
}
function NewProjectForm({ open, onClose, intent, userId }: NewProjectProps) {
  const [draft] = useState(() => storedDraft(userId));
  const [requestId, setRequestId] = useState(draft.requestId);
  const router = useRouter();
  const formId = useId();
  const [name, setName] = useState(draft.name ?? "");
  const [location, setLocation] = useState(draft.location ?? "");
  const [startDate, setStartDate] = useState(draft.startDate ?? "");
  const [endDate, setEndDate] = useState(draft.endDate ?? "");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [pending, startTransition] = useTransition();

  const nameRef = useRef<HTMLInputElement>(null);

  const canSubmit = name.trim().length > 0 && !pending;
  useEffect(() => {
    try { sessionStorage.setItem(`motiion:new-project:${userId}`, JSON.stringify({ requestId, name, location, startDate, endDate })); } catch { /* Keep the in-memory draft. */ }
  }, [userId, requestId, name, location, startDate, endDate]);

  useEffect(() => {
    if (!open) return;
    // Runs after the modal's own first-focusable pass so typing starts in the name field.
    const timer = window.setTimeout(() => nameRef.current?.focus(), 80);
    return () => window.clearTimeout(timer);
  }, [open]);

  function reset() {
    setName("");
    setLocation("");
    setStartDate("");
    setEndDate("");
    setErrors({});
    setRequestId(crypto.randomUUID());
    try { sessionStorage.removeItem(`motiion:new-project:${userId}`); } catch { /* Storage optional. */ }
  }

  function handleClose() {
    if (pending) return;
    onClose();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    setErrors({});
    startTransition(async () => {
      const result = await createComposableProject({ requestId, name, location, startDate, endDate });
      if (!result.ok) {
        setErrors({ form: result.error, ...(result.fieldErrors ?? {}) });
        return;
      }
      reset();
      router.push(intent ? `${result.href}?suggest=${intent}` : result.href);
    });
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="New project"
      description="Name it now. Add casting, a roster, or classes from the project home."
      size="md"
      footer={
        <div className="composable-sheet__footer">
          <button type="button" className="bd-btn-secondary" onClick={handleClose} disabled={pending}>
            Cancel
          </button>
          <button type="submit" form={formId} className="buyer-chrome-bar__cta" disabled={!canSubmit}>
            {pending ? "Creating…" : "Create project"}
          </button>
        </div>
      }
    >
      <form id={formId} className="composable-sheet" onSubmit={handleSubmit} noValidate>
        <label className="composable-field">
          <span className="composable-field__label">
            Project name <span aria-hidden>*</span>
          </span>
          <input
            ref={nameRef}
            className="composable-input"
            name="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Summer Showcase 2026"
            maxLength={255}
            required
            aria-invalid={errors.name ? true : undefined}
            autoComplete="off"
          />
          {errors.name ? <span className="composable-field__error">{errors.name}</span> : null}
        </label>

        <label className="composable-field">
          <span className="composable-field__label">City</span>
          <input
            className="composable-input"
            name="location"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            placeholder="Los Angeles, CA"
            maxLength={255}
            autoComplete="address-level2"
          />
        </label>

        <div className="composable-sheet__dates">
          <label className="composable-field">
            <span className="composable-field__label">Start date</span>
            <input
              className="composable-input"
              type="date"
              name="startDate"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
            />
          </label>
          <label className="composable-field">
            <span className="composable-field__label">End date</span>
            <input
              className="composable-input"
              type="date"
              name="endDate"
              value={endDate}
              min={startDate || undefined}
              onChange={(event) => setEndDate(event.target.value)}
              aria-invalid={errors.endDate ? true : undefined}
            />
            {errors.endDate ? <span className="composable-field__error">{errors.endDate}</span> : null}
          </label>
        </div>

        <p className="composable-sheet__note">Projects are private. Only published castings and classes are visible to talent.</p>

        {errors.form && !errors.name && !errors.endDate ? (
          <p className="composable-field__error" role="alert">
            {errors.form}
          </p>
        ) : null}
      </form>
    </Modal>
  );
}
