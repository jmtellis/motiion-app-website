import type { User } from "@supabase/supabase-js";

export const EMAIL_CHANGE_INSTRUCTIONS = "Confirm the links sent to both your current and new email addresses. Your current sign-in email stays active until both confirmations are complete.";

/** Only the authenticated provider response establishes an address or pending change. */
export function emailChangeStatus(user: Pick<User, "email" | "new_email" | "email_confirmed_at"> | null) {
  const currentEmail = user?.email?.trim() || null;
  const requestedEmail = user?.new_email?.trim() || null;
  const pendingEmail = requestedEmail && requestedEmail.toLowerCase() !== currentEmail?.toLowerCase() ? requestedEmail : null;
  return { currentEmail, pendingEmail, verified: Boolean(user?.email_confirmed_at && currentEmail) };
}

export function emailChangeFailurePath(code?: string) {
  return `/auth/email-change${code ? `?error=${encodeURIComponent(code)}` : ""}`;
}
