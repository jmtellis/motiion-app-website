"use client";

import { useMemo, useState } from "react";

import { OpenInAppBar } from "@/components/product/OpenInAppBar";
import { PublicPageAnalytics } from "@/components/analytics/PublicPageAnalytics";
import { ProductShell } from "@/components/product/ProductShell";
import type {
  ProfileExperience,
  ProfileHighlight,
  ProfileVisual,
  PublicTalentProfile,
} from "@/types/public";

type ProfileTab = "about" | "resume" | "visuals";

const TABS: { id: ProfileTab; label: string }[] = [
  { id: "about", label: "About" },
  { id: "resume", label: "Resume" },
  { id: "visuals", label: "Visuals" },
];

export default function ProfilePageClient({ profile }: { profile: PublicTalentProfile }) {
  const [tab, setTab] = useState<ProfileTab>("about");

  const displayName = profile.full_name?.trim() || "Talent profile";
  const headshot = profile.headshot_url;
  const highlights = profile.profile_highlights ?? [];
  const styleTags = useMemo(
    () => uniqueTags([...profile.styles, ...profile.talent_types]),
    [profile.styles, profile.talent_types],
  );

  return (
    <ProductShell>
      <PublicPageAnalytics
        eventName="profile_viewed"
        properties={{ slug: profile.username ?? profile.id }}
        path={`/profile/${profile.username ?? profile.id}`}
      />
      <main style={{ display: "grid", gap: 20 }}>
        <header className="product-profile-header" style={{ display: "grid", gap: 16 }}>
          <div style={{ display: "flex", gap: 14, alignItems: "center", minWidth: 0 }}>
            <Headshot url={headshot} name={displayName} />
            <div style={{ minWidth: 0 }}>
              <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: -0.5, lineHeight: 1.1 }}>
                {displayName}
              </h1>
              {profile.username ? (
                <p style={{ margin: "6px 0 0", fontSize: 14, color: "var(--text-low)" }}>@{profile.username}</p>
              ) : null}
              {profile.location ? (
                <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--text-low)" }}>{profile.location}</p>
              ) : null}
              {profile.representation ? (
                <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-low)" }}>{profile.representation}</p>
              ) : null}
            </div>
          </div>

          <nav
            className="product-profile-tabs"
            aria-label="Profile sections"
            style={{ display: "flex", gap: 20, flexWrap: "wrap" }}
          >
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                className="product-tab"
                data-active={tab === item.id}
                onClick={() => setTab(item.id)}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </header>

        {highlights.length > 0 ? (
          <section aria-label="Highlights">
            <h2 style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase", color: "var(--text-low)" }}>
              Highlights
            </h2>
            <div className="product-highlights-rail">
              {highlights.map((item) => (
                <HighlightCard key={item.id} highlight={item} />
              ))}
            </div>
          </section>
        ) : null}

        <section style={{ display: "grid", gap: 16 }}>
          {tab === "about" ? <AboutPanel profile={profile} styleTags={styleTags} /> : null}
          {tab === "resume" ? <ResumePanel experiences={profile.experiences} training={profile.training} resumeUrl={profile.resume_url} /> : null}
          {tab === "visuals" ? <VisualsPanel visuals={orderVisuals(profile.profile_visuals)} /> : null}
        </section>

        <OpenInAppBar label="View full profile in Motiion" />
      </main>
    </ProductShell>
  );
}

function Headshot({ url, name }: { url: string | null; name: string }) {
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt=""
        width={72}
        height={72}
        style={{ width: 72, height: 72, borderRadius: 18, objectFit: "cover", flexShrink: 0, border: "1px solid var(--border-low)" }}
      />
    );
  }

  const initials =
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "?";

  return (
    <div
      aria-hidden
      style={{
        width: 72,
        height: 72,
        borderRadius: 18,
        flexShrink: 0,
        display: "grid",
        placeItems: "center",
        fontWeight: 800,
        fontSize: 22,
        background: "var(--surface-overlay)",
        border: "1px solid var(--border-low)",
      }}
    >
      {initials}
    </div>
  );
}

