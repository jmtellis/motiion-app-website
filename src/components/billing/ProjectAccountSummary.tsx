import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { PROJECT_CATALOG, receiptIsActive, type ProjectAccess } from "@/lib/billing/project-catalog";
export async function ProjectAccountSummary() {
  const db=await createServerSupabaseClient();
  const result=db ? await db.rpc("account_project_access") : null;
  if (!result || result.error) return <p role="status">Project billing details are temporarily unavailable. Refresh to check your purchases.</p>;
  const access=result.data as ProjectAccess;
  return <section className="bd-muted-panel space-y-3 p-5"><h3 className="text-lg">Project plans</h3>
    <p>{access.legacy ? "Existing Industry Pro access is active." : `${access.active_projects} active projects using ${access.monthly_limit} monthly slots.`}</p>
    {access.purchases.filter(p=>receiptIsActive(p)).map(p=><p key={p.id}>{PROJECT_CATALOG[p.plan].name} · {p.provider === "stripe" ? "Web billing" : "Apple billing"}{p.plan === "project_pass" ? p.project_id ? " · Assigned to a project" : " · Ready to activate" : ""}{p.expires_at ? ` · Access through ${new Date(p.expires_at).toLocaleDateString("en-US",{timeZone:"UTC"})}` : ""}</p>)}
    <Link className="ui-button" href="/pricing">View plans / add a Project Pass</Link>
  </section>;
}
