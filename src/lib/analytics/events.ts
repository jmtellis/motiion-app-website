export type AnalyticsEventCategory =
  | "navigation"
  | "profile"
  | "activity"
  | "onboarding"
  | "sharing"
  | "shortlist"
  | "deep_link"
  | "error"
  | "kpi"
  | "subscription"
  | "marketplace";

export type AnalyticsEventDefinition = {
  name: string;
  label: string;
  category: AnalyticsEventCategory;
  description: string;
};

export const ANALYTICS_EVENTS: Record<string, AnalyticsEventDefinition> = {
  page_viewed: {
    name: "page_viewed",
    label: "Page viewed",
    category: "navigation",
    description: "Authenticated app route viewed",
  },
  app_tab_viewed: {
    name: "app_tab_viewed",
    label: "App tab viewed",
    category: "navigation",
    description: "Home, Discover, Inbox, or Portfolio tab opened",
  },
  profile_viewed: {
    name: "profile_viewed",
    label: "Profile viewed",
    category: "profile",
    description: "Public talent profile page viewed",
  },
  activity_viewed: {
    name: "activity_viewed",
    label: "Activity viewed",
    category: "activity",
    description: "Public activity/class/session/event page viewed",
  },
  onboarding_completed: {
    name: "onboarding_completed",
    label: "Onboarding completed",
    category: "onboarding",
    description: "User finished onboarding",
  },
  shortlist_viewed: {
    name: "shortlist_viewed",
    label: "Shortlist viewed",
    category: "shortlist",
    description: "Client opened a shortlist review link",
  },
  shortlist_submitted: {
    name: "shortlist_submitted",
    label: "Shortlist submitted",
    category: "shortlist",
    description: "Client submitted shortlist votes",
  },
  share_initiated: {
    name: "share_initiated",
    label: "Share initiated",
    category: "sharing",
    description: "User started a share flow",
  },
  share_completed: {
    name: "share_completed",
    label: "Share completed",
    category: "sharing",
    description: "User completed a share flow",
  },
  share_failed: {
    name: "share_failed",
    label: "Share failed",
    category: "error",
    description: "Share flow failed",
  },
  deep_link_opened: {
    name: "deep_link_opened",
    label: "Deep link opened",
    category: "deep_link",
    description: "App opened from a universal link",
  },
  user_signed_up: {
    name: "user_signed_up",
    label: "User signed up",
    category: "onboarding",
    description: "New account created on web",
  },
  class_created: {
    name: "class_created",
    label: "Class created",
    category: "marketplace",
    description: "Organizer published a class",
  },
  session_created: {
    name: "session_created",
    label: "Session created",
    category: "marketplace",
    description: "Organizer published a session",
  },
  casting_created: {
    name: "casting_created",
    label: "Casting created",
    category: "marketplace",
    description: "Client published a casting role",
  },
  class_registration_completed: {
    name: "class_registration_completed",
    label: "Class registration completed",
    category: "kpi",
    description: "Dancer registered for a class",
  },
  session_rsvp_completed: {
    name: "session_rsvp_completed",
    label: "Session RSVP completed",
    category: "kpi",
    description: "Dancer requested or joined a session",
  },
  casting_submission_completed: {
    name: "casting_submission_completed",
    label: "Casting submission completed",
    category: "kpi",
    description: "Talent submitted to a casting",
  },
  talent_saved_to_list: {
    name: "talent_saved_to_list",
    label: "Talent saved to list",
    category: "kpi",
    description: "Client saved talent to favorites or discover list",
  },
  booking_request_sent: {
    name: "booking_request_sent",
    label: "Booking request sent",
    category: "kpi",
    description: "Client sent a booking or availability request",
  },
  message_sent: {
    name: "message_sent",
    label: "Message sent",
    category: "kpi",
    description: "User sent a message",
  },
  talent_contacted: {
    name: "talent_contacted",
    label: "Talent contacted",
    category: "kpi",
    description: "First message in a new talent conversation",
  },
  profile_shared: {
    name: "profile_shared",
    label: "Profile shared",
    category: "kpi",
    description: "User shared a talent profile",
  },
  opportunity_viewed: {
    name: "opportunity_viewed",
    label: "Opportunity viewed",
    category: "marketplace",
    description: "User viewed a class, session, or casting detail",
  },
  opportunity_engaged: {
    name: "opportunity_engaged",
    label: "Opportunity engaged",
    category: "marketplace",
    description: "User completed a primary CTA on an opportunity",
  },
  casting_viewed: {
    name: "casting_viewed",
    label: "Casting viewed",
    category: "marketplace",
    description: "Public casting page viewed",
  },
  subscription_started: {
    name: "subscription_started",
    label: "Subscription started",
    category: "subscription",
    description: "User started a paid or trial subscription",
  },
  subscription_canceled: {
    name: "subscription_canceled",
    label: "Subscription canceled",
    category: "subscription",
    description: "User canceled a subscription",
  },
  subscription_renewed: {
    name: "subscription_renewed",
    label: "Subscription renewed",
    category: "subscription",
    description: "Subscription renewed successfully",
  },
  paywall_viewed: {
    name: "paywall_viewed",
    label: "Paywall viewed",
    category: "subscription",
    description: "Dancer paywall presented",
  },
  paywall_cta_tapped: {
    name: "paywall_cta_tapped",
    label: "Paywall CTA tapped",
    category: "subscription",
    description: "User tapped subscribe on paywall",
  },
};

/** Events that contribute to the North Star metric when tracked in analytics_events. */
export const NORTH_STAR_EVENT_NAMES = [
  "casting_submission_completed",
  "class_registration_completed",
  "session_rsvp_completed",
  "talent_saved_to_list",
  "booking_request_sent",
  "profile_shared",
  "message_sent",
  "talent_contacted",
] as const;

export const FUNNEL_EVENT_ORDER = [
  "onboarding_completed",
  "page_viewed",
  "app_tab_viewed",
  "profile_viewed",
  "activity_viewed",
  "share_initiated",
  "share_completed",
  "deep_link_opened",
  "shortlist_viewed",
  "shortlist_submitted",
] as const;

export function getEventLabel(eventName: string): string {
  return ANALYTICS_EVENTS[eventName]?.label ?? eventName.replaceAll("_", " ");
}

export function getEventCategory(eventName: string): AnalyticsEventCategory {
  return ANALYTICS_EVENTS[eventName]?.category ?? "navigation";
}
