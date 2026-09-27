import {
  IndustryPageHeader,
  IndustryJourney,
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
  return (
    <BuyerAppPage fullWidth>
      <section className="project-bookings">
        <IndustryPageHeader
          eyebrow="Talent coordination"
          title="Bookings"
          description="Manage the people, terms, and details behind each booking, together with its project."
          actions={
            <Link className="buyer-chrome-bar__cta" href="/projects?create=1">
              Create project
            </Link>
          }
        />
        <div className="project-bookings__panel">
          <h2>Project bookings</h2>
          {error ? (
            <p role="alert">Could not load your projects. Please try again.</p>
          ) : projects?.length ? (
            <div className="project-bookings__table">
              <table>
                <thead>
                  <tr>
                    <th>Project</th>
                    <th>Type</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {projects.map((p) => (
                    <tr key={p.id}>
                      <td>{p.title}</td>
                      <td>{p.project_type}</td>
                      <td>
                        <Link href={`/projects/${p.id}/bookings`}>
                          Manage bookings →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="project-bookings__empty">
              <h3>Start with a project</h3>
              <p>
                Create a project, then add the people you’re booking, their job
                terms, and the contact covering the bill.
              </p>
              <Link className="bd-btn-secondary" href="/projects?create=1">
                Create your first project
              </Link>
            </div>
          )}
        </div>
        <IndustryJourney
          steps={[
            {
              title: "Set the terms",
              description:
                "Add talent and define the work, dates, and payment details in the project.",
            },
            {
              title: "Get aligned",
              description:
                "Keep negotiations and confirmed bookings connected to the same work.",
            },
            {
              title: "See it through",
              description:
                "Track each booking through completion in its project workspace.",
            },
          ]}
        />
      </section>
    </BuyerAppPage>
  );
}
