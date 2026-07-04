export type PublicShortlistVote = "yes" | "no";

export type PublicShortlistShare = {
  id: string;
  title: string;
  message: string | null;
  roleTitle: string;
  projectTitle: string;
};

export type PublicShortlistRecipient = {
  id: string;
  displayName: string;
};

export type PublicShortlistProfileVisual = {
  id: string;
  kind: string;
  url: string;
  ref?: string | null;
  sort?: number;
};

export type PublicShortlistExperience = {
  title: string;
  role?: string | null;
  credits?: string | null;
  category?: string | null;
  imageUrl?: string | null;
  startDate?: string | null;
  endDate?: string | null;
};

export type PublicShortlistSubmission = {
  id: string;
  talentId: string | null;
  displayName: string;
  headshotUrl: string | null;
  headshotUrls: string[] | null;
  representation: string | null;
  gender: string | null;
  location: string | null;
  bio: string | null;
  skills: string[];
  dateOfBirth: string | null;
  height: string | null;
  ethnicity: string | null;
  profileVisuals: PublicShortlistProfileVisual[] | null;
  experiences: PublicShortlistExperience[] | null;
};

export type PublicShortlistPayload = {
  share: PublicShortlistShare;
  recipients: PublicShortlistRecipient[];
  submissions: PublicShortlistSubmission[];
};

export type PublicShortlistVoteInput = {
  submissionId: string;
  vote: PublicShortlistVote;
};
