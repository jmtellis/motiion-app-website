"use client";

import Link from "next/link";
import { useState } from "react";
import { Copy, ExternalLink, Share2 } from "lucide-react";
import { Modal } from "@/components/talent-buyers/dashboard/Modal";
import type { ProjectWorkspaceData } from "@/components/talent-buyers/project/ProjectWorkspaceContext";
import { useProjectWorkspace } from "@/components/talent-buyers/project/ProjectWorkspaceContext";
import { castingShareState } from "@/lib/talent-buyers/casting/casting-share-state";

export function CastingShareButton({ className = "bd-btn-secondary" }: { className?: string }) {
  const { projectId, castingWorkflow } = useProjectWorkspace();
  const [open, setOpen] = useState(false);
  return <>
    <button type="button" className={className} onClick={() => setOpen(true)}><Share2 size={16} aria-hidden /> Share casting</button>
    {open ? <CastingShareDialog projectId={projectId} castingWorkflow={castingWorkflow} open onClose={() => setOpen(false)} /> : null}
  </>;
}

export function CastingShareDialog({ projectId, castingWorkflow, open, onClose }: Pick<ProjectWorkspaceData, "projectId" | "castingWorkflow"> & { open: boolean; onClose: () => void }) {
  const [message, setMessage] = useState("");
  const share = castingShareState(castingWorkflow?.primaryCasting, castingWorkflow?.roles ?? []);
  async function copy() {
    if (!share.path) return;
    try {
      await navigator.clipboard.writeText(new URL(share.path, window.location.origin).href);
      setMessage("Casting link copied.");
    } catch { setMessage("Could not copy the link. Open the casting page and copy its address."); }
  }
  return <Modal open={open} onClose={onClose} title="Share casting" description="Share the application page with talent. Shortlist feedback has its own review link.">
      <div className="casting-share-content">
        <p>{share.description}</p>
        {share.path ? <>
          <div className="casting-share-content__actions">
            <button type="button" className="bd-btn-accent" onClick={copy}><Copy size={16} aria-hidden /> Copy casting link</button>
            <Link className="bd-btn-secondary" href={share.path} target="_blank" rel="noopener noreferrer"><ExternalLink size={16} aria-hidden /> Preview casting</Link>
          </div>
          <p role="status" aria-live="polite">{message}</p>
        </> : <Link className="bd-btn-secondary" href={`/projects/${projectId}/workspace/${share.invitationOnly ? "talent-search" : "breakdown?details=1"}`} onClick={onClose}>{share.invitationOnly ? "Invite talent" : "Review casting details"}</Link>}
      </div>
    </Modal>;
}
