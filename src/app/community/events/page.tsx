import { MarketingStubPage, marketingStubViewport } from "@/components/landing/MarketingStubPage";

export const viewport = marketingStubViewport;

export default function EventsPage() {
  return (
    <MarketingStubPage
      eyebrow="Community"
      title="Events"
      description="Discover live appearances, activations, and industry gatherings happening across Motiion. Full listings are coming soon."
      cta={{ label: "Create an account", href: "/signup" }}
    />
  );
}
