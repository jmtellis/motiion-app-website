import { notFound } from "next/navigation";

import { CastingReferralForm } from "@/components/talent-buyers/casting/CastingReferralForm";
import { ToastProvider } from "@/components/talent-buyers/dashboard/ToastProvider";
import { requireCompleteProfile } from "@/lib/auth/session";
import {
  dedupeReferralRoles,
  type ReferralRoleOption,
} from "@/lib/talent-buyers/casting/referral-role-context";
import { createServerSupabaseClient } from "@/lib/supabase/server";

import "@/components/talent-buyers/casting/casting-workspace.css";

export default async function CastingReferralPage({
  params,
}: {
  params: Promise<{ castingId: string }>;
}) {
  await requireCompleteProfile();
  const { castingId } = await params;

  const supabase = await createServerSupabaseClient();
  if (!supabase) notFound();

  const { data: casting } = await supabase
    .from("castings")
    .select("id, title, description, status")
    .eq("id", castingId)
    .maybeSingle();

  if (!casting || !["open", "published"].includes((casting.status as string) ?? "")) {
    notFound();
  }

  const { data: castingRoles } = await supabase
    .from("casting_roles")
    .select(
      "id, title, description, gender, age_min, age_max, ethnicity_preferences, special_skills, height_min_cm, height_max_cm, union_status, people_needed, sort_order",
    )
    .eq("casting_id", castingId)
    .order("sort_order", { ascending: true });

  const { data: bridgedRoles } = await supabase
    .from("roles")
    .select("id, title")
    .eq("casting_id", castingId)
    .order("created_at", { ascending: true });

  const bridgedByTitle = new Map(
    (bridgedRoles ?? []).map((role) => [(role.title as string).trim().toLowerCase(), role.id as string]),
  );

  const roles = dedupeReferralRoles(
    (castingRoles ?? []).map((role) => {
      const title = (role.title as string) || "Role";
      return {
        id: role.id as string,
        name: title,
        bridgedRoleId: bridgedByTitle.get(title.trim().toLowerCase()),
        description: (role.description as string | null) ?? undefined,
        gender: (role.gender as string | null) ?? undefined,
        ageMin: (role.age_min as number | null) ?? null,
        ageMax: (role.age_max as number | null) ?? null,
        ethnicityPreferences: (role.ethnicity_preferences as string[] | null) ?? [],
        specialSkills: (role.special_skills as string[] | null) ?? [],
        heightMinCm: (role.height_min_cm as number | null) ?? null,
        heightMaxCm: (role.height_max_cm as number | null) ?? null,
        unionStatus: (role.union_status as string | null) ?? undefined,
        peopleNeeded: (role.people_needed as number | null) ?? null,
      } satisfies ReferralRoleOption;
    }),
  );

  return (
    <ToastProvider>
      <div className="casting-refer-page min-h-screen bg-[#0a0a0b] text-white">
        <CastingReferralForm
          castingId={castingId}
          castingTitle={(casting.title as string) || "this casting"}
          castingDescription={(casting.description as string | null) ?? undefined}
          roles={roles}
        />
      </div>
    </ToastProvider>
  );
}
