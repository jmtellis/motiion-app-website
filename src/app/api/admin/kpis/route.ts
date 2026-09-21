import { NextResponse } from "next/server";

import { fetchKpiDashboard } from "@/lib/analytics/kpi-queries";
import { getCurrentUserProfile, isPlatformAdmin } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const profile = await getCurrentUserProfile();
  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = await isPlatformAdmin();
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const data = await fetchKpiDashboard();
  return NextResponse.json(data);
}
