"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { TalentProfileSheet, type TalentProfileChrome } from "@/components/app/talent-profile/TalentProfileSheet";
import { useNotificationsPanel } from "@/components/workspace/WorkspaceNotifications";
import { WorkspaceSidePanel } from "@/components/workspace/WorkspaceSidePanel";
import { discoverDetailHref } from "@/lib/app/discover-paths";
import type { Talent } from "@/lib/talent-navigator/types";
import type { PublicTalentProfile } from "@/types/public";

const PANEL_ID = "discover-profile-panel";

export function DiscoverProfilePanel({
  talent,
  open,
  onClose,
  profileBasePath = "/discover",
}: {
  talent: Talent | null;
  open: boolean;
  onClose: () => void;
  /** Where in-app full profiles live (`/discover` or `/talent`). */
  profileBasePath?: "/discover" | "/talent";
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const notifications = useNotificationsPanel();
  const [title, setTitle] = useState<string | null>(null);
  const pop = useRef<(() => void) | null>(null);
  const reason = talent?.matchReasons?.find((item) => item.evidenceType === "credit") ?? talent?.matchReasons?.[0];

  useEffect(() => {
    setTitle(null);
    pop.current = null;
  }, [talent?.id]);

  const handleChrome = useCallback((chrome: TalentProfileChrome) => {
    pop.current = chrome.pop;
    setTitle((current) => (current === chrome.title ? current : chrome.title));
  }, []);

  function openFullProfile(profile: PublicTalentProfile) {
    const slug = profile.username?.trim() || profile.id;
    const from = `${pathname}${searchParams.toString() ? `?${searchParams}` : ""}`;
    onClose();
    router.push(discoverDetailHref(profileBasePath, "profile", slug, from));
  }

  return (
    <WorkspaceSidePanel
      id={PANEL_ID}
      open={open && talent !== null && !notifications.open}
      title={title || talent?.name || "Profile"}
      onClose={onClose}
      hideHeader
    >
      {talent ? (
        <TalentProfileSheet
          key={talent.id}
          slug={talent.slug || talent.id}
          userId={talent.id}
          variant="preview"
          onChrome={handleChrome}
          matchReason={reason?.label}
          onClose={onClose}
          onOpenFullProfile={openFullProfile}
        />
      ) : null}
    </WorkspaceSidePanel>
  );
}
