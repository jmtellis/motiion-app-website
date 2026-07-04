import Link from "next/link";

import { PortfolioView } from "@/components/app/PortfolioView";
import { fetchOwnPortfolioProfile } from "@/lib/app/portfolio";
import { requireTalentAccount } from "@/lib/auth/session";

export default async function PortfolioPage() {
  const profile = await requireTalentAccount();
  const portfolio = await fetchOwnPortfolioProfile(profile);

  if (!portfolio) {
    return (
      <div className="ui-muted-panel px-6 py-10 text-center">
        <h1 className="text-2xl font-semibold text-[var(--ink)]">Finish your portfolio</h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-[var(--ink-soft)]">
          Complete onboarding with a username and headshot to publish your Motiion portfolio.
        </p>
        <Link href="/onboarding" className="btn-primary mt-6 inline-flex">
          Continue onboarding
        </Link>
      </div>
    );
  }

  return <PortfolioView profile={portfolio} />;
}
