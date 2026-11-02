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
import {
  clearPendingFeaturedTalentInviteToken,
  featuredInvitePath,
  projectInvitationTitle,
  storePendingFeaturedTalentInviteToken,
  type FeaturedTalentInviteCard,
} from "@/lib/publicFeaturedTalentInvite";
import { createClientSupabaseClient } from "@/lib/supabase/client";

type FeaturedInviteLandingClientProps = {
  token: string;
  card: FeaturedTalentInviteCard | null;
  cardError?: string | null;
};

function claimErrorMessage(code: string | undefined): string {
  switch (code) {
    case "talent_only":
      return "This invite is for talent profiles. Switch to or create a talent account to accept.";
    case "expired":
      return "This invite has expired.";
    case "revoked":
      return "This invite was revoked.";
    case "claimed":
      return "This invite was already claimed.";
    case "not_found":
      return "This invite could not be found.";
    default:
      return "Unable to accept invite.";
  }
}

export function FeaturedInviteLandingClient({
  token,
  card,
  cardError = null,
}: FeaturedInviteLandingClientProps) {
  const appStoreUrl = getIosAppStoreUrl();
  const openInAppHref = `motiion://www.motiion.app/featured-invite/${encodeURIComponent(token)}`;
  const [status, setStatus] = useState<"idle" | "working" | "done" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(cardError);
  const [isAuthed, setIsAuthed] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    if (token) {
      storePendingFeaturedTalentInviteToken(token);
    }
    const supabase = createClientSupabaseClient();
    if (!supabase) return;
    void (async () => {
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      setIsAuthed(Boolean(session));
      if (!session?.user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_completed_at")
        .eq("user_id", session.user.id)
        .maybeSingle();
      setNeedsOnboarding(!profile?.onboarding_completed_at);
    })();
  }, [token]);

  const claimInvite = useCallback(
    async (action: "accept" | "decline") => {
      setStatus("working");
      setErrorMessage(null);
      try {
        const supabase = createClientSupabaseClient();
        if (!supabase) {
          setStatus("error");
          setErrorMessage("Unable to connect.");
          return;
        }
        if (token.startsWith("ws_")) {
          if (action === "decline") { clearPendingFeaturedTalentInviteToken(); window.location.assign("/"); return; }
          const { error } = await supabase.rpc("join_featured_workspace", { p_token: token });
          if (error) throw error;
          clearPendingFeaturedTalentInviteToken();
          setStatus("done");
          return;
        }
        const { data, error } = await supabase.rpc("claim_activity_featured_talent_invite", {
          p_token: token,
          p_action: action,
        });
        if (error) throw error;
        const result = data as {
          ok?: boolean;
          error?: string;
          activity_id?: string;
          status?: string;
        } | null;
        if (!result?.ok) {
          setStatus("error");
          setErrorMessage(claimErrorMessage(result?.error));
          return;
        }
        clearPendingFeaturedTalentInviteToken();
        setStatus("done");
        if (result.activity_id) {
          window.location.href = `/event/${result.activity_id}`;
        }
      } catch (err) {
        setStatus("error");
        setErrorMessage(err instanceof Error ? err.message : "Unable to update invite.");
      }
    },
    [token],
  );

  const headline = card?.workspaceTitle
    ? projectInvitationTitle(card.inviterName)
    : card
    ? `You're invited to be featured at ${card.eventTitle}`
    : "Featured talent invite";

  return (
    <>
      <MarketingBodySurface dark />
      <BrowserThemeColor color={MARKETING_DARK.bg} />
      <PublicPageAnalytics
        eventName="featured_talent_invite_opened"
        properties={{ featured_invite_token: token }}
        path={featuredInvitePath(token)}
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
                {card?.workspaceTitle ? "Private workspace invitation" : "Featured talent invite"}
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#fafafa]">
                {headline}
              </h1>
              {card?.workspaceTitle ? (
                <p className="mt-3 text-lg font-medium text-[#fafafa]">{card.workspaceTitle}</p>
              ) : card?.inviterName ? (
                <p className="mt-3 text-sm text-[#a3a3a3]">
                  {card.inviterName} invited {card.displayName}
                </p>
              ) : card ? (
                <p className="mt-3 text-sm text-[#a3a3a3]">Invited as {card.displayName}</p>
              ) : null}
              {card?.workspaceTitle ? (
                <p className="mt-4 text-sm text-[#a3a3a3]">{card.invitationRole === "admin"
                    ? "Accept to become a project admin. Sign in or create an account using the verified email address your invitation was sent to."
                    : card.invitationRole === "participant"
                      ? "Accept to join this project’s workspace."
                      : `Accept to join the private team and Featured Performers for ${card.eventTitle}.`} Already have Motiion? Open this invitation in the app. Otherwise, create your account here first so your invitation is saved, then download the app if you use iPhone.</p>
              ) : null}
              {!card ? (
                <p className="mt-4 text-sm text-[#a3a3a3]">
                  {errorMessage ?? "This invite may have expired or been revoked."}
                </p>
              ) : null}
            </div>

            <div className="mt-10 flex flex-col gap-3">
              {card && isAuthed && needsOnboarding ? (
                <Link
                  href="/onboarding"
                  className="inline-flex h-12 items-center justify-center rounded-full bg-[#00aacc] px-5 text-sm font-semibold text-[#041018] transition hover:bg-[#33bbd6]"
                >
                  Finish setup to accept
                </Link>
              ) : null}

              {card && isAuthed && !needsOnboarding ? (
                <>
                  <button
                    type="button"
                    onClick={() => void claimInvite("accept")}
                    disabled={status === "working" || status === "done"}
                    className="inline-flex h-12 items-center justify-center rounded-full bg-[#00aacc] px-5 text-sm font-semibold text-[#041018] transition hover:bg-[#33bbd6] disabled:opacity-60"
                  >
                    {status === "working"
                      ? "Accepting…"
                      : status === "done"
                        ? (token.startsWith("ws_") ? "Joined workspace" : "Accepted")
                        : card.workspaceTitle ? "Join workspace" : "Accept invite"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void claimInvite("decline")}
                    disabled={status === "working" || status === "done"}
                    className="inline-flex h-12 items-center justify-center rounded-full border border-white/16 px-5 text-sm font-medium text-[#fafafa] transition hover:bg-white/6 disabled:opacity-60"
                  >
                    {token.startsWith("ws_") ? "Not now" : "Decline"}
                  </button>
                </>
              ) : null}

              {card && !isAuthed ? (
                <Link
                  href={`/signup?featured=${encodeURIComponent(token)}`}
                  className="inline-flex h-12 items-center justify-center rounded-full bg-[#00aacc] px-5 text-sm font-semibold text-[#041018] transition hover:bg-[#33bbd6]"
                >
                  Create an account to join
                </Link>
              ) : null}

              {card && !isAuthed ? (
                <Link
                  href={`/login?next=${encodeURIComponent(featuredInvitePath(token))}`}
                  className="inline-flex h-12 items-center justify-center rounded-full border border-white/16 px-5 text-sm font-medium text-[#fafafa] transition hover:bg-white/6"
                >
                  Log in
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

              {errorMessage && card ? (
                <p className="text-center text-sm text-[#ff8a8a]">{errorMessage}</p>
              ) : null}
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
