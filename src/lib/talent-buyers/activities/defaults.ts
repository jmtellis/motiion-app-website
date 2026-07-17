import type {
  ActivityDraft,
  ActivityType,
  DraftEventDay,
  DraftTicketOption,
} from "@/lib/talent-buyers/activities/types";

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `tmp_${Math.random().toString(36).slice(2)}_${Date.now()}`;
}

export function createDefaultEventDay(overrides?: Partial<DraftEventDay>): DraftEventDay {
  const today = new Date();
  const date = today.toISOString().slice(0, 10);
  return {
    id: newId(),
    dayDate: date,
    startTime: "18:00",
    endTime: "21:00",
    label: "",
    maxAttendees: null,
    ...overrides,
  };
}

export function createDefaultTicketOptions(): DraftTicketOption[] {
  return [
    {
      id: newId(),
      label: "General admission",
      priceAmount: 25,
      accessMode: "all_days",
      minDays: null,
      maxDays: null,
      maxSales: null,
      includedEventDayIds: [],
    },
    {
      id: newId(),
      label: "VIP",
      priceAmount: 50,
      accessMode: "all_days",
      minDays: null,
      maxDays: null,
      maxSales: null,
      includedEventDayIds: [],
    },
  ];
}

export function createDefaultActivityDraft(
  type: ActivityType = "event",
  projectId?: string | null,
): ActivityDraft {
  const day = createDefaultEventDay();
  return {
    type,
    title: "",
    description: "",
    coverImageUrl: "",
    locationLabel: "",
    place: null,
    activityDate: day.dayDate,
    startTime: day.startTime,
    endTime: day.endTime,
    endDate: day.dayDate,
    maxAttendees: type === "session" ? 20 : null,
    isPublic: true,
    projectId: projectId ?? null,

    category: "",
    subcategory: "",
    genres: [],
    prerequisites: "",
    whatYouWillLearn: [],
    classFocus: "",
    skillLevel: "",
    intensity: "",
    dressCode: "",
    whatToBring: "",
    cancellationPolicy: "",
    isPaid: type === "event",
    priceAmount: 25,
    maxGuestSpots: null,
    collaboratorUserIds: [],

    sessionType: "",
    sessionLevel: "",
    sessionGenre: "",
    sessionVibe: "",
    sessionRules: "",
    sessionGoodToKnow: "",
    sessionTags: [],
    attendeesVisible: true,

    eventDays: [day],
    ticketOptions: createDefaultTicketOptions(),
    eventHighlights: [],
    eventLineup: [],
    eventScheduleItems: [],
    eventDressCode: "",
    eventArrivalNotes: "",
    eventFoodDrinksInfo: "",
    eventAccessibilityInfo: "",
    eventLateEntryPolicy: "",
    eventCancellationPolicy: "",
  };
}

export function locationDisplayString(draft: ActivityDraft): string {
  if (draft.place?.displayLabel) return draft.place.displayLabel;
  if (draft.place?.formattedAddress) return draft.place.formattedAddress;
  if (draft.place?.name) return draft.place.name;
  return draft.locationLabel.trim();
}

export function syncScheduleFromEventDays(draft: ActivityDraft): ActivityDraft {
  if (draft.type !== "event" || draft.eventDays.length === 0) return draft;
  const sorted = [...draft.eventDays].sort((a, b) => a.dayDate.localeCompare(b.dayDate));
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  return {
    ...draft,
    activityDate: first.dayDate,
    startTime: first.startTime,
    endDate: last.dayDate,
    endTime: last.endTime,
  };
}

export function dollarsToCents(amount: number): number {
  return Math.max(1, Math.round(amount * 100));
}
