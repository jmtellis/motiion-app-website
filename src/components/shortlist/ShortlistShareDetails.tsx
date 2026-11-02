"use client";
import { useEffect, useState } from "react";
import type { PublicShortlistShare } from "@/types/publicShortlist";

export function ShortlistShareDetails({ share, onExpire }: { share: PublicShortlistShare; onExpire: () => void }) {
  const [now, setNow] = useState(() => Date.now());
  const end = share.expirationKind !== "until_casting_closes" && share.expiresAt ? Date.parse(share.expiresAt) : NaN;
  const start = share.createdAt ? Date.parse(share.createdAt) : NaN;
  const remaining = Number.isFinite(end) ? Math.max(0, end - now) : null;
  const fraction = remaining !== null && Number.isFinite(start) && end > start ? Math.min(1, remaining / (end - start)) : 1;
  const duration = remaining === null ? (share.expirationKind === "until_casting_closes" ? "Until casting closes" : "No expiration date") : remaining === 0 ? "Review link expired" : remaining >= 86400000 ? `${Math.ceil(remaining / 86400000)} days remaining` : remaining >= 3600000 ? `${Math.ceil(remaining / 3600000)} hours remaining` : `${Math.ceil(remaining / 60000)} minutes remaining`;
  useEffect(() => {
    const timer = setInterval(() => { setNow(Date.now()); if (Number.isFinite(end) && Date.now() >= end) onExpire(); }, 30000);
    const expiry = Number.isFinite(end) ? setTimeout(() => { setNow(Date.now()); if (Date.now() >= end) onExpire(); }, Math.min(Math.max(0, end - Date.now()), 2147483647)) : undefined;
    return () => { clearInterval(timer); clearTimeout(expiry); };
  }, [end, onExpire]);
  return <div className="shortlist-sharing">
    <button className="shortlist-sharing__avatar" popoverTarget="shortlist-share-info" aria-label={`Sharing details — ${duration}`} title={duration}>
      {share.sharedBy?.avatarUrl ? <img src={share.sharedBy.avatarUrl} alt="" /> : <span>{(share.sharedBy?.name || "M").slice(0, 1)}</span>}
      <svg viewBox="0 0 44 44" aria-hidden="true"><circle className="shortlist-ring-track" cx="22" cy="22" r="20" /><circle className="shortlist-ring-progress" cx="22" cy="22" r="20" pathLength="100" strokeDasharray="100" strokeDashoffset={100 * (1 - fraction)} /></svg>
    </button>
    <div id="shortlist-share-info" popover="auto" data-lenis-prevent><h2>Shared with you</h2><p>Shared by {share.sharedBy?.name || "your casting team"}</p><p>{duration}</p>{Number.isFinite(end) && <p>Review by {new Date(end).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</p>}</div>
  </div>;
}
