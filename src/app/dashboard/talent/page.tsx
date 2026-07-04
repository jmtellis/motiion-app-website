import { redirect } from "next/navigation";

import { getProfileDestination, requireAuth } from "@/lib/auth/session";

export default async function TalentDashboardRedirectPage() {
  const profile = await requireAuth();
  redirect(getProfileDestination(profile));
}
