"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

import { fetchReviewTalentProfile } from "@/app/(buyer-app)/talent/actions";
import type { CastingCandidate } from "@/lib/talent-buyers/casting/casting-types";
import type { PublicTalentProfile } from "@/types/public";

import { BuyerTalentProfileView } from "@/components/talent-buyers/BuyerTalentProfileView";

export function CastingReviewFocusProfile({
  candidate,
  onPrevious,
  onNext,
  canGoPrevious,
  canGoNext,
  isPending,
  indexLabel,
}: {
  candidate: CastingCandidate;
  onPrevious: () => void;
  onNext: () => void;
  canGoPrevious: boolean;
  canGoNext: boolean;
  isPending?: boolean;
  indexLabel: string;
}) {
  const [profile, setProfile] = useState<PublicTalentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const key =
      candidate.talentSlug?.trim() ||
      candidate.talentProfileId?.trim() ||
      "";
    if (!key) {
      setProfile(null);
      setLoading(false);
      setError("This submission is missing a Motiion profile.");
      return;
    }

    setLoading(true);
    setError(null);
    void fetchReviewTalentProfile(key).then((result) => {
      if (cancelled) return;
      if (result.error || !result.profile) {
        setProfile(null);
        setError(result.error ?? "Could not load profile.");
      } else {
        setProfile(result.profile);
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [candidate.id, candidate.talentSlug, candidate.talentProfileId]);

  return (
    <div className="casting-review-focus-profile">
      <div className="casting-review-focus-profile__stage">
        {loading ? (
          <div className="casting-review-focus-profile__loading">
            <Loader2 className="size-5 animate-spin" aria-hidden />
            <span>Loading profile…</span>
          </div>
        ) : null}

        {!loading && error ? (
          <div className="casting-review-focus-profile__fallback">
            <strong>{candidate.displayName}</strong>
            <p>{error}</p>
            {candidate.headshotUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={candidate.headshotUrl} alt="" className="casting-review-focus-profile__fallback-photo" />
            ) : null}
          </div>
        ) : null}

        {!loading && profile ? (
          <BuyerTalentProfileView profile={profile} hideActions defaultTab="resume" />
        ) : null}
      </div>

      <div className="casting-review-focus-profile__toolbar">
        <button
          type="button"
          className="casting-find-talent-carousel-section__nav-btn"
          disabled={!canGoPrevious || isPending}
          onClick={onPrevious}
          aria-label="Previous submission"
        >
          <ChevronLeft className="size-4" aria-hidden />
        </button>
        <p className="casting-review-focus-profile__count">{indexLabel}</p>
        <button
          type="button"
          className="casting-find-talent-carousel-section__nav-btn"
          disabled={!canGoNext || isPending}
          onClick={onNext}
          aria-label="Next submission"
        >
          <ChevronRight className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
