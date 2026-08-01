"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { useIndustryProOptional } from "./IndustryProContext";

/** Blocks full talent profile pages for free users; opens upgrade dialog and returns to Find Talent. */
export function BuyerTalentProfileProShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { hasIndustryPro, openUpgrade } = useIndustryProOptional();

  useEffect(() => {
    if (hasIndustryPro) return;
    openUpgrade("view_talent_profile");
    router.replace("/talent");
  }, [hasIndustryPro, openUpgrade, router]);

  if (!hasIndustryPro) return null;

  return <div className="relative min-h-0 flex-1">{children}</div>;
}
