"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { createBuyerActivity } from "@/app/(buyer-app)/(paid)/events/actions";
import { Modal } from "@/components/talent-buyers/dashboard/Modal";
import { useToast } from "@/components/talent-buyers/dashboard/ToastProvider";
import type { ScheduledActivityType } from "@/lib/talent-buyers/project-add-options";
import { labelFromSnake } from "@/lib/talent-buyers/dashboard-data";

const inputClass =
  "w-full rounded-xl border border-white/12 bg-black/30 px-3.5 py-2.5 text-sm text-white placeholder:text-white/35 outline-none focus:border-[#2dd4bf]/50";

export function CreateScheduledActivityModal({
  projectId,
  activityType,
  open,
  onClose,
}: {
  projectId: string;
  activityType: ScheduledActivityType;
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [activityDate, setActivityDate] = useState("");
  const [startTime, setStartTime] = useState("18:00");
  const [maxAttendees, setMaxAttendees] = useState("");

  function resetForm() {
    setTitle("");
    setDescription("");
    setLocation("");
    setActivityDate("");
    setStartTime("18:00");
    setMaxAttendees("");
    setError(null);
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await createBuyerActivity({
        title,
        type: activityType,
        description: description || undefined,
        location: location || undefined,
        activityDate,
        startTime,
        maxAttendees: maxAttendees ? Number(maxAttendees) : undefined,
        projectId,
      });
      if (!result.ok) {
        setError(result.error ?? "Could not create the activity.");
        return;
      }
      handleClose();
      showToast({ message: `${labelFromSnake(activityType)} created`, variant: "success" });
      router.refresh();
    });
  }

  const typeLabel = labelFromSnake(activityType);

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={`Create ${typeLabel.toLowerCase()}`}
      description={`Schedule a ${typeLabel.toLowerCase()} for this project.`}
      footer={
        <button type="submit" form="create-scheduled-activity-form" disabled={isPending} className="bd-btn-accent">
          {isPending ? "Creating…" : `Create ${typeLabel.toLowerCase()}`}
        </button>
      }
    >
      <form
        id="create-scheduled-activity-form"
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Title"
          required
          className={inputClass}
        />
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Description (optional)"
          rows={3}
          className={inputClass}
        />
        <input
          value={location}
          onChange={(event) => setLocation(event.target.value)}
          placeholder="Location (optional)"
          className={inputClass}
        />
        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1 text-xs font-medium text-white/55">
            Date
            <input
              type="date"
              value={activityDate}
              onChange={(event) => setActivityDate(event.target.value)}
              required
              className={inputClass}
            />
          </label>
          <label className="space-y-1 text-xs font-medium text-white/55">
            Start time
            <input
              type="time"
              value={startTime}
              onChange={(event) => setStartTime(event.target.value)}
              required
              className={inputClass}
            />
          </label>
        </div>
        <input
          type="number"
          min={1}
          value={maxAttendees}
          onChange={(event) => setMaxAttendees(event.target.value)}
          placeholder="Max attendees (optional)"
          className={inputClass}
        />

        {error ? <p className="text-sm text-amber-300">{error}</p> : null}
      </form>
    </Modal>
  );
}
