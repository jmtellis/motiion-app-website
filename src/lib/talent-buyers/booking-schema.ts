import { z } from "zod";
export const bookingStatuses = ["draft", "negotiating", "confirmed", "completed", "cancelled"] as const;
export const bookingSchema = z.object({
  id: z.string().uuid().optional(), project_id: z.string().uuid(),
  talent_name: z.string().trim().min(1).max(200), role: z.string().trim().max(200),
  status: z.enum(bookingStatuses), fee_cents: z.number().int().min(0).max(1000000000),
  currency: z.enum(["USD","CAD","GBP","EUR","AUD"]),
  start_date: z.string().date().nullable(), end_date: z.string().date().nullable(),
  payer_name: z.string().trim().max(200), payer_email: z.union([z.literal(""),z.string().email()]),
  terms: z.string().max(20000), negotiation_notes: z.string().max(20000),
}).refine(v => !v.start_date || !v.end_date || v.end_date >= v.start_date, { message: "End date must follow start date." });
export type BookingInput = z.infer<typeof bookingSchema>;
export type Booking = BookingInput & { id: string; updated_at: string };
export const jobTemplates: Record<string,string> = {
  Performance: "Job scope:\nPerformance date and venue:\nRehearsal schedule:\nAgreed fee and payment due date:\nTravel and expenses:\nAdditional agreed terms:",
  Commercial: "Production and role:\nShoot and fitting dates:\nUsage, territory, and duration:\nAgreed fee and payment due date:\nTravel and expenses:\nAdditional agreed terms:",
  Teaching: "Class or workshop:\nDate, location, and duration:\nPreparation and deliverables:\nAgreed fee and payment due date:\nTravel and expenses:\nAdditional agreed terms:",
};
