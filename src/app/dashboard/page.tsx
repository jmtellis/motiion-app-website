import { redirect } from "next/navigation";

import { getProfileDestination, requireAuth } from "@/lib/auth/session";

export default async function DashboardPage() {
  const profile = await requireAuth();
  redirect("/home");
}
