"use client";

import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Megaphone } from "lucide-react";
import { useMemo, useState } from "react";

import { CastingDetailPanel } from "@/components/app/CastingDetailPanel";
import { ProductEmptyState } from "@/components/ui/EmptyState";
import { useNotificationsPanel } from "@/components/workspace/WorkspaceNotifications";
import { groupOpportunityProjects as projectGroups } from "@/lib/app/opportunity-groups";
import { outcomeLabel } from "@/lib/app/talent-casting-state";
import type {
  TalentCastingCard,
  TalentOpportunities,
  TalentSubmissionCard,
} from "@/lib/app/talent-castings";

type Tab = "open" | "invited" | "submitted";
type Roster = "active" | "closed";

const TABS: { id: Tab; label: string }[] = [
  { id: "open", label: "Open calls" },
  { id: "invited", label: "Invited" },
  { id: "submitted", label: "Submitted" },
];

export function OpportunitiesView({
  opportunities,
}: {
  opportunities: TalentOpportunities;
}) {
  const searchParams = useSearchParams();
  const notifications = useNotificationsPanel();
  const requestedTab = searchParams.get("tab");
  const tab: Tab = requestedTab === "invited" || requestedTab === "submitted" ? requestedTab : "open";
  const [roster, setRoster] = useState<Roster>("active");
  const castingRoleId = searchParams.get("casting")?.trim() || null;
  const preferRole = searchParams.get("view") === "role" || (searchParams.get("view") !== "project" && tab !== "open");

  const submitted = useMemo(
    () =>
      opportunities.submitted.filter((card) =>
        roster === "closed" ? card.closed : !card.closed,
      ),
    [opportunities.submitted, roster],
  );
  const counts = {
    open: projectGroups(opportunities.openCalls).length,
    invited: projectGroups(opportunities.invited).length,
    submitted: projectGroups(opportunities.submitted).length,
  };

  function openCasting(roleId: string, roleView: boolean) {
    notifications.setOpen(false);
    writeUrl(tab, roleId, roleView, "push");
  }

  function selectTab(next: Tab) {
    writeUrl(next, null, false, "push");
  }

  function writeUrl(nextTab: Tab, roleId: string | null, roleView = false, mode: "push" | "replace" = "replace") {
    const params = new URLSearchParams();
    if (nextTab !== "open") params.set("tab", nextTab);
    if (roleId) {
      params.set("casting", roleId);
      params.set("view", roleView ? "role" : "project");
    }
    const query = params.toString();
    // These are views of already-loaded data. Avoid refetching the entire page
    // on inspection and keep Back/Forward tied to the visible panel.
    window.history[mode === "push" ? "pushState" : "replaceState"](
      { motiionCastingPanel: Boolean(roleId) }, "", query ? `/opportunities?${query}` : "/opportunities",
    );
  }

  return (
    <div className="opportunities-page">
      <header className="opportunities-page__header">
        <div>
          <h1>Opportunities</h1>
          <p>
            Open calls, private invites, and the castings you’ve already
            submitted to.
          </p>
        </div>
      </header>

      <div className="home-browser__filters" role="group" aria-label="Castings">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={tab === item.id}
            onClick={() => selectTab(item.id)}
          >
            {item.label}
            <span className="opportunities-count">{counts[item.id]}</span>
          </button>
        ))}
      </div>

      <div key={tab} className="opportunities-page__lens ui-swap">
        {tab === "open" ? (
          <CardGrid
            cards={opportunities.openCalls}
            onOpen={(card) => openCasting(card.roleId, false)}
          />
        ) : null}

        {tab === "invited" ? (
          opportunities.invited.length ? (
            <ul className="home-open-call-grid">
              {projectGroups(opportunities.invited).map((group) => {
                const card = group[0];
                return (
                  <li key={card.key}>
                    <CastingCard
                      card={card}
                      badge={
                        group.length > 1
                          ? `${group.length} invited roles`
                          : "Invited"
                      }
                      onOpen={() => openCasting(card.roleId, false)}
                    />
                  </li>
                );
              })}
            </ul>
          ) : (
            <ProductEmptyState
              illustration="castings"
              title="No invitations yet"
              description="When a casting team invites you to a private casting, it will show up here. A complete portfolio helps them find you."
              actionLabel="Update portfolio"
              actionHref="/portfolio"
              secondaryAction={{ label: "Browse open calls", onClick: () => selectTab("open") }}
            />
          )
        ) : null}

        {tab === "submitted" ? (
          <>
            <div
              className="home-browser__filters"
              role="group"
              aria-label="Submission status"
            >
              <button
                type="button"
                aria-pressed={roster === "active"}
                onClick={() => setRoster("active")}
              >
                Active
              </button>
              <button
                type="button"
                aria-pressed={roster === "closed"}
                onClick={() => setRoster("closed")}
              >
                Closed
              </button>
            </div>
            {submitted.length ? (
              <ul className="home-open-call-grid">
                {projectGroups(submitted).map((group) => {
                  const card = group[0];
                  return (
                    <li key={card.key}>
                      <CastingCard
                        card={card}
                        badge={
                          group.length > 1
                            ? `${group.length} submitted roles`
                            : outcomeLabel(card.outcome)
                        }
                        onOpen={() => openCasting(card.roleId, false)}
                      />
                    </li>
                  );
                })}
              </ul>
            ) : (
              <ProductEmptyState
                illustration="castings"
                title={roster === "closed" ? "No closed castings" : "No active submissions"}
                description={roster === "closed"
                  ? "Castings move here once they’re finalized, so you can look back at the outcome."
                  : "Submit to an open call and you can follow its status here."}
                actionLabel="Browse open calls"
                onAction={() => selectTab("open")}
              />
            )}
          </>
        ) : null}
      </div>

      <CastingDetailPanel
        roleId={castingRoleId}
        open={Boolean(castingRoleId) && !notifications.open}
        preferRole={preferRole}
        onClose={() => {
          if (window.history.state?.motiionCastingPanel) window.history.back();
          else writeUrl(tab, null);
        }}
      />
    </div>
  );
}

