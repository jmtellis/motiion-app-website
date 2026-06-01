import { AppTabNav } from "@/components/app/AppTabNav";
import { AppHeader } from "@/components/layout/AppHeader";
import { fetchInboxConversations } from "@/lib/app/inbox";
import type { DashboardProfile } from "@/types/database";

export async function AppShell({
  profile,
  children,
}: {
  profile: DashboardProfile;
  children: React.ReactNode;
}) {
  const { conversations } = await fetchInboxConversations();
  const inboxUnread = conversations.reduce((sum, row) => sum + Number(row.unread_count ?? 0), 0);

  return (
    <div className="min-h-screen bg-[var(--paper)]">
      <AppHeader profile={profile} homeHref="/home" />
      <AppTabNav inboxUnread={inboxUnread} />
      <main className="mx-auto w-full max-w-6xl px-6 py-8 lg:px-10 lg:py-10">{children}</main>
    </div>
  );
}
