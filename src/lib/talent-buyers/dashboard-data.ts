/** Default landing route for industry professionals after auth. */
export const BUYER_HOME_PATH = "/projects";

/** Ops summary surface (activity feed, metrics). */
export const BUYER_DASHBOARD_PATH = "/dashboard";

export const buyerHomeNavItems = [
  { href: BUYER_DASHBOARD_PATH, label: "Dashboard", segment: "dashboard" },
] as const;

export const buyerWorkspaceNavItems = [
  { href: "/projects", label: "Projects", segment: "projects" },
  { href: "/talent", label: "Talent", segment: "talent" },
  { href: "/messages", label: "Inbox", segment: "messages" },
  { href: "/calendar", label: "Calendar", segment: "calendar" },
  { href: "/library", label: "Library", segment: "library" },
] as const;

export const buyerSettingsNavItem = {
  href: "/dashboard/settings",
  label: "Settings",
  segment: "settings",
} as const;

/** @deprecated Prefer buyerHomeNavItems + buyerWorkspaceNavItems */
export const buyerNavItems = [
  ...buyerWorkspaceNavItems,
  buyerHomeNavItems[0],
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
