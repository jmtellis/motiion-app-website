"use server";

import { revalidatePath } from "next/cache";

import { trackServerEvent } from "@/lib/analytics/track-server";
import { sendNotificationEmail } from "@/lib/email/send";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { buildNavigatorInitialData } from "@/lib/talent-navigator/profile-adapter";
import {
  type BuyerOpenRole,
  isBuyerOpenRoleStatus,
} from "@/lib/talent-navigator/open-roles";
import { navigatorFiltersToSearchFilters } from "@/lib/talent-navigator/search-filters";
import type { TalentNavigatorFilters, TalentNavigatorInitialData } from "@/lib/talent-navigator/types";
import { resolveCastingRoleMatchAttributes } from "@/lib/talent-buyers/casting/casting-role-match-attributes";
import {
  bridgeWebInviteToMobile,
  resolveCastingIdFromRoleId,
} from "@/lib/talent-buyers/casting/bridge-mobile-invite";
import { searchTalentProfiles } from "@/lib/search/search-profiles";

export type ParseNlTalentQueryResult = {
  filters: TalentNavigatorFilters;
  parsedDescription: string;
  confidence: number;
  data: TalentNavigatorInitialData;
  reasoning: { headline: string; bullets: string[] };
  error?: string;
  warnings?: Array<{
    type: string;
    message: string;
    resolution?: {
      requestedName: string;
      status: string;
      role: string;
      candidates?: Array<{ id: string; name: string; type: string; score: number }>;
    };
  }>;
  creditEvidenceByTalentId?: Record<
    string,
    Array<{
      id: string;
      role: string | null;
      productionName: string | null;
      artistName: string | null;
      choreographerName: string | null;
      creditYear: number | null;
      verificationLabel: string;
      sourceLabel: string;
    }>
  >;
};

export async function fetchNavigatorTalent(
  filters: TalentNavigatorFilters,
): Promise<TalentNavigatorInitialData> {
  const { hasCreditSearchFilters } = await import("@/lib/talent-navigator/types");
  if (hasCreditSearchFilters(filters)) {
    const { searchTalentByCredits } = await import("@/lib/talent-navigator/search-by-credits");
    const creditResult = await searchTalentByCredits(
      {
        artists: filters.artists ?? [],
        choreographers: filters.choreographers ?? [],
        productions: filters.productions ?? [],
        resolvedArtistIds: filters.resolvedArtistIds ?? [],
        resolvedChoreographerIds: filters.resolvedChoreographerIds ?? [],
        resolvedProductionIds: filters.resolvedProductionIds ?? [],
        relationshipMatchMode: filters.relationshipMatchMode ?? "all",
        verificationStatuses: (filters.verificationStatuses ?? []) as never[],
        location: filters.location ? [filters.location] : [],
        danceStyles: filters.style ? [filters.style] : [],
        agencies: filters.agency ? [filters.agency] : [],
        representedOnly: filters.representation === "Represented" ? true : undefined,
        availableOnly: filters.availability ? true : undefined,
        broadExperienceQuery: filters.keyword || undefined,
      },
      { navigatorFilters: filters },
    );
    return {
      talent: creditResult.talent,
      usingFallbackData: creditResult.usingFallbackData,
      source: creditResult.source,
    };
  }

  const result = await searchTalentProfiles(navigatorFiltersToSearchFilters(filters));
  return buildNavigatorInitialData(result, filters);
}

