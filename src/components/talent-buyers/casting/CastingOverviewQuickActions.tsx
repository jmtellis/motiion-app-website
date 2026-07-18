"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  ClipboardCheck,
  MessageSquarePlus,
  Search,
  Send,
  Share2,
} from "lucide-react";

import { getCastingReferralShareUrls } from "@/app/(buyer-app)/(paid)/projects/[id]/casting-workflow/actions";
import { projectWorkspacePath } from "@/lib/talent-buyers/project-routes";
import { useToast } from "@/components/talent-buyers/dashboard/ToastProvider";

import { AskForReferralModal } from "./AskForReferralModal";

type ActionItem = {
  id: string;
  label: string;
  icon: typeof Share2;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
};

export function CastingOverviewQuickActions({
  projectId,
  castingId,
  castingTitle,
  publicRoleId,
}: {
  projectId: string;
  castingId?: string | null;
  castingTitle?: string | null;
  publicRoleId?: string | null;
}) {
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [copying, setCopying] = useState(false);
  const [askOpen, setAskOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const publicUrl =
    publicRoleId && typeof window !== "undefined"
      ? `${window.location.origin}/casting/${publicRoleId}`
      : publicRoleId
        ? `/casting/${publicRoleId}`
        : null;

  async function copyCastingLink() {
    if (!publicUrl) {
      showToast({ message: "Publish the casting to get a share link.", variant: "error" });
      return;
    }
    const fullUrl = publicUrl.startsWith("http") ? publicUrl : `${window.location.origin}${publicUrl}`;
    setCopying(true);
    try {
      await navigator.clipboard.writeText(fullUrl);
      showToast({ message: "Casting link copied", variant: "success" });
      setOpen(false);
    } catch {
      showToast({ message: "Could not copy link", variant: "error" });
    } finally {
      setCopying(false);
    }
  }

  async function copyReferralLink(kind: "motiion" | "external") {
    if (!castingId) {
      showToast({ message: "Save the casting before sharing a referral link.", variant: "error" });
      return;
    }
    setCopying(true);
    try {
      const result = await getCastingReferralShareUrls(castingId);
      if (!result.ok) {
        showToast({ message: result.error ?? "Could not create referral link.", variant: "error" });
        return;
      }
      const url = kind === "external" ? result.externalUrl : result.motiionUrl;
      if (!url) {
        showToast({ message: "Could not create referral link.", variant: "error" });
        return;
      }
      const fullUrl = url.startsWith("http") ? url : `${window.location.origin}${url}`;
      await navigator.clipboard.writeText(fullUrl);
      showToast({
        message: kind === "external" ? "External referral link copied" : "Motiion referral link copied",
        variant: "success",
      });
      setOpen(false);
    } catch {
      showToast({ message: "Could not copy link", variant: "error" });
    } finally {
      setCopying(false);
    }
  }

  const actions: ActionItem[] = [
    {
      id: "share",
      label: "Share casting",
      icon: Share2,
      onClick: copyCastingLink,
      disabled: copying,
    },
    {
      id: "referral",
      label: "Ask for referral",
      icon: MessageSquarePlus,
      onClick: () => {
        if (!castingId) {
          showToast({ message: "Save the casting before asking for referrals.", variant: "error" });
          return;
        }
        setOpen(false);
        setAskOpen(true);
      },
      disabled: !castingId,
    },
    {
      id: "refer-link",
      label: "Copy Motiion referral link",
      icon: Share2,
      onClick: () => void copyReferralLink("motiion"),
      disabled: copying || !castingId,
    },
    {
      id: "refer-external",
      label: "Copy external referral link",
      icon: Share2,
      onClick: () => void copyReferralLink("external"),
      disabled: copying || !castingId,
    },
    {
      id: "invite",
      label: "Invite talent",
      icon: Send,
      href: projectWorkspacePath(projectId, "talent-search"),
    },
    {
      id: "find",
      label: "Find talent",
      icon: Search,
      href: projectWorkspacePath(projectId, "talent-search"),
    },
    {
      id: "review",
      label: "Review submissions",
      icon: ClipboardCheck,
      href: projectWorkspacePath(projectId, "review"),
    },
  ];

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
    <>
      <div className="casting-overview-actions" ref={menuRef}>
        <button
          type="button"
          className="casting-overview-actions__trigger"
          aria-expanded={open}
          aria-haspopup="menu"
          onClick={() => setOpen((current) => !current)}
        >
          Actions
          <ChevronDown className={`size-3.5 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
        </button>

        {open ? (
          <ul className="casting-overview-actions__menu" role="menu">
            {actions.map((action) => (
              <li key={action.id} role="none">
                {action.href ? (
                  <Link
                    href={action.href}
                    className="casting-overview-actions__item"
                    role="menuitem"
                    onClick={() => setOpen(false)}
                  >
                    <action.icon className="size-4 shrink-0" aria-hidden />
                    {action.label}
                  </Link>
                ) : (
                  <button
                    type="button"
                    className="casting-overview-actions__item"
                    role="menuitem"
                    onClick={action.onClick}
                    disabled={action.disabled}
                  >
                    <action.icon className="size-4 shrink-0" aria-hidden />
                    {action.label}
                  </button>
                )}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {castingId ? (
        <AskForReferralModal
          open={askOpen}
          onClose={() => setAskOpen(false)}
          castingId={castingId}
          castingTitle={castingTitle ?? undefined}
        />
      ) : null}
    </>
  );
}
