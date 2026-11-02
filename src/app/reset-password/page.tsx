import Link from "next/link";
import { CenteredAuthShell } from "@/components/auth/CenteredAuthShell";
import { PasswordRecoveryForm } from "@/components/auth/PasswordRecoveryForm";
import { createServerSupabaseClient } from "@/lib/supabase/server";
export default async function ResetPasswordPage() {
  const db = await createServerSupabaseClient();
  const { data } = db ? await db.auth.getUser() : { data: { user: null } };
  return <CenteredAuthShell showAlternateAuth={false} mode="login" title={data.user ? "Choose a new password" : "Request a new reset link"} subtitle={data.user ? "Use at least 8 characters. Your new password will work across Motiion." : "Your reset session is missing or expired. Open the newest email link or request another."}>
    {data.user ? <PasswordRecoveryForm reset /> : <Link className="signup-split-submit" href="/forgot-password">Send a new reset link</Link>}
  </CenteredAuthShell>;
}
