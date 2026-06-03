import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/for-clients",
        destination: "/for-casting",
        permanent: true,
      },
      {
        source: "/for-agents",
        destination: "/",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
