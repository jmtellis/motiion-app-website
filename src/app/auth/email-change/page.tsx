import Link from "next/link";
import { CenteredAuthShell } from "@/components/auth/CenteredAuthShell";
import { getCurrentUserProfile, getProfileDestination } from "@/lib/auth/session";
import { getActiveShell } from "@/lib/auth/profile";
import { EMAIL_CHANGE_INSTRUCTIONS, emailChangeStatus } from "@/lib/auth/email-change";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function EmailChangePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const db = await createServerSupabaseClient();
  const user = db ? (await db.auth.getUser()).data.user : null;
  const status = emailChangeStatus(user);
  const profile = user ? await getCurrentUserProfile() : null;
  const settingsPath = getActiveShell(profile) === "lookingForTalent" ? "/dashboard/settings" : "/settings";
  let mirrorFailed = false;
  // Never copy a requested address into application records. The provider's
  // current confirmed address is the only authority, including on link replay.
  if (db && user && profile && status.verified && !status.pendingEmail) {
    const { error: updateError } = await db.from("profiles").update({ email: status.currentEmail }).eq("user_id", user.id);
    mirrorFailed = Boolean(updateError);
  }
  return <CenteredAuthShell showAlternateAuth={false} mode="login" title={status.pendingEmail ? "Confirm both email addresses" : "Your sign-in email"} subtitle={status.pendingEmail || !user ? EMAIL_CHANGE_INSTRUCTIONS : "Your account uses the verified address shown below."}>
    <div className="signup-split-form__body flex flex-col gap-4">
      {status.currentEmail && <p className="signup-split-hint">Current sign-in email: <strong className="break-all">{status.currentEmail}</strong></p>}
      {status.pendingEmail && <p className="signup-split-hint">Waiting for confirmation: <strong className="break-all">{status.pendingEmail}</strong></p>}
      {error && <p role="alert" className="signup-split-error">This link could not finish the change. Use the newest links from both inboxes. If you have already confirmed them, log in with your new address.</p>}
      {mirrorFailed && <p role="alert" className="signup-split-error">Your sign-in address is verified, but profile details could not refresh. Check status again to retry.</p>}
      <form action="/auth/email-change" method="get"><button className="signup-split-submit" type="submit">Check status again</button></form>
      {profile ? <><Link href={settingsPath} className="signup-split-text-btn text-center">Manage sign-in email</Link><Link href={getProfileDestination(profile)} className="signup-split-text-btn text-center">Continue to your account</Link></> : <Link href="/login" className="signup-split-text-btn text-center">Log in to check your address</Link>}
    </div>
  </CenteredAuthShell>;
}