export async function listBuyerOpenRoles(): Promise<{
  roles: BuyerOpenRole[];
  error?: string;
}> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { roles: [], error: "Supabase is not configured." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { roles: [], error: "You must be signed in." };

  const { data: projects, error: projectError } = await supabase
    .from("projects")
    .select("id, title")
    .eq("poster_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(40);

  if (projectError) return { roles: [], error: projectError.message };
  if (!projects?.length) return { roles: [] };

  const projectIds = projects.map((project) => project.id as string);
  const titleByProject = new Map(projects.map((project) => [project.id as string, (project.title as string) || "Untitled project"]));

  const { data: castings, error: castingError } = await supabase
    .from("castings")
    .select("id, project_id, title, status")
    .in("project_id", projectIds)
    .order("updated_at", { ascending: false });

  if (castingError) return { roles: [], error: castingError.message };

  const openCastings = (castings ?? []).filter((casting) =>
    isBuyerOpenRoleStatus(casting.status as string, null),
  );
  const castingIds = openCastings.map((casting) => casting.id as string);
  const castingMeta = new Map(
    openCastings.map((casting) => [
      casting.id as string,
      {
        projectId: casting.project_id as string,
        castingTitle: (casting.title as string) || "Untitled casting",
      },
    ]),
  );

  const roles: BuyerOpenRole[] = [];

  if (castingIds.length) {
    const { data: castingRoles, error: roleError } = await supabase
      .from("casting_roles")
      .select(
        "id, casting_id, title, gender, ethnicity_preferences, union_status, match_filters, status, sort_order",
      )
      .in("casting_id", castingIds)
      .order("sort_order", { ascending: true });

    if (roleError) return { roles: [], error: roleError.message };

    for (const row of castingRoles ?? []) {
      const castingId = row.casting_id as string;
      const meta = castingMeta.get(castingId);
      if (!meta) continue;
      if (!isBuyerOpenRoleStatus(null, row.status as string)) continue;

      const matchFilters = (row.match_filters as Record<string, unknown> | null) ?? null;
      const attrs = resolveCastingRoleMatchAttributes({
        gender: row.gender as string | null,
        ethnicity_preferences: (row.ethnicity_preferences as string[] | null) ?? null,
        union_status: row.union_status as string | null,
        match_filters: matchFilters,
      });

      roles.push({
        id: row.id as string,
        name: (row.title as string) || "Role",
        projectId: meta.projectId,
        projectTitle: titleByProject.get(meta.projectId) ?? "Project",
        castingId,
        castingTitle: meta.castingTitle,
        matchFilters,
        gender: attrs.gender ?? null,
        unionStatus: attrs.unionRequirement ?? null,
        ethnicityPreferences: attrs.ethnicityPreferences,
        locationRequirements: [
          ...attrs.locationRequirements,
          ...(attrs.projectLocation ? [attrs.projectLocation] : []),
        ],
        danceStyles: attrs.danceStyles,
      });
    }
  }

  const { data: legacyRoles } = await supabase
    .from("roles")
    .select("id, project_id, title, is_active")
    .in("project_id", projectIds)
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  for (const row of legacyRoles ?? []) {
    const projectId = row.project_id as string;
    if (roles.some((role) => role.projectId === projectId)) continue;
    roles.push({
      id: row.id as string,
      name: (row.title as string) || "Role",
      projectId,
      projectTitle: titleByProject.get(projectId) ?? "Project",
      castingId: "",
      castingTitle: titleByProject.get(projectId) ?? "Project",
      matchFilters: null,
      gender: null,
      unionStatus: null,
      ethnicityPreferences: [],
      locationRequirements: [],
      danceStyles: [],
    });
  }

  return { roles };
}

export async function transcribeNavigatorVoiceAudio(
  formData: FormData,
): Promise<{ text: string; error?: string }> {
  const file = formData.get("audio");
  if (!(file instanceof Blob) || file.size === 0) {
    return { text: "", error: "No audio was captured." };
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return { text: "", error: "Voice transcription is not configured." };
  }

  try {
    const body = new FormData();
    body.append("file", file, "voice.webm");
    body.append("model", "whisper-1");
    body.append("language", "en");

    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body,
    });

    if (!response.ok) {
      return { text: "", error: "Could not transcribe audio." };
    }

    const payload = (await response.json()) as { text?: string };
    return { text: payload.text?.trim() ?? "" };
  } catch {
    return { text: "", error: "Could not transcribe audio." };
  }
}

