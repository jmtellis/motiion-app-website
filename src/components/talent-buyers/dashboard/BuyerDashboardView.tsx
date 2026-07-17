"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  CalendarDays,
  CalendarPlus,
  FolderPlus,
  ListPlus,
  Search,
} from "lucide-react";

import type { BuyerDashboardLiveData } from "@/lib/talent-buyers/dashboard-live";
import type { DashboardProfile } from "@/types/database";

import { ActivityFeedItem } from "./ActivityFeedItem";
import { BuyerAppPage } from "./BuyerAppPage";
import { useRegisterBuyerChrome } from "./BuyerPageChromeContext";
import { EmptyState } from "./EmptyState";
import { FadeInSection } from "./FadeInSection";
import { SectionHeader } from "./SectionHeader";

const QUICK_ACTIONS = [
  { href: "/talent", title: "Search Talent", description: "Explore verified profiles", icon: Search },
  {
    href: "/projects?create=1",
    title: "Create project",
    description: "Start a new workspace",
    icon: FolderPlus,
  },
  { href: "/calendar", title: "Create Event", description: "Schedule your next session", icon: CalendarPlus },
  { href: "/library", title: "New Roster", description: "Organize talent selections", icon: ListPlus },
] as const;

function timeOfDayGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function BuyerDashboardView({
  profile,
  liveData,
}: {
  profile: DashboardProfile;
  liveData: BuyerDashboardLiveData;
}) {
  useRegisterBuyerChrome({ title: "Dashboard" });

  const firstName = profile.fullName.split(" ")[0];
  const recentActivity = liveData.activityFeed;

  return (
    <BuyerAppPage fullWidth className="buyer-home-dashboard">
      <div className="bd-home-top">
        <div className="bd-home-top__backdrop" aria-hidden />
        <div className="bd-home-inner">
          <div className="bd-home-action-canvas">
            <div className="bd-home-greeting-group">
              <h1 className="bd-home-greeting" suppressHydrationWarning>
                {timeOfDayGreeting()}, {firstName}.
              </h1>
              <p className="bd-home-greeting-subtext">
                Pick up where you left off, or start something new.
              </p>
            </div>

            <div className="bd-home-actions" aria-label="Quick actions">
              {QUICK_ACTIONS.map((action) => {
                const Icon = action.icon;
                return (
                  <Link key={action.href} href={action.href} className="bd-home-action-card">
                    <span className="bd-home-action-card__icon" aria-hidden>
                      <Icon className="size-5" />
                    </span>
                    <span className="bd-home-action-card__copy">
                      <span className="bd-home-action-card__title">{action.title}</span>
                      <span className="bd-home-action-card__description">{action.description}</span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="bd-home-bottom">
        <div className="bd-home-inner bd-home-bottom__grid">
          <div className="bd-home-workspace">
            <FadeInSection delay={0.08} className="bd-home-scroll-column">
              <section className="bd-home-activity bd-home-activity--main" aria-label="Recent activity">
                <SectionHeader
                  title="Activity"
                  count={liveData.activityFeed.length}
                  size="dashboard"
                  className="bd-home-section-header"
                />
                {recentActivity.length ? (
                  <div className="bd-home-activity__list">
                    {recentActivity.map((item, index) => (
                      <ActivityFeedItem
                        key={item.id}
                        item={item}
                        isLast={index === recentActivity.length - 1}
                        variant="dashboard"
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    variant="dashboard"
                    title="No recent activity"
                    description="Actions like shortlists, avail checks, sizing requests, and casting updates will show here."
                  />
                )}
              </section>
            </FadeInSection>
          </div>

          <aside className="bd-home-rail" aria-label="Recently viewed">
            <FadeInSection delay={0.08} className="bd-home-scroll-column">
              <section className="bd-home-panel bd-home-recently-viewed space-y-4">
                <SectionHeader
                  title="Recently Viewed"
                  count={liveData.recentlyViewed.length}
                  size="dashboard"
                  className="bd-home-section-header"
                />
                {liveData.recentlyViewed.length ? (
                  <ul className="bd-home-talent-list">
                    {liveData.recentlyViewed.map((item) => {
                      const initial = item.title.charAt(0).toUpperCase();
                      return (
                        <li key={item.id}>
                          <Link href={item.href} className="bd-home-talent-row">
                            {item.type === "profile" ? (
                              <span className="bd-home-talent-row__avatar">
                                {item.imageUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={item.imageUrl} alt="" />
                                ) : (
                                  <span aria-hidden>{initial}</span>
                                )}
                              </span>
                            ) : (
                              <span className="bd-home-project-row__icon" aria-hidden>
                                {item.type === "project" ? (
                                  <FolderPlus className="size-4" />
                                ) : (
                                  <CalendarDays className="size-4" />
                                )}
                              </span>
                            )}
                            <span className="min-w-0 flex-1">
                              <span className="bd-home-talent-row__name">{item.title}</span>
                              <span className="bd-home-talent-row__meta">{item.meta}</span>
                            </span>
                            <ArrowUpRight className="bd-home-talent-row__arrow size-4" aria-hidden />
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <EmptyState
                    variant="dashboard"
                    title="Nothing viewed yet"
                    description="Profiles, projects, and events you open will appear here."
                    actionLabel="Search Talent"
                    actionHref="/talent"
                  />
                )}
              </section>
            </FadeInSection>
          </aside>
        </div>
      </div>
    </BuyerAppPage>
  );
}
