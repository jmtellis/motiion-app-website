import { MarketingStubPage, marketingStubViewport } from "@/components/landing/MarketingStubPage";

export const viewport = marketingStubViewport;

export default function ResourcesPage() {
  return (
    <MarketingStubPage
      eyebrow="Resources"
      title="Industry resources"
      description="SAG dancer rules, Dancer's Alliance rates, and other guides for talent and industry teams. We're assembling this library now."
      cta={{ label: "Back to home", href: "/" }}
    />
  );
}
