"use client";

import { Plus } from "lucide-react";
import Link from "next/link";

import {
  createIntentPath,
  type BuyerCreateIntent,
} from "@/lib/talent-buyers/create-intent";
import { projectsCreateHref } from "@/lib/talent-buyers/projects-hub-constants";

export function CreateActivityButton({
  projectId,
  triggerClassName = "bd-btn-secondary",
  triggerLabel = "Create",
  showPlusIcon = false,
  type,
  onClick,
}: {
  projectId?: string;
  triggerClassName?: string;
  triggerLabel?: string;
  showPlusIcon?: boolean;
  type?: Exclude<BuyerCreateIntent, "casting">;
  /** When set, opens a local picker instead of navigating. */
  onClick?: () => void;
}) {
  const className = `${triggerClassName}${showPlusIcon ? " gap-1.5" : ""}`;

  if (onClick) {
    return (
      <button type="button" className={className} onClick={onClick}>
        {showPlusIcon ? <Plus className="size-4 shrink-0" aria-hidden /> : null}
        {triggerLabel}
      </button>
    );
  }

  const href = type
    ? createIntentPath(type, projectId)
    : projectsCreateHref();

  return (
    <Link href={href} className={className}>
      {showPlusIcon ? <Plus className="size-4 shrink-0" aria-hidden /> : null}
      {triggerLabel}
    </Link>
  );
}
