"use client";

import { useEffect, useRef, type KeyboardEvent, type MouseEvent } from "react";
import { useRouter } from "next/navigation";

/** Give a second tap time to choose the full profile without opening a preview first. */
export function useProfileCardInteraction(href: string | undefined, preview: (() => void) | undefined) {
  const router = useRouter();
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);
  function cancel() {
    if (pending.current !== null) clearTimeout(pending.current);
    pending.current = null;
  }
  useEffect(() => cancel, [href]);
  function openProfile() {
    cancel();
    if (href) router.push(href);
  }
  return {
    onClick(event: MouseEvent<HTMLButtonElement>) {
      if (!href || event.detail === 0) { preview?.(); return; }
      if (pending.current !== null || event.detail >= 2) { openProfile(); return; }
      pending.current = setTimeout(() => { pending.current = null; preview?.(); }, 300);
    },
    onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
      if (href && event.key === "Enter") {
        event.preventDefault();
        if (!event.repeat) openProfile();
      }
    },
  };
}
