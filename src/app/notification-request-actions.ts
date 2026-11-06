"use server";

import { fetchInboxBundle } from "@/lib/app/inbox";

/** Requests now live in Notifications instead of an Inbox tab. */
export async function loadNotificationRequests() {
  const bundle = await fetchInboxBundle();
  return {
    pendingRequests: bundle.pendingRequests,
    messageRequests: bundle.messageRequests,
    error: bundle.pendingError ?? bundle.messageRequestsError ?? null,
  };
}
