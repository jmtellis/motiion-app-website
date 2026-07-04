export type BuyerProjectType =
  | "casting"
  | "event"
  | "tour"
  | "production"
  | "agency_submission"
  | "client_presentation"
  | "internal_planning";

export type BuyerProjectStatus = "active" | "draft" | "shared" | "archived";

export type BuyerEventType = "casting" | "audition" | "class" | "session" | "job" | "event";

export type BuyerEventStatus = "upcoming" | "draft" | "past" | "cancelled";

export type BuyerActivityType =
  | "talent_added_to_roster"
  | "project_shared"
  | "event_created"
  | "talent_profile_updated"
  | "note_added"
  | "shortlist_shared";

export type BuyerProjectSummary = {
  id: string;
  title: string;
  projectType: BuyerProjectType;
  status: BuyerProjectStatus;
  lastUpdated: string;
  talentCount: number;
  notesCount?: number;
  sharedLinksCount?: number;
};

export type BuyerEventSummary = {
  id: string;
  title: string;
  eventType: BuyerEventType;
  dateTime: string;
  location: string;
  status: BuyerEventStatus;
};

export type BuyerTalentSummary = {
  id: string;
  name: string;
  location: string;
  styles: string[];
  avatarUrl?: string | null;
  profileSlug: string;
};

export type BuyerRosterSummary = {
  id: string;
  name: string;
  talentCount: number;
  lastUpdated: string;
  createdBy: string;
};

export type BuyerSharedPresentation = {
  id: string;
  title: string;
  projectTitle: string;
  sharedAt: string;
  viewCount?: number;
};

export type BuyerActivityItem = {
  id: string;
  type: BuyerActivityType;
  title: string;
  description: string;
  timestamp: string;
  href?: string;
};

export type BuyerDashboardData = {
  continueWorking: BuyerProjectSummary[];
  recentTalent: BuyerTalentSummary[];
  upcomingEvents: BuyerEventSummary[];
  activityFeed: BuyerActivityItem[];
  projects: BuyerProjectSummary[];
  events: {
    upcoming: BuyerEventSummary[];
    drafts: BuyerEventSummary[];
    past: BuyerEventSummary[];
  };
  library: {
    rosters: BuyerRosterSummary[];
    savedTalent: BuyerTalentSummary[];
    sharedPresentations: BuyerSharedPresentation[];
  };
};
