import type { CastingCandidateStatus } from "./casting-types";

export type CastingActionDescriptor = {
  id: string;
  label: string;
  variant?: "primary" | "secondary" | "danger";
  requiresConfirmation?: boolean;
  notifyTalentOption?: boolean;
};

export const CANDIDATE_ROW_ACTIONS: CastingActionDescriptor[] = [
  { id: "shortlist", label: "Shortlist", variant: "primary" },
  { id: "callback", label: "Callback" },
  { id: "select", label: "Select", variant: "primary" },
  { id: "pass", label: "Pass", variant: "danger", requiresConfirmation: true, notifyTalentOption: true },
  { id: "request-info", label: "Request info", notifyTalentOption: true },
  { id: "request-availability", label: "Request availability", notifyTalentOption: true },
  { id: "message", label: "Message" },
];

export const CAST_ROW_ACTIONS: CastingActionDescriptor[] = [
  { id: "send-availability", label: "Send availability request", notifyTalentOption: true },
  { id: "send-offer", label: "Send offer", variant: "primary", notifyTalentOption: true },
  { id: "confirm-booking", label: "Confirm booking", variant: "primary" },
  { id: "mark-declined", label: "Mark declined" },
  { id: "replace", label: "Replace" },
  { id: "promote-alternate", label: "Promote alternate" },
  { id: "reassign-role", label: "Reassign role" },
  { id: "message", label: "Message" },
  { id: "remove-from-cast", label: "Remove from cast", variant: "danger" },
];

export const BULK_CANDIDATE_ACTIONS: CastingActionDescriptor[] = [
  { id: "move-stage", label: "Move stage", variant: "primary" },
  { id: "assign-role", label: "Assign role" },
  { id: "send-message", label: "Send message" },
  { id: "request-availability", label: "Request availability", notifyTalentOption: true },
  { id: "export", label: "Export" },
  { id: "remove", label: "Remove", variant: "danger" },
];

export function stageActionForStatus(status: CastingCandidateStatus): CastingActionDescriptor | null {
  switch (status) {
    case "shortlisted":
      return { id: "shortlist", label: "Shortlist" };
    case "callback":
      return { id: "callback", label: "Callback" };
    case "selected":
      return { id: "select", label: "Select" };
    case "not_moving_forward":
      return { id: "pass", label: "Pass", variant: "danger", notifyTalentOption: true };
    default:
      return null;
  }
}
