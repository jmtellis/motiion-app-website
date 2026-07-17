"use client";

import { Plus } from "lucide-react";
import Link from "next/link";

export function CreateActivityButton({
  projectId,
  triggerClassName = "bd-btn-secondary",
  triggerLabel = "Create activity",
  showPlusIcon = false,
  type,
}: {
  projectId?: string;
  triggerClassName?: string;
  triggerLabel?: string;
  showPlusIcon?: boolean;
  type?: "class" | "session" | "event";
}) {
  const params = new URLSearchParams();
  if (type) params.set("type", type);
  if (projectId) params.set("projectId", projectId);
  const href = `/calendar/new${params.toString() ? `?${params.toString()}` : ""}`;

  return (
    <Link href={href} className={`${triggerClassName}${showPlusIcon ? " gap-1.5" : ""}`}>
      {showPlusIcon ? <Plus className="size-4 shrink-0" aria-hidden /> : null}
      {triggerLabel}
    </Link>
  );
}
