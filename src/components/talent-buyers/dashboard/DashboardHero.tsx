type DashboardHeroProps = {
  firstName: string;
  subtitle: string;
  stats: {
    activeProjects: number;
    upcomingEvents: number;
    recentTalent: number;
  };
};

function todayLabel() {
  return new Date()
    .toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })
    .toUpperCase();
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-[7rem]">
      <p className="text-2xl font-semibold leading-none tracking-[-0.02em] text-[#fafafa]">{value}</p>
      <p className="mt-1.5 font-mono text-[11px] font-medium tracking-[0.08em] text-[#5a5a5a] uppercase">
        {label}
      </p>
    </div>
  );
}

export function DashboardHero({ firstName, subtitle, stats }: DashboardHeroProps) {
  return (
    <section className="bd-section flex flex-col gap-6 pb-8 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0 space-y-2">
        <p className="font-mono text-xs font-medium tracking-[0.08em] text-[#5a5a5a] uppercase">
          Dashboard · {todayLabel()}
        </p>
        <h1 className="text-[1.75rem] font-semibold leading-[1.15] tracking-[-0.02em] text-[#fafafa]">
          Welcome back, {firstName}.
        </h1>
        <p className="max-w-xl text-sm leading-relaxed text-[#8a8a8a]">{subtitle}</p>
      </div>

      <div className="flex shrink-0 items-start gap-8 md:justify-end">
        <Stat label="Active projects" value={stats.activeProjects} />
        <span className="hidden h-12 w-px bg-[#262626] sm:block" aria-hidden />
        <Stat label="Upcoming events" value={stats.upcomingEvents} />
        <span className="hidden h-12 w-px bg-[#262626] sm:block" aria-hidden />
        <Stat label="Recent talent" value={stats.recentTalent} />
      </div>
    </section>
  );
}
