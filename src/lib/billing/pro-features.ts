export const PRO_FEATURES = {
  view_talent_profile: {
    key: "view_talent_profile",
    title: "Reach talent with Industry Pro",
    description:
      "Explore talent profiles and message individually on Free. Industry Pro adds voice search and advanced hiring workflows.",
  },
  talent_outreach: {
    key: "talent_outreach",
    title: "Reach talent with Industry Pro",
    description: "Individual messaging is included free. Upgrade for advanced group workflows and unlimited casting outreach.",
  },
  roster_write: {
    key: "roster_write",
    title: "Build rosters with Industry Pro",
    description: "Favorites is free and unlimited. Industry Pro lets you create rosters and share them, including with expiring links.",
  },
  casting_invite_limit: {
    key: "casting_invite_limit",
    title: "Invite more talent with Industry Pro",
    description: "Free plans include a small invite allowance per casting. Upgrade for unlimited outreach.",
  },
  project_files_storage: {
    key: "project_files_storage",
    title: "More file storage with Industry Pro",
    description: "Free plans include limited project file storage. Upgrade when you need more room.",
  },
  saved_search: {
    key: "saved_search",
    title: "Save searches with Industry Pro",
    description: "Keep advanced and natural-language searches ready for the next brief.",
  },
} as const;

export type ProFeatureKey = keyof typeof PRO_FEATURES;

export function getProFeature(feature: ProFeatureKey) {
  return PRO_FEATURES[feature];
}