function CardGrid({
  cards,
  onOpen,
}: {
  cards: TalentCastingCard[];
  onOpen: (card: TalentCastingCard) => void;
}) {
  if (!cards.length) {
    return (
      <ProductEmptyState
        illustration="castings"
        title="No open calls right now"
        description="New public castings show up here as soon as they’re posted. Keep your portfolio current so you’re ready to submit."
        actionLabel="Update portfolio"
        actionHref="/portfolio"
      />
    );
  }
  return (
    <ul className="home-open-call-grid">
      {projectGroups(cards).map((group) => {
        const card = group[0];
        return (
          <li key={card.key}>
            <CastingCard
              card={card}
              badge={
                group.length > 1
                  ? `${group.length} roles`
                  : card.matched
                    ? "Matched to you"
                    : undefined
              }
              onOpen={() => onOpen(card)}
            />
          </li>
        );
      })}
    </ul>
  );
}

function CastingCard({
  card,
  onOpen,
}: {
  card: TalentCastingCard | TalentSubmissionCard;
  badge?: string;
  onOpen: () => void;
}) {
  const [logoFailed, setLogoFailed] = useState(false);
  return (
    <button type="button" className="home-open-call-card" onClick={onOpen}>
      <div className="home-open-call-card__header">
        <span className="home-open-call-card__logo">
          {card.logoUrl && !logoFailed ? (
            <Image
              src={card.logoUrl}
              alt=""
              width={48}
              height={48}
              unoptimized
              onError={() => setLogoFailed(true)}
            />
          ) : (
            <Megaphone size={18} strokeWidth={2.2} aria-hidden />
          )}
        </span>
        <div>
          <h3>{card.title}</h3>
          <p>{card.subtitle}</p>
        </div>
      </div>
      {card.description ? (
        <p className="home-open-call-card__description">{card.description}</p>
      ) : null}
      <div className="home-open-call-card__footer">
        <strong>{card.payLine}</strong>
        <span className="home-open-call-card__cta">
          <span>View</span>
          <span aria-hidden className="home-open-call-card__arrow">
            <ArrowRight size={12} strokeWidth={2.6} />
          </span>
        </span>
      </div>
    </button>
  );
}
