"use client";

import { AppleLogo } from "@/components/icons/AppleLogo";
import { getIosAppStoreUrl } from "@/lib/referrals/app-store";

import "@/app/product.css";

function absoluteOpenInAppHref(path?: string): string {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.motiion.app").replace(
    /\/$/,
    "",
  );
  if (!path?.trim()) return siteUrl;
  const trimmed = path.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  const normalized = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `${siteUrl}${normalized}`;
}

export function OpenInAppBar({
  href,
  label = "Open in Motiion",
  hint = "Download Motiion for tickets, updates, and the full experience.",
}: {
  /** Relative or absolute Universal Link path (e.g. `/event/{id}`). */
  href?: string;
  label?: string;
  hint?: string;
}) {
  const appStoreUrl = getIosAppStoreUrl();
  const openInAppHref = absoluteOpenInAppHref(href);

  return (
    <div
      style={{
        position: "sticky",
        bottom: 12,
        zIndex: 20,
        marginTop: 24,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 10,
      }}
    >
      {hint ? (
        <p
          style={{
            margin: 0,
            maxWidth: 360,
            textAlign: "center",
            fontSize: 13,
            lineHeight: 1.45,
            color: "rgba(255,255,255,0.55)",
          }}
        >
          {hint}
        </p>
      ) : null}
      <div
        style={{
          width: "100%",
          maxWidth: 360,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <a
          className="product-btn-primary"
          href={appStoreUrl}
          style={{
            width: "100%",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <AppleLogo className="h-[1.125rem] w-[1.125rem] shrink-0" />
          Download on the App Store
        </a>
        <a
          className="product-btn-secondary"
          href={openInAppHref}
          style={{ width: "100%", textAlign: "center" }}
        >
          {label}
        </a>
      </div>
    </div>
  );
}
