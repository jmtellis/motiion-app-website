import { MarketingStubPage, marketingStubViewport } from "@/components/landing/MarketingStubPage";

export const viewport = marketingStubViewport;

export default function ProgramsPage() {
  return (
    <MarketingStubPage
      eyebrow="Community"
      title="Programs"
      description="Explore intensives, workshops, and development programs. Program listings are coming soon."
      cta={{ label: "Create an account", href: "/signup" }}
    />
  );
}
