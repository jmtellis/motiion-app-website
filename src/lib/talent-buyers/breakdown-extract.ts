import { breakdownExtractionJsonSchema, breakdownVisionSystemPrompt } from "@/lib/talent-buyers/breakdown-schema";
import type { ExtractedBreakdownData } from "@/lib/talent-buyers/breakdown-types";
import { getNormalizedProjectType } from "@/lib/talent-buyers/project-types";

const PLACEHOLDER_VALUES = new Set([
  "fallback",
  "legacy",
  "example",
  "string",
  "unknown",
  "n/a",
  "na",
  "tbd",
]);

function sanitizeString(value: string | null | undefined) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed || PLACEHOLDER_VALUES.has(trimmed.toLowerCase())) return null;
  return trimmed;
}

function sanitizeIsoDate(value: string | null | undefined) {
  const trimmed = sanitizeString(value);
  if (!trimmed) return null;
  const isoMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoMatch) return isoMatch[1]!;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

function sanitizeStringArray(value: string[] | null | undefined) {
  if (!value?.length) return null;
  const cleaned = value.map((item) => sanitizeString(item)).filter((item): item is string => Boolean(item));
  return cleaned.length ? cleaned : null;
}

function sanitizeRoles(data: ExtractedBreakdownData["roles"]) {
  if (!data?.length) return null;
  const roles = data
    .map((role) => ({
      title: sanitizeString(role.title),
      description: sanitizeString(role.description),
      ageRangeMin: sanitizeString(role.ageRangeMin),
      ageRangeMax: sanitizeString(role.ageRangeMax),
      gender: sanitizeString(role.gender),
      peopleNeeded: sanitizeString(role.peopleNeeded),
      ethnicityPreferences: sanitizeStringArray(role.ethnicityPreferences),
      unionStatus: sanitizeString(role.unionStatus),
    }))
    .filter((role) => role.title);
  return roles.length ? roles : null;
}

function sanitizeExtracted(data: ExtractedBreakdownData): ExtractedBreakdownData {
  const projectTypeRaw = sanitizeString(data.projectType ?? undefined);
  return {
    title: sanitizeString(data.title),
    description: sanitizeString(data.description),
    productionCompany: sanitizeString(data.productionCompany),
    projectType: projectTypeRaw ? getNormalizedProjectType(projectTypeRaw) : null,
    startDate: sanitizeIsoDate(data.startDate),
    endDate: sanitizeIsoDate(data.endDate),
    location: sanitizeString(data.location),
    castingKinds: sanitizeStringArray(data.castingKinds),
    visibility: data.visibility === "public" || data.visibility === "unlisted" || data.visibility === "private"
      ? data.visibility
      : null,
    locationMode: sanitizeString(data.locationMode),
    locationCity: sanitizeString(data.locationCity),
    locationRegion: sanitizeString(data.locationRegion),
    locationCountry: sanitizeString(data.locationCountry),
    submissionDeadline: sanitizeIsoDate(data.submissionDeadline) ?? sanitizeString(data.submissionDeadline),
    auditionDate: sanitizeIsoDate(data.auditionDate) ?? sanitizeString(data.auditionDate),
    callbackDate: sanitizeIsoDate(data.callbackDate) ?? sanitizeString(data.callbackDate),
    compensationCategory: sanitizeString(data.compensationCategory),
    rateType: sanitizeString(data.rateType),
    isUnion: typeof data.isUnion === "boolean" ? data.isUnion : null,
    compensationNotes: sanitizeString(data.compensationNotes),
    submissionMethod: sanitizeString(data.submissionMethod),
    submissionMaterials: sanitizeStringArray(data.submissionMaterials),
    submitterPolicy: sanitizeString(data.submitterPolicy),
    roles: sanitizeRoles(data.roles),
  };
}

function parseOpenAiError(payload: unknown) {
  if (!payload || typeof payload !== "object") return null;
  const error = (payload as { error?: { message?: string } }).error?.message;
  return error ?? null;
}

export async function extractBreakdownWithVision(pageImages: Buffer[]): Promise<ExtractedBreakdownData> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("Breakdown parsing is not configured. Add OPENAI_API_KEY to the server environment.");
  }

  if (!pageImages.length) {
    throw new Error("Could not read any pages from that file.");
  }

  const userContent: Array<Record<string, unknown>> = [
    {
      type: "text",
      text: "Extract project details from this breakdown or production document. Return a JSON object.",
    },
  ];

  for (const image of pageImages.slice(0, 4)) {
    const base64 = image.toString("base64");
    userContent.push({
      type: "image_url",
      image_url: {
        url: `data:image/jpeg;base64,${base64}`,
        detail: "high",
      },
    });
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o",
      temperature: 0,
      max_tokens: 2048,
      messages: [
        { role: "system", content: breakdownVisionSystemPrompt },
        { role: "user", content: userContent },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "breakdown_extraction",
          strict: true,
          schema: breakdownExtractionJsonSchema,
        },
      },
    }),
    signal: AbortSignal.timeout(120_000),
  });

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    error?: { message?: string };
  };

  if (!response.ok) {
    throw new Error(parseOpenAiError(payload) ?? `Breakdown parsing failed (HTTP ${response.status}).`);
  }

  const content = payload.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Breakdown parsing returned an empty response. Please try again.");
  }

  const extracted = JSON.parse(content) as ExtractedBreakdownData;
  return sanitizeExtracted(extracted);
}
