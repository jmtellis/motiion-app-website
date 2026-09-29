"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition, type FormEvent } from "react";

import { createComposableProject } from "@/app/(buyer-app)/(paid)/projects/composable-actions";
import { Modal } from "@/components/talent-buyers/dashboard/Modal";

import "./composable-project.css";

type FieldErrors = Partial<Record<"name" | "location" | "startDate" | "endDate" | "form", string>>;

export function NewProjectSheet({
  open,
  onClose,
  intent,
}: {
  open: boolean;
  onClose: () => void;
  /** Soft suggestion carried to the new project's home ("What do you need?"). */
  intent?: "casting" | null;
}) {
  const router = useRouter();
  const formId = useId();
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [pending, startTransition] = useTransition();

  const nameRef = useRef<HTMLInputElement>(null);

  const canSubmit = name.trim().length > 0 && !pending;

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
  }

  function handleClose() {
    if (pending) return;
    reset();
    onClose();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    setErrors({});
    startTransition(async () => {
      const result = await createComposableProject({ name, location, startDate, endDate });
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

        <p className="composable-sheet__note">Projects are private. Only what you publish from an ability is visible to talent.</p>

        {errors.form && !errors.name && !errors.endDate ? (
          <p className="composable-field__error" role="alert">
            {errors.form}
          </p>
        ) : null}
      </form>
    </Modal>
  );
}
