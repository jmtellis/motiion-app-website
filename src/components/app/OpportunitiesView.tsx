"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowRight, Megaphone } from "lucide-react";
import { useMemo, useState } from "react";

import { CastingDetailPanel } from "@/components/app/CastingDetailPanel";
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
  initialTab = "open",
  initialCasting = null,
  initialPreferRole = false,
}: {
  opportunities: TalentOpportunities;
  initialTab?: Tab;
  initialCasting?: string | null;
  initialPreferRole?: boolean;
}) {
  const router = useRouter();
  const notifications = useNotificationsPanel();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [roster, setRoster] = useState<Roster>("active");
  const [castingRoleId, setCastingRoleId] = useState<string | null>(
    initialCasting,
  );
  const [preferRole, setPreferRole] = useState(initialPreferRole);

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
    setPreferRole(roleView);
    setCastingRoleId(roleId);
    writeUrl(tab, roleId);
  }

  function selectTab(next: Tab) {
    setTab(next);
    writeUrl(next, castingRoleId);
  }

  function writeUrl(nextTab: Tab, roleId: string | null) {
    const params = new URLSearchParams();
    if (nextTab !== "open") params.set("tab", nextTab);
    if (roleId) params.set("casting", roleId);
    const query = params.toString();
    router.replace(query ? `/opportunities?${query}` : "/opportunities", {
      scroll: false,
    });
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
            empty="No open calls right now. New public castings will show up here."
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
            <EmptyCopy>
              Private castings you’re invited to submit for will show up here.
            </EmptyCopy>
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
              <EmptyCopy>
                {roster === "closed"
                  ? "Finalized castings will move here."
                  : "Submit to an open call and it will show up here."}
              </EmptyCopy>
            )}
          </>
        ) : null}
      </div>

      <CastingDetailPanel
        roleId={castingRoleId}
        open={Boolean(castingRoleId) && !notifications.open}
        preferRole={preferRole}
        onClose={() => {
          setCastingRoleId(null);
          writeUrl(tab, null);
        }}
      />
    </div>
  );
}

function CardGrid({
  cards,
  empty,
  onOpen,
}: {
  cards: TalentCastingCard[];
  empty: string;
  onOpen: (card: TalentCastingCard) => void;
}) {
  if (!cards.length) return <EmptyCopy>{empty}</EmptyCopy>;
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

function EmptyCopy({ children }: { children: string }) {
  return (
    <div className="home-listing-empty">
      <Megaphone size={22} strokeWidth={1.6} aria-hidden />
      <div>
        <h3>{children}</h3>
      </div>
    </div>
  );
}
