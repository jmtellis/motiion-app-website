import type { Metadata } from "next";

import { AnalyticsDetailView } from "@/components/analytics/dashboard/AnalyticsDetailView";
import { buildSampleAdminAnalytics } from "@/lib/analytics/sample-admin-analytics";

export const metadata: Metadata = {
  title: "Admin analytics detail preview",
  robots: { index: false, follow: false },
};

type PageProps = {
  searchParams: Promise<{
    range?: string;
  }>;
};

export default async function AdminAnalyticsPreviewDetailPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { detail } = buildSampleAdminAnalytics(params);

  return (
    <div className="theme-dark theme-product min-h-screen bg-[#0a0a0a] text-[#ffffff]">
      <main className="mx-auto w-full min-w-0 max-w-7xl overflow-x-hidden px-6 py-10 lg:px-10">
        <AnalyticsDetailView data={detail} hrefBase="/preview/admin-analytics" preview />
      </main>
    </div>
  );
}
