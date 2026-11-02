"use client";

import { useCallback, useRef, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { TalentProfileSheet, type TalentProfileChrome } from "@/components/app/talent-profile/TalentProfileSheet";
import { WorkspaceSidePanel } from "@/components/workspace/WorkspaceSidePanel";

export function CollectionProfilePanel({ slug, userId, onClose }: { slug: string | null; userId?: string; onClose: () => void }) {
  const [title, setTitle] = useState<string | null>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const back = useRef<(() => void) | null>(null);
  const onChrome = useCallback((chrome: TalentProfileChrome) => {
    setTitle(chrome.title);
    setCanGoBack(Boolean(chrome.pop));
    back.current = chrome.pop;
  }, []);
  return <WorkspaceSidePanel id="collection-profile-panel" open={Boolean(slug)} title={title || "Talent profile"} onClose={onClose}
    leading={canGoBack ? <button type="button" className="workspace-notifications__close" aria-label="Back to profile" onClick={() => back.current?.()}><ChevronLeft size={18} aria-hidden /></button> : null}>
    {slug ? <TalentProfileSheet key={slug} slug={slug} userId={userId} onChrome={onChrome} /> : null}
  </WorkspaceSidePanel>;
}
