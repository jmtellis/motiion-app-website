"use client";

import Link from "next/link";
import { Briefcase, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { listBuyerOpenRoles } from "@/app/(buyer-app)/(paid)/talent/actions";
import { previewRoleOverlap } from "@/lib/talent-navigator/preview-role-overlap";
import type { BuyerOpenRole } from "@/lib/talent-navigator/open-roles";
import type { PublicTalentProfile } from "@/types/public";

export function PreviewRelevance({ profile }: { profile: PublicTalentProfile }) {
  const [result, setResult] = useState<{ roles: BuyerOpenRole[]; error?: string } | null>(null);
  useEffect(() => {
    let cancelled = false;
    void listBuyerOpenRoles().then(result => { if (!cancelled) setResult(result.error ? { roles: [], error: "Your open roles couldn’t be loaded." } : result); })
      .catch(() => { if (!cancelled) setResult({ roles: [], error: "Your open roles couldn’t be loaded." }); });
    return () => { cancelled = true; };
  }, []);
  const overlaps = result ? previewRoleOverlap(profile, result.roles) : [];
  if (!result || result.error || !overlaps.length) return null;
  return <div className="discover-preview__quick-actions">
    {overlaps.slice(0, 3).map(({ role, sharedStyles, sharedSkills }) => (
      <Link className="home-profile-row discover-preview__role-link" key={role.id} href={`/projects/${encodeURIComponent(role.projectId)}/castings`} prefetch={false}>
        <Briefcase size={18} aria-hidden />
        <span><strong>{role.name}</strong><small>{role.projectTitle} · {role.castingTitle}</small><small>Shared: {[...sharedStyles, ...sharedSkills].join(", ")}</small></span>
        <ChevronRight size={16} aria-hidden />
      </Link>
    ))}
  </div>;
}
