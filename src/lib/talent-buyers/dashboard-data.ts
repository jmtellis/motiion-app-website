import { portraitWallImages } from "@/lib/mock-data";

import type { BuyerDashboardData } from "@/types/talent-buyer-dashboard";

function portrait(index: number) {
  return portraitWallImages[index % portraitWallImages.length];
}

const now = Date.now();

function daysAgo(days: number) {
  return new Date(now - days * 24 * 60 * 60 * 1000).toISOString();
}

function daysFromNow(days: number, hour = 14) {
  const date = new Date(now + days * 24 * 60 * 60 * 1000);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
}

export const BUYER_DASHBOARD_PATH = "/dashboard";

export const buyerNavItems = [
  { href: "/dashboard", label: "Dashboard", segment: "dashboard" },
  { href: "/talent", label: "Talent", segment: "talent" },
  { href: "/projects", label: "Projects", segment: "projects" },
  { href: "/messages", label: "Inbox", segment: "messages" },
  { href: "/events", label: "Events", segment: "events" },
  { href: "/library", label: "Library", segment: "library" },
  { href: "/dashboard/settings", label: "Settings", segment: "settings" },
] as const;

export function getBuyerDashboardData(): BuyerDashboardData {
  const projects: BuyerDashboardData["projects"] = [
    {
      id: "proj-nike",
      title: "Nike Commercial",
      projectType: "casting",
      status: "active",
      lastUpdated: daysAgo(1),
      talentCount: 24,
      notesCount: 6,
      sharedLinksCount: 2,
    },
    {
      id: "proj-summer",
      title: "Summer Intensive",
      projectType: "event",
      status: "active",
      lastUpdated: daysAgo(3),
      talentCount: 18,
      notesCount: 4,
    },
    {
      id: "proj-tour",
      title: "Tour Roster",
      projectType: "tour",
      status: "shared",
      lastUpdated: daysAgo(5),
      talentCount: 32,
      sharedLinksCount: 1,
    },
    {
      id: "proj-shortlist",
      title: "Client Shortlist",
      projectType: "client_presentation",
      status: "active",
      lastUpdated: daysAgo(2),
      talentCount: 12,
      notesCount: 3,
      sharedLinksCount: 3,
    },
  ];

  const upcomingEvents: BuyerDashboardData["upcomingEvents"] = [
    {
      id: "evt-1",
      title: "Commercial Callback",
      eventType: "audition",
      dateTime: daysFromNow(2, 10),
      location: "Los Angeles, CA",
      status: "upcoming",
    },
    {
      id: "evt-2",
      title: "Summer Intensive Rehearsal",
      eventType: "session",
      dateTime: daysFromNow(5, 15),
      location: "New York, NY",
      status: "upcoming",
    },
    {
      id: "evt-3",
      title: "Agency Submission Review",
      eventType: "casting",
      dateTime: daysFromNow(8, 11),
      location: "Virtual",
      status: "upcoming",
    },
  ];

  const recentTalent: BuyerDashboardData["recentTalent"] = [
    {
      id: "tal-1",
      name: "Maya Chen",
      location: "Los Angeles, CA",
      styles: ["Commercial", "Hip Hop"],
      profileSlug: "maya-chen",
      avatarUrl: portrait(0),
    },
    {
      id: "tal-2",
      name: "Jordan Ellis",
      location: "New York, NY",
      styles: ["Contemporary", "Jazz"],
      profileSlug: "jordan-ellis",
      avatarUrl: portrait(1),
    },
    {
      id: "tal-3",
      name: "Sofia Reyes",
      location: "Atlanta, GA",
      styles: ["Latin", "Commercial"],
      profileSlug: "sofia-reyes",
      avatarUrl: portrait(2),
    },
    {
      id: "tal-4",
      name: "Ethan Park",
      location: "Chicago, IL",
      styles: ["Ballet", "Contemporary"],
      profileSlug: "ethan-park",
      avatarUrl: portrait(3),
    },
  ];

  return {
    continueWorking: projects.slice(0, 4),
    recentTalent,
    upcomingEvents,
    activityFeed: [
      {
        id: "act-1",
        type: "talent_added_to_roster",
        title: "Talent added to roster",
        description: "Maya Chen added to Tour Roster.",
        timestamp: daysAgo(0),
        href: "/projects/proj-tour",
      },
      {
        id: "act-2",
        type: "project_shared",
        title: "Project shared with client",
        description: "Client Shortlist shared with Nike team.",
        timestamp: daysAgo(1),
        href: "/projects/proj-shortlist",
      },
      {
        id: "act-3",
        type: "event_created",
        title: "Event created",
        description: "Commercial Callback scheduled for next week.",
        timestamp: daysAgo(2),
        href: "/events",
      },
      {
        id: "act-4",
        type: "talent_profile_updated",
        title: "Talent profile updated",
        description: "Jordan Ellis updated headshots and reel.",
        timestamp: daysAgo(3),
        href: "/talent/jordan-ellis",
      },
    ],
    projects,
    events: {
      upcoming: upcomingEvents,
      drafts: [
        {
          id: "evt-draft-1",
          title: "Winter Showcase Audition",
          eventType: "audition",
          dateTime: daysFromNow(14),
          location: "Dallas, TX",
          status: "draft",
        },
      ],
      past: [
        {
          id: "evt-past-1",
          title: "Brand Campaign Fitting",
          eventType: "session",
          dateTime: daysAgo(10),
          location: "Los Angeles, CA",
          status: "past",
        },
      ],
    },
    library: {
      rosters: [
        {
          id: "rost-1",
          name: "Tour Roster",
          talentCount: 32,
          lastUpdated: daysAgo(5),
          createdBy: "You",
        },
        {
          id: "rost-2",
          name: "Commercial Pool",
          talentCount: 18,
          lastUpdated: daysAgo(8),
          createdBy: "You",
        },
        {
          id: "rost-3",
          name: "Agency Favorites",
          talentCount: 45,
          lastUpdated: daysAgo(12),
          createdBy: "Alex Williamson",
        },
      ],
      savedTalent: recentTalent,
      sharedPresentations: [
        {
          id: "pres-1",
          title: "Nike Shortlist — Round 1",
          projectTitle: "Client Shortlist",
          sharedAt: daysAgo(2),
          viewCount: 12,
        },
        {
          id: "pres-2",
          title: "Tour Roster Preview",
          projectTitle: "Tour Roster",
          sharedAt: daysAgo(6),
          viewCount: 8,
        },
      ],
    },
  };
}

export function formatBuyerRelativeDate(value: string) {
  const date = new Date(value);
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
