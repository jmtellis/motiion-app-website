import { demoCollections, demoProjects } from "@/lib/demo/projects";
import { demoDancers, featuredDemoDancer, type DemoDancer } from "@/lib/demo/dancers";
import type { CastingCandidate, CastingRole } from "@/lib/talent-buyers/casting/casting-types";
import type { LibraryCollectionSummary, LibraryTalent } from "@/lib/talent-buyers/library";
import type { Talent, TalentRow } from "@/lib/talent-navigator/types";
import type { BuyerProjectSummary } from "@/types/talent-buyer-dashboard";
import type { PublicTalentProfile } from "@/types/public";

export function toNavigatorTalent(dancer: DemoDancer): Talent {
  return {
    id: dancer.id,
    slug: dancer.slug,
    name: dancer.name,
    pronouns: dancer.pronouns,
    location: dancer.location,
    agency: dancer.agency,
    styles: dancer.styles,
    height: dancer.height || undefined,
    availability: dancer.availabilityLabel,
    unionStatus: dancer.unionStatus,
    credits: dancer.credits.map((credit) => `${credit.artist} — ${credit.role}`),
    imageUrl: dancer.imageUrl,
    represented: dancer.represented,
    gender: dancer.gender,
    isVerified: dancer.agencyVerified,
    recommended: true,
    matchReasons: (dancer.matchReasons ?? []).map((label) => ({
      category: "filter",
      label,
      evidenceType: "profile",
    })),
  };
}

export function buildDemoNavigatorRows(): TalentRow[] {
  const talent = demoDancers.map(toNavigatorTalent);
  // Repeat to fill navigator wrap-around grid density.
  const padded = [...talent, ...talent, ...talent];
  return [
    { id: "row-commercial", label: "Commercial / Hip-Hop", talent: padded },
    { id: "row-recommended", label: "Recommended near you", talent: [...padded].reverse() },
    { id: "row-tour", label: "Tour-ready", talent: padded },
  ];
}

export function toPublicTalentProfile(dancer: DemoDancer): PublicTalentProfile {
  return {
    id: dancer.id,
    user_id: null,
    full_name: dancer.name,
    username: dancer.slug,
    headshot_url: dancer.imageUrl,
    headshot_urls: dancer.headshots,
    location: dancer.location,
    representation: dancer.agency,
    agency_logo_url: null,
    gender: dancer.gender,
    ethnicity: null,
    date_of_birth: null,
    height: dancer.height || null,
    union_status: dancer.unionStatus,
    eye_color: null,
    hair_color: null,
    sizing: dancer.measurements || null,
    skills: [],
    styles: dancer.styles,
    talent_types: ["Dancer"],
    profile_highlights: dancer.credits.slice(0, 2).map((credit, index) => ({
      id: `${dancer.id}-hl-${index}`,
      title: credit.artist,
      subtitle: credit.role,
      image_url: dancer.imageUrl,
    })),
    credits: { artists: [], companies: [] },
    experiences: dancer.credits.map((credit, index) => ({
      id: `${dancer.id}-exp-${index}`,
      title: credit.artist,
      role: credit.role,
      credits: credit.year,
      category: "liveStage",
    })),
    training: [],
    profile_visuals: dancer.headshots.slice(0, 2).map((url, index) => ({
      id: `${dancer.id}-vis-${index}`,
      kind: index === 0 ? "reel" : "slate",
      url,
      sort: index,
    })),
    resume_url: null,
    instagram_url: null,
    youtube_url: null,
  };
}

export const featuredPublicProfile = toPublicTalentProfile(featuredDemoDancer);

export function toLibraryTalent(dancer: DemoDancer, collectionIds: string[]): LibraryTalent {
  return {
    id: `lt-${dancer.id}`,
    profileId: dancer.id,
    addedAt: "2026-03-01T00:00:00.000Z",
    name: dancer.name,
    slug: dancer.slug,
    location: dancer.location,
    avatarUrl: dancer.imageUrl,
    styles: dancer.styles.slice(0, 3),
    collectionIds,
  };
}

