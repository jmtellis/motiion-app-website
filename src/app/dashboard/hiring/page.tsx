import { redirect } from "next/navigation";

import { getProfileDestination, requireAuth } from "@/lib/auth/session";

export default async function HiringDashboardRedirectPage() {
  const profile = await requireAuth();
  redirect(getProfileDestination(profile));
}
