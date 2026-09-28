"use client";

import { Check, ExternalLink, Link2, Loader2 } from "lucide-react";
import { useState } from "react";

import { PanelActions } from "./panel-shared";

export function ProfilePreviewFrame({ path, note }: { path: string; note?: string }) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="portfolio-public">
      {note ? <p className="portfolio-public__note">{note}</p> : null}
      <div className="portfolio-public__frame">
        {!loaded ? (
          <div className="portfolio-public__loading">
            <Loader2 size={20} className="animate-spin" aria-hidden />
          </div>
        ) : null}
        <iframe title="Public profile preview" src={path} onLoad={() => setLoaded(true)} />
      </div>
    </div>
  );
}

export function PublicProfilePanel({ path, actionsHost }: { path: string; actionsHost: HTMLElement | null }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(`${window.location.origin}${path}`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <PanelActions host={actionsHost}>
        <button type="button" className="workspace-notifications__close" aria-label={copied ? "Link copied" : "Copy profile link"} title="Copy link" onClick={() => void copy()}>
          {copied ? <Check size={16} aria-hidden /> : <Link2 size={16} aria-hidden />}
        </button>
        <a className="workspace-notifications__close" href={path} target="_blank" rel="noopener noreferrer" aria-label="Open public profile in a new tab" title="Open in new tab">
          <ExternalLink size={16} aria-hidden />
        </a>
      </PanelActions>
      <ProfilePreviewFrame path={path} note="This is what casting teams see. Saved changes appear here automatically." />
    </>
  );
}