export function buildDemoLibraryCollections(): LibraryCollectionSummary[] {
  return demoCollections.map((collection) => {
    const members = collection.dancerIds
      .map((id) => demoDancers.find((dancer) => dancer.id === id))
      .filter((dancer): dancer is DemoDancer => Boolean(dancer));
    return {
      id: collection.id,
      name: collection.name,
      description: collection.note,
      talentCount: members.length,
      createdAt: "2026-02-12T00:00:00.000Z",
      updatedAt: "2026-03-04T00:00:00.000Z",
      previewAvatars: members.map((member) => member.imageUrl),
    };
  });
}

export function buildDemoLibraryMembers(collectionId: string): LibraryTalent[] {
  const collection = demoCollections.find((item) => item.id === collectionId);
  if (!collection) return [];
  return collection.dancerIds
    .map((id) => demoDancers.find((dancer) => dancer.id === id))
    .filter((dancer): dancer is DemoDancer => Boolean(dancer))
    .map((dancer) => toLibraryTalent(dancer, [collectionId]));
}

const PROJECT_TYPE_MAP = {
  "World Tour": "tour",
  "Commercial Campaign": "campaign",
  "Award Show": "event",
  "Music Video": "production",
  "Fashion Campaign": "campaign",
} as const;

const PROJECT_STATUS_MAP = {
  Draft: "draft",
  Live: "active",
  Review: "shared",
  Complete: "archived",
} as const;

export function buildDemoBuyerProjects(): BuyerProjectSummary[] {
  return demoProjects.map((project) => ({
    id: project.id,
    title: project.title,
    projectType: PROJECT_TYPE_MAP[project.type],
    status: PROJECT_STATUS_MAP[project.status],
    lastUpdated: "2026-03-05T14:00:00.000Z",
    talentCount: project.talentCount,
    notesCount: 3,
    sharedLinksCount: 1,
    coverImageUrl: project.coverUrl,
  }));
}

export const DEMO_CASTING_ROLE: CastingRole = {
  id: "role-ensemble",
  castingProjectId: "casting-ensemble",
  name: "Tour Ensemble",
  quantityNeeded: 6,
  status: "published",
  order: 0,
  danceStyles: ["Hip-Hop", "Commercial"],
};

export function buildDemoCastingCandidates(
  statuses: Array<{ dancerId: string; status: CastingCandidate["status"] }>,
): CastingCandidate[] {
  const now = "2026-03-05T12:00:00.000Z";
  const candidates: CastingCandidate[] = [];

  statuses.forEach(({ dancerId, status }, index) => {
    const dancer = demoDancers.find((item) => item.id === dancerId);
    if (!dancer) return;
    candidates.push({
      id: `cand-${dancer.id}-${index}`,
      castingProjectId: "casting-ensemble",
      talentProfileId: dancer.id,
      roleIds: [DEMO_CASTING_ROLE.id],
      source: "talent_search",
      status,
      displayName: dancer.name,
      agency: dancer.agency,
      headshotUrl: dancer.imageUrl,
      talentSlug: dancer.slug,
      createdAt: now,
      updatedAt: now,
      availabilityStatus:
        status === "confirmed" || status === "accepted" ? "confirmed" : undefined,
    });
  });

  return candidates;
}

export const demoProjectFiles = [
  {
    title: "Casting brief.pdf",
    fileName: "casting-brief.pdf",
    contentType: "application/pdf",
    url: null as string | null,
  },
  {
    title: "Look references",
    fileName: "look-01.jpg",
    contentType: "image/jpeg",
    url: demoDancers[0]?.imageUrl ?? null,
  },
  {
    title: "Schedule.xlsx",
    fileName: "schedule.xlsx",
    contentType: "application/vnd.ms-excel",
    url: null as string | null,
  },
  {
    title: "Wardrobe notes",
    fileName: "wardrobe.jpg",
    contentType: "image/jpeg",
    url: demoDancers[1]?.imageUrl ?? null,
  },
];
