export function ProfileSection({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-mono text-xs font-medium tracking-[0.08em] text-[var(--ds-muted)] uppercase">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}
