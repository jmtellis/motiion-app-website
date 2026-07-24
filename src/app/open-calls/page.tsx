import { MarketingStubPage, marketingStubViewport } from "@/components/landing/MarketingStubPage";

export const viewport = marketingStubViewport;

export default function OpenCallsPage() {
  return (
    <MarketingStubPage
      eyebrow="Talent"
      title="Open Calls"
      description="Browse open castings and calls across the Motiion platform. A full public open-calls board is coming soon."
      cta={{ label: "Sign up as talent", href: "/signup" }}
    />
  );
}
