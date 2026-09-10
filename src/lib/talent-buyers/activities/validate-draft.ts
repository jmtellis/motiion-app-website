import { locationDisplayString } from "@/lib/talent-buyers/activities/defaults";
import {
  CLASS_CATEGORY_HIGH_LEVELS,
  CLASS_FOCUSES,
  CLASS_INTENSITIES,
  CLASS_SKILL_LEVELS,
  EVENT_TYPES,
  SESSION_LEVELS,
  SESSION_TYPES,
  SESSION_VIBES,
  classTypeOptionsForHighLevel,
} from "@/lib/talent-buyers/activities/registry";
import type { ActivityDraft } from "@/lib/talent-buyers/activities/types";

function isOneOf(value: string, options: readonly string[]): boolean {
  return (options as readonly string[]).includes(value);
}

export function validateActivityDraft(draft: ActivityDraft): string | null {
  const title = draft.title.trim();
  if (title.length < 3) return "Give the activity a title (at least 3 characters).";

  if (draft.isPublic && !locationDisplayString(draft)) {
    return "Public activities need a venue so dancers can find them.";
  }

  if (draft.type === "session") {
    if (!draft.activityDate) return "Pick a date.";
    if (!draft.startTime) return "Pick a start time.";
    if (!draft.maxAttendees || draft.maxAttendees < 1) {
      return "Sessions need a capacity greater than zero.";
    }
    if (!isOneOf(draft.sessionType, SESSION_TYPES)) {
      return "Pick a session type.";
    }
    if (!isOneOf(draft.sessionLevel, SESSION_LEVELS)) {
      return "Pick a session level.";
    }
    if (!isOneOf(draft.sessionVibe, SESSION_VIBES)) {
      return "Pick a session vibe.";
    }
    if (draft.genres.filter((g) => g.trim()).length < 1) {
      return "Pick at least one genre.";
    }
  }

  if (draft.type === "class") {
    if (!draft.activityDate) return "Pick a date.";
    if (!draft.startTime) return "Pick a start time.";
    if (!isOneOf(draft.category, CLASS_CATEGORY_HIGH_LEVELS)) {
      return "Pick a class category (Training or Industry).";
    }
    const typeOptions = classTypeOptionsForHighLevel(draft.category);
    if (!isOneOf(draft.subcategory, typeOptions)) {
      return "Pick a class type.";
    }
    if (draft.genres.filter((g) => g.trim()).length < 1) {
      return "Pick at least one genre.";
    }
    if (draft.whatYouWillLearn.filter((item) => item.trim()).length < 1) {
      return "Add at least one learning outcome.";
    }
    if (!isOneOf(draft.skillLevel, CLASS_SKILL_LEVELS)) {
      return "Pick a skill level.";
    }
    if (!isOneOf(draft.classFocus, CLASS_FOCUSES)) {
      return "Pick a class focus.";
    }
    if (draft.intensity && !isOneOf(draft.intensity, CLASS_INTENSITIES)) {
      return "Pick a valid intensity.";
    }
    if (draft.isPaid) {
      if (draft.priceAmount < 0.5 || draft.priceAmount > 99999) {
        return "Paid classes need a price between $0.50 and $99,999.";
      }
    }
  }

  if (draft.type === "event") {
    if (draft.subcategory && !isOneOf(draft.subcategory, EVENT_TYPES)) {
      return "Pick a valid event type.";
    }
    if (draft.eventDays.length < 1) return "Add a date and time for the event.";
    for (const day of draft.eventDays) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day.dayDate)) return "Each day needs a valid date.";
      if (!/^\d{2}:\d{2}/.test(day.startTime) || !/^\d{2}:\d{2}/.test(day.endTime)) {
        return "Each day needs start and end times.";
      }
    }
    const ticketUrl = draft.externalTicketUrl.trim();
    if (ticketUrl && !/^https?:\/\//i.test(ticketUrl)) {
      return "Ticket link must start with http:// or https://.";
    }
    if (draft.sellTicketsOnMotiion && draft.isPaid) {
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
      for (const promo of draft.promoCodes) {
        const code = promo.code.trim();
        if (!code) continue;
        if (code.length < 3) return "Promo codes need at least 3 characters.";
        if (promo.discountType === "percent") {
          if (promo.discountValue < 1 || promo.discountValue > 100) {
            return `Promo ${code.toUpperCase()} needs a percent between 1 and 100.`;
          }
        } else if (promo.discountValue < 0.5) {
          return `Promo ${code.toUpperCase()} needs a discount of at least $0.50.`;
        }
      }
    }
    if (draft.eventSubgroupsEnabled) {
      const named = draft.jobGroups.filter((group) => group.name.trim());
      if (named.length < 1) {
        return "Add at least one named subgroup, or turn subgroups off.";
      }
    }
  }

  return null;
}
