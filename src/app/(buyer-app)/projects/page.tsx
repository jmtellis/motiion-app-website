import Link from "next/link";

import { BuyerAppPage } from "@/components/talent-buyers/dashboard/BuyerAppPage";
import { EmptyState } from "@/components/talent-buyers/dashboard/EmptyState";
import { PageHeader } from "@/components/talent-buyers/dashboard/PageHeader";
import { ProjectCard } from "@/components/talent-buyers/dashboard/ProjectCard";
import { PaywallCard } from "@/components/talent-buyers/PaywallCard";
import { isIndustryLocked } from "@/lib/billing/gate";
import { fetchPosterCastingSummaries, splitCastingSummaries } from "@/lib/talent-buyers/casting-projects";
import { getBuyerDashboardData } from "@/lib/talent-buyers/dashboard-data";
import { requireHiringAccount } from "@/lib/auth/session";

export default async function BuyerProjectsPage() {
  const profile = await requireHiringAccount();

  if (await isIndustryLocked(profile.id)) {
    return (
      <BuyerAppPage>
        <PaywallCard feature="Projects and castings" />
      </BuyerAppPage>
    );
  }
  const liveCastings = await fetchPosterCastingSummaries(profile.id);
  const mockData = getBuyerDashboardData();
  const mockNonCastingProjects = mockData.projects.filter((project) => project.projectType !== "casting");
  const projects = [...liveCastings, ...mockNonCastingProjects];
  const { drafts, published } = splitCastingSummaries(liveCastings);

  return (
    <BuyerAppPage>
      <PageHeader
        variant="dashboard"
        eyebrow="Projects"
        title="Projects"
        description="Your workspace for casting, tours, client presentations, and talent boards."
        actions={
          <Link href="/projects/new" className="bd-btn-accent">
            Create Casting
          </Link>
        }
      />

      {liveCastings.length ? (
        <>
          {drafts.length ? (
            <section className="bd-page-section space-y-4">
              <h2 className="bd-eyebrow">Draft castings</h2>
              <div className="grid gap-1 md:grid-cols-2 xl:grid-cols-3">
                {drafts.map((project) => (
                  <ProjectCard key={project.id} project={project} variant="dashboard" />
                ))}
              </div>
            </section>
          ) : null}

          {published.length ? (
            <section className="bd-page-section space-y-4">
              <h2 className="bd-eyebrow">Published castings</h2>
              <div className="grid gap-1 md:grid-cols-2 xl:grid-cols-3">
                {published.map((project) => (
                  <ProjectCard key={project.id} project={project} variant="dashboard" />
                ))}
              </div>
            </section>
          ) : null}
        </>
      ) : null}

      {mockNonCastingProjects.length ? (
        <section className="bd-page-section space-y-4">
          <h2 className="bd-eyebrow">Workspaces</h2>
          <div className="grid gap-1 md:grid-cols-2 xl:grid-cols-3">
            {mockNonCastingProjects.map((project) => (
              <ProjectCard key={project.id} project={project} variant="dashboard" />
            ))}
          </div>
        </section>
      ) : null}

      {!projects.length ? (
        <EmptyState
          variant="dashboard"
          title="No projects yet"
          description="Create a casting to start collecting submissions, or organize talent boards and client shares in a project workspace."
          actionLabel="Create Casting"
          actionHref="/projects/new"
        />
      ) : null}

      <p className="bd-caption">
        Castings are saved to your Motiion account. Other workspace types still use preview data until those flows are connected.
      </p>
    </BuyerAppPage>
  );
}
