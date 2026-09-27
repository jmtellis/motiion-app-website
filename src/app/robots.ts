import type { MetadataRoute } from "next";
import { getAppEnvironment } from "@/lib/environment";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.motiion.app").replace(/\/$/, "");

export default function robots(): MetadataRoute.Robots {
  if (getAppEnvironment() !== "production") return { rules: [{ userAgent: "*", disallow: "/" }] };
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/dashboard",
          "/home",
          "/inbox",
          "/portfolio",
          "/settings",
          "/onboarding",
          "/admin",
          "/projects",
          "/library",
          "/messages",
          "/calendar",
          "/events",
          "/payments/",
          "/shortlist/",
          "/auth/",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
