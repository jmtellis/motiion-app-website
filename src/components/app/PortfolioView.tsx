"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

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

export function PortfolioView({ profile }: { profile: PublicTalentProfile }) {
  const [tab, setTab] = useState<ProfileTab>("about");
  const displayName = profile.full_name?.trim() || "Your portfolio";
  const headshot = profile.headshot_url;
  const highlights = profile.profile_highlights ?? [];
  const styleTags = useMemo(
    () => uniqueTags([...(profile.styles ?? []), ...(profile.talent_types ?? [])]),
    [profile.styles, profile.talent_types],
  );

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex gap-4">
          <Headshot url={headshot} name={displayName} />
          <div>
            <p className="type-eyebrow text-[#8a8a8a]">Portfolio</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-[-0.02em] text-[var(--ink)]">{displayName}</h1>
            {profile.username ? (
              <p className="mt-1 text-sm text-[var(--ink-soft)]">@{profile.username}</p>
            ) : null}
            {profile.location ? <p className="mt-1 text-sm text-[var(--ink-soft)]">{profile.location}</p> : null}
          </div>
        </div>
        {profile.username ? (
          <Link
            href={`/profile/${profile.username}`}
            className="btn-outline text-sm"
            target="_blank"
            rel="noopener noreferrer"
          >
            View public page
          </Link>
        ) : null}
      </header>

      <nav aria-label="Portfolio sections" className="flex flex-wrap gap-2">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              tab === item.id
                ? "bg-[var(--ink)] text-white"
                : "border border-[var(--line)] bg-[var(--surface-card)] text-[var(--ink-soft)] hover:text-[var(--ink)]"
            }`}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {highlights.length > 0 ? (
        <section>
          <h2 className="mb-3 type-eyebrow text-[#8a8a8a]">
            Highlights
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {highlights.map((item) => (
              <article
                key={item.id}
                className="min-w-[12rem] shrink-0 rounded-2xl border border-[var(--line)] bg-[var(--surface-card)] p-4 shadow-[0_8px_24px_rgba(17,17,17,0.04)]"
              >
                <p className="font-semibold text-[var(--ink)]">{item.title}</p>
                {item.subtitle ? <p className="mt-1 text-sm text-[var(--ink-soft)]">{item.subtitle}</p> : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {tab === "about" ? <AboutPanel profile={profile} styleTags={styleTags} /> : null}
      {tab === "resume" ? (
        <ResumePanel
          experiences={profile.experiences ?? []}
          training={profile.training ?? []}
          resumeUrl={profile.resume_url}
        />
      ) : null}
      {tab === "visuals" ? <VisualsPanel visuals={orderVisuals(profile.profile_visuals ?? [])} /> : null}
    </div>
  );
}

function Headshot({ url, name }: { url: string | null; name: string }) {
  if (url) {
    return (
      <div className="relative size-20 shrink-0 overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--tone)]">
        <Image src={url} alt="" fill className="object-cover" unoptimized />
      </div>
    );
  }

  return (
    <div className="flex size-20 shrink-0 items-center justify-center rounded-2xl bg-[#4a7cff] text-lg font-semibold text-white">
      {name.slice(0, 2).toUpperCase()}
    </div>
  );
}

function AboutPanel({
  profile,
  styleTags,
}: {
  profile: PublicTalentProfile;
  styleTags: string[];
}) {
  return (
    <section className="grid gap-6 rounded-2xl border border-[var(--line)] bg-[var(--surface-card)] p-6 md:grid-cols-2">
      <div>
        <h2 className="text-lg font-semibold text-[var(--ink)]">About</h2>
        <dl className="mt-4 space-y-3 text-sm">
          {profile.representation ? (
            <div>
              <dt className="text-[var(--ink-soft)]">Representation</dt>
              <dd className="font-medium text-[var(--ink)]">{profile.representation}</dd>
            </div>
          ) : null}
          {profile.gender ? (
            <div>
              <dt className="text-[var(--ink-soft)]">Gender</dt>
              <dd className="font-medium text-[var(--ink)]">{profile.gender}</dd>
            </div>
          ) : null}
          {profile.height ? (
            <div>
              <dt className="text-[var(--ink-soft)]">Height</dt>
              <dd className="font-medium text-[var(--ink)]">{profile.height}</dd>
            </div>
          ) : null}
          {profile.union_status ? (
            <div>
              <dt className="text-[var(--ink-soft)]">Union</dt>
              <dd className="font-medium text-[var(--ink)]">{profile.union_status}</dd>
            </div>
          ) : null}
        </dl>
      </div>
      <div>
        {styleTags.length ? (
          <>
            <h3 className="text-sm font-semibold text-[var(--ink)]">Styles & types</h3>
            <ul className="mt-3 flex flex-wrap gap-2">
              {styleTags.map((tag) => (
                <li
                  key={tag}
                  className="rounded-full border border-[var(--line)] bg-[var(--tone)] px-3 py-1 text-xs font-medium text-[var(--ink-soft)]"
                >
                  {tag}
                </li>
              ))}
            </ul>
          </>
        ) : null}
        {profile.skills?.length ? (
          <>
            <h3 className="mt-6 text-sm font-semibold text-[var(--ink)]">Skills</h3>
            <ul className="mt-3 flex flex-wrap gap-2">
              {profile.skills.map((skill) => (
                <li
                  key={skill}
                  className="rounded-full border border-[var(--line)] px-3 py-1 text-xs text-[var(--ink-soft)]"
                >
                  {skill}
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </div>
    </section>
  );
}

function ResumePanel({
  experiences,
  training,
  resumeUrl,
}: {
  experiences: ProfileExperience[];
  training: PublicTalentProfile["training"];
  resumeUrl: string | null;
}) {
  return (
    <section className="space-y-6">
      {resumeUrl ? (
        <a href={resumeUrl} target="_blank" rel="noopener noreferrer" className="btn-outline inline-flex text-sm">
          Open resume PDF
        </a>
      ) : null}
      <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-card)] p-6">
        <h2 className="text-lg font-semibold text-[var(--ink)]">Experience</h2>
        {experiences.length ? (
          <ul className="mt-4 space-y-4">
            {experiences.map((item, index) => (
              <li key={`${item.title}-${index}`} className="border-b border-[var(--line)] pb-4 last:border-0 last:pb-0">
                <p className="font-semibold text-[var(--ink)]">{item.title}</p>
                {item.role ? <p className="text-sm text-[var(--ink-soft)]">{item.role}</p> : null}
                {item.credits ? <p className="mt-1 text-sm text-[var(--ink-soft)]">{item.credits}</p> : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-[var(--ink-soft)]">No credits added yet.</p>
        )}
      </div>
      <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-card)] p-6">
        <h2 className="text-lg font-semibold text-[var(--ink)]">Training</h2>
        {training?.length ? (
          <ul className="mt-4 space-y-3">
            {training.map((item, index) => (
              <li key={`${item.title ?? item.organization ?? "training"}-${index}`}>
                <p className="font-semibold text-[var(--ink)]">{item.title ?? item.organization ?? "Training"}</p>
                {item.organization && item.title ? (
                  <p className="text-sm text-[var(--ink-soft)]">{item.organization}</p>
                ) : null}
                {item.year ? <p className="text-sm text-[var(--ink-soft)]">{item.year}</p> : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-[var(--ink-soft)]">No training listed yet.</p>
        )}
      </div>
    </section>
  );
}

function VisualsPanel({ visuals }: { visuals: ProfileVisual[] }) {
  if (!visuals.length) {
    return (
      <p className="rounded-2xl border border-dashed border-[var(--line)] bg-[var(--tone)] px-8 py-12 text-center text-sm text-[var(--ink-soft)]">
        No visuals uploaded yet.
      </p>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {visuals.map((visual) => (
        <article key={visual.id} className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface-card)]">
          {visual.url ? (
            <div className="relative aspect-[4/5] bg-[var(--tone)]">
              <Image
                src={visual.url}
                alt={visual.kind}
                fill
                className="object-cover"
                unoptimized
              />
            </div>
          ) : null}
          <p className="px-3 py-2 text-sm font-medium capitalize text-[var(--ink)]">{visual.kind}</p>
        </article>
      ))}
    </div>
  );
}

function uniqueTags(values: string[]) {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = value.trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function orderVisuals(visuals: ProfileVisual[]) {
  return [...visuals].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
}
