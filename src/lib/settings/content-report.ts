import { z } from "zod";

export const reportReasons = [
  { value: "spam", label: "Spam" }, { value: "harassment", label: "Harassment or bullying" },
  { value: "nudity", label: "Nudity or sexual content" }, { value: "hate_speech", label: "Hate speech" },
  { value: "impersonation", label: "Impersonation" }, { value: "other", label: "Other" },
] as const;
export const contentReportSchema = z.object({
  contentType: z.enum(["profile", "message", "conversation", "activity", "casting", "media"]),
  reportedUserId: z.string().uuid(), contentId: z.string().uuid().nullable(),
  reason: z.enum(["spam", "harassment", "nudity", "hate_speech", "impersonation", "other"]),
  details: z.string().trim().max(2000, "Keep report details under 2,000 characters."),
}).refine((input) => input.reason !== "other" || input.details.length > 0, { message: "Add a few details so the team can understand your report.", path: ["details"] });
export type ContentReportInput = z.infer<typeof contentReportSchema>;
export type ContentReportTarget = Pick<ContentReportInput, "contentType" | "reportedUserId" | "contentId"> & { displayName: string };
