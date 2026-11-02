import { z } from "zod";

// The historical database status "negotiating" now means internal coordination.
export const coordinationStatuses = ["draft", "negotiating", "confirmed", "completed", "cancelled"] as const;
export const coordinationLabels = { draft: "Draft", negotiating: "Coordinating", confirmed: "Confirmed", completed: "Completed", cancelled: "Cancelled" };
export const coordinationSchema = z.object({
  id: z.string().uuid().optional(),
  project_id: z.string().uuid(),
  talent_name: z.string().trim().min(1, "Add a name.").max(200),
  role: z.string().trim().max(200),
  status: z.enum(coordinationStatuses),
  start_date: z.string().date().nullable(),
  end_date: z.string().date().nullable(),
  negotiation_notes: z.string().max(20000),
}).refine((value) => !value.start_date || !value.end_date || value.end_date >= value.start_date, {
  message: "End date must be on or after the start date.", path: ["end_date"],
});
export type CoordinationInput = z.infer<typeof coordinationSchema>;
export type CoordinationRecord = CoordinationInput & { id: string; updated_at: string };
export const COORDINATION_COLUMNS = "id,project_id,talent_name,role,status,start_date,end_date,negotiation_notes,updated_at";
