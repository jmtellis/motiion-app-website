import { PROJECT_TYPES } from "@/lib/talent-buyers/project-types";

import {
  CASTING_KIND_OPTIONS,
  COMPENSATION_CATEGORY_OPTIONS,
  LOCATION_MODE_OPTIONS,
  RATE_TYPE_OPTIONS,
  SUBMISSION_MATERIAL_OPTIONS,
  SUBMISSION_METHOD_OPTIONS,
  SUBMITTER_POLICY_OPTIONS,
} from "./casting-composer-defaults";

const castingKindValues = CASTING_KIND_OPTIONS.map((option) => option.value);
const locationModeValues = LOCATION_MODE_OPTIONS.map((option) => option.value);
const compensationValues = COMPENSATION_CATEGORY_OPTIONS.map((option) => option.value);
const rateTypeValues = RATE_TYPE_OPTIONS.map((option) => option.value);
const submissionMethodValues = SUBMISSION_METHOD_OPTIONS.map((option) => option.value);
const submitterPolicyValues = SUBMITTER_POLICY_OPTIONS.map((option) => option.value);

const extractedRoleSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "title",
    "description",
    "ageRangeMin",
    "ageRangeMax",
    "gender",
    "peopleNeeded",
    "ethnicityPreferences",
    "unionStatus",
  ],
  properties: {
    title: { type: ["string", "null"] },
    description: { type: ["string", "null"] },
    ageRangeMin: { type: ["string", "null"] },
    ageRangeMax: { type: ["string", "null"] },
    gender: { type: ["string", "null"] },
    peopleNeeded: { type: ["string", "null"] },
    ethnicityPreferences: {
      type: ["array", "null"],
      items: { type: "string" },
    },
    unionStatus: { type: ["string", "null"] },
  },
} as const;

export const breakdownExtractionJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "title",
    "description",
    "productionCompany",
    "projectType",
    "startDate",
    "endDate",
    "location",
    "castingKinds",
    "visibility",
    "locationMode",
    "locationCity",
    "locationRegion",
    "locationCountry",
    "submissionDeadline",
    "auditionDate",
    "callbackDate",
    "compensationCategory",
    "rateType",
    "isUnion",
    "compensationNotes",
    "submissionMethod",
    "submissionMaterials",
    "submitterPolicy",
    "roles",
  ],
  properties: {
    title: { type: ["string", "null"] },
    description: { type: ["string", "null"] },
    productionCompany: { type: ["string", "null"] },
    projectType: {
      type: ["string", "null"],
      enum: [...PROJECT_TYPES, null],
    },
    startDate: { type: ["string", "null"] },
    endDate: { type: ["string", "null"] },
    location: { type: ["string", "null"] },
    castingKinds: {
      type: ["array", "null"],
      items: { type: "string", enum: castingKindValues },
    },
    visibility: {
      type: ["string", "null"],
      enum: ["public", "unlisted", "private", null],
    },
    locationMode: {
      type: ["string", "null"],
      enum: [...locationModeValues, null],
    },
    locationCity: { type: ["string", "null"] },
    locationRegion: { type: ["string", "null"] },
    locationCountry: { type: ["string", "null"] },
    submissionDeadline: { type: ["string", "null"] },
    auditionDate: { type: ["string", "null"] },
    callbackDate: { type: ["string", "null"] },
    compensationCategory: {
      type: ["string", "null"],
      enum: [...compensationValues, null],
    },
    rateType: {
      type: ["string", "null"],
      enum: [...rateTypeValues, null],
    },
    isUnion: { type: ["boolean", "null"] },
    compensationNotes: { type: ["string", "null"] },
    submissionMethod: {
      type: ["string", "null"],
      enum: [...submissionMethodValues, null],
    },
    submissionMaterials: {
      type: ["array", "null"],
      items: { type: "string", enum: [...SUBMISSION_MATERIAL_OPTIONS] },
    },
    submitterPolicy: {
      type: ["string", "null"],
      enum: [...submitterPolicyValues, null],
    },
    roles: {
      type: ["array", "null"],
      items: extractedRoleSchema,
    },
  },
} as const;

export const breakdownVisionSystemPrompt = `You extract structured project and casting information from entertainment industry breakdown documents, casting briefs, production call sheets, and similar PDFs.

Return only fields you can confidently infer from the document. Use null when uncertain.

Date fields must be ISO 8601 date strings (YYYY-MM-DD) or datetime strings when a time is specified.

projectType must be one of these exact values when identifiable:
job, casting, audition, campaign, tour, production, event, talent_submission, client_presentation, class_program, training_program, internal_planning

castingKinds values: ${castingKindValues.join(", ")}
locationMode values: ${locationModeValues.join(", ")}
compensationCategory values: ${compensationValues.join(", ")}
rateType values: ${rateTypeValues.join(", ")}
submissionMethod values: ${submissionMethodValues.join(", ")}
submitterPolicy values: ${submitterPolicyValues.join(", ")}
submissionMaterials options: ${SUBMISSION_MATERIAL_OPTIONS.join(", ")}

Extract all roles mentioned in the document with as much detail as available (title, description, age range, gender, headcount, ethnicity preferences, union status).

Choose the best matching project type based on the document's purpose. Default to casting for casting notices.`;
