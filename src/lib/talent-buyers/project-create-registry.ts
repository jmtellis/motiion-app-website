import type { ProjectType } from "@/lib/talent-buyers/project-types";
import { PROJECT_TYPES } from "@/lib/talent-buyers/project-types";

export type ProjectCreateLeftSection = "cover" | "dates" | "location" | "breakdown";
export type ProjectCreateRightSection = "title" | "description" | "company" | "attachments" | "highlights";

export type ProjectCreateHighlightField = {
  fieldKey: string;
  label: string;
  placeholder: string;
};

export type ProjectCreateConfig = {
  pageTitle: string;
  breadcrumbLabel: string;
  lede: string;
  publishLabel: string;
  draftLabel: string;
  titlePlaceholder: string;
  descriptionPlaceholder: string;
  companyPlaceholder: string;
  leftSections: ProjectCreateLeftSection[];
  rightSections: ProjectCreateRightSection[];
  highlights?: ProjectCreateHighlightField[];
};

const PROJECT_CREATE_REGISTRY: Record<ProjectType, ProjectCreateConfig> = {
  casting: {
    pageTitle: "Create Casting",
    breadcrumbLabel: "Create Casting",
    lede: "Define your casting, roles, and submission process.",
    publishLabel: "Publish Casting",
    draftLabel: "Save Draft",
    titlePlaceholder: "Nike Summer Campaign Casting",
    descriptionPlaceholder: "What is this casting for?",
    companyPlaceholder: "Production company",
    leftSections: ["cover", "breakdown", "dates", "location"],
    rightSections: [],
  },
  audition: {
    pageTitle: "Create Audition",
    breadcrumbLabel: "Create Audition",
    lede: "Set up registration, check-in, and evaluation for your audition.",
    publishLabel: "Create Audition",
    draftLabel: "Save Draft",
    titlePlaceholder: "Spring Open Audition",
    descriptionPlaceholder: "Describe the audition format and what dancers should prepare.",
    companyPlaceholder: "Presenting organization",
    leftSections: ["cover", "dates", "location"],
    rightSections: ["title", "description", "company", "highlights", "attachments"],
    highlights: [
      { fieldKey: "venue", label: "Venue", placeholder: "Studio or theater name" },
      { fieldKey: "auditionFormat", label: "Format", placeholder: "Open call, by appointment, video first…" },
    ],
  },
  talent_submission: {
    pageTitle: "Create Talent Submission",
    breadcrumbLabel: "Create Submission",
    lede: "Package roster talent for an external opportunity or client brief.",
    publishLabel: "Create Submission",
    draftLabel: "Save Draft",
    titlePlaceholder: "Agency Submission — Brand Campaign",
    descriptionPlaceholder: "Summarize the opportunity and submission requirements.",
    companyPlaceholder: "Client or brand",
    leftSections: ["cover", "dates", "location"],
    rightSections: ["title", "description", "company", "highlights", "attachments"],
    highlights: [
      { fieldKey: "clientContact", label: "Client contact", placeholder: "Name or team" },
      { fieldKey: "deadline", label: "Submission deadline", placeholder: "Date or timeframe" },
    ],
  },
  client_presentation: {
    pageTitle: "Create Client Presentation",
    breadcrumbLabel: "Create Presentation",
    lede: "Curate talent into a polished presentation for client review.",
    publishLabel: "Create Presentation",
    draftLabel: "Save Draft",
    titlePlaceholder: "Client Presentation — Tour Cast",
    descriptionPlaceholder: "What should the client know about this presentation?",
    companyPlaceholder: "Client name",
    leftSections: ["cover", "dates", "location"],
    rightSections: ["title", "description", "company", "highlights", "attachments"],
    highlights: [
      { fieldKey: "presentationGoal", label: "Goal", placeholder: "Shortlist approval, final cast, options…" },
    ],
  },
  job: {
    pageTitle: "Create Job",
    breadcrumbLabel: "Create Job",
    lede: "Coordinate booked talent, rehearsals, fittings, and deliverables.",
    publishLabel: "Create Job",
    draftLabel: "Save Draft",
    titlePlaceholder: "Tour Job — Principal Dancer",
    descriptionPlaceholder: "Describe the job scope and expectations.",
    companyPlaceholder: "Hiring company",
    leftSections: ["cover", "dates", "location"],
    rightSections: ["title", "description", "company", "attachments"],
  },
  tour: {
    pageTitle: "Create Tour",
    breadcrumbLabel: "Create Tour",
    lede: "Manage talent and production logistics across cities and dates.",
    publishLabel: "Create Tour",
    draftLabel: "Save Draft",
    titlePlaceholder: "North America Tour 2026",
    descriptionPlaceholder: "Outline the tour scope and key dates.",
    companyPlaceholder: "Production company",
    leftSections: ["cover", "dates", "location"],
    rightSections: ["title", "description", "company", "highlights", "attachments"],
    highlights: [
      { fieldKey: "cities", label: "Cities", placeholder: "Primary markets on the tour" },
    ],
  },
  production: {
    pageTitle: "Create Production",
    breadcrumbLabel: "Create Production",
    lede: "Coordinate talent and operations for a commercial, video, film, or live production.",
    publishLabel: "Create Production",
    draftLabel: "Save Draft",
    titlePlaceholder: "Music Video — Artist Name",
    descriptionPlaceholder: "What is this production about?",
    companyPlaceholder: "Production company",
    leftSections: ["cover", "dates", "location"],
    rightSections: ["title", "description", "company", "attachments"],
  },
  campaign: {
    pageTitle: "Create Campaign",
    breadcrumbLabel: "Create Campaign",
    lede: "Connect castings, events, deliverables, and approvals for a campaign.",
    publishLabel: "Create Campaign",
    draftLabel: "Save Draft",
    titlePlaceholder: "Brand Summer Campaign",
    descriptionPlaceholder: "Describe the campaign goals and deliverables.",
    companyPlaceholder: "Brand or agency",
    leftSections: ["cover", "dates", "location"],
    rightSections: ["title", "description", "company", "highlights", "attachments"],
    highlights: [
      { fieldKey: "campaignObjective", label: "Objective", placeholder: "Launch, awareness, conversion…" },
    ],
  },
  event: {
    pageTitle: "Create Event",
    breadcrumbLabel: "Create Event",
    lede: "Plan and operate an activation, launch, appearance, or live event.",
    publishLabel: "Create Event",
    draftLabel: "Save Draft",
    titlePlaceholder: "Product Launch Activation",
    descriptionPlaceholder: "Describe the event experience and audience.",
    companyPlaceholder: "Host organization",
    leftSections: ["cover", "dates", "location"],
    rightSections: ["title", "description", "company", "highlights", "attachments"],
    highlights: [
      { fieldKey: "venue", label: "Venue", placeholder: "Event location or venue name" },
      { fieldKey: "guestCapacity", label: "Guest capacity", placeholder: "Expected attendance" },
    ],
  },
  class_program: {
    pageTitle: "Create Class Program",
    breadcrumbLabel: "Create Class Program",
    lede: "Organize a schedule of classes, instructors, enrollment, and attendance.",
    publishLabel: "Create Program",
    draftLabel: "Save Draft",
    titlePlaceholder: "Summer Intensive Program",
    descriptionPlaceholder: "Describe the program structure and who it's for.",
    companyPlaceholder: "Studio or school",
    leftSections: ["cover", "dates", "location"],
    rightSections: ["title", "description", "company", "highlights", "attachments"],
    highlights: [
      { fieldKey: "instructor", label: "Lead instructor", placeholder: "Primary instructor name" },
      { fieldKey: "classFormat", label: "Format", placeholder: "Weekly series, intensive, drop-in…" },
    ],
  },
  training_program: {
    pageTitle: "Create Training Program",
    breadcrumbLabel: "Create Training Program",
    lede: "Manage an intensive, workshop series, bootcamp, or development program.",
    publishLabel: "Create Program",
    draftLabel: "Save Draft",
    titlePlaceholder: "Professional Development Bootcamp",
    descriptionPlaceholder: "Outline the training goals and curriculum focus.",
    companyPlaceholder: "Organization",
    leftSections: ["cover", "dates", "location"],
    rightSections: ["title", "description", "company", "highlights", "attachments"],
    highlights: [
      { fieldKey: "programLength", label: "Program length", placeholder: "Duration or number of sessions" },
    ],
  },
  internal_planning: {
    pageTitle: "Create Plan",
    breadcrumbLabel: "Create Plan",
    lede: "Organize tasks, notes, milestones, and early-stage ideas.",
    publishLabel: "Create Plan",
    draftLabel: "Save Draft",
    titlePlaceholder: "Q3 Creative Planning",
    descriptionPlaceholder: "What are you planning?",
    companyPlaceholder: "Team or department",
    leftSections: ["dates"],
    rightSections: ["title", "description", "attachments"],
  },
};

export function getProjectCreateConfig(projectType: ProjectType): ProjectCreateConfig {
  return PROJECT_CREATE_REGISTRY[projectType];
}

export function isTypedProjectCreateType(value: string): value is ProjectType {
  return (PROJECT_TYPES as string[]).includes(value) && value !== "casting";
}

export function projectCreatePath(projectType: ProjectType): string {
  return `/projects/new/${projectType}`;
}
