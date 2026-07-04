import Link from "next/link";
import { CalendarPlus, FolderPlus, ListPlus, Search } from "lucide-react";

import { getTalentBuyerDashboardSections, primaryGoalOptions } from "@/lib/talent-buyers/onboarding";
import { getBuyerDashboardData } from "@/lib/talent-buyers/dashboard-data";
import type { DashboardProfile } from "@/types/database";
import type { TalentBuyerPrimaryGoal } from "@/types/talent-buyers";
import type { BuyerProjectSummary } from "@/types/talent-buyer-dashboard";

import { ActionCard } from "./ActionCard";
import { ActivityFeedItem } from "./ActivityFeedItem";
import { BuyerAppPage } from "./BuyerAppPage";
import { BuyerTalentCard } from "./BuyerTalentCard";
import { DashboardHero } from "./DashboardHero";
import { DashboardSection } from "./DashboardSection";
import { EmptyState } from "./EmptyState";
import { EventCard } from "./EventCard";
import { EventSpotlight } from "./EventSpotlight";
import { ProjectTable } from "./ProjectTable";
import { SectionHeader } from "./SectionHeader";

function subtitleForGoal(primaryGoal: TalentBuyerPrimaryGoal | null | undefined) {
  const match = primaryGoalOptions.find((option) => option.value === primaryGoal);
  if (!match) return "Pick up where you left off.";
  if (primaryGoal === "find_talent") return "Discover talent and build your next shortlist.";
  if (primaryGoal === "post_opportunities") return "Manage castings, classes, and sessions.";
  if (primaryGoal === "manage_talent") return "Organize rosters and client-ready selections.";
  return "Search talent, manage projects, and share with clients.";
}

export function BuyerDashboardView({
  profile,
  castingProjects = [],
}: {
  profile: DashboardProfile;
  castingProjects?: BuyerProjectSummary[];
}) {
  const data = getBuyerDashboardData();
  const firstName = profile.fullName.split(" ")[0];
  const sections = getTalentBuyerDashboardSections(profile.buyerRole, profile.primaryGoal);
  const continueWorking = castingProjects.length
    ? castingProjects.slice(0, 4)
    : data.continueWorking;

  return (
    <BuyerAppPage className="max-w-7xl space-y-0">
      <DashboardHero
        firstName={firstName}
        subtitle={subtitleForGoal(profile.primaryGoal)}
        stats={{
          activeProjects: continueWorking.length,
          upcomingEvents: data.upcomingEvents.length,
          recentTalent: data.recentTalent.length,
        }}
      />

      <div className="grid gap-0 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.75fr)] xl:gap-10">
        <div className="space-y-0 xl:pr-6">
          <DashboardSection className="bd-section relative space-y-4 pt-6" cornerHref="/projects" cornerLabel="View all projects">
            <SectionHeader
              title="Continue Working"
              count={continueWorking.length}
              size="dashboard"
              action={
                <Link href="/projects" className="bd-link">
                  View all
                </Link>
              }
            />
            {continueWorking.length ? (
              <ProjectTable projects={continueWorking} variant="dashboard" />
            ) : (
              <EmptyState
                variant="dashboard"
                title="No active projects"
                description="Create a casting to start collecting submissions from talent."
                actionLabel="Create Casting"
                actionHref="/projects/new"
              />
            )}
          </DashboardSection>

          <DashboardSection className="bd-section space-y-4 pt-6">
            <SectionHeader title="Activity Feed" count={data.activityFeed.length} size="dashboard" />
            {data.activityFeed.length ? (
              <div className="border-t border-white/8 pt-4">
                {data.activityFeed.map((item, index) => (
                  <ActivityFeedItem
                    key={item.id}
                    item={item}
                    isLast={index === data.activityFeed.length - 1}
                    variant="dashboard"
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                variant="dashboard"
                title="No recent activity"
                description="Updates from projects, rosters, and events will show here."
              />
            )}
          </DashboardSection>

          {sections.length ? (
            <section className="bd-section space-y-4 pt-6">
              <SectionHeader
                title="Recommended for you"
                description="Based on your onboarding goals."
                size="dashboard"
              />
              <div className="grid gap-3 sm:grid-cols-2">
                {sections.map((section) => (
                  <div key={section} className="bd-muted-panel px-4 py-5 text-sm">
                    <p className="font-semibold text-white/92">{section}</p>
                    <p className="mt-1 text-white/50">Coming soon.</p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <aside className="space-y-0 xl:border-l xl:border-white/6 xl:pl-6">
          <DashboardSection className="bd-section space-y-3 pt-6 xl:pt-6">
            <SectionHeader title="Quick Actions" size="dashboard" />
            <div className="space-y-1">
              <ActionCard
                href="/talent"
                title="Search Talent"
                description="Explore the Motiion talent database."
                icon={Search}
                compact
                variant="dashboard"
              />
              <ActionCard
                href="/projects/new"
                title="Create Casting"
                description="Publish a casting with roles and submission rules."
                icon={FolderPlus}
                compact
                variant="dashboard"
              />
              <ActionCard
                href="/events"
                title="Create Event"
                description="Schedule auditions, classes, and sessions."
                icon={CalendarPlus}
                compact
                variant="dashboard"
              />
              <ActionCard
                href="/library"
                title="New Roster"
                description="Build and manage talent rosters."
                icon={ListPlus}
                compact
                variant="dashboard"
              />
            </div>
          </DashboardSection>

          {data.upcomingEvents[0] ? (
            <EventSpotlight event={data.upcomingEvents[0]} />
          ) : (
            <div className="bd-section pt-6">
              <EmptyState
                variant="dashboard"
                title="No upcoming events"
                description="Create an event to schedule auditions, classes, or sessions."
                actionLabel="Create Event"
                actionHref="/events"
              />
            </div>
          )}

          <section className="bd-section space-y-4 pt-6">
            <SectionHeader
              title="Recent Talent"
              count={data.recentTalent.length}
              size="dashboard"
              action={
                <Link href="/talent" className="bd-link">
                  Browse all
                </Link>
              }
            />
            {data.recentTalent.length ? (
              <div className="space-y-1">
                {data.recentTalent.slice(0, 3).map((talent) => (
                  <BuyerTalentCard key={talent.id} talent={talent} variant="dashboard" />
                ))}
              </div>
            ) : (
              <EmptyState
                variant="dashboard"
                title="No recent talent"
                description="Profiles you view or save will appear here."
                actionLabel="Search Talent"
                actionHref="/talent"
              />
            )}
          </section>

          <section className="bd-section space-y-4 pt-6">
            <SectionHeader
              title="Upcoming Events"
              count={data.upcomingEvents.length}
              size="dashboard"
              action={
                <Link href="/events" className="bd-link">
                  View all
                </Link>
              }
            />
            {data.upcomingEvents.length ? (
              <div className="space-y-1">
                {data.upcomingEvents.slice(1).map((event) => (
                  <EventCard key={event.id} event={event} variant="dark" />
                ))}
              </div>
            ) : (
              <EmptyState
                variant="dashboard"
                title="No upcoming events"
                description="Create an event to schedule auditions, classes, or sessions."
                actionLabel="Create Event"
                actionHref="/events"
              />
            )}
          </section>
        </aside>
      </div>
    </BuyerAppPage>
  );
}
