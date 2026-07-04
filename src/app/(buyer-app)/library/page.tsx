import { BuyerAppPage } from "@/components/talent-buyers/dashboard/BuyerAppPage";
import { EmptyState } from "@/components/talent-buyers/dashboard/EmptyState";
import { PageHeader } from "@/components/talent-buyers/dashboard/PageHeader";
import { RosterCreateForm } from "@/components/talent-buyers/dashboard/RosterCreateForm";
import { SectionHeader } from "@/components/talent-buyers/dashboard/SectionHeader";
import { PaywallCard } from "@/components/talent-buyers/PaywallCard";
import { isIndustryLocked } from "@/lib/billing/gate";
import { listRosters } from "@/lib/talent-buyers/rosters";
import { requireHiringAccount } from "@/lib/auth/session";

export default async function BuyerLibraryPage() {
  const profile = await requireHiringAccount();

  if (await isIndustryLocked(profile.id)) {
    return (
      <BuyerAppPage>
        <PaywallCard feature="Rosters and the talent library" />
      </BuyerAppPage>
    );
  }

  const { rosters, error } = await listRosters();

  return (
    <BuyerAppPage>
      <PageHeader
        variant="dashboard"
        eyebrow="Library"
        title="Library"
        description="Reusable rosters, saved talent, and client presentations."
      />

      {error ? (
        <p className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
          Could not load rosters: {error}
        </p>
      ) : null}

      <section className="bd-page-section space-y-4">
        <SectionHeader title="Rosters" count={rosters.length} size="dashboard" />
        <RosterCreateForm />
        {rosters.length ? (
          <ul>
            {rosters.map((roster) => (
              <li key={roster.id} className="bd-list-row">
                <div>
                  <h3 className="text-base font-semibold text-white/92">{roster.name}</h3>
                  <p className="mt-1 text-sm text-white/50">
                    {roster.talentCount} talent · {new Date(roster.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState variant="dashboard" title="No rosters" description="Create a roster to group talent for projects and clients." />
        )}
      </section>
    </BuyerAppPage>
  );
}
