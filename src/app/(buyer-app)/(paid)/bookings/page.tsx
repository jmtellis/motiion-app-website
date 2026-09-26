import Link from "next/link";
import { requireHiringAccount } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { BuyerAppPage } from "@/components/talent-buyers/dashboard/BuyerAppPage";
import "@/components/talent-buyers/project/project-bookings.css";
export default async function BookingsPage() {
 const profile = await requireHiringAccount();
 const db = await createServerSupabaseClient();
 const { data: projects, error } = db ? await db.from("projects").select("id,title,project_type").eq("poster_id",profile.id).order("created_at",{ascending:false}) : {data:null,error:true};
 return <BuyerAppPage fullWidth><section className="project-bookings">
  <div className="project-bookings__heading"><div><p className="project-bookings__eyebrow">TALENT COORDINATION</p><h2>Bookings</h2><p>From an initial conversation to completed work. Keep every booking with its project.</p></div><Link className="bd-btn-secondary" href="/projects?create=1">Create project</Link></div>
  <div className="project-bookings__stages">{["Draft","Negotiating","Confirmed","Work completed"].map((s,i)=><div className="project-bookings__panel" key={s}><p>0{i+1}</p><h3>{s}</h3></div>)}</div>
  <div className="project-bookings__panel"><h3>Your projects</h3>
    {error ? <p role="alert">Could not load your projects. Please try again.</p> : projects?.length ? <div className="project-bookings__table"><table><thead><tr><th>Project</th><th>Type</th><th/></tr></thead><tbody>{projects.map(p=><tr key={p.id}><td>{p.title}</td><td>{p.project_type}</td><td><Link href={`/projects/${p.id}/bookings`}>Manage bookings →</Link></td></tr>)}</tbody></table></div> : <div className="project-bookings__empty"><h3>Start with a project</h3><p>Create a project, then add the people you’re booking, their job terms, and the contact covering the bill.</p><Link className="bd-btn-secondary" href="/projects?create=1">Create your first project</Link></div>}
  </div>
 </section></BuyerAppPage>;
}
