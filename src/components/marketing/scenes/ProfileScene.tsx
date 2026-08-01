"use client";

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
  const portrait =
    tab === "Visuals" ? (dancer.headshots[1] ?? dancer.imageUrl) : dancer.imageUrl;

  return (
    <MarketingScene>
      <MockArtboard className="md-mock--profile">
        <div className="md-mock__body">
          <div className="md-mock__portrait">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={portrait} alt="" />
            <p className="md-mock__portrait-count">
              1 / {Math.max(dancer.headshots.length, 1)}
            </p>
          </div>

          <div className="md-mock__profile-panel">
            <h2 className="md-mock__profile-name">{dancer.name}</h2>
            <p className="md-mock__profile-handle">
              @{dancer.slug} · {dancer.location}
            </p>

            <div className="md-mock__profile-attrs">
              <span className="md-mock__chip">{dancer.gender === "Female" ? "F" : "M"}</span>
              <span className="md-mock__chip">{dancer.height}</span>
              <span className="md-mock__chip">{dancer.agency}</span>
              <span className="md-mock__chip md-mock__chip--accent">{dancer.availabilityLabel}</span>
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
                      .slice(0, 2)
                      .map((url) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={url} src={url} alt="" />
                      ))}
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </MockArtboard>
    </MarketingScene>
  );
}
