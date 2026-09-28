export type PortfolioSocials = {
  instagram: string;
  x: string;
  tiktok: string;
  whatsapp: string;
  youtube: string;
};

export type PortfolioTrainingEntry = {
  id: string;
  name: string;
  program: string;
  startDate: string;
  endDate: string;
  trainingType: string;
  sourceId: string | null;
  linkedTalentId: string | null;
  extras: Record<string, unknown>;
};

export type PortfolioEditorDraft = {
  displayName: string;
  socials: PortfolioSocials;
  workingLocations: string[];
  styles: string[];
  skills: string[];
  training: PortfolioTrainingEntry[];
  representation: string;
  agent: string;
  additionalRepresentations: string[];
  unionStatus: string;
  unionMemberId: string;
  gender: string;
  ethnicity: string;
  height: string;
  eyeColor: string;
  hairColor: string;
};

export const trainingTypeOptions = ["Program", "School", "Intensive", "Convention", "Instructor"];

const emptySocials = (): PortfolioSocials => ({
  instagram: "",
  x: "",
  tiktok: "",
  whatsapp: "",
  youtube: "",
});

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function textList(value: string[] | null | undefined): string[] {
  return (value ?? []).map((item) => item.trim()).filter(Boolean);
}

export function readTrainingEntries(raw: unknown): PortfolioTrainingEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item, index) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    const name = text(row.name) || text(row.title);
    const organization = text(row.organization);
    const program = text(row.program) || (organization && organization !== name ? organization : "");
    if (!name && !program) return [];
    const consumed = new Set([
      "id",
      "name",
      "title",
      "program",
      "organization",
      "startDate",
      "start_year",
      "start_date",
      "year",
      "endDate",
      "end_year",
      "end_date",
      "trainingType",
      "training_type",
      "sourceId",
      "source_id",
      "linkedTalentId",
      "linked_talent_id",
    ]);
    const extras = Object.fromEntries(Object.entries(row).filter(([key]) => !consumed.has(key)));
    return [
      {
        id: text(row.id) || `training-${index}`,
        name: name || program,
        program: name ? program : "",
        startDate: text(row.startDate) || text(row.start_year) || text(row.start_date) || text(row.year),
        endDate: text(row.endDate) || text(row.end_year) || text(row.end_date),
        trainingType: text(row.trainingType) || text(row.training_type),
        sourceId: text(row.sourceId) || text(row.source_id) || null,
        linkedTalentId: text(row.linkedTalentId) || text(row.linked_talent_id) || null,
        extras,
      },
    ];
  });
}

export function blankTrainingEntry(): PortfolioTrainingEntry {
  return {
    id: crypto.randomUUID(),
    name: "",
    program: "",
    startDate: "",
    endDate: "",
    trainingType: "",
    sourceId: null,
    linkedTalentId: null,
    extras: {},
  };
}

export function toPortfolioEditorDraft(source: {
  displayName?: string | null;
  socials?: Partial<PortfolioSocials> | null;
  workingLocations?: string[] | null;
  styles?: string[] | null;
  skills?: string[] | null;
  training?: unknown;
  representation?: string | null;
  agent?: string | null;
  additionalRepresentations?: string[] | null;
  unionStatus?: string | null;
  unionMemberId?: string | null;
  gender?: string | null;
  ethnicity?: string | null;
  height?: string | null;
  eyeColor?: string | null;
  hairColor?: string | null;
}): PortfolioEditorDraft {
  const socials = { ...emptySocials(), ...(source.socials ?? {}) };
  return {
    displayName: source.displayName?.trim() ?? "",
    socials: {
      instagram: socials.instagram?.trim() ?? "",
      x: socials.x?.trim() ?? "",
      tiktok: socials.tiktok?.trim() ?? "",
      whatsapp: socials.whatsapp?.trim() ?? "",
      youtube: socials.youtube?.trim() ?? "",
    },
    workingLocations: textList(source.workingLocations),
    styles: textList(source.styles),
    skills: textList(source.skills),
    training: readTrainingEntries(source.training),
    representation: source.representation?.trim() || source.agent?.trim() || "",
    agent: source.agent?.trim() || source.representation?.trim() || "",
    additionalRepresentations: textList(source.additionalRepresentations),
    unionStatus: source.unionStatus?.trim() ?? "",
    unionMemberId: source.unionMemberId?.trim() ?? "",
    gender: source.gender?.trim() ?? "",
    ethnicity: source.ethnicity?.trim() ?? "",
    height: source.height?.trim() ?? "",
    eyeColor: source.eyeColor?.trim() ?? "",
    hairColor: source.hairColor?.trim() ?? "",
  };
}

export function parseEthnicityList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function serializeEthnicityList(values: string[]): string {
  return values.join(", ");
}
