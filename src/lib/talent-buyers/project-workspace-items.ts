import type { ProjectCastingSummary } from "@/lib/talent-buyers/castings";
import type { ProjectActivitySummary } from "@/lib/talent-buyers/project-activities";

export type ProjectWorkspaceItemKind = "casting" | "class" | "session" | "event";

export type ProjectWorkspaceItem = {
  id: string;
  kind: ProjectWorkspaceItemKind;
  title: string;
  status: string;
  updatedAt: string;
  coverImageUrl: string | null;
  subtitle: string;
  href: string;
};

function castingHref(projectId: string, casting: ProjectCastingSummary) {
  if (casting.isLegacy) {
    return `/projects/${projectId}/edit`;
  }
  return `/projects/${projectId}/castings/${casting.id}/edit`;
}

function mapActivityKind(eventType: string): ProjectWorkspaceItemKind {
  if (eventType === "class" || eventType === "session" || eventType === "event") {
    return eventType;
  }
  return "event";
}

export function buildProjectWorkspaceItems(
  projectId: string,
  castings: ProjectCastingSummary[],
  activities: ProjectActivitySummary[],
): ProjectWorkspaceItem[] {
  const castingItems: ProjectWorkspaceItem[] = castings.map((casting) => ({
    id: casting.id,
    kind: "casting" as const,
    title: casting.title,
    status: casting.status,
    updatedAt: casting.updatedAt,
    coverImageUrl: null,
    subtitle: `${casting.roleCount} role${casting.roleCount === 1 ? "" : "s"}`,
    href: castingHref(projectId, casting),
  }));

  const activityItems: ProjectWorkspaceItem[] = activities.map((activity) => ({
    id: activity.id,
    kind: mapActivityKind(activity.eventType),
    title: activity.title,
    status: activity.status,
    updatedAt: activity.dateTime,
    coverImageUrl: activity.coverImageUrl ?? null,
    subtitle: `${activity.attendeeCount} attendee${activity.attendeeCount === 1 ? "" : "s"}`,
    href: `/calendar`,
  }));

  return [...castingItems, ...activityItems].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export function filterProjectConversations(
  conversations: import("@/types/app").InboxConversation[],
  projectTitle: string,
  workspaceItems: ProjectWorkspaceItem[],
  projectId?: string,
) {
  const titleNeedle = projectTitle.trim().toLowerCase();
  const activityTitles = new Set(workspaceItems.map((item) => item.title.trim().toLowerCase()).filter(Boolean));

  return conversations.filter((conversation) => {
    if (
      projectId &&
      conversation.context_type === "project" &&
      conversation.context_id === projectId
    ) {
      return true;
    }

    const contextTitle = conversation.context_title?.trim().toLowerCase() ?? "";
    if (!contextTitle) return false;
    if (titleNeedle && contextTitle.includes(titleNeedle)) return true;
    for (const activityTitle of activityTitles) {
      if (contextTitle.includes(activityTitle) || activityTitle.includes(contextTitle)) {
        return true;
      }
    }
    return false;
  });
}

export function conversationGroupChips(conversations: import("@/types/app").InboxConversation[]) {
  const titles = new Set<string>();
  for (const conversation of conversations) {
    const title = conversation.context_title?.trim();
    if (title) titles.add(title);
  }
  return Array.from(titles).sort((a, b) => a.localeCompare(b));
}
