export const PRO_FEATURES = {
  view_talent_profile: {
    key: "view_talent_profile",
    title: "Reach talent with Industry Pro",
    description:
      "View full talent profiles, message talent, and request availability or size sheets.",
  },
  talent_outreach: {
    key: "talent_outreach",
    title: "Reach talent with Industry Pro",
    description: "Message talent, request availability or size sheets, and run unlimited invites.",
  },
  roster_write: {
    key: "roster_write",
    title: "Build rosters with Industry Pro",
    description: "Create named rosters, organize saved talent, and share collections with your team.",
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