function HighlightCard({ highlight }: { highlight: ProfileHighlight }) {
  const image = highlight.image_url?.trim();
  return (
    <article className="product-highlight-card">
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" />
      ) : (
        <div style={{ aspectRatio: "3/4", background: "var(--surface-accent)" }} />
      )}
      <div style={{ padding: "10px 12px 12px" }}>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, lineHeight: 1.25 }}>{highlight.title}</p>
        {highlight.subtitle ? (
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-low)", lineHeight: 1.3 }}>{highlight.subtitle}</p>
        ) : null}
      </div>
    </article>
  );
}

function AboutPanel({
  profile,
  styleTags,
}: {
  profile: PublicTalentProfile;
  styleTags: string[];
}) {
  const skills = profile.skills ?? [];

  return (
    <div className="product-glass-card" style={{ padding: 16, display: "grid", gap: 14 }}>
      <StatGrid profile={profile} />
      {styleTags.length > 0 ? (
        <TagGroup title="Styles" tags={styleTags} />
      ) : null}
      {skills.length > 0 ? <TagGroup title="Skills" tags={skills} /> : null}
      <SocialLinks profile={profile} />
    </div>
  );
}

function StatGrid({ profile }: { profile: PublicTalentProfile }) {
  const stats = [
    profile.gender,
    profile.height,
    profile.union_status,
  ].filter((v): v is string => Boolean(v?.trim()));

  if (stats.length === 0) return null;

  return (
    <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
      {profile.gender ? (
        <div>
          <dt style={{ margin: 0, fontSize: 11, color: "var(--text-low)", textTransform: "uppercase", letterSpacing: 0.5 }}>Gender</dt>
          <dd style={{ margin: "4px 0 0", fontSize: 15, fontWeight: 600 }}>{profile.gender}</dd>
        </div>
      ) : null}
      {profile.height ? (
        <div>
          <dt style={{ margin: 0, fontSize: 11, color: "var(--text-low)", textTransform: "uppercase", letterSpacing: 0.5 }}>Height</dt>
          <dd style={{ margin: "4px 0 0", fontSize: 15, fontWeight: 600 }}>{profile.height}</dd>
        </div>
      ) : null}
      {profile.union_status ? (
        <div>
          <dt style={{ margin: 0, fontSize: 11, color: "var(--text-low)", textTransform: "uppercase", letterSpacing: 0.5 }}>Union</dt>
          <dd style={{ margin: "4px 0 0", fontSize: 15, fontWeight: 600 }}>{profile.union_status}</dd>
        </div>
      ) : null}
    </dl>
  );
}

