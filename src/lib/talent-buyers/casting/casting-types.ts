/** Normalized casting pipeline types for buyer workspace workflows. */

export type CastingCandidateStatus =
  | "discovered"
  | "invited"
  | "submitted"
  | "in_review"
  | "shortlisted"
  | "callback"
  | "selected"
  | "availability_requested"
  | "offer_sent"
  | "accepted"
  | "confirmed"
  | "alternate"
  | "not_moving_forward"
  | "withdrawn"
  | "declined"
  | "released";

export type CastingCandidateSource =
  | "talent_search"
  | "invitation"
  | "referral"
  | "public_submission"
  | "manual"
  | "external_platform"
  | "walk_in";

export type CastingProjectStatus = "draft" | "published" | "paused" | "closed" | "archived";

export type CastingVisibility = "private" | "invitation_only" | "public";

export type CastingRoleStatus = "draft" | "published" | "paused" | "filled" | "closed";

export type CastingInvitationStatus =
  | "draft"
  | "sent"
  | "viewed"
  | "started"
  | "submitted"
  | "declined"
  | "expired"
  | "withdrawn";

export type CastingRecommendation = "yes" | "maybe" | "no";

export type CastingWorkspaceTabId =
  | "breakdown"
  | "talent-search"
  | "review"
  | "client-review"
  | "cast";

export type OutreachView = "invitations" | "casting-link" | "external";

export type FindTalentView = "search" | OutreachView;

export type ReviewViewMode = "cards" | "focus";

export type ReviewStageFilter =
  | "all"
  | "new"
  | "in_review"
  | "shortlisted"
  | "callback"
  | "selected"
  | "not_moving_forward";

export interface DateRange {
  start?: string;
  end?: string;
}

export interface CastingProject {
  id: string;
  projectId: string;
  title: string;
  clientName?: string;
  companyName?: string;
  description?: string;
  productionType?: string;
  unionStatus?: string;
  compensationSummary?: string;
  usageTerms?: string;
  locationType?: "in_person" | "remote" | "hybrid";
  location?: string;
  workDates?: DateRange[];
  rehearsalDates?: DateRange[];
  fittingDates?: DateRange[];
  auditionDates?: DateRange[];
  callbackDates?: DateRange[];
  submissionDeadline?: string;
  status: CastingProjectStatus;
  visibility: CastingVisibility;
  confidentialityLevel?: string;
  allowExternalCandidates: boolean;
  allowMultipleRoleSubmissions: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  configuration?: Record<string, unknown>;
}

export interface CastingRole {
  id: string;
  castingProjectId: string;
  bridgedRoleId?: string;
  /** All bridged `roles` ids that share this title (handles leftover duplicates). */
  bridgedRoleIds?: string[];
  name: string;
  description?: string;
  quantityNeeded: number;
  status: CastingRoleStatus;
  priority?: "low" | "medium" | "high";
  danceStyles?: string[];
  skillLevel?: string[];
  ageRange?: { min?: number; max?: number };
  genderPresentation?: string[];
  heightRange?: { min?: number; max?: number; unit?: string };
  locationRequirements?: string[];
  representationPreference?: string;
  unionRequirement?: string;
  specialSkills?: string[];
  ethnicityPreferences?: string[];
  gender?: string;
  heightMinDisplay?: string;
  heightMaxDisplay?: string;
  requiredMedia?: string[];
  requiredAvailability?: string[];
  compensationOverride?: string;
  internalNotes?: string;
  order: number;
  candidateCount?: number;
  shortlistCount?: number;
  selectedCount?: number;
  confirmedCount?: number;
  /** Bridged `roles.is_casting_finalized` — Final Selects locked for this role. */
  isCastingFinalized?: boolean;
  /** Bridged `roles.is_active` — accepts submissions when true. */
  isActive?: boolean;
}

export interface CastingCandidate {
  id: string;
  castingProjectId: string;
  talentProfileId?: string;
  externalCandidateId?: string;
  roleIds: string[];
  source: CastingCandidateSource;
  status: CastingCandidateStatus;
  representationContactId?: string;
  availabilityStatus?: string;
  overallRecommendation?: CastingRecommendation;
  displayName: string;
  email?: string;
  agency?: string;
  headshotUrl?: string;
  resumeUrl?: string;
  talentSlug?: string;
  talentUserId?: string;
  submissionId?: string;
  invitationId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CastingSubmission {
  id: string;
  castingCandidateId: string;
  roleId: string;
  answers?: Record<string, unknown>;
  mediaIds?: string[];
  resumeFileId?: string;
  headshotFileIds?: string[];
  availabilityConfirmed?: boolean;
  submittedAt?: string;
  source?: string;
}

export interface CastingEvaluation {
  id: string;
  castingCandidateId: string;
  evaluatorId: string;
  roleId?: string;
  recommendation?: CastingRecommendation;
  scorecard?: Record<string, number | boolean | string>;
  privateNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CastingInvitation {
  id: string;
  castingCandidateId?: string;
  castingId: string;
  roleIds: string[];
  invitedProfileId: string;
  status: CastingInvitationStatus;
  message?: string;
  sentAt?: string;
  viewedAt?: string;
  expiresAt?: string;
  talentName: string;
  talentSlug?: string;
  talentUserId?: string;
  headshotUrl?: string;
}

export type CastingReferralStatus = "submitted" | "withdrawn";
export type CastingReferralSource = "authenticated" | "anonymous";

export interface CastingReferral {
  id: string;
  castingId: string;
  projectId: string;
  roleIds: string[];
  referredProfileId: string;
  referrerUserId?: string;
  referrerDisplayName?: string;
  referralTokenId?: string;
  source: CastingReferralSource;
  note?: string;
  status: CastingReferralStatus;
  createdAt: string;
  talentName: string;
  talentSlug?: string;
  talentUserId?: string;
  headshotUrl?: string;
  styles?: string[];
  location?: string;
}

export interface CastingExternalCandidate {
  id: string;
  castingId: string;
  fullName: string;
  email?: string;
  phone?: string;
  representation?: string;
  source: CastingCandidateSource;
  roleIds: string[];
  headshotUrl?: string;
  resumeUrl?: string;
  mediaUrl?: string;
  internalNotes?: string;
  linkedProfileId?: string;
  createdAt: string;
}

export interface CastingWorkflowData {
  primaryCasting: CastingProject | null;
  roles: CastingRole[];
  candidates: CastingCandidate[];
  invitations: CastingInvitation[];
  referrals: CastingReferral[];
  externalCandidates: CastingExternalCandidate[];
  evaluations: CastingEvaluation[];
}

export interface CastingProgressMetrics {
  invited: number;
  submitted: number;
  inReview: number;
  shortlisted: number;
  selected: number;
  confirmed: number;
}

export interface CastingAttentionItem {
  id: string;
  priority: "high" | "medium" | "low";
  message: string;
  href: string;
  actionLabel?: string;
}
