"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2, UserMinus } from "lucide-react";
import { useState, useTransition } from "react";

import {
  bulkInviteRosterToCasting,
  listBuyerCastingTargets,
  type CastingInviteTarget,
} from "@/app/(buyer-app)/(paid)/talent/actions";
import {
  deleteRoster,
  removeTalentFromRoster,
  renameRoster,
  type RosterDetail,
} from "@/lib/talent-buyers/rosters";

import { EmptyState } from "./dashboard/EmptyState";
import { FadeInSection, StaggerList } from "./dashboard/FadeInSection";
import { useToast } from "./dashboard/ToastProvider";

export function RosterDetailView({ roster: initialRoster }: { roster: RosterDetail }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(initialRoster.name);
  const [roster, setRoster] = useState(initialRoster);
  const [invitePicker, setInvitePicker] = useState<{
    targets: CastingInviteTarget[];
    loading: boolean;
  } | null>(null);

  function openBulkInvite() {
    setInvitePicker({ targets: [], loading: true });
    void listBuyerCastingTargets().then((result) => {
      if (result.error || !result.targets.length) {
        setInvitePicker(null);
        showToast({
          message: result.error ?? "Create a project with roles first.",
          variant: "error",
        });
        return;
      }
      setInvitePicker({ targets: result.targets, loading: false });
    });
  }

  function sendBulkInvite(target: CastingInviteTarget) {
    setInvitePicker(null);
    startTransition(async () => {
      const result = await bulkInviteRosterToCasting({
        rosterId: roster.id,
        projectId: target.projectId,
        roleId: target.castingId,
      });
      if (!result.ok) {
        showToast({ message: result.error ?? "Could not invite roster", variant: "error" });
        return;
      }
      showToast({
        message: `Invited ${result.invited} talent to ${target.title}`,
        variant: "success",
      });
    });
  }

  function handleRename() {
    startTransition(async () => {
      const result = await renameRoster(roster.id, name);
      if (result.ok) {
        showToast({ message: "Roster renamed", variant: "success" });
        router.refresh();
      } else {
        showToast({ message: result.error ?? "Could not rename roster.", variant: "error" });
      }
    });
  }

  function handleDelete() {
    if (!window.confirm(`Delete "${roster.name}"? This cannot be undone.`)) return;
    startTransition(async () => {
      const result = await deleteRoster(roster.id);
      if (result.ok) {
        showToast({ message: "Roster deleted", variant: "success" });
        router.push("/library");
        router.refresh();
      } else {
        showToast({ message: result.error ?? "Could not delete roster.", variant: "error" });
      }
    });
  }

  function handleRemoveMember(profileId: string, memberName: string) {
    startTransition(async () => {
      const result = await removeTalentFromRoster(roster.id, profileId);
      if (result.ok) {
        setRoster((current) => ({
          ...current,
          members: current.members.filter((member) => member.profileId !== profileId),
          talentCount: current.talentCount - 1,
        }));
        showToast({ message: `${memberName} removed from roster`, variant: "success" });
      } else {
        showToast({ message: result.error ?? "Could not remove member.", variant: "error" });
      }
    });
  }

  return (
    <div className="space-y-8">
      <FadeInSection>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-3">
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full max-w-md border-none bg-transparent text-2xl font-semibold text-white/95 outline-none focus:ring-0"
              aria-label="Roster name"
            />
            <p className="text-sm text-white/50">
              {roster.talentCount} talent · Created {new Date(roster.createdAt).toLocaleDateString()}
              {roster.kind === "favorites" ? " · Saved Talent" : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {roster.members.length ? (
              <button type="button" className="bd-btn-accent" disabled={isPending} onClick={openBulkInvite}>
                Invite roster to casting
              </button>
            ) : null}
            <button
              type="button"
              className="bd-btn-secondary"
              disabled={isPending || name.trim() === roster.name}
              onClick={handleRename}
            >
              Save name
            </button>
            {roster.kind !== "favorites" ? (
              <button
                type="button"
                className="bd-btn-secondary inline-flex items-center gap-2 text-rose-300"
                disabled={isPending}
                onClick={handleDelete}
              >
                <Trash2 className="size-3.5" aria-hidden />
                Delete
              </button>
            ) : null}
          </div>
        </div>
      </FadeInSection>

      {roster.members.length ? (
        <StaggerList className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" stagger={0.04}>
          {roster.members.map((member) => (
            <article
              key={member.id}
              className="bd-muted-panel bd-interactive-card group relative overflow-hidden p-4"
            >
              <div className="flex items-start gap-3">
                {member.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={member.avatarUrl}
                    alt=""
                    className="size-14 shrink-0 rounded-xl object-cover"
                  />
                ) : (
                  <span className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-white/8 text-lg font-semibold text-white/70">
                    {member.name[0]?.toUpperCase() ?? "?"}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  {member.slug ? (
                    <Link href={`/talent/${member.slug}`} className="font-semibold text-white/92 hover:underline">
                      {member.name}
                    </Link>
                  ) : (
                    <p className="font-semibold text-white/92">{member.name}</p>
                  )}
                  {member.location ? (
                    <p className="mt-0.5 truncate text-sm text-white/50">{member.location}</p>
                  ) : null}
                  {member.styles.length ? (
                    <p className="mt-1 truncate text-xs text-white/40">{member.styles.join(" · ")}</p>
                  ) : null}
                </div>
              </div>
              <button
                type="button"
                className="absolute top-3 right-3 inline-flex size-8 items-center justify-center rounded-full text-white/40 opacity-0 transition hover:bg-white/8 hover:text-white/80 group-hover:opacity-100"
                aria-label={`Remove ${member.name}`}
                disabled={isPending}
                onClick={() => handleRemoveMember(member.profileId, member.name)}
              >
                <UserMinus className="size-3.5" aria-hidden />
              </button>
            </article>
          ))}
        </StaggerList>
      ) : (
        <EmptyState
          variant="dashboard"
          title="No talent in this roster"
          description="Save talent from the Navigator or a profile to build this list."
          actionLabel="Search Talent"
          actionHref="/talent"
        />
      )}

      {invitePicker ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/70"
            aria-label="Close invite picker"
            onClick={() => setInvitePicker(null)}
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-[#151515] p-5 shadow-2xl">
            <h3 className="text-lg font-semibold text-white">Invite roster to casting</h3>
            <p className="mt-1 text-sm text-white/50">{roster.talentCount} members</p>
            {invitePicker.loading ? (
              <p className="mt-4 text-sm text-white/45">Loading projects…</p>
            ) : (
              <ul className="mt-4 max-h-64 space-y-2 overflow-y-auto">
                {invitePicker.targets.map((target) => (
                  <li key={`${target.projectId}-${target.castingId ?? "project"}`}>
                    <button
                      type="button"
                      className="w-full rounded-xl border border-white/10 px-4 py-3 text-left text-sm text-white hover:border-[#2dd4bf]/40"
                      onClick={() => sendBulkInvite(target)}
                    >
                      {target.title}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
