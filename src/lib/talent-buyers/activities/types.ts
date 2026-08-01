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

export type DraftPersonRef = {
  userId: string;
  displayName: string;
  headshotUrl: string | null;
};

export type DraftJobGroup = {
  id: string;
  /** Persisted `job_groups.id` when editing an existing subgroup. */
  persistedId: string | null;
  name: string;
  leadInvitees: DraftPersonRef[];
};

export type PromoDiscountType = "percent" | "fixed_cents";

export type DraftPromoCode = {
  id: string;
  /** Persisted row id when editing. */
  persistedId: string | null;
  code: string;
  discountType: PromoDiscountType;
  /** Percent 1–100, or dollars when fixed (UI); fixed persists as cents. */
  discountValue: number;
  maxRedemptions: number | null;
  expiresAt: string;
  isActive: boolean;
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
  collaborators: DraftPersonRef[];

  // Session
  sessionType: string;
  sessionLevel: string;
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
  eventSubgroupsEnabled: boolean;
  jobGroups: DraftJobGroup[];
  promoCodes: DraftPromoCode[];
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
  promoRedemptionCount: number;
};

export type OrganizerLeadStatus =
  | "pending_invite"
  | "accepted_setup_incomplete"
  | "child_event_linked"
  | "member";

export type OrganizerLeadRow = {
  groupId: string;
  groupName: string;
  userId: string | null;
  displayName: string;
  headshotUrl: string | null;
  status: OrganizerLeadStatus;
  inviteId: string | null;
  memberId: string | null;
  subgroupActivityId: string | null;
  subgroupActivityTitle: string | null;
};

export type OrganizerSubgroup = {
  id: string;
  name: string;
  sortOrder: number;
  leads: OrganizerLeadRow[];
};
