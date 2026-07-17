export type ActivityType = "class" | "session" | "event";

export type TicketAccessMode = "all_days" | "select_days" | "fixed_days";

export type ActivityPlace = {
  placeId: string;
  name: string;
  formattedAddress: string;
  displayLabel: string;
};

export type DraftEventDay = {
  id: string;
  dayDate: string;
  startTime: string;
  endTime: string;
  label: string;
  maxAttendees: number | null;
};

export type DraftTicketOption = {
  id: string;
  label: string;
  /** Dollars (UI); persisted as amount_cents. */
  priceAmount: number;
  accessMode: TicketAccessMode;
  minDays: number | null;
  maxDays: number | null;
  maxSales: number | null;
  includedEventDayIds: string[];
};

export type DraftScheduleItem = {
  id: string;
  timeLabel: string;
  title: string;
  detail: string;
};

export type ActivityDraft = {
  type: ActivityType;
  title: string;
  description: string;
  coverImageUrl: string;
  locationLabel: string;
  place: ActivityPlace | null;
  activityDate: string;
  startTime: string;
  endTime: string;
  endDate: string;
  maxAttendees: number | null;
  isPublic: boolean;
  projectId: string | null;

  // Class
  category: string;
  subcategory: string;
  genres: string[];
  prerequisites: string;
  whatYouWillLearn: string[];
  classFocus: string;
  skillLevel: string;
  intensity: string;
  dressCode: string;
  whatToBring: string;
  cancellationPolicy: string;
  isPaid: boolean;
  priceAmount: number;
  maxGuestSpots: number | null;
  collaboratorUserIds: string[];

  // Session
  sessionType: string;
  sessionLevel: string;
  sessionGenre: string;
  sessionVibe: string;
  sessionRules: string;
  sessionGoodToKnow: string;
  sessionTags: string[];
  attendeesVisible: boolean;

  // Event
  eventDays: DraftEventDay[];
  ticketOptions: DraftTicketOption[];
  eventHighlights: string[];
  eventLineup: string[];
  eventScheduleItems: DraftScheduleItem[];
  eventDressCode: string;
  eventArrivalNotes: string;
  eventFoodDrinksInfo: string;
  eventAccessibilityInfo: string;
  eventLateEntryPolicy: string;
  eventCancellationPolicy: string;
};

export type ConnectAccountStatus = {
  hasConnectAccount: boolean;
  isReadyToAcceptPayments: boolean;
  detailsSubmitted: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  connectAccountId: string | null;
};

export type OrganizerAttendee = {
  userId: string;
  enrollmentId: string | null;
  displayName: string;
  headshotUrl: string | null;
  status: string;
  checkedInAt: string | null;
  ticketLabel: string | null;
  source: "enrollment" | "invite";
};

export type OrganizerRevenueSummary = {
  paidCount: number;
  grossCents: number;
  currency: string;
};
