"use client";

import { ExternalLink, Link2 } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

import type { MessagingLinkPayload } from "@/lib/messaging/attachment-payload";

function castingReferralPath(url: string): string | null {
  try {
    const parsed = new URL(url);
    const match = parsed.pathname.match(
      /\/refer\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i,
    );
    if (!match?.[1]) return null;
    return `/refer/${match[1]}`;
  } catch {
    return null;
  }
}

export function MessageLinkBubble({
  payload,
  isMine,
  variant = "default",
}: {
  payload: MessagingLinkPayload;
  isMine: boolean;
  variant?: "default" | "dashboard";
}) {
  const isDashboard = variant === "dashboard";
  const inAppReferralPath = useMemo(() => castingReferralPath(payload.url), [payload.url]);

  const className = `block w-[min(280px,100%)] overflow-hidden rounded-2xl border text-left transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2dd4bf] ${
    isMine
      ? "border-[#fafafa]/20 bg-[#fafafa] text-[#0a0a0a]"
      : isDashboard
        ? "border-white/10 bg-white/8 text-white/90"
        : "border-[#2a2a2a] bg-[#1e1e1e] text-[#eaeaea]"
  }`;

  const content = (
    <>
      <div
        className={`flex items-center gap-3 px-3.5 py-3 ${
          isMine ? "bg-black/[0.04]" : isDashboard ? "bg-white/[0.04]" : "bg-white/[0.03]"
        }`}
      >
        <div
          className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${
            isMine ? "bg-[#0a0a0a]/08 text-[#0a0a0a]" : "bg-[#2dd4bf]/15 text-[#2dd4bf]"
          }`}
        >
          <Link2 className="size-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{payload.title}</p>
          {payload.subtitle ? (
            <p
              className={`mt-0.5 truncate text-xs ${
                isMine ? "text-black/50" : isDashboard ? "text-white/45" : "text-[var(--ink-soft)]"
              }`}
            >
              {payload.subtitle}
            </p>
          ) : null}
        </div>
        <ExternalLink
          className={`size-4 shrink-0 ${isMine ? "text-black/40" : isDashboard ? "text-white/40" : "text-[var(--ink-soft)]"}`}
          aria-hidden
        />
      </div>
      <div className="px-3.5 py-2">
        <p
          className={`truncate text-xs ${
            isMine ? "text-black/45" : isDashboard ? "text-white/40" : "text-[var(--ink-soft)]"
          }`}
        >
          {payload.preview_label || "Tap to open"}
        </p>
      </div>
    </>
  );

  // Motiion referral cards stay in the website app shell instead of a new browser tab.
  if (inAppReferralPath) {
    return (
      <Link href={inAppReferralPath} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <a
      href={payload.url}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      {content}
    </a>
  );
}
