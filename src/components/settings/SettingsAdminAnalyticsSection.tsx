import Link from "next/link";

export const ADMIN_ANALYTICS_HREF = "/admin/analytics";

export function SettingsAdminAnalyticsSection({
  variant,
}: {
  variant: "talent" | "industry";
}) {
  if (variant === "industry") {
    return (
      <section className="bd-muted-panel p-5" aria-labelledby="settings-admin-heading">
        <p id="settings-admin-heading" className="text-sm font-medium text-white">
          Admin
        </p>
        <p className="mt-1 text-sm text-white/58">
          Early product signals for Motiion staff.
        </p>
        <div className="mt-4">
          <Link href={ADMIN_ANALYTICS_HREF} className="bd-btn-secondary">
            Open analytics
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="talent-settings-card" aria-labelledby="settings-admin-heading">
      <div className="talent-settings-row">
        <div>
          <h2 id="settings-admin-heading">Admin</h2>
          <p>Early product signals for Motiion staff.</p>
        </div>
        <Link className="talent-settings-secondary" href={ADMIN_ANALYTICS_HREF}>
          Open analytics
        </Link>
      </div>
    </section>
  );
}
