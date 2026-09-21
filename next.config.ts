import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Keep recently visited dynamic segments warm so sidebar revisits feel instant.
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
    // Headshot / project media uploads can exceed the default 1MB server-action body limit.
    serverActions: {
      bodySizeLimit: "15mb",
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  async redirects() {
    return [
      {
        source: "/for-clients",
        destination: "/?audience=casting",
        permanent: false,
      },
      {
        source: "/for-agents",
        destination: "/",
        permanent: true,
      },
      {
        source: "/for-talent",
        destination: "/?audience=talent",
        permanent: false,
      },
      {
        source: "/for-casting",
        destination: "/?audience=casting",
        permanent: false,
      },
      {
        source: "/community",
        destination: "/?audience=community",
        permanent: false,
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  disableLogger: true,
});
