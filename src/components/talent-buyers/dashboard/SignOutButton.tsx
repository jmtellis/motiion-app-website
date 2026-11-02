"use client";
import { useSignOut } from "@/hooks/use-sign-out";
import { safeAuthReturnPath } from "@/lib/auth/redirects";
export function SignOutButton({ className = "btn-outline text-sm", returnTo, label = "Sign out" }: { className?: string; returnTo?: string; label?: string }) {
  const destination = safeAuthReturnPath(returnTo);
  const { signOut, pending, error } = useSignOut(destination ? `/login?next=${encodeURIComponent(destination)}` : "/");
  return <div><button type="button" className={className} onClick={signOut} disabled={pending} aria-busy={pending}>{pending ? "Signing out…" : label}</button>
    {error ? <p className="text-sm text-[var(--ui-danger)]" role="alert">{error}</p> : null}
  </div>;
}
