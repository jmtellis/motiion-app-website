import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Briefcase,
  Building2,
  Calendar,
  CalendarDays,
  CheckCircle2,
  CheckSquare,
  Clapperboard,
  ClipboardList,
  FileStack,
  FileText,
  FolderKanban,
  GraduationCap,
  Hotel,
  Inbox,
  LayoutGrid,
  Link2,
  ListChecks,
  MapPin,
  MessageSquareQuote,
  Package,
  Plane,
  Presentation,
  Rows3,
  Search,
  Send,
  Shirt,
  Sparkles,
  StickyNote,
  Target,
  Users,
  UserCheck,
  Wallet,
} from "lucide-react";

import { getNormalizedProjectType, type ProjectType } from "./project-types";

export type ProjectNavItem = {
  id: string;
  label: string;
  icon: LucideIcon;
  /** Path segment under /projects/:id (e.g. "overview") or workspace tab id. */
  path: string;
  description?: string;
  badge?: number;
  disabled?: boolean;
};

export type ProjectQuickAction = {
  id: string;
  label: string;
  description?: string;
  /** Known handler keys — unimplemented actions show an empty-state CTA only. */
  action:
    | { kind: "timeline-item" }
    | { kind: "add-talent" }
    | { kind: "casting" }
    | { kind: "navigate"; href: string }
    | { kind: "placeholder" };
};

export type ProjectWorkspaceEmptyState = {
  title: string;
  description: string;
  actionLabel: string;
  actionId?: string;
};

export type ProjectWorkspaceConfig = {
  label: string;
  workspaceItems: ProjectNavItem[];
  quickActions: ProjectQuickAction[];
  emptyStates: Record<string, ProjectWorkspaceEmptyState>;
};

function item(
  id: string,
  label: string,
  icon: LucideIcon,
  description?: string,
): ProjectNavItem {
  return { id, label, icon, path: id, description };
}

