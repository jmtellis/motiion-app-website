"use client";

import {
  Bookmark,
  CalendarClock,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Download,
  Send,
} from "lucide-react";

import { MarketingScene, type MarketingSceneProps } from "@/components/marketing/MarketingScene";
import { MockArtboard } from "@/components/marketing/MockArtboard";
import { useSceneTimeline } from "@/components/marketing/useSceneTimeline";
import { featuredDemoDancer } from "@/lib/demo/dancers";

const STEPS = [
  { at: 0, set: "about" },
  { at: 1800, set: "resume" },
  { at: 3600, set: "visuals" },
  { at: 5200, set: "hold" },
];

const TABS = ["About", "Resume", "Visuals"] as const;

export function ProfileScene({ play, reduceMotion = false, playKey }: MarketingSceneProps) {
  const beat = useSceneTimeline(STEPS, { play, reduceMotion, restartKey: playKey });
  const dancer = featuredDemoDancer;
  const tab =
    beat === "resume" ? "Resume" : beat === "visuals" || beat === "hold" ? "Visuals" : "About";
  const portraitIndex = tab === "Visuals" ? 1 : 0;
  const portrait = dancer.headshots[portraitIndex] ?? dancer.imageUrl;

  return (
    <MarketingScene>
      <MockArtboard className="md-mock--profile">
        <div className="md-mock__body md-mock__body--profile">
          <div className="md-mock__profile-panel">
            <h2 className="md-mock__profile-name">{dancer.name}</h2>
            <p className="md-mock__profile-handle">
              @{dancer.slug}
            </p>
            <p className="md-mock__profile-location">{dancer.location}</p>

            <div className="md-mock__attr-strip">
              <div>
                <strong>{dancer.gender === "Female" ? "F" : "M"}</strong>
                <span>Gender</span>
              </div>
              <div>
                <strong>{dancer.height}</strong>
                <span>Height</span>
              </div>
              <div>
                <strong>{dancer.unionStatus}</strong>
                <span>Union</span>
              </div>
              <div>
                <strong>{dancer.agency.split(" ")[0]}</strong>
                <span>Agency</span>
              </div>
            </div>

            <div className="md-mock__profile-tabs">
              {TABS.map((item) => (
                <span
                  key={item}
                  className={`md-mock__profile-tab${tab === item ? " md-mock__profile-tab--active" : ""}`}
                >
                  {item}
                </span>
              ))}
            </div>

            <div className="md-mock__profile-content">
              {tab === "About" ? (
                <>
                  <p className="md-mock__profile-section-title">Highlights</p>
                  {dancer.credits.slice(0, 3).map((credit) => (
                    <div key={`${credit.artist}-${credit.role}`} className="md-mock__credit">
                      <div>
                        <strong>{credit.artist}</strong>
                        <span>{credit.role}</span>
                      </div>
                      <span>{credit.year}</span>
                    </div>
                  ))}
                  <p className="md-mock__profile-section-title" style={{ marginTop: 18 }}>
                    Styles
                  </p>
                  <div className="md-mock__profile-attrs">
                    {dancer.styles.slice(0, 5).map((style) => (
                      <span key={style} className="md-mock__chip">
                        {style}
                      </span>
                    ))}
                  </div>
                </>
              ) : null}

              {tab === "Resume" ? (
                <>
                  <p className="md-mock__profile-section-title">Experience</p>
                  {dancer.credits.map((credit) => (
                    <div key={`${credit.artist}-${credit.role}-resume`} className="md-mock__credit">
                      <div>
                        <strong>{credit.artist}</strong>
                        <span>{credit.role}</span>
                      </div>
                      <span>{credit.year}</span>
                    </div>
                  ))}
                </>
              ) : null}

              {tab === "Visuals" ? (
                <>
                  <p className="md-mock__profile-section-title">Visuals</p>
                  <div className="md-mock__visual-grid">
                    {(dancer.headshots.length ? dancer.headshots : [dancer.imageUrl])
                      .slice(0, 4)
                      .map((url) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={url} src={url} alt="" />
                      ))}
                  </div>
                </>
              ) : null}
            </div>
          </div>

          <div className="md-mock__portrait">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={portrait} alt="" />
            <span className="md-mock__portrait-nav md-mock__portrait-nav--left">
              <ChevronLeft className="size-4" aria-hidden />
            </span>
            <span className="md-mock__portrait-nav md-mock__portrait-nav--right">
              <ChevronRight className="size-4" aria-hidden />
            </span>
            <p className="md-mock__portrait-count">
              {portraitIndex + 1} / {Math.max(dancer.headshots.length, 1)}
            </p>
          </div>

          <aside className="md-mock__profile-actions">
            <p className="md-mock__profile-actions-title">Actions</p>
            <span className="md-mock__btn md-mock__btn--ghost md-mock__btn--block">
              <Bookmark className="size-3.5" aria-hidden />
              Save to Library
            </span>
            <span className="md-mock__btn md-mock__btn--ghost md-mock__btn--block">
              <CalendarPlus className="size-3.5" aria-hidden />
              Add to Project
            </span>
            <span className="md-mock__btn md-mock__btn--ghost md-mock__btn--block">
              <Send className="size-3.5" aria-hidden />
              Just Invite
            </span>
            <span className="md-mock__btn md-mock__btn--ghost md-mock__btn--block">
              <CalendarClock className="size-3.5" aria-hidden />
              Ask Availability
            </span>
            <span className="md-mock__btn md-mock__btn--ghost md-mock__btn--block">
              <ClipboardList className="size-3.5" aria-hidden />
              Request Size Sheet
            </span>
            <span className="md-mock__btn md-mock__btn--block">
              <Download className="size-3.5" aria-hidden />
              Download Resume
            </span>
            <p className="md-mock__availability">{dancer.availabilityLabel}</p>
          </aside>
        </div>
      </MockArtboard>
    </MarketingScene>
  );
}
