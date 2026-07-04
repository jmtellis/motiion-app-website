import { callSupabaseFunction } from "@/lib/supabaseRest";
import type { PublicCasting } from "@/types/public";

type CastingResponse = { casting: PublicCasting };

export async function fetchPublicCasting(id: string): Promise<PublicCasting | null> {
  const trimmed = decodeURIComponent(id).trim();
  if (!trimmed) return null;

  try {
    const data = await callSupabaseFunction<CastingResponse>("public-casting-detail", {
      roleId: trimmed,
    });
    return data.casting ?? null;
  } catch {
    return null;
  }
}

export function formatCastingDeadline(deadline: string | null): string | null {
  if (!deadline) return null;
  const parsed = Date.parse(deadline);
  if (Number.isNaN(parsed)) return deadline;
  return new Date(parsed).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
