import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/marketing/site-seo";

export default function sitemap(): MetadataRoute.Sitemap {
  // Only public discovery/content pages; omit account flows and redirects.
  // Add lastModified only when an actual content modification date is available.
  return ["/", "/pricing", "/search", "/privacy", "/terms", "/cookies"].map((path) => ({
    url: `${SITE_URL}${path}`,
  }));
}