export async function parseNlTalentQuery(
  prompt: string,
  priorFilters?: TalentNavigatorFilters,
): Promise<ParseNlTalentQueryResult> {
  const { parseNlQuery, mergeNavigatorFilters, creditResultsToReasoning } = await import(
    "@/lib/talent-navigator/parse-nl-query"
  );
  const { EMPTY_NAVIGATOR_FILTERS, hasCreditSearchFilters } = await import(
    "@/lib/talent-navigator/types"
  );

  try {
    await trackServerEvent("talent_navigator_search_submitted", {
      promptLength: prompt.trim().length,
    });

    const parsed = await parseNlQuery(prompt);
    if (parsed.parseFailed) {
      await trackServerEvent("talent_navigator_search_parse_failed", {});
    } else {
      await trackServerEvent("talent_navigator_search_parsed", {
        artistCount: parsed.filters.artists?.length ?? 0,
        choreographerCount: parsed.filters.choreographers?.length ?? 0,
        productionCount: parsed.filters.productions?.length ?? 0,
      });
    }

    const merged = mergeNavigatorFilters(priorFilters ?? EMPTY_NAVIGATOR_FILTERS, parsed.filters);

    if (hasCreditSearchFilters(merged)) {
      const { searchTalentByCredits } = await import("@/lib/talent-navigator/search-by-credits");
      const creditResult = await searchTalentByCredits(
        {
          artists: merged.artists,
          choreographers: merged.choreographers,
          productions: merged.productions,
          resolvedArtistIds: merged.resolvedArtistIds,
          resolvedChoreographerIds: merged.resolvedChoreographerIds,
          resolvedProductionIds: merged.resolvedProductionIds,
          relationshipMatchMode: merged.relationshipMatchMode,
          verificationStatuses: merged.verificationStatuses as never[],
          location: merged.location ? [merged.location] : [],
          danceStyles: merged.style ? [merged.style] : [],
          agencies: merged.agency ? [merged.agency] : [],
          representedOnly: merged.representation === "Represented" ? true : undefined,
          availableOnly: merged.availability ? true : undefined,
          broadExperienceQuery: merged.keyword || undefined,
        },
        { navigatorFilters: merged },
      );

      const unresolvedCount = creditResult.warnings.filter((w) => w.type === "unresolved").length;
      const ambiguousCount = creditResult.warnings.filter((w) => w.type === "ambiguous").length;
      if (unresolvedCount) {
        await trackServerEvent("talent_navigator_entity_unresolved", {
          unresolvedEntityCount: unresolvedCount,
        });
      }
      if (ambiguousCount) {
        await trackServerEvent("talent_navigator_entity_ambiguous", {
          ambiguousEntityCount: ambiguousCount,
        });
      }
      await trackServerEvent(
        creditResult.total === 0
          ? "talent_navigator_search_zero_results"
          : "talent_navigator_search_returned_results",
        {
          resultCount: creditResult.total,
          artistCount: merged.artists.length,
          choreographerCount: merged.choreographers.length,
          productionCount: merged.productions.length,
          matchMode: merged.relationshipMatchMode,
          verificationFilterCount: merged.verificationStatuses.length,
          unresolvedEntityCount: unresolvedCount,
        },
      );

      const filtersWithResolved: TalentNavigatorFilters = {
        ...merged,
        resolvedArtistIds: creditResult.input.resolvedArtistIds,
        resolvedChoreographerIds: creditResult.input.resolvedChoreographerIds,
        resolvedProductionIds: creditResult.input.resolvedProductionIds,
      };

      const creditEvidenceByTalentId: ParseNlTalentQueryResult["creditEvidenceByTalentId"] = {};
      for (const talent of creditResult.talent) {
        creditEvidenceByTalentId[talent.id] = talent.matchingCredits.map((c) => ({
          id: c.id,
          role: c.role,
          productionName: c.productionName,
          artistName: c.artistName,
          choreographerName: c.choreographerName,
          creditYear: c.creditYear,
          verificationLabel: c.verificationLabel,
          sourceLabel: c.sourceLabel,
        }));
      }

      return {
        filters: filtersWithResolved,
        parsedDescription: parsed.parsedDescription,
        confidence: parsed.confidence,
        data: {
          talent: creditResult.talent,
          usingFallbackData: creditResult.usingFallbackData,
          source: creditResult.source,
        },
        reasoning: creditResultsToReasoning(
          creditResult.talent,
          filtersWithResolved,
          parsed.parsedDescription,
          creditResult.warnings.map((w) => w.message),
        ),
        warnings: creditResult.warnings,
        creditEvidenceByTalentId,
      };
    }

    const data = await fetchNavigatorTalent(merged);
    const { buildSearchReasoning } = await import("@/lib/talent-navigator/parse-nl-query");
    const reasoning = buildSearchReasoning({
      count: data.talent.length,
      parsedDescription: parsed.parsedDescription,
      topTalentNames: data.talent.slice(0, 5).map((talent) => talent.name),
      activeFilters: merged,
    });

    await trackServerEvent(
      data.talent.length === 0
        ? "talent_navigator_search_zero_results"
        : "talent_navigator_search_returned_results",
      { resultCount: data.talent.length },
    );

    return {
      filters: merged,
      parsedDescription: parsed.parsedDescription,
      confidence: parsed.confidence,
      data,
      reasoning,
    };
  } catch (error) {
    return {
      filters: priorFilters ?? EMPTY_NAVIGATOR_FILTERS,
      parsedDescription: "",
      confidence: 0,
      data: await fetchNavigatorTalent(priorFilters ?? EMPTY_NAVIGATOR_FILTERS),
      reasoning: { headline: "Could not parse that request.", bullets: [] },
      error: error instanceof Error ? error.message : "Search assistant unavailable.",
    };
  }
}

