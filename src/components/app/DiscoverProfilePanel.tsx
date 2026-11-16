"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { TalentProfileSheet } from "@/components/app/talent-profile/TalentProfileSheet";
import { useNotificationsPanel } from "@/components/workspace/WorkspaceNotifications";
import { WorkspaceSidePanel } from "@/components/workspace/WorkspaceSidePanel";
import { discoverDetailHref, discoverReturnHref } from "@/lib/app/discover-paths";
import type { Talent } from "@/lib/talent-navigator/types";
import type { PublicTalentProfile } from "@/types/public";

const PANEL_ID = "discover-profile-panel";
const ignoreChrome = () => {};

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
  const reason = talent?.matchReasons?.find((item) => item.evidenceType === "credit") ?? talent?.matchReasons?.[0];

  function openFullProfile(profile: PublicTalentProfile) {
    const slug = profile.username?.trim() || profile.id;
    const from = discoverReturnHref(pathname, searchParams.toString(), profile.id);
    router.push(discoverDetailHref(profileBasePath, "profile", slug, from));
  }

  return (
    <WorkspaceSidePanel
      id={PANEL_ID}
      open={open && talent !== null && !notifications.open}
      title="Profile preview"
      onClose={onClose}
    >
      {talent ? (
        <TalentProfileSheet
          key={talent.id}
          slug={talent.slug || talent.id}
          userId={talent.id}
          variant="preview"
          onChrome={ignoreChrome}
          previewSummary={{ name: talent.name, imageUrl: talent.imageUrl, location: talent.location }}
          hideFullProfileFooter
          matchReason={reason?.label}
          onOpenFullProfile={openFullProfile}
        />
      ) : null}
    </WorkspaceSidePanel>
  );
}
