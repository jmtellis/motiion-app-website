/** OpenAI structured output schema aligned with the iOS ResumeService extraction shape. */
export const resumeExtractionJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "name",
    "talentTypes",
    "experiences",
    "training",
    "skills",
    "height",
    "gender",
    "ethnicity",
    "hairColor",
    "eyeColor",
    "agent",
    "workLocations",
    "unionStatus",
  ],
  properties: {
    name: { type: ["string", "null"] },
    talentTypes: { type: ["array", "null"], items: { type: "string" } },
    experiences: {
      type: ["array", "null"],
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "title",
          "projectTitle",
          "songTitle",
          "role",
          "credits",
          "studio",
          "company",
          "artist",
          "choreographer",
          "category",
          "startDate",
          "endDate",
          "notes",
        ],
        properties: {
          title: { type: ["string", "null"] },
          projectTitle: { type: ["string", "null"] },
          songTitle: { type: ["string", "null"] },
          role: { type: ["string", "null"] },
          credits: { type: ["string", "null"] },
          studio: { type: ["string", "null"] },
          company: { type: ["string", "null"] },
          artist: { type: ["string", "null"] },
          choreographer: { type: ["string", "null"] },
          category: {
            type: ["string", "null"],
            enum: ["liveStage", "televisionFilm", "musicVideos", "printCommercial", null],
          },
          startDate: { type: ["string", "null"] },
          endDate: { type: ["string", "null"] },
          notes: { type: ["string", "null"] },
        },
      },
    },
    training: {
      type: ["array", "null"],
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "program", "startDate", "endDate"],
        properties: {
          name: { type: ["string", "null"] },
          program: { type: ["string", "null"] },
          startDate: { type: ["string", "null"] },
          endDate: { type: ["string", "null"] },
        },
      },
    },
    skills: { type: ["array", "null"], items: { type: "string" } },
    height: { type: ["string", "null"] },
    gender: { type: ["string", "null"] },
    ethnicity: { type: ["string", "null"] },
    hairColor: { type: ["string", "null"] },
    eyeColor: { type: ["string", "null"] },
    agent: { type: ["string", "null"] },
    workLocations: { type: ["array", "null"], items: { type: "string" } },
    unionStatus: { type: ["string", "null"] },
  },
} as const;

export const resumeVisionSystemPrompt = `You are an expert at parsing entertainment industry resumes (acting, modeling, performing arts).

Output rules:
- Return ONLY valid JSON that matches the provided schema.
- Omit unknown fields rather than guessing.
- Never output instructional/meta placeholder text as field values.
- Do not output values such as: "fallback", "legacy", "example", "string", "unknown", "N/A".

Extraction strategy:
- Reconstruct visual rows first, then map each row into schema fields.
- Assign each experience to exactly one category: liveStage, televisionFilm, musicVideos, or printCommercial.
- name: primary full name in resume header.
- training: schools, studios, workshops, conservatories, coaching.
- skills: discrete skills as separate array items.
- height: preserve displayed format.
- gender/ethnicity/hairColor/eyeColor/agent/unionStatus: use allowed enum-style values when present.
- workLocations: cities or regions where the talent works.`;