export async function resolveCreditEntityChoice(input: {
  priorFilters: TalentNavigatorFilters;
  role: "artist" | "choreographer" | "production";
  entityId: string;
  entityName: string;
}): Promise<ParseNlTalentQueryResult> {
  const { EMPTY_NAVIGATOR_FILTERS } = await import("@/lib/talent-navigator/types");
  const filters: TalentNavigatorFilters = {
    ...EMPTY_NAVIGATOR_FILTERS,
    ...input.priorFilters,
  };

  if (input.role === "artist") {
    filters.resolvedArtistIds = [...new Set([...filters.resolvedArtistIds, input.entityId])];
    if (!filters.artists.includes(input.entityName)) {
      filters.artists = [...filters.artists, input.entityName];
    }
  } else if (input.role === "choreographer") {
    filters.resolvedChoreographerIds = [
      ...new Set([...filters.resolvedChoreographerIds, input.entityId]),
    ];
    if (!filters.choreographers.includes(input.entityName)) {
      filters.choreographers = [...filters.choreographers, input.entityName];
    }
  } else {
    filters.resolvedProductionIds = [
      ...new Set([...filters.resolvedProductionIds, input.entityId]),
    ];
    if (!filters.productions.includes(input.entityName)) {
      filters.productions = [...filters.productions, input.entityName];
    }
  }

  const data = await fetchNavigatorTalent(filters);
  const evidenceTalent = data.talent as Array<{
    id: string;
    name: string;
    matchingCredits?: ParseNlTalentQueryResult["creditEvidenceByTalentId"] extends Record<
      string,
      infer V
    >
      ? V
      : never;
  }>;

  return {
    filters,
    parsedDescription: `Using ${input.entityName}`,
    confidence: 1,
    data,
    reasoning: {
      headline: `Searching with ${input.entityName}.`,
      bullets: [`Resolved ${input.role}: ${input.entityName}`],
    },
    creditEvidenceByTalentId: Object.fromEntries(
      evidenceTalent.map((t) => [
        t.id,
        ((t as { matchingCredits?: NonNullable<ParseNlTalentQueryResult["creditEvidenceByTalentId"]>[string] })
          .matchingCredits ?? []).map((c) => ({
          id: c.id,
          role: c.role,
          productionName: c.productionName,
          artistName: c.artistName,
          choreographerName: c.choreographerName,
          creditYear: c.creditYear,
          verificationLabel: c.verificationLabel,
          sourceLabel: c.sourceLabel,
        })),
      ]),
    ),
  };
}

