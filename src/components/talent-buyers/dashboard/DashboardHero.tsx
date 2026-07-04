import { CalendarDays, FolderKanban, Users } from "lucide-react";

type DashboardHeroProps = {
  firstName: string;
  subtitle: string;
  stats: {
    activeProjects: number;
    upcomingEvents: number;
    recentTalent: number;
  };
};

function StatPill({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof FolderKanban;
  label: string;
  value: number;
}) {
  return (
    <div className="bd-chip flex items-center gap-3 px-4 py-2.5">
      <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-white/6 text-white/80">
        <Icon className="size-3.5" aria-hidden />
      </span>
      <div>
        <p className="text-lg font-semibold leading-none text-white/92">{value}</p>
        <p className="mt-0.5 text-xs text-white/50">{label}</p>
      </div>
    </div>
  );
}

function HeroDecoration() {
  return (
    <div className="bd-hero-deco hidden shrink-0 sm:block" aria-hidden>
      <span className="bd-hero-deco__ring" />
      <span className="bd-hero-deco__ring" />
      <span className="bd-hero-deco__ring" />
      <span className="bd-hero-deco__dot" />
    </div>
  );
}

export function DashboardHero({ firstName, subtitle, stats }: DashboardHeroProps) {
  return (
    <section className="bd-section flex flex-col gap-5 pb-8 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0 space-y-2">
        <p className="text-xs font-semibold tracking-[0.18em] text-white/42 uppercase">Dashboard</p>
        <h1 className="text-3xl font-semibold tracking-tight text-white/92 md:text-4xl">
          Welcome back, {firstName}.
        </h1>
        <p className="max-w-xl text-sm leading-relaxed text-white/58 md:text-base">{subtitle}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3 md:justify-end">
        <StatPill icon={FolderKanban} label="Active projects" value={stats.activeProjects} />
        <StatPill icon={CalendarDays} label="Upcoming events" value={stats.upcomingEvents} />
        <StatPill icon={Users} label="Recent talent" value={stats.recentTalent} />
        <HeroDecoration />
      </div>
    </section>
  );
}
