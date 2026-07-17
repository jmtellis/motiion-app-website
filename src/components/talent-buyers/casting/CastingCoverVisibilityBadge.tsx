"use client";

import { Globe, Lock } from "lucide-react";

import {
  castingVisibilityHint,
  castingVisibilityLabel,
  isCastingPublicVisibility,
} from "@/lib/talent-buyers/casting/casting-display";
import type { CastingVisibility } from "@/lib/talent-buyers/casting/casting-types";

export function CastingCoverVisibilityBadge({
  visibility,
}: {
  visibility: CastingVisibility | undefined;
}) {
  const isPublic = isCastingPublicVisibility(visibility);
  const Icon = isPublic ? Globe : Lock;
  const label = castingVisibilityLabel(visibility);
  const hint = castingVisibilityHint(visibility);

  return (
    <span className="casting-cover-visibility" tabIndex={0}>
      <span className="casting-cover-visibility__icon" aria-hidden>
        <Icon className="size-3.5" strokeWidth={2.25} />
      </span>
      <span className="casting-cover-visibility__tooltip" role="tooltip">
        <span className="casting-cover-visibility__tooltip-label">{label}</span>
        <span className="casting-cover-visibility__tooltip-hint">{hint}</span>
      </span>
      <span className="sr-only">{`${label}. ${hint}`}</span>
    </span>
  );
}
