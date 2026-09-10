"use client";

import { useEffect, useState, useTransition } from "react";
import { Copy, Link2, Trash2 } from "lucide-react";

import {
  createOffPlatformFeaturedTalentInviteAction,
  inviteFeaturedTalentAction,
  listOffPlatformFeaturedTalentInvitesAction,
  removeFeaturedTalentAction,
  revokeOffPlatformFeaturedTalentInviteAction,
  setFeaturedTalentVideoAction,
  type OffPlatformFeaturedInvite,
} from "@/app/(buyer-app)/(paid)/calendar/featured-talent-actions";
import { ActivityPeoplePicker } from "@/components/talent-buyers/activities/ActivityPeoplePicker";
import type { FeaturedTalentRow } from "@/lib/talent-buyers/activities/featured-talent";
import type { DraftPersonRef } from "@/lib/talent-buyers/activities/types";

export function FeaturedTalentManagePanel({
  activityId,
  initialTree,
  canManage = true,
  allowVideoEdit = false,
  level1SelfId = null,
}: {
  activityId: string;
  initialTree: FeaturedTalentRow[];
  canManage?: boolean;
  /** When true, Level 1 talent can edit their own video URL. */
  allowVideoEdit?: boolean;
  /** Current user's Level 1 row id when managing as featured talent. */
  level1SelfId?: string | null;
}) {
  const [tree, setTree] = useState(initialTree);
  const [offPlatformInvites, setOffPlatformInvites] = useState<OffPlatformFeaturedInvite[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [offPlatformName, setOffPlatformName] = useState("");
  const [offPlatformEmail, setOffPlatformEmail] = useState("");
  const [offPlatformParentId, setOffPlatformParentId] = useState<string | null>(null);
  const [showOffPlatformForm, setShowOffPlatformForm] = useState(false);
  const [copiedInviteId, setCopiedInviteId] = useState<string | null>(null);
  const [videoDrafts, setVideoDrafts] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const row of initialTree) {
      map[row.id] = row.videoUrl ?? "";
    }
    return map;
  });

  useEffect(() => {
    if (!canManage && !level1SelfId) return;
    let cancelled = false;
    void (async () => {
      const result = await listOffPlatformFeaturedTalentInvitesAction(activityId);
      if (cancelled || !result.ok) return;
      setOffPlatformInvites(result.invites);
    })();
    return () => {
      cancelled = true;
    };
  }, [activityId, canManage, level1SelfId]);

  function invite(people: DraftPersonRef[], parentId: string | null) {
    if (!people.length) return;
    const person = people[people.length - 1];
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await inviteFeaturedTalentAction({
        activityId,
        talentUserId: person.userId,
        parentId,
      });
      if (!result.ok) {
        setError(result.error ?? "Could not invite.");
        return;
      }
      setMessage(`Invite sent to ${person.displayName}.`);
      const optimistic: FeaturedTalentRow = {
        id: result.id ?? `tmp_${person.userId}`,
        activityId,
        talentUserId: person.userId,
        parentId,
        invitedByUserId: "",
        status: "pending",
        videoUrl: null,
        sortOrder: 999,
        person: {
          userId: person.userId,
          displayName: person.displayName,
          headshotUrl: person.headshotUrl,
          username: null,
        },
        children: [],
      };
      setTree((prev) => {
        if (!parentId) {
          if (prev.some((row) => row.talentUserId === person.userId)) return prev;
          return [...prev, optimistic];
        }
        return prev.map((row) => {
          if (row.id !== parentId) return row;
          if (row.children.some((child) => child.talentUserId === person.userId)) return row;
          return { ...row, children: [...row.children, optimistic] };
        });
      });
    });
  }

  function createOffPlatformInvite() {
    const name = offPlatformName.trim();
    if (!name) {
      setError("Enter a name for the invite.");
      return;
    }
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await createOffPlatformFeaturedTalentInviteAction({
        activityId,
        displayName: name,
        parentId: offPlatformParentId,
        email: offPlatformEmail.trim() || null,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOffPlatformInvites((prev) => [result.invite, ...prev]);
      setOffPlatformName("");
      setOffPlatformEmail("");
      setShowOffPlatformForm(false);
      setOffPlatformParentId(null);
      setMessage(`Invite link created for ${result.invite.displayName}.`);
      try {
        await navigator.clipboard.writeText(result.invite.url);
        setCopiedInviteId(result.invite.id);
      } catch {
        // ignore clipboard failures
      }
    });
  }

  function copyInviteLink(invite: OffPlatformFeaturedInvite) {
    startTransition(async () => {
      try {
        await navigator.clipboard.writeText(invite.url);
        setCopiedInviteId(invite.id);
        setMessage("Invite link copied.");
      } catch {
        setError("Could not copy link.");
      }
    });
  }

  function revokeOffPlatform(id: string) {
    setError(null);
    startTransition(async () => {
      const result = await revokeOffPlatformFeaturedTalentInviteAction({ id, activityId });
      if (!result.ok) {
        setError(result.error ?? "Could not revoke invite.");
        return;
      }
      setOffPlatformInvites((prev) => prev.filter((invite) => invite.id !== id));
      setMessage("Invite revoked.");
    });
  }

  function remove(id: string) {
    setError(null);
    startTransition(async () => {
      const result = await removeFeaturedTalentAction({ id, activityId });
      if (!result.ok) {
        setError(result.error ?? "Could not remove.");
        return;
      }
      setTree((prev) =>
        prev
          .filter((row) => row.id !== id)
          .map((row) => ({
            ...row,
            children: row.children.filter((child) => child.id !== id),
          })),
      );
      setMessage("Removed from featured lineup.");
    });
  }

  function saveVideo(id: string) {
    setError(null);
    startTransition(async () => {
      const result = await setFeaturedTalentVideoAction({
        id,
        activityId,
        videoUrl: videoDrafts[id] ?? "",
      });
      if (!result.ok) {
        setError(result.error ?? "Could not save video.");
        return;
      }
      setTree((prev) =>
        prev.map((row) =>
          row.id === id ? { ...row, videoUrl: (videoDrafts[id] ?? "").trim() || null } : row,
        ),
      );
      setMessage("Video link saved.");
    });
  }

  const statusLabel = (status: string) => {
    if (status === "accepted") return "Accepted";
    if (status === "pending") return "Invite pending";
    return status;
  };

  const visibleOffPlatform = offPlatformInvites.filter((invite) => {
    if (canManage) return true;
    return Boolean(invite.parentId && invite.parentId === level1SelfId);
  });

  return (
    <div className="space-y-4">
      {message ? <p className="text-sm text-emerald-300">{message}</p> : null}
      {error ? <p className="text-sm text-amber-300">{error}</p> : null}

      {canManage ? (
        <div className="space-y-3">
          <ActivityPeoplePicker
            label="Invite featured talent"
            talentOnly
            selected={[]}
            emptyHint="Search talent to invite as featured."
            placeholder="Search talent by name or username"
            onChange={(people) => invite(people, null)}
          />
          {!showOffPlatformForm ? (
            <button
              type="button"
              className="text-sm font-medium text-[#00aacc] hover:text-[#33bbd6]"
              onClick={() => {
                setOffPlatformParentId(null);
                setShowOffPlatformForm(true);
              }}
            >
              Invite someone not on Motiion
            </button>
          ) : null}
        </div>
      ) : null}

      {showOffPlatformForm ? (
        <div className="activity-create-wizard__panel space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/45">
            Invite someone not on Motiion
          </p>
          <input
            value={offPlatformName}
            onChange={(event) => setOffPlatformName(event.target.value)}
            placeholder="Full name"
            className="w-full rounded-full border border-white/12 bg-black/30 px-3.5 py-2 text-sm text-white outline-none placeholder:text-white/35 focus:border-white/30"
          />
          <input
            value={offPlatformEmail}
            onChange={(event) => setOffPlatformEmail(event.target.value)}
            placeholder="Email (optional)"
            className="w-full rounded-full border border-white/12 bg-black/30 px-3.5 py-2 text-sm text-white outline-none placeholder:text-white/35 focus:border-white/30"
          />
          <p className="text-xs text-white/45">
            Creates a share link. They sign up on Motiion and get linked as featured talent.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="bd-btn-primary"
              disabled={isPending || !offPlatformName.trim()}
              onClick={() => createOffPlatformInvite()}
            >
              <Link2 className="size-3.5" />
              Create link
            </button>
            <button
              type="button"
              className="bd-btn-secondary"
              disabled={isPending}
              onClick={() => {
                setShowOffPlatformForm(false);
                setOffPlatformParentId(null);
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {tree.length === 0 ? (
        <p className="text-sm text-white/55">No featured talent yet.</p>
      ) : (
        tree.map((row) => {
          const canEditVideo =
            allowVideoEdit && level1SelfId === row.id && row.status === "accepted";
          const showVideoField = canManage || canEditVideo;
          return (
            <div key={row.id} className="activity-create-wizard__panel space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  {row.person.headshotUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={row.person.headshotUrl}
                      alt=""
                      className="size-10 rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex size-10 items-center justify-center rounded-full bg-white/10 text-sm text-white/70">
                      {row.person.displayName.slice(0, 1)}
                    </span>
                  )}
                  <div>
                    <p className="text-sm font-semibold text-white">{row.person.displayName}</p>
                    <p className="text-xs text-white/50">{statusLabel(row.status)}</p>
                  </div>
                </div>
                {canManage ? (
                  <button
                    type="button"
                    className="bd-btn-secondary"
                    disabled={isPending}
                    onClick={() => remove(row.id)}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                ) : null}
              </div>

              {showVideoField && row.status === "accepted" ? (
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.12em] text-white/45">
                    Showcase video link
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <input
                      value={videoDrafts[row.id] ?? ""}
                      onChange={(event) =>
                        setVideoDrafts((prev) => ({ ...prev, [row.id]: event.target.value }))
                      }
                      placeholder="https://…"
                      className="min-w-[220px] flex-1 rounded-full border border-white/12 bg-black/30 px-3.5 py-2 text-sm text-white outline-none placeholder:text-white/35 focus:border-white/30"
                    />
                    <button
                      type="button"
                      className="bd-btn-secondary"
                      disabled={isPending}
                      onClick={() => saveVideo(row.id)}
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : null}

              {(canManage || level1SelfId === row.id) && row.status === "accepted" ? (
                <div className="space-y-2">
                  <ActivityPeoplePicker
                    label="Invite supporting talent"
                    talentOnly
                    selected={[]}
                    emptyHint="Add talent performing under them."
                    placeholder="Search talent"
                    onChange={(people) => invite(people, row.id)}
                  />
                  <button
                    type="button"
                    className="text-sm font-medium text-[#00aacc] hover:text-[#33bbd6]"
                    onClick={() => {
                      setOffPlatformParentId(row.id);
                      setShowOffPlatformForm(true);
                    }}
                  >
                    Invite someone not on Motiion
                  </button>
                </div>
              ) : null}

              {row.children.length > 0 ? (
                <ul className="space-y-2 border-l border-white/10 pl-4">
                  {row.children.map((child) => (
                    <li key={child.id} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {child.person.headshotUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={child.person.headshotUrl}
                            alt=""
                            className="size-8 rounded-full object-cover"
                          />
                        ) : (
                          <span className="flex size-8 items-center justify-center rounded-full bg-white/10 text-xs text-white/70">
                            {child.person.displayName.slice(0, 1)}
                          </span>
                        )}
                        <div>
                          <p className="text-sm text-white">{child.person.displayName}</p>
                          <p className="text-xs text-white/45">{statusLabel(child.status)}</p>
                        </div>
                      </div>
                      {canManage || level1SelfId === row.id ? (
                        <button
                          type="button"
                          className="bd-btn-secondary"
                          disabled={isPending}
                          onClick={() => remove(child.id)}
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          );
        })
      )}

      {visibleOffPlatform.length > 0 ? (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/45">
            Not on Motiion yet
          </p>
          {visibleOffPlatform.map((invite) => (
            <div
              key={invite.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
            >
              <div>
                <p className="text-sm font-semibold text-white">{invite.displayName}</p>
                <p className="text-xs text-white/50">Invite sent · not on Motiion</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="bd-btn-secondary"
                  disabled={isPending}
                  onClick={() => copyInviteLink(invite)}
                >
                  <Copy className="size-3.5" />
                  {copiedInviteId === invite.id ? "Copied" : "Copy link"}
                </button>
                <button
                  type="button"
                  className="bd-btn-secondary"
                  disabled={isPending}
                  onClick={() => revokeOffPlatform(invite.id)}
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
