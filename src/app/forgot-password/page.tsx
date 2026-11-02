import { CenteredAuthShell } from "@/components/auth/CenteredAuthShell";
import { PasswordRecoveryForm } from "@/components/auth/PasswordRecoveryForm";
export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return <CenteredAuthShell showAlternateAuth={false} mode="login" title="Reset your password" subtitle={error ? "That reset link is incomplete, expired, or already used. Request a new one below." : "We’ll email you a link to choose a new password."}><PasswordRecoveryForm /></CenteredAuthShell>;
}
