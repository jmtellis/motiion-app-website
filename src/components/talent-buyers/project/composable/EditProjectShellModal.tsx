"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition, type FormEvent } from "react";

import {
  setComposableProjectArchived,
  updateComposableProjectShell,
} from "@/app/(buyer-app)/(paid)/projects/composable-actions";
import { Modal } from "@/components/talent-buyers/dashboard/Modal";
import { useToast } from "@/components/talent-buyers/dashboard/ToastProvider";

import "./composable-project.css";

export type EditableProjectShell = {
  id: string;
  title: string;
  location: string | null;
  startDate: string | null;
  endDate: string | null;
  coverImageUrl: string | null;
  archivedAt: string | null;
};

export function EditProjectShellModal({
  open,
  onClose,
  project,
}: {
  open: boolean;
  onClose: () => void;
  project: EditableProjectShell;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const formId = useId();
  const [name, setName] = useState(project.title);
  const [location, setLocation] = useState(project.location ?? "");
  const [startDate, setStartDate] = useState(project.startDate?.slice(0, 10) ?? "");
  const [endDate, setEndDate] = useState(project.endDate?.slice(0, 10) ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [wasOpen, setWasOpen] = useState(false);

  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setName(project.title);
      setLocation(project.location ?? "");
      setStartDate(project.startDate?.slice(0, 10) ?? "");
      setEndDate(project.endDate?.slice(0, 10) ?? "");
      setError(null);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim() || pending) return;
    startTransition(async () => {
      const result = await updateComposableProjectShell({
        projectId: project.id,
        shell: { name, location, startDate, endDate, coverImageUrl: project.coverImageUrl ?? "" },
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      showToast({ message: "Project updated", variant: "success" });
      onClose();
      router.refresh();
    });
  }

  function toggleArchived() {
    startTransition(async () => {
      const archived = !project.archivedAt;
      const result = await setComposableProjectArchived({ projectId: project.id, archived });
      if (!result.ok) {
        showToast({ message: result.error, variant: "error" });
        return;
      }
      showToast({ message: archived ? "Project archived" : "Project restored", variant: "success" });
      onClose();
      router.refresh();
    });
  }

  return (
    <Modal
      open={open}
      onClose={() => (pending ? undefined : onClose())}
      title="Project details"
      size="md"
      footer={
        <div className="composable-sheet__footer composable-sheet__footer--split">
          <button type="button" className="bd-btn-secondary" onClick={toggleArchived} disabled={pending}>
            {project.archivedAt ? "Restore project" : "Archive project"}
          </button>
          <span className="composable-sheet__footer-group">
            <button type="button" className="bd-btn-secondary" onClick={onClose} disabled={pending}>
              Cancel
            </button>
            <button
              type="submit"
              form={formId}
              className="buyer-chrome-bar__cta"
              disabled={pending || !name.trim()}
            >
              {pending ? "Saving…" : "Save"}
            </button>
          </span>
        </div>
      }
    >
      <form id={formId} className="composable-sheet" onSubmit={handleSubmit} noValidate>
        <label className="composable-field">
          <span className="composable-field__label">Project name</span>
          <input
            className="composable-input"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={255}
            required
          />
        </label>
        <label className="composable-field">
          <span className="composable-field__label">City</span>
          <input
            className="composable-input"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            maxLength={255}
          />
        </label>
        <div className="composable-sheet__dates">
          <label className="composable-field">
            <span className="composable-field__label">Start date</span>
            <input
              className="composable-input"
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
            />
          </label>
          <label className="composable-field">
            <span className="composable-field__label">End date</span>
            <input
              className="composable-input"
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={(event) => setEndDate(event.target.value)}
            />
          </label>
        </div>
        {error ? (
          <p className="composable-field__error" role="alert">
            {error}
          </p>
        ) : null}
      </form>
    </Modal>
  );
}