export async function addTalentToProjectRoster(input: {
  projectId: string;
  talentIdOrSlug: string;
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const profileId = await resolveProfessionalProfileId(supabase, input.talentIdOrSlug);
  if (!profileId) {
    return { ok: false, error: "This profile isn't available for rosters yet." };
  }

  const { addToProjectRoster } = await import("@/lib/talent-buyers/project-roster");
  return addToProjectRoster({ projectId: input.projectId, profileId });
}

export async function saveTalentToRoster(input: {
  talentIdOrSlug: string;
  rosterId?: string;
  rosterName?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  const profileId = await resolveProfessionalProfileId(supabase, input.talentIdOrSlug);
  if (!profileId) {
    return { ok: false, error: "This profile isn't available for rosters yet." };
  }

  let listId = input.rosterId;
  if (!listId && input.rosterName?.trim()) {
    const { data: created, error } = await supabase
      .from("talent_lists")
      .insert({ owner_id: user.id, name: input.rosterName.trim(), kind: "roster" })
      .select("id")
      .single();
    if (error) return { ok: false, error: error.message };
    listId = created.id as string;
  }

  if (!listId) {
    return saveTalentForBuyer(input.talentIdOrSlug);
  }

  const { error: memberError } = await supabase
    .from("talent_list_members")
    .upsert({ list_id: listId, profile_id: profileId }, { onConflict: "list_id,profile_id" });

  if (memberError) return { ok: false, error: memberError.message };

  revalidatePath("/library");
  return { ok: true };
}

export async function bulkInviteRosterToCasting(input: {
  rosterId: string;
  projectId: string;
  roleId: string | null;
}): Promise<{ ok: boolean; invited: number; error?: string }> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, invited: 0, error: "Supabase is not configured." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, invited: 0, error: "You must be signed in." };

  const { data: members, error } = await supabase
    .from("talent_list_members")
    .select("profile_id")
    .eq("list_id", input.rosterId);

  if (error) return { ok: false, invited: 0, error: error.message };

  const castingId = await resolveCastingIdFromRoleId(supabase, input.roleId);

  let invited = 0;
  for (const member of members ?? []) {
    const { error: inviteError } = await supabase.from("invitations").insert({
      project_id: input.projectId,
      casting_id: castingId,
      role_id: input.roleId,
      invited_profile_id: member.profile_id,
      invited_by: user.id,
      kind: "casting",
      status: "sent",
    });
    if (!inviteError || inviteError.code === "23505") {
      await bridgeWebInviteToMobile(supabase, {
        invitedProfileId: member.profile_id as string,
        roleId: input.roleId,
        castingId,
      });
      invited += 1;
    }
  }

  revalidatePath("/projects");
  revalidatePath(`/projects/${input.projectId}`);
  return { ok: true, invited };
}

const DEFAULT_ROSTER_NAME = "Saved Talent";

type ResolveClient = NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>;

/**
 * Resolve a navigator/profile key to professional_profiles.id.
 * Uses a SECURITY DEFINER RPC so buyers can save talent that appears in the
 * public search views even when RLS hides unverified professional_profiles rows.
 */
async function resolveProfessionalProfileId(
  supabase: ResolveClient,
  talentIdOrSlug: string | string[],
): Promise<string | null> {
  const keys = (Array.isArray(talentIdOrSlug) ? talentIdOrSlug : [talentIdOrSlug])
    .map((value) => value.trim())
    .filter(Boolean);
  if (!keys.length) return null;

  for (const key of keys) {
    const { data, error } = await supabase.rpc("resolve_professional_profile_id", {
      p_key: key,
    });
    if (!error && data) return data as string;
  }

  // Fallback for environments where the RPC isn't migrated yet.
  const admin = createAdminSupabaseClient();
  const clients = [admin, supabase].filter(Boolean) as ResolveClient[];
  const isUuid = (key: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key);

  for (const key of keys) {
    for (const client of clients) {
      if (isUuid(key)) {
        const { data: byId } = await client
          .from("professional_profiles")
          .select("id")
          .eq("id", key)
          .maybeSingle<{ id: string }>();
        if (byId?.id) return byId.id;

        const { data: byUserId } = await client
          .from("professional_profiles")
          .select("id")
          .eq("user_id", key)
          .maybeSingle<{ id: string }>();
        if (byUserId?.id) return byUserId.id;
      }

      const { data: bySlug } = await client
        .from("professional_profiles")
        .select("id")
        .eq("slug", key)
        .maybeSingle<{ id: string }>();
      if (bySlug?.id) return bySlug.id;
    }
  }

  return null;
}

