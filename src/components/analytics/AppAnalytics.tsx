"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { trackClientEvent } from "@/lib/analytics/track-client";

export function AppAnalytics() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) {
      return;
    }

    trackClientEvent("page_viewed", {}, pathname);
  }, [pathname]);

  return null;
}
