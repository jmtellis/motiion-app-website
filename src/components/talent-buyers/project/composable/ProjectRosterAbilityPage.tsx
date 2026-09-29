"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { BadgeCheck, Search, Trash2, UserPlus, X } from "lucide-react";

import { useToast } from "@/components/talent-buyers/dashboard/ToastProvider";
import { hasActiveAbility } from "@/lib/talent-buyers/project-abilities";
import {
  importCollectionToProjectRoster,
  removeFromProjectRoster,
  type ProjectRosterMember,
} from "@/lib/talent-buyers/project-roster";
import { labelFromSnake } from "@/lib/talent-buyers/dashboard-data";
import { projectPath } from "@/lib/talent-buyers/project-routes";

import { useProjectWorkspace } from "../ProjectWorkspaceContext";
import { RosterStack } from "./RosterStackTile";
import { rosterStackTransitionName } from "./view-transition";

import "./composable-project.css";

type CollectionOption = { id: string; name: string; talentCount: number };

function TalentCardTile({
  member,
  onRemove,
  removing,
}: {
  member: ProjectRosterMember;
  onRemove: () => void;
  removing: boolean;
}) {
  const card = member.card;
  const meta = [card?.locationCity, card?.subtype ? labelFromSnake(card.subtype) : null]
    .filter(Boolean)
    .join(" · ");
  const credits = card?.topCredits.length
    ? card.topCredits.join(" · ")
    : card?.creditCount
      ? `${card.creditCount} credits`
      : "No public credits yet";

  const media = (
    <span className="talent-tile__media">
      {member.avatarUrl ? (
        <Image src={member.avatarUrl} alt="" fill sizes="(max-width: 640px) 45vw, 200px" />
      ) : (
        <span className="talent-tile__initials" aria-hidden>
          {member.name.slice(0, 1).toUpperCase()}
        </span>
      )}
    </span>
  );

  return (
    <li className="talent-tile">
      {member.slug ? (
        <Link href={`/talent/${member.slug}`} className="talent-tile__link" aria-label={`Open ${member.name}'s Talent Card`}>
          {media}
        </Link>
      ) : (
        media
      )}
      <button
        type="button"
        className="talent-tile__remove"
        onClick={onRemove}
        disabled={removing}
        aria-label={`Remove ${member.name} from roster`}
      >
        <Trash2 aria-hidden />
      </button>
      <span className="talent-tile__label">
        <strong>
          <span className="talent-tile__name">{member.name}</span>
          {card?.isVerified ? <BadgeCheck className="talent-tile__verified" aria-label="Verified" /> : null}
        </strong>
        <span>{meta || "\u00a0"}</span>
        <span className="talent-tile__credits">{credits}</span>
      </span>
    </li>
  );
}

export function ProjectRosterAbilityPage({
  collections,
  inviteOpen: initialInviteOpen,
}: {
  collections: CollectionOption[];
  inviteOpen: boolean;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const { projectId, project, rosterMembers } = useProjectWorkspace();
  const [inviteOpen, setInviteOpen] = useState(initialInviteOpen || rosterMembers.length === 0);
  const [collectionId, setCollectionId] = useState(collections[0]?.id ?? "");
  const [pending, startTransition] = useTransition();
  const [removingId, setRemovingId] = useState<string | null>(null);
  const paused = project.composable ? !hasActiveAbility(project.composable.abilities, "roster") : false;
  const findTalentHref = `/talent?projectId=${projectId}`;

  function closeInvite() {
    setInviteOpen(false);
    router.replace(projectPath(projectId, "roster"), { scroll: false });
  }

  function importCollection() {
    if (!collectionId) return;
    startTransition(async () => {
      const result = await importCollectionToProjectRoster({ projectId, collectionId });
      if (!result.ok) {
        showToast({ message: result.error ?? "Couldn't import that collection.", variant: "error" });
        return;
      }
      showToast({
        message: result.added ? `Added ${result.added} from collection` : "That collection is empty",
        variant: result.added ? "success" : "default",
      });
      router.refresh();
    });
  }

  function remove(member: ProjectRosterMember) {
    setRemovingId(member.id);
    startTransition(async () => {
      const result = await removeFromProjectRoster(projectId, member.id);
      setRemovingId(null);
      if (!result.ok) {
        showToast({ message: result.error ?? "Couldn't remove that dancer.", variant: "error" });
        return;
      }
      showToast({ message: `${member.name} removed`, variant: "success" });
      router.refresh();
    });
  }

  return (
    <div className="ability-page">
      <header className="ability-page__header">
        <RosterStack
          people={rosterMembers.map((member) => ({ id: member.id, name: member.name, avatarUrl: member.avatarUrl }))}
          transitionName={rosterStackTransitionName(projectId)}
          size="lg"
        />
        <div className="ability-page__title">
          <h2>Roster</h2>
          <p>
            {rosterMembers.length
              ? `${rosterMembers.length} ${rosterMembers.length === 1 ? "dancer" : "dancers"} · invite-only`
              : "Confirmed dancers, their Talent Cards, and contacts in one place."}
          </p>
        </div>
        <div className="ability-page__actions">
          <button type="button" className="bd-btn-secondary" onClick={() => setInviteOpen(true)}>
            <UserPlus aria-hidden /> Invite dancers
          </button>
        </div>
      </header>

      {paused ? (
        <p className="ability-page__notice">Roster is paused. Its dancers stay here; resume it from + Ability.</p>
      ) : null}

      {inviteOpen ? (
        <section className="roster-invite" aria-labelledby="roster-invite-title">
          <header>
            <h3 id="roster-invite-title">Invite dancers</h3>
            <button type="button" className="need-prompt__dismiss" onClick={closeInvite} aria-label="Close invite">
              <X aria-hidden />
            </button>
          </header>
          <div className="roster-invite__options">
            <Link href={findTalentHref} className="roster-invite__option">
              <Search aria-hidden />
              <span>
                <strong>Find talent on Motiion</strong>
                <span>Search verified Talent Cards and add dancers to this roster.</span>
              </span>
            </Link>
            <div className="roster-invite__option roster-invite__option--form">
              <UserPlus aria-hidden />
              <span>
                <strong>Import from a collection</strong>
                {collections.length ? (
                  <span className="roster-invite__import">
                    <select
                      className="composable-input"
                      value={collectionId}
                      onChange={(event) => setCollectionId(event.target.value)}
                      aria-label="Collection"
                    >
                      {collections.map((collection) => (
                        <option key={collection.id} value={collection.id}>
                          {collection.name} ({collection.talentCount})
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="bd-btn-secondary"
                      onClick={importCollection}
                      disabled={pending || !collectionId}
                    >
                      Import
                    </button>
                  </span>
                ) : (
                  <span>
                    No collections yet. <Link href="/library">Create one in Library</Link>.
                  </span>
                )}
              </span>
            </div>
          </div>
        </section>
      ) : null}

      {rosterMembers.length ? (
        <ul className="talent-grid" aria-label="Roster">
          {rosterMembers.map((member) => (
            <TalentCardTile
              key={member.id}
              member={member}
              onRemove={() => remove(member)}
              removing={pending && removingId === member.id}
            />
          ))}
        </ul>
      ) : (
        <p className="ability-page__empty">No dancers yet. Invite from Motiion or import a collection.</p>
      )}
    </div>
  );
}