function TagGroup({ title, tags }: { title: string; tags: string[] }) {
  return (
    <div>
      <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 700, color: "var(--text-low)", textTransform: "uppercase", letterSpacing: 0.5 }}>
        {title}
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {tags.map((tag) => (
          <span key={tag} className="product-pill">
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

function SocialLinks({ profile }: { profile: PublicTalentProfile }) {
  const links = [
    { label: "Instagram", url: profile.instagram_url },
    { label: "YouTube", url: profile.youtube_url },
  ].filter((l) => l.url?.trim());

  if (links.length === 0) return null;

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
      {links.map((link) => (
        <a
          key={link.label}
          href={link.url!}
          target="_blank"
          rel="noopener noreferrer"
          className="product-pill"
          style={{ textDecoration: "none" }}
        >
          {link.label}
        </a>
      ))}
    </div>
  );
}

function ResumePanel({
  experiences,
  training,
  resumeUrl,
}: {
  experiences: ProfileExperience[];
  training: { title?: string; organization?: string; year?: string }[];
  resumeUrl: string | null;
}) {
  const grouped = groupExperiences(experiences);

  if (grouped.length === 0 && training.length === 0 && !resumeUrl) {
    return <EmptySection message="Resume credits will appear here when added in Motiion." />;
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {resumeUrl ? (
        <a href={resumeUrl} target="_blank" rel="noopener noreferrer" className="product-btn-primary" style={{ textAlign: "center" }}>
          View resume PDF
        </a>
      ) : null}
      {grouped.map(([category, items]) => (
        <div key={category} className="product-glass-card" style={{ padding: 16 }}>
          <h3 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 700 }}>{category}</h3>
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 12 }}>
            {items.map((exp, index) => (
              <li key={`${category}-${index}`} style={{ display: "flex", gap: 12 }}>
                <ExperienceThumb experience={exp} />
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 15 }}>{exp.title}</p>
                  {experienceSubtitle(exp) ? (
                    <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-low)" }}>{experienceSubtitle(exp)}</p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
      {training.length > 0 ? (
        <div className="product-glass-card" style={{ padding: 16 }}>
          <h3 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 700 }}>Training</h3>
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 10 }}>
            {training.map((row, index) => (
              <li key={index} style={{ fontSize: 14 }}>
                <span style={{ fontWeight: 600 }}>{row.title || row.organization || "Training"}</span>
                {row.organization && row.title ? (
                  <span style={{ color: "var(--text-low)" }}> · {row.organization}</span>
                ) : null}
                {row.year ? <span style={{ color: "var(--text-low)" }}> · {row.year}</span> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function ExperienceThumb({ experience }: { experience: ProfileExperience }) {
  const src = experience.tv_film_project_poster_url || experience.image_url;
  if (!src) {
    return (
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 10,
          flexShrink: 0,
          background: "var(--surface-accent)",
        }}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      style={{ width: 44, height: 44, borderRadius: 10, objectFit: "cover", flexShrink: 0 }}
    />
  );
}

function VisualsPanel({ visuals }: { visuals: ProfileVisual[] }) {
  if (visuals.length === 0) {
    return <EmptySection message="Reel and visual slots will appear here when added in Motiion." />;
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {visuals.map((visual) => (
        <article key={visual.id} className="product-glass-card" style={{ overflow: "hidden" }}>
          <div style={{ position: "relative", aspectRatio: "16/9", background: "#111" }}>
            <video
              src={visual.url}
              controls
              playsInline
              preload="metadata"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
            <span
              className="product-pill"
              style={{ position: "absolute", top: 10, right: 10, background: "rgba(0,0,0,0.55)" }}
            >
              {visualChipLabel(visual)}
            </span>
          </div>
        </article>
      ))}
    </div>
  );
}

function EmptySection({ message }: { message: string }) {
  return (
    <div className="product-glass-card" style={{ padding: 20, textAlign: "center" }}>
      <p style={{ margin: 0, color: "var(--text-low)", lineHeight: 1.5 }}>{message}</p>
    </div>
  );
}

function uniqueTags(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const tag = raw.trim();
    if (!tag) continue;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(tag);
  }
  return out.sort((a, b) => a.localeCompare(b));
}

function groupExperiences(experiences: ProfileExperience[]): [string, ProfileExperience[]][] {
  const map = new Map<string, ProfileExperience[]>();
  for (const exp of experiences) {
    const category = formatCategory(exp.category);
    const list = map.get(category) ?? [];
    list.push(exp);
    map.set(category, list);
  }
  return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
}

function formatCategory(raw: string | null | undefined): string {
  if (!raw?.trim()) return "Credits";
  return raw
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function experienceSubtitle(exp: ProfileExperience): string | null {
  const role = exp.role || exp.roles?.[0];
  const credit = exp.credits_display_name || exp.credits;
  const parts = [role, credit].filter((p): p is string => Boolean(p?.trim()));
  return parts.length > 0 ? parts.join(" · ") : null;
}

function orderVisuals(visuals: ProfileVisual[]): ProfileVisual[] {
  const order: Record<ProfileVisual["kind"], number> = {
    reel: 0,
    skill: 1,
    style: 2,
    slate: 3,
    other: 4,
  };
  return [...visuals].sort((a, b) => {
    const kindDiff = order[a.kind] - order[b.kind];
    if (kindDiff !== 0) return kindDiff;
    return (a.sort ?? 0) - (b.sort ?? 0);
  });
}

function visualChipLabel(visual: ProfileVisual): string {
  switch (visual.kind) {
    case "reel":
      return "Reel";
    case "slate":
      return "Slate";
    case "other":
      return "Other";
    case "skill":
      return visual.ref?.trim() ? `Skill: ${visual.ref}` : "Skill";
    case "style":
      return visual.ref?.trim() ? `Style: ${visual.ref}` : "Style";
  }
}
