import type { PublicShortlistPayload } from "@/types/publicShortlist";

// Local development fixture. The public API wrapper only loads this in development.
export const shortlistReviewPreview: PublicShortlistPayload = {
  share: {
    id: "preview",
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    expiresAt: new Date(Date.now() + 2 * 86400000).toISOString(),
    sharedBy: { name: "Studio casting team", avatarUrl: "/marketing/hero/dancer-02.png" },
    title: "Campaign cast",
    projectTitle: "Studio campaign",
    roleTitle: "Campaign cast",
    message: "Preview only — no votes are sent.",
  },
  recipients: [],
  submissions: ["Alex Morgan", "Jordan Rivera", "Alex Morgan", "Sam Chen", "Taylor Brooks", "Jamie Park"].map((displayName, index) => ({
    id: String(index),
    roleId: ["lead", "ensemble", "featured"][Math.floor(index / 2)],
    roleTitle: ["Lead dancers", "Movement ensemble", "Featured movers"][Math.floor(index / 2)],
    talentId: index === 2 ? "0" : String(index),
    displayName,
    headshotUrl: `/marketing/hero/dancer-0${index % 3 + 1}.png`,
    headshotUrls: null,
    representation: "Independent",
    location: "Los Angeles",
    gender: null,
    bio: "Sample profile for testing the shortlist review experience.",
    skills: ["Contemporary", "Freestyle"],
    dateOfBirth: null,
    height: null,
    ethnicity: null,
    profileVisuals: null,
    experiences: null,
    instagramUrl: "https://instagram.com/instagram/",
  })),
};
