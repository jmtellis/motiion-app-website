import { MarketingStubPage, marketingStubViewport } from "@/components/landing/MarketingStubPage";

export const viewport = marketingStubViewport;

export default function ClassesPage() {
  return (
    <MarketingStubPage
      eyebrow="Community"
      title="Classes"
      description="Find open classes and training sessions from the Motiion community. Class discovery is coming soon."
      cta={{ label: "Create an account", href: "/signup" }}
    />
  );
}