export const PROJECT_WORKSPACE_CONFIG: Record<ProjectType, ProjectWorkspaceConfig> = {
  job: {
    label: "Job",
    workspaceItems: [
      item("schedule", "Schedule", CalendarDays),
      item("rehearsals", "Rehearsals", Users),
      item("fittings", "Fittings", Shirt),
      item("call-sheets", "Call Sheets", ClipboardList),
      item("travel", "Travel", Plane),
      item("deliverables", "Deliverables", Package),
    ],
    quickActions: [
      { id: "schedule-rehearsal", label: "Schedule rehearsal", action: { kind: "timeline-item" } },
      { id: "add-fitting", label: "Add fitting", action: { kind: "timeline-item" } },
      { id: "create-call-sheet", label: "Create call sheet", action: { kind: "placeholder" } },
      { id: "add-booked-talent", label: "Add booked talent", action: { kind: "add-talent" } },
      { id: "collect-availability", label: "Collect availability", action: { kind: "placeholder" } },
      {
        id: "upload-music",
        label: "Upload music or choreography",
        action: { kind: "navigate", href: "files" },
      },
      { id: "add-timeline-item", label: "Add activity", action: { kind: "timeline-item" } },
    ],
    emptyStates: {
      schedule: {
        title: "No schedule yet",
        description: "Build the day-by-day schedule for this job.",
        actionLabel: "Add schedule item",
        actionId: "timeline-item",
      },
      rehearsals: {
        title: "No rehearsals scheduled",
        description: "Create a rehearsal and notify the talent attached to this job.",
        actionLabel: "Schedule rehearsal",
        actionId: "timeline-item",
      },
      fittings: {
        title: "No fittings yet",
        description: "Schedule fittings for booked talent.",
        actionLabel: "Add fitting",
        actionId: "timeline-item",
      },
      "call-sheets": {
        title: "No call sheets yet",
        description: "Create a call sheet for the next work day.",
        actionLabel: "Create call sheet",
      },
      travel: {
        title: "No travel planned",
        description: "Add flights, ground transport, or travel notes.",
        actionLabel: "Add travel",
      },
      deliverables: {
        title: "No deliverables yet",
        description: "Track music, choreography, and other job deliverables.",
        actionLabel: "Add deliverable",
      },
    },
  },

  casting: {
    label: "Casting",
    workspaceItems: [
      item("breakdown", "Breakdown", FileText, "Define the casting, roles, requirements, and submission process."),
      item(
        "talent-search",
        "Find Talent",
        Search,
        "Search the network, invite dancers, and manage how candidates enter the casting.",
      ),
      item("review", "Review Submissions", Users, "Evaluate candidates and move them through the casting process."),
      item(
        "client-review",
        "Client Review",
        Link2,
        "Prepare shortlisted dancers and send a private link for client voting.",
      ),
      item("cast", "Cast", CheckCircle2, "Finalize selections, send offers, and confirm the cast."),
    ],
    quickActions: [
      { id: "create-role", label: "Create role", action: { kind: "casting" } },
      { id: "search-talent", label: "Find talent", action: { kind: "navigate", href: "workspace/talent-search" } },
      {
        id: "invite-talent",
        label: "Invite talent",
        action: { kind: "navigate", href: "workspace/talent-search?view=invitations" },
      },
      {
        id: "share-with-client",
        label: "Share with client",
        action: { kind: "navigate", href: "workspace/client-review" },
      },
      { id: "review-submissions", label: "Review submissions", action: { kind: "navigate", href: "workspace/review" } },
      { id: "finalize-cast", label: "Finalize cast", action: { kind: "navigate", href: "workspace/cast" } },
    ],
    emptyStates: {
      breakdown: {
        title: "No breakdown yet",
        description: "Define the casting details, roles, requirements, and submission process.",
        actionLabel: "Create breakdown",
        actionId: "casting",
      },
      "talent-search": {
        title: "No roles available for matching",
        description: "Add at least one role to search, invite, and source candidates.",
        actionLabel: "Add role",
        actionId: "casting",
      },
      "client-review": {
        title: "No shortlisted candidates",
        description: "Shortlist dancers in Review, then create a client presentation link here.",
        actionLabel: "Review candidates",
        actionId: "review-candidates",
      },
      review: {
        title: "No candidates to review",
        description: "Invite talent, publish the casting link, or add candidates from Find Talent.",
        actionLabel: "Find talent",
        actionId: "add-talent",
      },
      cast: {
        title: "No selections yet",
        description: "Move candidates forward from Review when you are ready to begin building the cast.",
        actionLabel: "Review candidates",
        actionId: "review-candidates",
      },
    },
  },

  audition: {
    label: "Audition",
    workspaceItems: [
      item("audition-details", "Audition Details", FileText),
      item("registration", "Registration", ClipboardList),
      item("check-in", "Check-In", UserCheck),
      item("groups", "Groups", Users),
      item("callbacks", "Callbacks", Target),
      item("selections", "Selections", CheckCircle2),
    ],
    quickActions: [
      { id: "open-registration", label: "Open registration", action: { kind: "placeholder" } },
      { id: "invite-talent", label: "Invite talent", action: { kind: "add-talent" } },
      { id: "generate-check-in", label: "Generate check-in link", action: { kind: "placeholder" } },
      { id: "create-group", label: "Create audition group", action: { kind: "placeholder" } },
      { id: "record-evaluation", label: "Record evaluation", action: { kind: "placeholder" } },
      { id: "move-callback", label: "Move to callback", action: { kind: "placeholder" } },
      { id: "select-talent", label: "Select talent", action: { kind: "add-talent" } },
      { id: "add-timeline-item", label: "Add activity", action: { kind: "timeline-item" } },
    ],
    emptyStates: {
      "audition-details": {
        title: "No audition details yet",
        description: "Add location, timing, and evaluation criteria.",
        actionLabel: "Add details",
      },
      registration: {
        title: "Registration is closed",
        description: "Open registration so talent can sign up for this audition.",
        actionLabel: "Open registration",
      },
      "check-in": {
        title: "No check-ins yet",
        description: "Generate a check-in link for the audition day.",
        actionLabel: "Generate check-in link",
      },
      groups: {
        title: "No groups yet",
        description: "Organize talent into audition groups or rooms.",
        actionLabel: "Create audition group",
      },
      callbacks: {
        title: "No callbacks yet",
        description: "Move talent to callbacks after the first round.",
        actionLabel: "Move to callback",
      },
      selections: {
        title: "No selections yet",
        description: "Select talent after evaluations are complete.",
        actionLabel: "Select talent",
        actionId: "add-talent",
      },
    },
  },

  campaign: {
    label: "Campaign",
    workspaceItems: [
      item("brief", "Brief", FileText),
      item("workstreams", "Workstreams", FolderKanban),
      item("castings", "Castings", Clapperboard),
      item("events", "Events", Calendar),
      item("deliverables", "Deliverables", Package),
      item("approvals", "Approvals", CheckSquare),
    ],
    quickActions: [
      { id: "add-workstream", label: "Add workstream", action: { kind: "placeholder" } },
      { id: "create-casting", label: "Create casting", action: { kind: "casting" } },
      { id: "create-activation", label: "Create activation", action: { kind: "placeholder" } },
      { id: "create-event", label: "Create event", action: { kind: "timeline-item" } },
      { id: "add-deliverable", label: "Add deliverable", action: { kind: "placeholder" } },
      { id: "request-approval", label: "Request approval", action: { kind: "placeholder" } },
      { id: "add-timeline-item", label: "Add activity", action: { kind: "timeline-item" } },
    ],
    emptyStates: {
      brief: {
        title: "No brief yet",
        description: "Capture campaign goals, audience, and creative direction.",
        actionLabel: "Add brief",
      },
      workstreams: {
        title: "No workstreams yet",
        description: "Break the campaign into connected workstreams.",
        actionLabel: "Add workstream",
      },
      castings: {
        title: "No castings linked",
        description: "Create or link castings that belong to this campaign.",
        actionLabel: "Create casting",
        actionId: "casting",
      },
      events: {
        title: "No events yet",
        description: "Add activations or events connected to this campaign.",
        actionLabel: "Create event",
        actionId: "timeline-item",
      },
      deliverables: {
        title: "No deliverables yet",
        description: "Track assets and deliverables across the campaign.",
        actionLabel: "Add deliverable",
      },
      approvals: {
        title: "No approvals yet",
        description: "Request review when deliverables are ready.",
        actionLabel: "Request approval",
      },
    },
  },

  tour: {
    label: "Tour",
    workspaceItems: [
      item("tour-dates", "Tour Dates", CalendarDays),
      item("cities", "Cities", MapPin),
      item("rehearsals", "Rehearsals", Users),
      item("travel", "Travel", Plane),
      item("accommodations", "Accommodations", Hotel),
      item("show-documents", "Show Documents", FileStack),
    ],
    quickActions: [
      { id: "add-tour-date", label: "Add tour date", action: { kind: "timeline-item" } },
      { id: "add-city", label: "Add city", action: { kind: "placeholder" } },
      { id: "schedule-rehearsal", label: "Schedule rehearsal", action: { kind: "timeline-item" } },
      { id: "add-travel", label: "Add travel", action: { kind: "placeholder" } },
      { id: "add-hotel", label: "Add hotel", action: { kind: "placeholder" } },
      { id: "upload-show-doc", label: "Upload show document", action: { kind: "navigate", href: "files" } },
      { id: "add-timeline-item", label: "Add activity", action: { kind: "timeline-item" } },
    ],
    emptyStates: {
      "tour-dates": {
        title: "No tour dates yet",
        description: "Add performance dates to build the tour calendar.",
        actionLabel: "Add tour date",
        actionId: "timeline-item",
      },
      cities: {
        title: "No cities yet",
        description: "Add cities and venues for this tour.",
        actionLabel: "Add city",
      },
      rehearsals: {
        title: "No rehearsals scheduled",
        description: "Schedule rehearsals around tour dates.",
        actionLabel: "Schedule rehearsal",
        actionId: "timeline-item",
      },
      travel: {
        title: "No travel planned",
        description: "Coordinate travel between cities.",
        actionLabel: "Add travel",
      },
      accommodations: {
        title: "No accommodations yet",
        description: "Add hotels and lodging for the tour party.",
        actionLabel: "Add hotel",
      },
      "show-documents": {
        title: "No show documents yet",
        description: "Upload run of show, stage plots, call sheets, and venue notes.",
        actionLabel: "Upload show document",
        actionId: "navigate-files",
      },
    },
  },

  production: {
    label: "Production",
    workspaceItems: [
      item("production-schedule", "Production Schedule", CalendarDays),
      item("scenes", "Scenes", LayoutGrid),
      item("departments", "Departments", Briefcase),
      item("call-sheets", "Call Sheets", ClipboardList),
      item("wardrobe", "Wardrobe", Shirt),
      item("deliverables", "Deliverables", Package),
    ],
    quickActions: [
      { id: "add-production-day", label: "Add production day", action: { kind: "timeline-item" } },
      { id: "add-scene", label: "Add scene", action: { kind: "placeholder" } },
      { id: "add-department", label: "Add department", action: { kind: "placeholder" } },
      { id: "create-call-sheet", label: "Create call sheet", action: { kind: "placeholder" } },
      { id: "schedule-fitting", label: "Schedule fitting", action: { kind: "timeline-item" } },
      { id: "add-deliverable", label: "Add deliverable", action: { kind: "placeholder" } },
      { id: "add-timeline-item", label: "Add activity", action: { kind: "timeline-item" } },
    ],
    emptyStates: {
      "production-schedule": {
        title: "No production schedule yet",
        description: "Add shoot days and key production milestones.",
        actionLabel: "Add production day",
        actionId: "timeline-item",
      },
      scenes: {
        title: "No scenes yet",
        description: "Break the production into scenes or segments.",
        actionLabel: "Add scene",
      },
      departments: {
        title: "No departments yet",
        description: "Organize crew and department contacts.",
        actionLabel: "Add department",
      },
      "call-sheets": {
        title: "No call sheets yet",
        description: "Create call sheets for production days.",
        actionLabel: "Create call sheet",
      },
      wardrobe: {
        title: "No wardrobe items yet",
        description: "Track fittings and wardrobe needs.",
        actionLabel: "Schedule fitting",
        actionId: "timeline-item",
      },
      deliverables: {
        title: "No deliverables yet",
        description: "Track cuts, assets, and delivery deadlines.",
        actionLabel: "Add deliverable",
      },
    },
  },

  event: {
    label: "Event",
    workspaceItems: [
      item("event-details", "Event Details", FileText),
      item("run-of-show", "Run of Show", ListChecks),
      item("venue", "Venue", Building2),
      item("guests", "Guests", Users),
      item("check-in", "Check-In", UserCheck),
      item("staffing", "Staffing", Briefcase),
    ],
    quickActions: [
      { id: "add-schedule-item", label: "Add schedule item", action: { kind: "timeline-item" } },
      { id: "build-run-of-show", label: "Build run of show", action: { kind: "placeholder" } },
      { id: "add-venue", label: "Add venue details", action: { kind: "placeholder" } },
      { id: "invite-guest", label: "Invite guest", action: { kind: "add-talent" } },
      { id: "create-check-in", label: "Create check-in link", action: { kind: "placeholder" } },
      { id: "assign-talent", label: "Assign talent or staff", action: { kind: "add-talent" } },
      { id: "add-timeline-item", label: "Add activity", action: { kind: "timeline-item" } },
    ],
    emptyStates: {
      "event-details": {
        title: "No event details yet",
        description: "Capture the concept, timing, and goals for this event.",
        actionLabel: "Add details",
      },
      "run-of-show": {
        title: "No run of show yet",
        description: "Build the minute-by-minute event timeline.",
        actionLabel: "Build run of show",
      },
      venue: {
        title: "No venue details yet",
        description: "Add location, load-in, and venue contacts.",
        actionLabel: "Add venue details",
      },
      guests: {
        title: "No guests yet",
        description: "Invite guests or manage the guest list.",
        actionLabel: "Invite guest",
        actionId: "add-talent",
      },
      "check-in": {
        title: "No check-in yet",
        description: "Create a check-in link for arrivals.",
        actionLabel: "Create check-in link",
      },
      staffing: {
        title: "No staffing assigned",
        description: "Assign talent and staff roles for the event.",
        actionLabel: "Assign talent or staff",
        actionId: "add-talent",
      },
    },
  },

  talent_submission: {
    label: "Talent Submission",
    workspaceItems: [
      item("breakdown", "Breakdown", FileText),
      item("roles", "Roles", Rows3),
      item("recommendations", "Recommendations", Sparkles),
      item("submission-package", "Submission Package", Package),
      item("client-review", "Client Review", Presentation),
      item("decisions", "Decisions", CheckCircle2),
    ],
    quickActions: [
      { id: "import-breakdown", label: "Import breakdown", action: { kind: "placeholder" } },
      { id: "add-role", label: "Add role", action: { kind: "casting" } },
      { id: "recommend-talent", label: "Recommend roster talent", action: { kind: "add-talent" } },
      { id: "build-package", label: "Build submission package", action: { kind: "placeholder" } },
      { id: "generate-client-link", label: "Generate client link", action: { kind: "placeholder" } },
      { id: "record-decision", label: "Record client decision", action: { kind: "placeholder" } },
      { id: "add-timeline-item", label: "Add activity", action: { kind: "timeline-item" } },
    ],
    emptyStates: {
      breakdown: {
        title: "No breakdown yet",
        description: "Import or enter the opportunity breakdown.",
        actionLabel: "Import breakdown",
      },
      roles: {
        title: "No roles yet",
        description: "Add roles from the breakdown to organize recommendations.",
        actionLabel: "Add role",
        actionId: "casting",
      },
      recommendations: {
        title: "No recommendations yet",
        description: "Use the breakdown to identify roster talent who may be a strong fit.",
        actionLabel: "Recommend talent",
        actionId: "add-talent",
      },
      "submission-package": {
        title: "No submission package yet",
        description: "Package recommended talent for client review.",
        actionLabel: "Build submission package",
      },
      "client-review": {
        title: "Client review not ready",
        description: "Generate a private link when the package is ready.",
        actionLabel: "Generate client link",
      },
      decisions: {
        title: "No decisions yet",
        description: "Record client decisions as feedback comes in.",
        actionLabel: "Record client decision",
      },
    },
  },

  client_presentation: {
    label: "Client Presentation",
    workspaceItems: [
      item("presentation", "Presentation", Presentation),
      item("sections", "Sections", Rows3),
      item("share-link", "Share Link", Link2),
      item("client-feedback", "Client Feedback", MessageSquareQuote),
      item("analytics", "Analytics", BarChart3),
    ],
    quickActions: [
      { id: "add-talent", label: "Add talent", action: { kind: "add-talent" } },
      { id: "create-section", label: "Create section", action: { kind: "placeholder" } },
      { id: "add-file", label: "Add file", action: { kind: "navigate", href: "files" } },
      { id: "reorder", label: "Reorder presentation", action: { kind: "placeholder" } },
      { id: "customize", label: "Customize presentation", action: { kind: "placeholder" } },
      { id: "generate-share-link", label: "Generate share link", action: { kind: "placeholder" } },
      { id: "preview-client", label: "Preview as client", action: { kind: "placeholder" } },
      { id: "add-timeline-item", label: "Add activity", action: { kind: "timeline-item" } },
    ],
    emptyStates: {
      presentation: {
        title: "No presentation yet",
        description: "Build a curated presentation of talent for your client to review.",
        actionLabel: "Create presentation",
        actionId: "add-talent",
      },
      sections: {
        title: "No sections yet",
        description: "Organize talent into presentation sections.",
        actionLabel: "Create section",
      },
      "share-link": {
        title: "No share link yet",
        description: "Generate a private link for client review.",
        actionLabel: "Generate share link",
      },
      "client-feedback": {
        title: "No client feedback yet",
        description: "Feedback will appear here once the client reviews the presentation.",
        actionLabel: "Preview as client",
      },
      analytics: {
        title: "No analytics yet",
        description: "Views and engagement will appear after you share the presentation.",
        actionLabel: "Generate share link",
      },
    },
  },

  class_program: {
    label: "Class Program",
    workspaceItems: [
      item("classes", "Classes", GraduationCap),
      item("calendar", "Calendar", Calendar),
      item("instructors", "Instructors", Users),
      item("enrollment", "Enrollment", ClipboardList),
      item("attendance", "Attendance", UserCheck),
      item("payments", "Payments", Wallet),
    ],
    quickActions: [
      { id: "create-class", label: "Create class", action: { kind: "timeline-item" } },
      { id: "add-instructor", label: "Add instructor", action: { kind: "placeholder" } },
      { id: "open-enrollment", label: "Open enrollment", action: { kind: "placeholder" } },
      { id: "register-participant", label: "Register participant", action: { kind: "add-talent" } },
      { id: "take-attendance", label: "Take attendance", action: { kind: "placeholder" } },
      { id: "record-payment", label: "Record payment", action: { kind: "placeholder" } },
      { id: "add-timeline-item", label: "Add activity", action: { kind: "timeline-item" } },
    ],
    emptyStates: {
      classes: {
        title: "No classes yet",
        description: "Create classes to build this program schedule.",
        actionLabel: "Create class",
        actionId: "timeline-item",
      },
      calendar: {
        title: "Calendar is empty",
        description: "Classes and sessions will appear on the program calendar.",
        actionLabel: "Create class",
        actionId: "timeline-item",
      },
      instructors: {
        title: "No instructors yet",
        description: "Add instructors for this class program.",
        actionLabel: "Add instructor",
      },
      enrollment: {
        title: "No enrollment yet",
        description: "Open enrollment or register participants.",
        actionLabel: "Open enrollment",
      },
      attendance: {
        title: "No attendance records",
        description: "Take attendance once classes begin.",
        actionLabel: "Take attendance",
      },
      payments: {
        title: "No payments recorded",
        description: "Track tuition and class payments here.",
        actionLabel: "Record payment",
      },
    },
  },

  training_program: {
    label: "Training Program",
    workspaceItems: [
      item("curriculum", "Curriculum", ListChecks),
      item("schedule", "Schedule", CalendarDays),
      item("participants", "Participants", Users),
      item("instructors", "Instructors", GraduationCap),
      item("attendance", "Attendance", UserCheck),
      item("evaluations", "Evaluations", ClipboardList),
    ],
    quickActions: [
      { id: "add-curriculum", label: "Add curriculum item", action: { kind: "placeholder" } },
      { id: "schedule-session", label: "Schedule session", action: { kind: "timeline-item" } },
      { id: "add-participant", label: "Add participant", action: { kind: "add-talent" } },
      { id: "add-instructor", label: "Add instructor", action: { kind: "placeholder" } },
      { id: "take-attendance", label: "Take attendance", action: { kind: "placeholder" } },
      { id: "record-evaluation", label: "Record evaluation", action: { kind: "placeholder" } },
      { id: "add-timeline-item", label: "Add activity", action: { kind: "timeline-item" } },
    ],
    emptyStates: {
      curriculum: {
        title: "No curriculum yet",
        description: "Outline sessions, modules, and learning goals.",
        actionLabel: "Add curriculum item",
      },
      schedule: {
        title: "No schedule yet",
        description: "Schedule intensive sessions for this program.",
        actionLabel: "Schedule session",
        actionId: "timeline-item",
      },
      participants: {
        title: "No participants yet",
        description: "Add talent participating in this training program.",
        actionLabel: "Add participant",
        actionId: "add-talent",
      },
      instructors: {
        title: "No instructors yet",
        description: "Add instructors or coaches for the program.",
        actionLabel: "Add instructor",
      },
      attendance: {
        title: "No attendance records",
        description: "Track attendance across training sessions.",
        actionLabel: "Take attendance",
      },
      evaluations: {
        title: "No evaluations yet",
        description: "Record evaluations as the program progresses.",
        actionLabel: "Record evaluation",
      },
    },
  },

  internal_planning: {
    label: "Internal Planning",
    workspaceItems: [
      item("tasks", "Tasks", CheckSquare),
      item("notes", "Notes", StickyNote),
      item("milestones", "Milestones", Target),
      item("budget", "Budget", Wallet),
      item("references", "References", Link2),
    ],
    quickActions: [
      { id: "create-task", label: "Create task", action: { kind: "placeholder" } },
      { id: "add-note", label: "Add note", action: { kind: "placeholder" } },
      { id: "add-milestone", label: "Add milestone", action: { kind: "timeline-item" } },
      { id: "add-budget-item", label: "Add budget item", action: { kind: "placeholder" } },
      { id: "save-reference", label: "Save reference", action: { kind: "placeholder" } },
      { id: "add-timeline-item", label: "Add activity", action: { kind: "timeline-item" } },
    ],
    emptyStates: {
      tasks: {
        title: "No tasks yet",
        description: "Break early planning into actionable tasks.",
        actionLabel: "Create task",
      },
      notes: {
        title: "No notes yet",
        description: "Capture ideas and planning notes.",
        actionLabel: "Add note",
      },
      milestones: {
        title: "No milestones yet",
        description: "Mark key planning milestones on the timeline.",
        actionLabel: "Add milestone",
        actionId: "timeline-item",
      },
      budget: {
        title: "No budget items yet",
        description: "Track estimated costs for this plan.",
        actionLabel: "Add budget item",
      },
      references: {
        title: "No references yet",
        description: "Save links, inspiration, profiles, and external sources.",
        actionLabel: "Save reference",
      },
    },
  },
};

export function getProjectWorkspaceConfig(rawType: string | null | undefined): ProjectWorkspaceConfig {
  return PROJECT_WORKSPACE_CONFIG[getNormalizedProjectType(rawType)];
}