export async function saveTalentForBuyer(
  talentIdOrSlug: string | string[],
): Promise<{ ok: boolean; profileId?: string; error?: string }> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  const profileId = await resolveProfessionalProfileId(supabase, talentIdOrSlug);
  if (!profileId) {
    return { ok: false, error: "Couldn't find this profile to save. Try opening their profile and saving from there." };
  }

  const { data: existing } = await supabase
    .from("talent_lists")
    .select("id")
    .eq("owner_id", user.id)
    .eq("kind", "favorites")
    .maybeSingle<{ id: string }>();

  let listId = existing?.id;
  if (!listId) {
    const { data: byName } = await supabase
      .from("talent_lists")
      .select("id")
      .eq("owner_id", user.id)
      .eq("name", DEFAULT_ROSTER_NAME)
      .maybeSingle<{ id: string }>();
    listId = byName?.id;
    if (listId) {
      await supabase.from("talent_lists").update({ kind: "favorites" }).eq("id", listId);
    }
  }
  if (!listId) {
    const { data: created, error: createError } = await supabase
      .from("talent_lists")
      .insert({ owner_id: user.id, name: DEFAULT_ROSTER_NAME, kind: "favorites" })
      .select("id")
      .single();
    if (createError) return { ok: false, error: createError.message };
    listId = created.id;
  }

  const { error: memberError } = await supabase
    .from("talent_list_members")
    .upsert({ list_id: listId, profile_id: profileId }, { onConflict: "list_id,profile_id", ignoreDuplicates: true });

  if (memberError) return { ok: false, error: memberError.message };

  await trackServerEvent("talent_saved_to_list", { list_id: listId, profile_id: profileId });
  revalidatePath("/library");
  return { ok: true, profileId };
}

export type CastingInviteTarget = {
  projectId: string;
  castingId: string | null;
  title: string;
};

