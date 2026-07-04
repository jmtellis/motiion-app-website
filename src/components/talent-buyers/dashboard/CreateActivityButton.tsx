"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

import { createBuyerActivity } from "@/app/(buyer-app)/events/actions";

const inputClass =
  "w-full rounded-xl border border-white/12 bg-black/30 px-3.5 py-2.5 text-sm text-white placeholder:text-white/35 outline-none focus:border-white/40";

export function CreateActivityButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [title, setTitle] = useState("");
  const [type, setType] = useState<"class" | "session">("class");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [activityDate, setActivityDate] = useState("");
  const [startTime, setStartTime] = useState("18:00");
  const [maxAttendees, setMaxAttendees] = useState("");

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await createBuyerActivity({
        title,
        type,
        description: description || undefined,
        location: location || undefined,
        activityDate,
        startTime,
        maxAttendees: maxAttendees ? Number(maxAttendees) : undefined,
      });
      if (!result.ok) {
        setError(result.error ?? "Could not create the activity.");
        return;
      }
      setOpen(false);
      setTitle("");
      setDescription("");
      setLocation("");
      setActivityDate("");
      setMaxAttendees("");
      router.refresh();
    });
  }

  return (
    <>
      <button type="button" className="bd-btn-secondary" onClick={() => setOpen(true)}>
        Create Class / Session
      </button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-activity-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <form
            className="w-full max-w-md space-y-4 rounded-2xl border border-white/10 bg-[#141414] p-6"
            onClick={(event) => event.stopPropagation()}
            onSubmit={(event) => {
              event.preventDefault();
              submit();
            }}
          >
            <div className="flex items-start justify-between">
              <h2 id="create-activity-title" className="text-lg font-semibold text-white">
                Create an activity
              </h2>
              <button
                type="button"
                aria-label="Close"
                className="rounded-full p-1 text-white/50 hover:text-white"
                onClick={() => setOpen(false)}
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>

            <div className="flex gap-2">
              {(["class", "session"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setType(option)}
                  className={`flex-1 rounded-xl border px-3 py-2 text-sm font-semibold capitalize transition ${
                    type === option
                      ? "border-white/40 bg-white/10 text-white"
                      : "border-white/10 text-white/55 hover:text-white"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>

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

            <button
              type="submit"
              disabled={isPending}
              className="w-full rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[#0a0a0a] hover:bg-white/90 disabled:opacity-40"
            >
              {isPending ? "Creating…" : "Create activity"}
            </button>
          </form>
        </div>
      ) : null}
    </>
  );
}
