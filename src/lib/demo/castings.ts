import { demoDancers, type DemoDancer } from "@/lib/demo/dancers";

export type DemoCastingStage = "submissions" | "shortlist" | "callbacks" | "booked";

export type DemoCastingCandidate = {
  dancerId: string;
  stage: DemoCastingStage;
};

export type DemoCasting = {
  id: string;
  projectId: string;
  title: string;
  role: string;
  requirements: string[];
  candidates: DemoCastingCandidate[];
};

export type DemoTeamMember = {
  dancerId: string;
  status: "pending" | "confirmed" | "messaged" | "scheduled";
};

export const summerTourCasting: DemoCasting = {
  id: "casting-ensemble",
  projectId: "project-summer-tour",
  title: "Tour Ensemble",
  role: "Tour Ensemble — Hip Hop / Commercial",
  requirements: [
    "Hip-Hop / Commercial",
    "Available LA rehearsals",
    "Tour experience preferred",
    "Camera-ready",
  ],
  candidates: [
    { dancerId: "dancer-gabriela", stage: "booked" },
    { dancerId: "dancer-jay", stage: "booked" },
    { dancerId: "dancer-jake", stage: "callbacks" },
    { dancerId: "dancer-gaynor", stage: "shortlist" },
    { dancerId: "dancer-monique", stage: "shortlist" },
    { dancerId: "dancer-natsuki", stage: "submissions" },
    { dancerId: "dancer-nathan", stage: "submissions" },
    { dancerId: "dancer-rithiely", stage: "submissions" },
  ],
};

export const demoTeam: DemoTeamMember[] = [
  { dancerId: "dancer-gabriela", status: "scheduled" },
  { dancerId: "dancer-jay", status: "messaged" },
  { dancerId: "dancer-jake", status: "confirmed" },
];

export function resolveCandidates(
  casting: DemoCasting,
  stage?: DemoCastingStage,
): Array<{ candidate: DemoCastingCandidate; dancer: DemoDancer }> {
  return casting.candidates
    .filter((candidate) => (stage ? candidate.stage === stage : true))
    .map((candidate) => {
      const dancer = demoDancers.find((item) => item.id === candidate.dancerId);
      if (!dancer) return null;
      return { candidate, dancer };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
}

export const CASTING_STAGE_LABELS: Record<DemoCastingStage, string> = {
  submissions: "Submissions",
  shortlist: "Shortlist",
  callbacks: "Callbacks",
  booked: "Booked",
};
