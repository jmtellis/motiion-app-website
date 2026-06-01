import { resumeExtractionJsonSchema, resumeVisionSystemPrompt } from "@/lib/onboarding/resume-schema";
import type { ExtractedResumeData } from "@/lib/onboarding/resume-types";

const PLACEHOLDER_VALUES = new Set([
  "fallback",
  "legacy",
  "example",
  "string",
  "unknown",
  "n/a",
  "na",
]);

function sanitizeString(value: string | null | undefined) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed || PLACEHOLDER_VALUES.has(trimmed.toLowerCase())) return null;
  return trimmed;
}

function sanitizeExtracted(data: ExtractedResumeData): ExtractedResumeData {
  return {
    ...data,
    name: sanitizeString(data.name),
    height: sanitizeString(data.height),
    ethnicity: sanitizeString(data.ethnicity),
    hairColor: sanitizeString(data.hairColor),
    eyeColor: sanitizeString(data.eyeColor),
    gender: sanitizeString(data.gender),
    agent: sanitizeString(data.agent),
    unionStatus: sanitizeString(data.unionStatus),
    skills: data.skills?.map((s) => sanitizeString(s)).filter((s): s is string => Boolean(s)) ?? null,
    workLocations:
      data.workLocations?.map((l) => sanitizeString(l)).filter((l): l is string => Boolean(l)) ?? null,
    experiences: data.experiences?.map((exp) => ({
      ...exp,
      title: sanitizeString(exp.title),
      projectTitle: sanitizeString(exp.projectTitle),
      songTitle: sanitizeString(exp.songTitle),
      role: sanitizeString(exp.role),
      credits: sanitizeString(exp.credits),
      studio: sanitizeString(exp.studio),
      company: sanitizeString(exp.company),
      artist: sanitizeString(exp.artist),
      choreographer: sanitizeString(exp.choreographer),
      category: sanitizeString(exp.category),
      startDate: sanitizeString(exp.startDate),
      endDate: sanitizeString(exp.endDate),
      notes: sanitizeString(exp.notes),
    })),
    training: data.training?.map((t) => ({
      ...t,
      name: sanitizeString(t.name),
      program: sanitizeString(t.program),
      startDate: sanitizeString(t.startDate),
      endDate: sanitizeString(t.endDate),
    })),
  };
}

function parseOpenAiError(payload: unknown) {
  if (!payload || typeof payload !== "object") return null;
  const error = (payload as { error?: { message?: string } }).error?.message;
  return error ?? null;
}

export async function extractResumeWithVision(pageImages: Buffer[]): Promise<ExtractedResumeData> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("Resume parsing is not configured. Add OPENAI_API_KEY to the server environment.");
  }

  if (!pageImages.length) {
    throw new Error("Could not read any pages from that file.");
  }

  const userContent: Array<Record<string, unknown>> = [
    {
      type: "text",
      text: "Extract all relevant information from this entertainment industry resume. Return a JSON object.",
    },
  ];

  for (const image of pageImages.slice(0, 3)) {
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
      max_tokens: 4096,
      messages: [
        { role: "system", content: resumeVisionSystemPrompt },
        { role: "user", content: userContent },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "resume_extraction",
          strict: true,
          schema: resumeExtractionJsonSchema,
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
    throw new Error(parseOpenAiError(payload) ?? `Resume parsing failed (HTTP ${response.status}).`);
  }

  const content = payload.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Resume parsing returned an empty response. Please try again.");
  }

  const extracted = JSON.parse(content) as ExtractedResumeData;
  return sanitizeExtracted(extracted);
}
