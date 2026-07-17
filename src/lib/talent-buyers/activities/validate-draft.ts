import type { ActivityDraft } from "@/lib/talent-buyers/activities/types";

export function validateActivityDraft(draft: ActivityDraft): string | null {
  const title = draft.title.trim();
  if (title.length < 3) return "Give the activity a title (at least 3 characters).";

  if (draft.type === "session") {
    if (!draft.activityDate) return "Pick a date.";
    if (!draft.startTime) return "Pick a start time.";
    if (!draft.maxAttendees || draft.maxAttendees < 1) {
      return "Sessions need a capacity greater than zero.";
    }
  }

  if (draft.type === "class") {
    if (!draft.activityDate) return "Pick a date.";
    if (!draft.startTime) return "Pick a start time.";
    if (draft.isPaid) {
      if (draft.priceAmount < 0.5 || draft.priceAmount > 99999) {
        return "Paid classes need a price between $0.50 and $99,999.";
      }
    }
  }

  if (draft.type === "event") {
    if (draft.eventDays.length < 1) return "Add at least one event day.";
    for (const day of draft.eventDays) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day.dayDate)) return "Each day needs a valid date.";
      if (!/^\d{2}:\d{2}/.test(day.startTime) || !/^\d{2}:\d{2}/.test(day.endTime)) {
        return "Each day needs start and end times.";
      }
    }
    if (draft.isPaid) {
      const validTickets = draft.ticketOptions.filter(
        (t) => t.label.trim().length > 0 && t.priceAmount >= 0.5,
      );
      if (validTickets.length < 1) {
        return "Paid events need at least one ticket type with a price.";
      }
      for (const ticket of validTickets) {
        if (ticket.accessMode === "fixed_days" && ticket.includedEventDayIds.length < 1) {
          return `"${ticket.label}" needs at least one included day.`;
        }
        if (ticket.accessMode === "select_days") {
          const min = ticket.minDays ?? 1;
          const max = ticket.maxDays ?? min;
          if (min < 1 || max < min) {
            return `"${ticket.label}" has an invalid day range.`;
          }
        }
      }
    }
  }

  return null;
}
