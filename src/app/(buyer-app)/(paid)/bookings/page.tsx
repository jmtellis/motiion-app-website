import {
  IndustryPageHeader,
  IndustryEmptyState,
} from "@/components/talent-buyers/dashboard/IndustryUI";
import Link from "next/link";
import { requireHiringAccount } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { BuyerAppPage } from "@/components/talent-buyers/dashboard/BuyerAppPage";
import "@/components/talent-buyers/project/project-bookings.css";

export default async function BookingsPage() {
  const profile = await requireHiringAccount();
  const db = await createServerSupabaseClient();
  const { data: projects, error } = db
    ? await db
        .from("projects")
        .select("id,title,project_type")
        .eq("poster_id", profile.id)
        .order("created_at", { ascending: false })
    : { data: null, error: true };
  const { data: bookings, error: bookingError } =
    db && projects?.length
      ? await db
          .from("project_bookings")
          .select(
            "id,project_id,talent_name,role,status,fee_cents,currency,start_date,end_date",
          )
          .in(
            "project_id",
            projects.map((p) => p.id),
          )
          .order("start_date", { ascending: true })
      : { data: [], error: null };
  const rows = bookings ?? [];
  const names = new Map(projects?.map((p) => [p.id, p.title]));
  const formatDate = (value: string | null) =>
    value
      ? new Date(value + "T12:00:00").toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })
      : "Dates to confirm";
  return (
    <BuyerAppPage fullWidth>
      <section className="project-bookings studio-booking-desk">
        <IndustryPageHeader
          title="Bookings"
          description="The right people. The details agreed. Everything ready for the work."
          actions={
            <Link href="/projects" className="buyer-chrome-bar__cta">
              Open projects
            </Link>
          }
        />
        {error || bookingError ? (
          <p role="alert">
            Could not load your booking workspace. Please refresh to try again.
          </p>
        ) : (
          <>
            <div
              className="studio-booking-stats"
              aria-label="Booking status summary"
            >
              {[
                { status: "confirmed", label: "Confirmed" },
                { status: "negotiating", label: "In discussion" },
                { status: "draft", label: "To prepare" },
              ].map((item) => (
                <div key={item.status}>
                  <span>{item.label}</span>
                  <strong>
                    {rows.filter((row) => row.status === item.status).length}
                  </strong>
                </div>
              ))}
              <p>
                Keep each agreement connected to the production it belongs to.
              </p>
            </div>
            {rows.length ? (
              <div className="project-bookings__panel">
                <h2>Your booking desk</h2>
                <div className="project-bookings__table">
                  <table>
                    <thead>
                      <tr>
                        <th>Talent & project</th>
                        <th>Status</th>
                        <th>Dates</th>
                        <th>Fee</th>
                        <th>
                          <span className="sr-only">Action</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => (
                        <tr key={row.id}>
                          <td className="studio-booking-person">
                            {row.talent_name}
                            <small>
                              {names.get(row.project_id)} ·{" "}
                              {row.role || "Role to confirm"}
                            </small>
                          </td>
                          <td>
                            <span
                              className={`studio-booking-status studio-booking-status--${row.status}`}
                            >
                              {row.status?.replace(/^./, (s: string) =>
                                s.toUpperCase(),
                              )}
                            </span>
                          </td>
                          <td>{formatDate(row.start_date)}</td>
                          <td>
                            {row.fee_cents == null
                              ? "To agree"
                              : new Intl.NumberFormat("en-US", {
                                  style: "currency",
                                  currency: row.currency ?? "USD",
                                  maximumFractionDigits: 0,
                                }).format(Number(row.fee_cents) / 100)}
                          </td>
                          <td>
                            <Link
                              href={`/projects/${row.project_id}/bookings`}
                              aria-label={`Manage booking for ${row.talent_name}`}
                            >
                              Manage ↗
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <IndustryEmptyState
                title="Your next collaboration starts with a project"
                description="Add talent and agree the details in a project. Every booking will appear here as it takes shape."
                actions={
                  <Link
                    className="buyer-chrome-bar__cta"
                    href="/projects?create=1"
                  >
                    Create project
                  </Link>
                }
              />
            )}
            {!!projects?.length && (
              <div>
                <h2 className="mb-3 text-sm font-semibold">
                  Manage by project
                </h2>
                <div className="studio-booking-projects">
                  {projects.map((p) => (
                    <Link href={`/projects/${p.id}/bookings`} key={p.id}>
                      {p.title} ↗
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </BuyerAppPage>
  );
}
