import { getSupabaseConfig } from "@/lib/supabaseRest";
import type {
  PublicShortlistPayload,
  PublicShortlistVoteInput,
} from "@/types/publicShortlist";

export class PublicShortlistError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "PublicShortlistError";
    this.status = status;
  }
}

async function callShortlistFunction<T>(body: Record<string, unknown>): Promise<T> {
  const config = getSupabaseConfig();
  if (!config) {
    throw new PublicShortlistError("Shortlist review is not configured.", 500);
  }

  const response = await fetch(`${config.supabaseUrl}/functions/v1/shortlist-share-public`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: config.anon,
      Authorization: `Bearer ${config.anon}`,
    },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      typeof data === "object" && data && "error" in data && typeof data.error === "string"
        ? data.error
        : "Request failed.";
    throw new PublicShortlistError(message, response.status);
  }

  return data as T;
}

export async function fetchPublicShortlist(token: string): Promise<PublicShortlistPayload> {
  const trimmed = decodeURIComponent(token).trim();
  if (!trimmed) {
    throw new PublicShortlistError("Missing share token", 400);
  }

  return callShortlistFunction<PublicShortlistPayload>({ token: trimmed });
}

export async function submitShortlistVotes(args: {
  token: string;
  recipientId: string;
  votes: PublicShortlistVoteInput[];
}): Promise<{ success: boolean; submittedCount: number }> {
  const trimmed = decodeURIComponent(args.token).trim();
  return callShortlistFunction({
    action: "submit",
    token: trimmed,
    recipientId: args.recipientId,
    votes: args.votes,
  });
}
