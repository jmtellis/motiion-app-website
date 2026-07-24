/** Default landing route for industry professionals after auth. */
export const BUYER_HOME_PATH = "/projects";

/** Legacy dashboard path — redirects to home; settings still live under `/dashboard/settings`. */
export const BUYER_DASHBOARD_PATH = "/dashboard";

/** Primary workflow items. */
export const buyerMenuNavItems = [
  { href: "/talent", label: "Find Talent", segment: "talent" },
  { href: "/projects", label: "Projects", segment: "projects" },
  { href: "/events", label: "Events", segment: "events" },
  { href: "/library", label: "Roster", segment: "library" },
] as const;

export const buyerWorkspaceNavItems = [
  { href: "/talent", label: "Find Talent", segment: "talent" },
  { href: "/projects", label: "Projects", segment: "projects" },
  { href: "/messages", label: "Inbox", segment: "messages" },
  { href: "/events", label: "Events", segment: "events" },
  { href: "/library", label: "Roster", segment: "library" },
] as const;

export const buyerInboxNavItem = {
  href: "/messages",
  label: "Inbox",
  segment: "messages",
} as const;

export const buyerNotificationsNavItem = {
  href: "/notifications",
  label: "Notifications",
  segment: "notifications",
} as const;

export const buyerSettingsNavItem = {
  href: "/dashboard/settings",
  label: "Settings",
  segment: "settings",
} as const;

/** @deprecated Prefer buyerMenuNavItems + buyerWorkspaceNavItems */
export const buyerNavItems = [
  ...buyerWorkspaceNavItems,
  buyerSettingsNavItem,
] as const;

export function formatBuyerRelativeDate(value: string) {
  const date = new Date(value);
  const now = Date.now();
  const diffMs = date.getTime() - now;
  const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays === -1) return "Yesterday";
  if (diffDays > 1 && diffDays < 7) return `In ${diffDays} days`;
  if (diffDays < -1 && diffDays > -7) return `${Math.abs(diffDays)} days ago`;

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== new Date(now).getFullYear() ? "numeric" : undefined,
  });
}

export function formatBuyerDateTime(value: string) {
  const date = new Date(value);
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function labelFromSnake(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
