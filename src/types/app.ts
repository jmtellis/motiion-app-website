export type HomePendingRequest = {
  id: string;
  request_kind: string;
  title: string;
  header_text: string;
  detail_text: string;
  cover_url: string | null;
  inviter_user_id: string;
  inviter_name: string;
  inviter_avatar_url: string | null;
  ref_activity_id: string | null;
  ref_role_id: string | null;
  ref_job_id: string | null;
  sort_key: string;
};

export type InboxConversation = {
  conversation_id: string;
  type: string;
  context_type: string | null;
  context_id: string | null;
  context_title: string | null;
  participant_user_id: string | null;
  participant_name: string;
  participant_role: string | null;
  participant_avatar_url: string | null;
  last_message_body: string | null;
  last_message_at: string | null;
  unread_count: number;
};

export type UpcomingActivity = {
  id: string;
  title: string;
  type: string | null;
  activity_date: string | null;
  start_time: string | null;
  cover_image_url: string | null;
  role: "attending" | "hosting";
};

export type HomeFeedData = {
  pendingRequests: HomePendingRequest[];
  upcomingActivities: UpcomingActivity[];
  matchedOpportunities: MatchedOpportunity[];
};

export type MatchedOpportunity = {
  id: string;
  kind: string;
  title: string;
  subtitle: string;
  location: string | null;
  score: number;
  href: string;
};
