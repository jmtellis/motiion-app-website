import type { ProjectType } from "@/lib/talent-buyers/project-types";

export type ExtractedBreakdownRole = {
  title: string | null;
  description: string | null;
  ageRangeMin: string | null;
  ageRangeMax: string | null;
  gender: string | null;
  peopleNeeded: string | null;
  ethnicityPreferences: string[] | null;
  unionStatus: string | null;
};

export type ExtractedBreakdownData = {
  title: string | null;
  description: string | null;
  productionCompany: string | null;
  projectType: ProjectType | null;
  startDate: string | null;
  endDate: string | null;
  location: string | null;
  castingKinds: string[] | null;
  visibility: "public" | "unlisted" | "private" | null;
  locationMode: string | null;
  locationCity: string | null;
  locationRegion: string | null;
  locationCountry: string | null;
  submissionDeadline: string | null;
  auditionDate: string | null;
  callbackDate: string | null;
  compensationCategory: string | null;
  rateType: string | null;
  isUnion: boolean | null;
  compensationNotes: string | null;
  submissionMethod: string | null;
  submissionMaterials: string[] | null;
  submitterPolicy: string | null;
  roles: ExtractedBreakdownRole[] | null;
};

export type BreakdownPrefillPatch = Partial<
  Pick<
    ProjectComposerFormFields,
    "title" | "description" | "productionCompany" | "projectType" | "startDate" | "endDate" | "location"
  >
>;

type ProjectComposerFormFields = {
  title: string;
  description: string;
  productionCompany: string;
  projectType: ProjectType;
  startDate: string;
  endDate: string;
  location: string;
};
