import { AccountSessionBoundary } from "@/components/auth/AccountSessionBoundary";
import { requireAuth } from "@/lib/auth/session";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireAuth();
  return <AccountSessionBoundary userId={profile.id}>{children}</AccountSessionBoundary>;
}
