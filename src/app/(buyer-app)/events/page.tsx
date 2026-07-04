import Link from "next/link";

import { listHostedActivities } from "@/app/(buyer-app)/events/actions";
import { BuyerAppPage } from "@/components/talent-buyers/dashboard/BuyerAppPage";
import { CreateActivityButton } from "@/components/talent-buyers/dashboard/CreateActivityButton";
import { EmptyState } from "@/components/talent-buyers/dashboard/EmptyState";
import { EventCard } from "@/components/talent-buyers/dashboard/EventCard";
import { PageHeader } from "@/components/talent-buyers/dashboard/PageHeader";
import { ProjectCard } from "@/components/talent-buyers/dashboard/ProjectCard";
import { SectionHeader } from "@/components/talent-buyers/dashboard/SectionHeader";
import { fetchPosterCastingSummaries, splitCastingSummaries } from "@/lib/talent-buyers/casting-projects";
import { requireHiringAccount } from "@/lib/auth/session";

export default async function BuyerEventsPage() {
  const profile = await requireHiringAccount();
  const [liveCastings, hosted] = await Promise.all([
    fetchPosterCastingSummaries(profile.id),
    listHostedActivities(),
  ]);
  const { drafts, published } = splitCastingSummaries(liveCastings);

  return (
    <BuyerAppPage>
      <PageHeader
        variant="dashboard"
        eyebrow="Events"
        title="Events"
        description="View, create, and manage castings, auditions, classes, and sessions."
        actions={
          <div className="flex items-center gap-2">
            <CreateActivityButton />
            <Link href="/projects/new" className="bd-btn-accent">
              Create Casting
            </Link>
          </div>
        }
      />

      <section className="bd-page-section space-y-4">
        <SectionHeader title="Draft castings" count={drafts.length} size="dashboard" />
        {drafts.length ? (
          <div className="grid gap-1 md:grid-cols-2">
            {drafts.map((project) => (
              <ProjectCard key={project.id} project={project} variant="dashboard" />
            ))}
          </div>
        ) : (
          <EmptyState
            variant="dashboard"
            title="No draft castings"
            description="Save a casting draft while you finish roles and submission details."
            actionLabel="Create Casting"
            actionHref="/projects/new"
          />
        )}
      </section>

      <section className="bd-page-section space-y-4">
        <SectionHeader title="Published castings" count={published.length} size="dashboard" />
        {published.length ? (
          <div className="grid gap-1 md:grid-cols-2">
            {published.map((project) => (
              <ProjectCard key={project.id} project={project} variant="dashboard" />
            ))}
          </div>
        ) : (
          <EmptyState
            variant="dashboard"
            title="No published castings"
            description="Published castings will appear here once you publish from the composer."
            actionLabel="Create Casting"
            actionHref="/projects/new"
          />
        )}
      </section>

      <section className="bd-page-section space-y-4">
        <SectionHeader title="Calendar view" size="dashboard" />
        <EmptyState
          variant="dashboard"
          title="Calendar view coming soon"
          description="A calendar layout for auditions, classes, and sessions will live here."
        />
      </section>

      <section className="bd-page-section space-y-4">
        <SectionHeader title="Upcoming" count={hosted.upcoming.length} size="dashboard" />
        {hosted.upcoming.length ? (
          <div className="space-y-1">
            {hosted.upcoming.map((event) => (
              <div key={event.id}>
                <EventCard event={event} variant="dark" />
                <p className="px-4 pb-2 text-xs text-white/45">
                  {event.attendeeCount} {event.attendeeCount === 1 ? "attendee" : "attendees"} registered
                </p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            variant="dashboard"
            title="No upcoming events"
            description="Create a class or session to see it here with live attendee counts."
          />
        )}
      </section>

      <section className="bd-page-section space-y-4">
        <SectionHeader title="Past" count={hosted.past.length} size="dashboard" />
        {hosted.past.length ? (
          <div className="space-y-1">
            {hosted.past.map((event) => (
              <div key={event.id}>
                <EventCard event={event} variant="dark" />
                <p className="px-4 pb-2 text-xs text-white/45">
                  {event.attendeeCount} {event.attendeeCount === 1 ? "attendee" : "attendees"} attended
                </p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState variant="dashboard" title="No past events" description="Completed events will appear here." />
        )}
      </section>
    </BuyerAppPage>
  );
}