export async function listBuyerCastingTargets(): Promise<{
  targets: CastingInviteTarget[];
  error?: string;
}> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { targets: [], error: "Supabase is not configured." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { targets: [], error: "You must be signed in." };

  const { data: projects, error: projectError } = await supabase
    .from("projects")
    .select("id, title")
    .eq("poster_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  if (projectError) return { targets: [], error: projectError.message };
  if (!projects?.length) return { targets: [] };

  const projectIds = projects.map((project) => project.id);
  const { data: roles } = await supabase
    .from("roles")
    .select("id, title, project_id")
    .in("project_id", projectIds)
    .order("created_at", { ascending: false });

  const titleByProject = new Map(projects.map((project) => [project.id, project.title ?? "Untitled project"]));
  const targets: CastingInviteTarget[] = [];

  for (const role of roles ?? []) {
    targets.push({
      projectId: role.project_id as string,
      castingId: role.id as string,
      title: (role.title as string) || titleByProject.get(role.project_id as string) || "Role",
    });
  }

  for (const project of projects) {
    const hasRole = (roles ?? []).some((role) => role.project_id === project.id);
    if (!hasRole) {
      targets.push({ projectId: project.id, castingId: null, title: project.title ?? "Untitled project" });
    }
  }

  return { targets };
}

export async function inviteTalentFromNavigator(
  talentIdOrSlug: string,
  target: { projectId: string; castingId: string | null },
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  const profileId = await resolveProfessionalProfileId(supabase, talentIdOrSlug);
  if (!profileId) {
    return { ok: false, error: "This profile isn't available for invitations yet." };
  }

  const castingId = await resolveCastingIdFromRoleId(supabase, target.castingId);

  const { error } = await supabase.from("invitations").insert({
    project_id: target.projectId,
    casting_id: castingId,
    role_id: target.castingId,
    invited_profile_id: profileId,
    invited_by: user.id,
    kind: "casting",
    status: "sent",
  });

  if (error) {
    if (error.code === "23505") return { ok: true };
    return { ok: false, error: error.message };
  }

  await bridgeWebInviteToMobile(supabase, {
    invitedProfileId: profileId,
    roleId: target.castingId,
    castingId,
  });

  await trackServerEvent("booking_request_sent", {
    project_id: target.projectId,
    casting_id: target.castingId,
    profile_id: profileId,
  });

  await emailInvitedTalent(profileId);

  revalidatePath("/projects");
  return { ok: true };
}

export async function askTalentAvailability(input: {
  talentUserId: string;
  title: string;
  message?: string;
  projectName?: string;
  projectId?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  const { error } = await supabase.from("availability_check_requests").insert({
    requester_id: user.id,
    talent_id: input.talentUserId,
    title: input.title.trim(),
    message: input.message?.trim() || null,
    project_name: input.projectName?.trim() || null,
    project_id: input.projectId ?? null,
    status: "pending",
  });

  if (error) return { ok: false, error: error.message };

  await trackServerEvent("booking_request_sent", {
    target_user_id: input.talentUserId,
    request_type: "availability",
  });

  return { ok: true };
}

export async function requestTalentSizeSheet(input: {
  talentUserId: string;
  message?: string;
  projectId?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  const { error } = await supabase.from("size_sheet_requests").insert({
    requester_id: user.id,
    talent_id: input.talentUserId,
    message: input.message?.trim() || null,
    project_id: input.projectId ?? null,
    status: "pending",
  });

  if (error) return { ok: false, error: error.message };

  await trackServerEvent("booking_request_sent", {
    target_user_id: input.talentUserId,
    request_type: "size_sheet",
  });

  return { ok: true };
}

export async function contactTalentUser(
  talentUserId: string,
  context?: { contextType?: string; contextId?: string; projectTitle?: string },
  initialMessage?: string,
): Promise<{ ok: boolean; conversationId?: string; pendingRequest?: boolean; error?: string }> {
  const { startConversationWith } = await import("@/lib/app/conversations");
  const opener =
    initialMessage?.trim() ||
    (context?.projectTitle?.trim()
      ? `Hi, reaching out about ${context.projectTitle.trim()}.`
      : "Hi!");

  return startConversationWith({
    targetUserId: talentUserId,
    contextType: context?.contextType,
    contextId: context?.contextId,
    initialMessage: opener,
  });
}

export async function resolveTalentProfessionalProfileId(
  talentIdOrSlug: string | string[],
): Promise<{ profileId: string | null; error?: string }> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { profileId: null, error: "Supabase is not configured." };
  const profileId = await resolveProfessionalProfileId(supabase, talentIdOrSlug);
  return { profileId };
}

/** Best-effort email to the invited talent; in-app notification is the primary channel. */
async function emailInvitedTalent(profileId: string): Promise<void> {
  const admin = createAdminSupabaseClient();
  if (!admin) return;

  const { data: pro } = await admin
    .from("professional_profiles")
    .select("user_id")
    .eq("id", profileId)
    .maybeSingle<{ user_id: string }>();
  if (!pro) return;

  const { data: profile } = await admin
    .from("profiles")
    .select("email, display_name, first_name")
    .eq("user_id", pro.user_id)
    .maybeSingle<{ email: string | null; display_name: string | null; first_name: string | null }>();
  if (!profile?.email) return;

  const firstName = profile.first_name || profile.display_name || "there";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.motiion.app";

  await sendNotificationEmail({
    to: profile.email,
    subject: "You've been invited to a casting on Motiion",
    html: `<p>Hi ${firstName},</p><p>A casting professional invited you to a project on Motiion. Sign in to review and respond.</p><p><a href="${siteUrl}/home">View your invitation</a></p>`,
  });
}

export async function fetchReviewTalentProfile(slugOrUserId: string) {
  const key = slugOrUserId.trim();
  if (!key) return { profile: null as null, error: "Missing profile." as string };

  const { fetchPublicTalentProfile } = await import("@/lib/publicProfile");
  const profile = await fetchPublicTalentProfile(key);
  if (!profile) return { profile: null as null, error: "Profile not found." };
  return { profile, error: undefined as string | undefined };
}
