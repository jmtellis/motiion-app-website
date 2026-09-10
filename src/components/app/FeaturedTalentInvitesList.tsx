"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { respondFeaturedTalentAction } from "@/app/(buyer-app)/(paid)/calendar/featured-talent-actions";

export type FeaturedTalentInviteCard = {
  id: string;
  activityId: string;
  activityTitle: string;
  parentId: string | null;
  coverImageUrl: string | null;
};

export function FeaturedTalentInvitesList({
  invites,
}: {
  invites: FeaturedTalentInviteCard[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (!invites.length) return null;

  function respond(id: string, activityId: string, action: "accept" | "decline") {
    startTransition(async () => {
      await respondFeaturedTalentAction({ id, action, activityId });
      router.refresh();
    });
  }

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold tracking-[-0.01em] text-[#fafafa]">
        Event feature invites
      </h2>
      <ul className="space-y-3">
        {invites.map((invite) => (
          <li
            key={invite.id}
            className="rounded-2xl border border-[#2a2a2a] bg-[#141414] p-4"
          >
            <div className="flex items-start gap-3">
              {invite.coverImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={invite.coverImageUrl}
                  alt=""
                  className="size-12 rounded-xl object-cover"
                />
              ) : (
                <span className="flex size-12 items-center justify-center rounded-xl bg-[#222] text-sm text-[#888]">
                  E
                </span>
              )}
              <div className="min-w-0 flex-1 space-y-2">
                <div>
                  <p className="text-sm font-semibold text-[#fafafa]">{invite.activityTitle}</p>
                  <p className="text-xs text-[#8a8a8a]">
                    {invite.parentId
                      ? "You've been invited as supporting talent"
                      : "You've been invited as featured talent"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={isPending}
                    className="rounded-full bg-[#fafafa] px-3 py-1.5 text-xs font-semibold text-[#111]"
                    onClick={() => respond(invite.id, invite.activityId, "accept")}
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    className="rounded-full border border-[#333] px-3 py-1.5 text-xs font-semibold text-[#ddd]"
                    onClick={() => respond(invite.id, invite.activityId, "decline")}
                  >
                    Decline
                  </button>
                  <Link
                    href={`/event/${invite.activityId}`}
                    className="rounded-full border border-[#333] px-3 py-1.5 text-xs font-semibold text-[#ddd]"
                  >
                    View event
                  </Link>
                  {!invite.parentId ? (
                    <Link
                      href={`/events/${invite.activityId}/featured`}
                      className="rounded-full border border-[#333] px-3 py-1.5 text-xs font-semibold text-[#ddd]"
                    >
                      Manage after accept
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
