import { MarketingStubPage, marketingStubViewport } from "@/components/landing/MarketingStubPage";

export const viewport = marketingStubViewport;

export default function DancerbasePage() {
  return (
    <MarketingStubPage
      eyebrow="Industry Professionals"
      title="Dancerbase"
      description="A lightweight chat for discovering dance info—ask simple questions against Motiion's database. Early access is coming soon."
      cta={{ label: "Sign up", href: "/signup" }}
    />
  );
}
