"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { PublicPageAnalytics } from "@/components/analytics/PublicPageAnalytics";
import { MotiionWordmark } from "@/components/brand/MotiionWordmark";
import { AppleLogo } from "@/components/icons/AppleLogo";
import { BrowserThemeColor } from "@/components/landing/BrowserThemeColor";
import { MarketingBodySurface } from "@/components/landing/MarketingBodySurface";
import { MARKETING_DARK } from "@/lib/marketing/dark-theme";
import { getIosAppStoreUrl } from "@/lib/referrals/app-store";
import type { ProductionJobJoinCard } from "@/lib/publicJob";
import { createClientSupabaseClient } from "@/lib/supabase/client";

const PENDING_JOB_TOKEN_KEY = "motiion.pending_job_invite_token";

type JobJoinLandingClientProps = {
  token: string;
  card: ProductionJobJoinCard | null;
};

function formatDateRange(start: string | null, end: string | null): string | null {
  if (!start && !end) return null;
  if (start && end && start !== end) return `${start} – ${end}`;
  return start ?? end;
}

export function JobJoinLandingClient({ token, card }: JobJoinLandingClientProps) {
  const appStoreUrl = getIosAppStoreUrl();
  const openInAppHref = `https://www.motiion.app/job/${encodeURIComponent(token)}`;
  const [status, setStatus] = useState<"idle" | "accepting" | "accepted" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    if (token) {
      try {
        window.localStorage.setItem(PENDING_JOB_TOKEN_KEY, token);
      } catch {
        // ignore
      }
    }
    const supabase = createClientSupabaseClient();
    if (!supabase) return;
    void supabase.auth.getSession().then(({ data }) => {
      setIsAuthed(Boolean(data.session));
    });
  }, [token]);

  const acceptInvite = useCallback(async () => {
    setStatus("accepting");
    setErrorMessage(null);
    try {
      const supabase = createClientSupabaseClient();
      if (!supabase) {
        setStatus("error");
        setErrorMessage("Unable to connect.");
        return;
      }
      const { data, error } = await supabase.rpc("accept_job_invite", { p_token: token });
      if (error) throw error;
      const result = data as { ok?: boolean; error?: string; job_id?: string } | null;
      if (!result?.ok) {
        setStatus("error");
        setErrorMessage(result?.error ?? "Unable to accept invite.");
        return;
      }
      try {
        window.localStorage.removeItem(PENDING_JOB_TOKEN_KEY);
      } catch {
        // ignore
      }
      setStatus("accepted");
      if (result.job_id) {
        window.location.href = `/jobs/${result.job_id}`;
      }
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Unable to accept invite.");
    }
  }, [token]);

  const headline = card?.title ? `Join ${card.title}` : "Join this Job on Motiion";
  const dateLabel = formatDateRange(card?.startDate ?? null, card?.endDate ?? null);

  return (
    <>
      <MarketingBodySurface dark />
      <BrowserThemeColor color={MARKETING_DARK.bg} />
      <PublicPageAnalytics
        eventName="job_invite_opened"
        properties={{ job_token: token }}
        path={`/job/${token}`}
      />

      <div className="relative min-h-svh bg-[#111111] text-[#fafafa]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 55% at 0% -10%, rgb(0 170 204 / 0.06) 0%, transparent 50%)",
          }}
        />

        <div className="relative mx-auto flex min-h-svh w-full max-w-md flex-col px-6 py-8">
          <header>
            <Link href="/" className="inline-flex items-center" aria-label="Motiion home">
              <MotiionWordmark priority height={12} />
            </Link>
          </header>

          <main className="flex flex-1 flex-col justify-center py-12">
            <div className="flex flex-col items-center text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8a8a8a]">
                Job invite
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#fafafa]">
                {headline}
              </h1>
              {card?.inviterName ? (
                <p className="mt-3 text-sm text-[#a3a3a3]">
                  {card.inviterName} added you
                  {card.choreographerName ? ` · Choreographed by ${card.choreographerName}` : ""}
                </p>
              ) : null}
              {dateLabel ? (
                <p className="mt-2 text-sm text-[#8a8a8a]">{dateLabel}</p>
              ) : null}
              {!card ? (
                <p className="mt-4 text-sm text-[#a3a3a3]">
                  This invite may have expired or been revoked.
                </p>
              ) : null}
            </div>

            <div className="mt-10 flex flex-col gap-3">
              {card && isAuthed ? (
                <button
                  type="button"
                  onClick={() => void acceptInvite()}
                  disabled={status === "accepting" || status === "accepted"}
                  className="inline-flex h-12 items-center justify-center rounded-full bg-[#00aacc] px-5 text-sm font-semibold text-[#041018] transition hover:bg-[#33bbd6] disabled:opacity-60"
                >
                  {status === "accepting"
                    ? "Accepting…"
                    : status === "accepted"
                      ? "Accepted"
                      : "Accept invite"}
                </button>
              ) : null}

              {card && !isAuthed ? (
                <Link
                  href={`/signup?job=${encodeURIComponent(token)}`}
                  className="inline-flex h-12 items-center justify-center rounded-full bg-[#00aacc] px-5 text-sm font-semibold text-[#041018] transition hover:bg-[#33bbd6]"
                >
                  Sign up to join
                </Link>
              ) : null}

              {appStoreUrl ? (
                <a
                  href={appStoreUrl}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/16 bg-white/6 px-5 text-sm font-medium text-[#fafafa] transition hover:bg-white/12"
                >
                  <AppleLogo className="h-4 w-4" />
                  Get the iOS app
                </a>
              ) : null}

              <a
                href={openInAppHref}
                className="inline-flex h-12 items-center justify-center rounded-full border border-white/16 px-5 text-sm font-medium text-[#fafafa] transition hover:bg-white/6"
              >
                Open in Motiion
              </a>

              {errorMessage ? (
                <p className="text-center text-sm text-[#ff8a8a]">{errorMessage}</p>
              ) : null}
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
