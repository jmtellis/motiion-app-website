"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useMemo, useState } from "react";

import type {
  ProfileExperience,
  ProfileHighlight,
  ProfileVisual,
  PublicTalentProfile,
} from "@/types/public";
import { TalentCreditsManager } from "@/components/talent/TalentCreditsManager";

type ProfileTab = "about" | "resume" | "credits" | "visuals";

const TABS: { id: ProfileTab; label: string }[] = [
  { id: "about", label: "About" },
  { id: "resume", label: "Resume" },
  { id: "credits", label: "Credits" },
  { id: "visuals", label: "Visuals" },
];

const monoLabelClass = "font-mono text-xs font-medium tracking-[0.08em] text-[#8a8a8a] uppercase";

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
      <header className="flex flex-col gap-6 border-b border-[#262626] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex gap-5">
          <Headshot url={headshot} name={displayName} />
          <div className="min-w-0">
            <p className="font-mono text-xs font-medium tracking-[0.08em] text-[#5a5a5a] uppercase">
              Portfolio
            </p>
            <h1 className="mt-1.5 text-[1.75rem] font-semibold leading-[1.15] tracking-[-0.02em] text-[#fafafa]">
              {displayName}
            </h1>
            <p className="mt-1.5 font-mono text-xs text-[#5a5a5a]">
              {[profile.username ? `@${profile.username}` : null, profile.location]
                .filter(Boolean)
                .join("  ·  ")}
            </p>
          </div>
        </div>
        {profile.username ? (
          <Link
            href={`/profile/${profile.username}`}
            className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-[#262626] bg-[#1e1e1e] px-4 text-sm font-medium text-[#eaeaea] transition-colors hover:bg-[#2a2a2a]"
            target="_blank"
            rel="noopener noreferrer"
          >
            View public page
            <ArrowUpRight className="size-3.5 text-[#8a8a8a]" aria-hidden />
          </Link>
        ) : null}
      </header>

      <nav aria-label="Portfolio sections" className="flex flex-wrap gap-1">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
              tab === item.id
                ? "bg-[#1e1e1e] text-[#fafafa]"
                : "text-[#8a8a8a] hover:bg-[#151515] hover:text-[#eaeaea]"
            }`}
            aria-pressed={tab === item.id}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {highlights.length > 0 ? (
        <section className="space-y-3">
          <h2 className={monoLabelClass}>Highlights</h2>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {highlights.map((item) => (
              <HighlightCard key={item.id} item={item} />
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
      {tab === "credits" ? <TalentCreditsManager /> : null}
      {tab === "visuals" ? <VisualsPanel visuals={orderVisuals(profile.profile_visuals ?? [])} /> : null}
    </div>
  );
}

function Headshot({ url, name }: { url: string | null; name: string }) {
  if (url) {
    return (
      <div className="relative size-20 shrink-0 overflow-hidden rounded-[14px] border border-[#262626] bg-[#1e1e1e]">
        <Image src={url} alt="" fill className="object-cover" unoptimized />
      </div>
    );
  }

  return (
    <div className="flex size-20 shrink-0 items-center justify-center rounded-[14px] border border-[#262626] bg-[#0c2a26] font-mono text-lg font-medium text-[#2dd4bf]">
      {name.slice(0, 2).toUpperCase()}
    </div>
  );
}

function HighlightCard({ item }: { item: ProfileHighlight }) {
  return (
    <article className="min-w-[13rem] shrink-0 rounded-[14px] border border-[#262626] bg-[#151515] p-4">
      <p className="text-sm font-medium text-[#fafafa]">{item.title}</p>
      {item.subtitle ? <p className="mt-1 text-sm text-[#8a8a8a]">{item.subtitle}</p> : null}
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
  const facts: Array<{ label: string; value: string }> = [
    profile.representation ? { label: "Representation", value: profile.representation } : null,
    profile.gender ? { label: "Gender", value: profile.gender } : null,
    profile.height ? { label: "Height", value: profile.height } : null,
    profile.union_status ? { label: "Union", value: profile.union_status } : null,
  ].filter((row): row is { label: string; value: string } => row !== null);

  return (
    <section className="grid gap-6 rounded-[14px] border border-[#262626] bg-[#151515] p-6 md:grid-cols-2">
      <div>
        <h2 className={monoLabelClass}>Details</h2>
        {facts.length ? (
          <dl className="mt-4 divide-y divide-[#262626]">
            {facts.map((row) => (
              <div key={row.label} className="flex items-baseline justify-between gap-4 py-2.5">
                <dt className="font-mono text-xs tracking-[0.08em] text-[#5a5a5a] uppercase">{row.label}</dt>
                <dd className="text-right text-sm font-medium text-[#eaeaea]">{row.value}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="mt-4 text-sm text-[#5a5a5a]">No details added yet.</p>
        )}
      </div>
      <div>
        {styleTags.length ? (
          <>
            <h3 className={monoLabelClass}>Styles & types</h3>
            <ul className="mt-3 flex flex-wrap gap-2">
              {styleTags.map((tag) => (
                <li
                  key={tag}
                  className="rounded-full border border-[#262626] bg-[#1e1e1e] px-3 py-1 text-xs font-medium text-[#a3a3a3] capitalize"
                >
                  {tag}
                </li>
              ))}
            </ul>
          </>
        ) : null}
        {profile.skills?.length ? (
          <>
            <h3 className={`mt-6 ${monoLabelClass}`}>Skills</h3>
            <ul className="mt-3 flex flex-wrap gap-2">
              {profile.skills.map((skill) => (
                <li
                  key={skill}
                  className="rounded-full border border-[#262626] px-3 py-1 text-xs text-[#8a8a8a] capitalize"
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
        <a
          href={resumeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-10 items-center gap-1.5 rounded-full border border-[#262626] bg-[#1e1e1e] px-4 text-sm font-medium text-[#eaeaea] transition-colors hover:bg-[#2a2a2a]"
        >
          Open resume PDF
          <ArrowUpRight className="size-3.5 text-[#8a8a8a]" aria-hidden />
        </a>
      ) : null}
      <div className="rounded-[14px] border border-[#262626] bg-[#151515] p-6">
        <h2 className={monoLabelClass}>Experience</h2>
        {experiences.length ? (
          <ul className="mt-4 divide-y divide-[#262626]">
            {experiences.map((item, index) => (
              <li key={`${item.title}-${index}`} className="py-4 first:pt-0 last:pb-0">
                <p className="text-sm font-medium text-[#fafafa]">{item.title}</p>
                {item.role ? <p className="mt-0.5 text-sm text-[#8a8a8a]">{item.role}</p> : null}
                {item.credits ? <p className="mt-1 text-sm text-[#8a8a8a]">{item.credits}</p> : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-[#5a5a5a]">No credits added yet.</p>
        )}
      </div>
      <div className="rounded-[14px] border border-[#262626] bg-[#151515] p-6">
        <h2 className={monoLabelClass}>Training</h2>
        {training?.length ? (
          <ul className="mt-4 divide-y divide-[#262626]">
            {training.map((item, index) => (
              <li key={`${item.title ?? item.organization ?? "training"}-${index}`} className="py-3 first:pt-0 last:pb-0">
                <p className="text-sm font-medium text-[#fafafa]">
                  {item.title ?? item.organization ?? "Training"}
                </p>
                {item.organization && item.title ? (
                  <p className="mt-0.5 text-sm text-[#8a8a8a]">{item.organization}</p>
                ) : null}
                {item.year ? <p className="mt-0.5 font-mono text-xs text-[#5a5a5a]">{item.year}</p> : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-[#5a5a5a]">No training listed yet.</p>
        )}
      </div>
    </section>
  );
}

function VisualsPanel({ visuals }: { visuals: ProfileVisual[] }) {
  if (!visuals.length) {
    return (
      <p className="rounded-[14px] border border-dashed border-[#262626] bg-[#151515] px-8 py-12 text-center text-sm text-[#8a8a8a]">
        No visuals uploaded yet.
      </p>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {visuals.map((visual) => (
        <article
          key={visual.id}
          className="overflow-hidden rounded-[14px] border border-[#262626] bg-[#151515]"
        >
          {visual.url ? (
            <div className="relative aspect-[4/5] bg-[#1e1e1e]">
              <Image src={visual.url} alt={visual.kind} fill className="object-cover" unoptimized />
            </div>
          ) : null}
          <p className="px-4 py-2.5 font-mono text-xs font-medium tracking-[0.08em] text-[#8a8a8a] uppercase">
            {visual.kind}
          </p>
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
