"use client";

import type { MouseEvent, ReactNode } from "react";

import { profileWebPath } from "@/lib/app-links/motiion-profile";
import { getIosAppStoreUrl } from "@/lib/referrals/app-store";

import { openMotiionProfile } from "./openMotiionProfile";

export function MotiionProfileLink({
  slug,
  className,
  children,
}: {
  slug: string;
  className?: string;
  children: ReactNode;
}) {
  const appStoreUrl = getIosAppStoreUrl();

  function onClick(event: MouseEvent<HTMLAnchorElement>) {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    openMotiionProfile({ slug, appStoreUrl });
  }

  return (
    <a className={className} href={profileWebPath(slug)} onClick={onClick}>
      {children}
    </a>
  );
}
