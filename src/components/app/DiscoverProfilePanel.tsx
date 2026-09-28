"use client";

import { ChevronLeft } from "lucide-react";
import { useCallback, useRef, useState } from "react";

import { TalentProfileSheet, type TalentProfileChrome } from "@/components/app/talent-profile/TalentProfileSheet";
import { useNotificationsPanel } from "@/components/workspace/WorkspaceNotifications";
import { WorkspaceSidePanel } from "@/components/workspace/WorkspaceSidePanel";
import type { Talent } from "@/lib/talent-navigator/types";

const PANEL_ID = "discover-profile-panel";

export function DiscoverProfilePanel({
  talent,
  open,
  onClose,
}: {
  talent: Talent | null;
  open: boolean;
  onClose: () => void;
}) {
  const notifications = useNotificationsPanel();
  const [title, setTitle] = useState<string | null>(null);
  const [canPop, setCanPop] = useState(false);
  const pop = useRef<(() => void) | null>(null);
  const reason = talent?.matchReasons?.find((item) => item.evidenceType === "credit") ?? talent?.matchReasons?.[0];

  const handleChrome = useCallback((chrome: TalentProfileChrome) => {
    pop.current = chrome.pop;
    setCanPop(Boolean(chrome.pop));
    setTitle((current) => (current === chrome.title ? current : chrome.title));
  }, []);

  return (
    <WorkspaceSidePanel
      id={PANEL_ID}
      open={open && talent !== null && !notifications.open}
      title={title || talent?.name || "Profile"}
      onClose={onClose}
      leading={canPop ? (
        <button type="button" className="workspace-notifications__close" aria-label="Back" onClick={() => pop.current?.()}>
          <ChevronLeft size={18} aria-hidden />
        </button>
      ) : null}
    >
      {talent ? (
        <TalentProfileSheet
          key={talent.id}
          slug={talent.slug || talent.id}
          userId={talent.id}
          onChrome={handleChrome}
          matchReason={reason?.label}
        />
      ) : null}
    </WorkspaceSidePanel>
  );
}
