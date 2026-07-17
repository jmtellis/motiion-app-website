"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Copy, Link2, MessageSquarePlus } from "lucide-react";

type FindTalentReferralMenuProps = {
  disabled?: boolean;
  onAskForReferral: () => void;
  onCopyMotiionLink: () => void;
  onCopyExternalLink: () => void;
};

export function FindTalentReferralMenu({
  disabled = false,
  onAskForReferral,
  onCopyMotiionLink,
  onCopyExternalLink,
}: FindTalentReferralMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div className="casting-find-talent-referral-menu" ref={menuRef}>
      <button
        type="button"
        className="casting-find-talent-referral-menu__trigger"
        aria-expanded={open}
        aria-haspopup="menu"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
      >
        Refer
        <ChevronDown
          className={`size-3.5 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      {open ? (
        <ul className="casting-find-talent-referral-menu__menu" role="menu">
          <li role="none">
            <button
              type="button"
              className="casting-find-talent-referral-menu__item"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onAskForReferral();
              }}
            >
              <MessageSquarePlus className="size-4 shrink-0" aria-hidden />
              Ask for referral
            </button>
          </li>
          <li role="none">
            <button
              type="button"
              className="casting-find-talent-referral-menu__item"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onCopyMotiionLink();
              }}
            >
              <Link2 className="size-4 shrink-0" aria-hidden />
              Copy Motiion refer link
            </button>
          </li>
          <li role="none">
            <button
              type="button"
              className="casting-find-talent-referral-menu__item"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onCopyExternalLink();
              }}
            >
              <Copy className="size-4 shrink-0" aria-hidden />
              Copy external refer link
            </button>
          </li>
        </ul>
      ) : null}
    </div>
  );
}
