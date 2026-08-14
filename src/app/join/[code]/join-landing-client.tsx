"use client";

import Link from "next/link";
import { useCallback, useState } from "react";

import { PublicPageAnalytics } from "@/components/analytics/PublicPageAnalytics";
import { MotiionWordmark } from "@/components/brand/MotiionWordmark";
import { AppleLogo } from "@/components/icons/AppleLogo";
import { BrowserThemeColor } from "@/components/landing/BrowserThemeColor";
import { MarketingBodySurface } from "@/components/landing/MarketingBodySurface";
import { getProfileInitials } from "@/lib/auth/avatar";
import { MARKETING_DARK } from "@/lib/marketing/dark-theme";
import { getIosAppStoreUrl } from "@/lib/referrals/app-store";
import { joinPagePath, joinPageUrl } from "@/lib/referrals/code";
import type { PublicReferrerProfile } from "@/lib/referrals/resolve-referrer";

type JoinLandingClientProps = {
  code: string;
  referrer: PublicReferrerProfile | null;
};

function ReferrerAvatar({ referrer }: { referrer: PublicReferrerProfile }) {
  if (referrer.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={referrer.avatarUrl}
        alt=""
        className="h-20 w-20 rounded-full object-cover ring-1 ring-white/10"
      />
    );
  }

  return (
    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#1e1e1e] text-lg font-semibold text-[#fafafa] ring-1 ring-white/10">
      {getProfileInitials(referrer.displayName)}
    </div>
  );
}

function ReferralCodeCard({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [code]);

  return (
    <div className="rounded-[14px] border border-[#262626] bg-[#1e1e1e] px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8a8a8a]">
        Your referral code
      </p>
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="min-w-0 break-all font-mono text-xl font-semibold tracking-wide text-[#fafafa]">
          {code}
        </p>
        <button
          type="button"
          onClick={() => void copy()}
          aria-label={copied ? "Referral code copied" : "Copy referral code"}
          className="shrink-0 rounded-full border border-white/16 bg-white/6 px-3 py-1.5 text-xs font-medium text-[#fafafa] transition-colors hover:bg-white/12"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-[#a3a3a3]">
        If Motiion doesn’t open automatically after install, enter this code on signup under
        “Have a referral code?”
      </p>
    </div>
  );
}

export function JoinLandingClient({ code, referrer }: JoinLandingClientProps) {
  const appStoreUrl = getIosAppStoreUrl();
  const analyticsPath = joinPagePath(code);
  const openInAppHref = joinPageUrl(code);
  const headline = referrer
    ? `${referrer.displayName} invited you to Motiion`
    : "You’re invited to Motiion";
  const handle = referrer?.username ? `@${referrer.username}` : null;

  return (
    <>
      <MarketingBodySurface dark />
      <BrowserThemeColor color={MARKETING_DARK.bg} />
      <PublicPageAnalytics
        eventName="referral_link_opened"
        properties={{ referral_code: code }}
        path={analyticsPath}
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
              {referrer ? <ReferrerAvatar referrer={referrer} /> : null}

              <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-[#8a8a8a]">
                Join Motiion
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#fafafa]">
                {headline}
              </h1>
              {handle ? <p className="mt-2 text-sm text-[#a3a3a3]">{handle}</p> : null}
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-[#a3a3a3]">
                Download the Motiion iOS app to create your account. If you already have the app,
                open this invite to apply the referral automatically.
              </p>
            </div>

            <div className="mt-8 flex flex-col gap-3">
              <a
                href={appStoreUrl}
                className="btn-hero-pill btn-hero-pill-accent w-full"
              >
                <AppleLogo className="h-[1.125rem] w-[1.125rem] shrink-0" />
                Download on the App Store
              </a>
              <a href={openInAppHref} className="btn-hero-pill btn-hero-pill-ghost w-full">
                Open in Motiion
              </a>
            </div>

            <div className="mt-8">
              <ReferralCodeCard code={code} />
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
