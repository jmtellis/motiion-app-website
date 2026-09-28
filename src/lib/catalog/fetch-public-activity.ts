import "server-only";

import { readLivePublicActivity } from "@/lib/catalog/live-catalog";
import { fetchPublicActivity as fetchConnectedActivity } from "@/lib/publicActivity";

/** Staging first. Public live events are read only when this environment does not have them. */
export async function fetchPublicActivity(id: string) {
  const activity = await fetchConnectedActivity(id);
  if (activity) return activity;
  return readLivePublicActivity(decodeURIComponent(id).trim().toLowerCase());
}
