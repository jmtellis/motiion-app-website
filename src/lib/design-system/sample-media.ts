/** Sample media for design-system previews (Jay Tellis / jaymtellis@gmail.com). */
export const CATALOG_SAMPLE_PROFILE = {
  displayName: "Jay Tellis",
  username: "jaymtellis",
  location: "Los Angeles, CA",
  headshotUrls: [
    "https://pygdxcscmebeqjxhzzuq.supabase.co/storage/v1/object/public/headshots/42402829-5cf7-4fdb-95dc-d5d8fd506124/headshot_0_1789508084.jpg",
    "https://pygdxcscmebeqjxhzzuq.supabase.co/storage/v1/object/public/headshots/42402829-5cf7-4fdb-95dc-d5d8fd506124/headshot_1_1789508084.jpg",
    "https://pygdxcscmebeqjxhzzuq.supabase.co/storage/v1/object/public/headshots/42402829-5cf7-4fdb-95dc-d5d8fd506124/headshot_2_1789508084.jpg",
    "https://pygdxcscmebeqjxhzzuq.supabase.co/storage/v1/object/public/headshots/42402829-5cf7-4fdb-95dc-d5d8fd506124/headshot_3_1789508084.jpg",
  ],
} as const;

export type CatalogSampleProfile = typeof CATALOG_SAMPLE_PROFILE;
