"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Copy, Link2, Loader2, MessageSquarePlus, Search } from "lucide-react";

import {
  getCastingReferralShareUrls,
  searchPlatformUsers,
  type PlatformUserResult,
} from "@/app/(buyer-app)/projects/[id]/casting-workflow/actions";
import { startConversationWith } from "@/lib/app/conversations";
import { Modal } from "@/components/talent-buyers/dashboard/Modal";
import { useToast } from "@/components/talent-buyers/dashboard/ToastProvider";

import "./casting-workspace.css";

function absoluteUrl(pathOrUrl: string): string {
  if (pathOrUrl.startsWith("http")) return pathOrUrl;
  if (typeof window === "undefined") return pathOrUrl;
  return `${window.location.origin}${pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`}`;
}

export function AskForReferralModal({
  open,
  onClose,
  castingId,
  castingTitle,
}: {
  open: boolean;
  onClose: () => void;
  castingId: string;
  castingTitle?: string;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<PlatformUserResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [motiionUrl, setMotiionUrl] = useState<string | null>(null);
  const [externalUrl, setExternalUrl] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open || !castingId) return;

    let cancelled = false;
    void getCastingReferralShareUrls(castingId).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setMotiionUrl(result.motiionUrl ?? null);
        setExternalUrl(result.externalUrl ?? null);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [open, castingId]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setUsers([]);
    }
  }, [open]);

  async function runSearch() {
    const needle = query.trim();
    if (needle.length < 2) {
      setUsers([]);
      return;
    }

    setSearching(true);
    try {
      const result = await searchPlatformUsers(needle);
      if (result.error) {
        showToast({ message: result.error, variant: "error" });
        setUsers([]);
        return;
      }
      setUsers(result.users);
    } catch {
      showToast({ message: "Could not search users.", variant: "error" });
      setUsers([]);
    } finally {
      setSearching(false);
    }
  }

  function copyLink(url: string | null, label: string) {
    if (!url) {
      showToast({ message: "Link not ready yet.", variant: "error" });
      return;
    }
    void navigator.clipboard.writeText(absoluteUrl(url)).then(
      () => showToast({ message: `${label} copied`, variant: "success" }),
      () => showToast({ message: "Could not copy link", variant: "error" }),
    );
  }

  function askUser(user: PlatformUserResult) {
    // Always prefer the canonical Motiion host so iOS opens the referral in-app.
    const referUrl =
      motiionUrl && motiionUrl.startsWith("http")
        ? motiionUrl
        : `https://www.motiion.app/refer/${castingId}`;
    const title = castingTitle?.trim() || "a casting";
    const message = `Hi ${user.name.split(" ")[0] ?? user.name} — could you refer talent for ${title}? Tap the link below to search Motiion and add recommendations.`;

    startTransition(async () => {
      const result = await startConversationWith({
        targetUserId: user.userId,
        contextType: "casting_referral",
        contextId: castingId,
        initialMessage: message,
        link: {
          title: "Refer talent",
          url: referUrl,
          previewLabel: "Open referral form",
          subtitle: `Recommendations for ${title}`,
        },
      });

      if (!result.ok) {
        showToast({ message: result.error ?? "Could not send request", variant: "error" });
        return;
      }

      if (result.pendingRequest) {
        showToast({
          message: "Referral request sent — waiting for them to accept messaging.",
          variant: "success",
        });
        onClose();
        return;
      }

      showToast({ message: `Referral request sent to ${user.name}`, variant: "success" });
      onClose();
      if (result.conversationId) {
        router.push(`/messages?conversation=${encodeURIComponent(result.conversationId)}`);
      }
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Ask for referral"
      description="Message someone on Motiion, or copy a shareable referral link."
      size="lg"
    >
      <div className="ask-referral-modal">
        <div className="ask-referral-modal__links">
          <button
            type="button"
            className="bd-btn-secondary inline-flex items-center gap-1.5 text-sm"
            onClick={() => copyLink(motiionUrl, "Motiion referral link")}
            disabled={!motiionUrl}
          >
            <Link2 className="size-4" aria-hidden />
            Copy Motiion link
          </button>
          <button
            type="button"
            className="bd-btn-secondary inline-flex items-center gap-1.5 text-sm"
            onClick={() => copyLink(externalUrl, "External referral link")}
            disabled={!externalUrl}
          >
            <Copy className="size-4" aria-hidden />
            Copy external link
          </button>
        </div>

        <div className="ask-referral-modal__search">
          <label className="casting-toolbar__field casting-find-talent-toolbar__search">
            <span>Find someone on Motiion</span>
            <div className="casting-find-talent-toolbar__search-input">
              <Search className="size-4 text-white/35" aria-hidden />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void runSearch();
                  }
                }}
                placeholder="Search dancers or choreographers"
                className="casting-input"
              />
            </div>
          </label>
          <button type="button" className="bd-btn-secondary" onClick={() => void runSearch()} disabled={searching}>
            {searching ? <Loader2 className="size-4 animate-spin" aria-hidden /> : "Search"}
          </button>
        </div>

        <ul className="ask-referral-modal__results">
          {users.map((user) => (
            <li key={user.userId} className="ask-referral-modal__result">
              <div className="ask-referral-modal__result-main">
                {user.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.imageUrl} alt="" className="ask-referral-modal__avatar" />
                ) : (
                  <div className="ask-referral-modal__avatar ask-referral-modal__avatar--empty" />
                )}
                <div>
                  <strong>{user.name}</strong>
                  {user.subtitle ? <p>{user.subtitle}</p> : null}
                </div>
              </div>
              <button
                type="button"
                className="bd-btn-accent inline-flex items-center gap-1.5"
                disabled={isPending}
                onClick={() => askUser(user)}
              >
                <MessageSquarePlus className="size-4" aria-hidden />
                Ask
              </button>
            </li>
          ))}
        </ul>

        {!searching && query.trim().length >= 2 && users.length === 0 ? (
          <p className="ask-referral-modal__empty">No users matched that search.</p>
        ) : null}
      </div>
    </Modal>
  );
}
