"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import type { ProFeatureKey } from "@/lib/billing/pro-features";

import { useIndustryPro } from "./IndustryProContext";

/** Blocks deep links to Pro-only create flows; opens upgrade dialog and returns to browse. */
export function ProFeaturePageGate({
  feature,
  fallbackHref,
  children,
}: {
  feature: ProFeatureKey;
  fallbackHref: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const { hasIndustryPro, openUpgrade } = useIndustryPro();

  useEffect(() => {
    if (hasIndustryPro) return;
    openUpgrade(feature);
    router.replace(fallbackHref);
  }, [fallbackHref, feature, hasIndustryPro, openUpgrade, router]);

  if (!hasIndustryPro) return null;
  return children;
}
