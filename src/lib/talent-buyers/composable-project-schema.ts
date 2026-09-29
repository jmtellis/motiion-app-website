import { z } from "zod";

const isoDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date.")
  .or(z.literal(""))
  .optional()
  .default("");

export const composableProjectShellSchema = z
  .object({
    name: z.string().trim().min(1, "Name your project.").max(255, "Keep the name under 255 characters."),
    location: z.string().trim().max(255).optional().default(""),
    startDate: isoDate,
    endDate: isoDate,
    coverImageUrl: z.string().trim().optional().default(""),
  })
  .refine((value) => !value.startDate || !value.endDate || value.endDate >= value.startDate, {
    message: "End date must be on or after the start date.",
    path: ["endDate"],
  });

export type ComposableProjectShellInput = z.input<typeof composableProjectShellSchema>;
export type ComposableProjectShell = z.output<typeof composableProjectShellSchema>;

export function parseComposableProjectShell(payload: unknown) {
  return composableProjectShellSchema.safeParse(payload);
}
