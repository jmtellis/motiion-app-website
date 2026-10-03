import type { Metadata } from "next";

import { AnalyticsHomeView } from "@/components/analytics/dashboard/AnalyticsHomeView";
import { buildSampleAdminAnalytics } from "@/lib/analytics/sample-admin-analytics";

export const metadata: Metadata = {
  title: "Admin analytics preview",
  robots: { index: false, follow: false },
};

type PageProps = {
  searchParams: Promise<{
    range?: string;
    query?: string;
    user?: string;
  }>;
};

export default async function AdminAnalyticsPreviewPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { home } = buildSampleAdminAnalytics(params);

  return (
    <div className="theme-dark theme-product min-h-screen bg-[#0a0a0a] text-[#ffffff]">
      <main className="mx-auto w-full min-w-0 max-w-7xl overflow-x-hidden px-6 py-10 lg:px-10">
        <AnalyticsHomeView data={home} hrefBase="/preview/admin-analytics" preview />
      </main>
    </div>
  );
}
