"use client";

import { useEffect, useMemo } from "react";

import { trackClientEvent } from "@/lib/analytics/track-client";

type PublicPageAnalyticsProps = {
  eventName: string;
  properties?: Record<string, unknown>;
  path?: string;
};

export function PublicPageAnalytics({ eventName, properties = {}, path }: PublicPageAnalyticsProps) {
  const serializedProperties = useMemo(() => JSON.stringify(properties), [properties]);

  useEffect(() => {
    trackClientEvent(eventName, JSON.parse(serializedProperties) as Record<string, unknown>, path);
  }, [eventName, path, serializedProperties]);

  return null;
}
