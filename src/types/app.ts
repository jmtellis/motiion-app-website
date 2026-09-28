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
  last_message_sender_id: string | null;
  unread_count: number;
  muted: boolean;
};

export type MessageRequest = {
  id: string;
  sender_id: string;
  sender_name: string;
  sender_avatar_url: string | null;
  context_type: string | null;
  context_id: string | null;
  context_title: string | null;
  initial_message: string;
  status: string;
  created_at: string;
};

export type ConversationParticipant = {
  user_id: string;
  display_name: string;
  role: string | null;
  avatar_url: string | null;
  joined_at: string;
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

export type MatchedOpportunity = {
  id: string;
  kind: string;
  title: string;
  subtitle: string;
  location: string | null;
  score: number;
  href: string;
};
