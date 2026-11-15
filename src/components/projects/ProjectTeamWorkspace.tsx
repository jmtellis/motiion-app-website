"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { LoaderCircle } from "lucide-react";
import type { TeamWorkspace } from "@/lib/talent-buyers/project-team";
import { teamAction } from "@/app/team-projects/actions";
import { TeamSeatPurchase } from "./TeamSeatPurchase";
import "./project-team.css";
export function ProjectTeamWorkspace({workspace:w}:{workspace:TeamWorkspace}) {
 const [now]=useState(()=>Date.now()); const router=useRouter(); const [busy,start]=useTransition(); const [message,setMessage]=useState("");
 const [email,setEmail]=useState(""); const [role,setRole]=useState("admin"); const [job,setJob]=useState("");
 const run=(action:Parameters<typeof teamAction>[1],data:Record<string,string>)=>start(async()=>{
  setMessage(""); try {const r=await teamAction(w.id,action,data);setMessage(r.error??(action==="invite"?"Invitation queued for email delivery.":"Saved.")); if(!r.error)router.refresh();} catch {setMessage("Couldn’t save. Please try again.");}
 });
 return <main className="project-team"><nav><Link href="/team-projects">Team projects</Link>{w.role!=="coordinator" && <Link href={`/projects/${w.id}/overview`}>Open project workspace</Link>}</nav>
 <header><p>{w.role === "coordinator" ? "Schedule and logistics" : "Project team"}</p><h1>{w.title}</h1><p>{w.role === "coordinator" ? "Coordinate dates, times, and locations. Casting decisions, contracts, rates, billing, and team permissions stay with the project’s admins and owner." : "Invite your producer, choreographer, creative director, or assistant. Job titles describe the work; access controls what each person can do."}</p></header>
 {message && <p role="status">{message}</p>}{busy && <LoaderCircle className="animate-spin" aria-label="Saving"/>}
 {w.role==="owner" && <section><h2>Invite team</h2><p>{w.capacity?.used} occupied + {w.capacity?.pending} reserved / {w.capacity?.limit === 2147483647 ? "Unlimited" : w.capacity?.limit} team seats. The owner counts; talent does not.</p>
 <form onSubmit={e=>{e.preventDefault();run("invite",{email,role,job_title:job});}}><label>Email<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} maxLength={320}/></label><label>Job title<input placeholder="e.g. Choreographer or Production assistant" value={job} onChange={e=>setJob(e.target.value)} maxLength={100}/></label><label>Project access<select value={role} onChange={e=>setRole(e.target.value)}><option value="admin">Project admin</option><option value="coordinator">Coordinator</option></select></label><p>{role==="admin"?"Manage this project’s casting and collaboration. Cannot change billing or team permissions.":"Edit schedule dates, times, and locations. Cannot access casting decisions, contracts, rates, billing, or team permissions."}</p><button disabled={busy}>Send invitation</button></form>
 {w.capacity?.limit !== 2147483647 && <TeamSeatPurchase projectId={w.id} pass={w.capacity?.pass===true}/>}
 </section>}
 <section><h2>Team</h2>{w.members.map(m=><article key={m.user_id}><strong>{m.name}</strong><p>{m.job_title || "Team member"} · {m.role}</p>{w.role==="owner" && m.role!=="owner" && <div><button disabled={busy} onClick={()=>run("member",{user_id:m.user_id,role:m.role==="admin"?"coordinator":"admin",job_title:m.job_title})}>Make {m.role==="admin"?"coordinator":"admin"}</button><button disabled={busy} onClick={()=>{if(window.confirm(`Remove ${m.name} from this project?`))run("member",{user_id:m.user_id,role:"remove"});}}>Remove</button></div>}</article>)}</section>
 {w.role==="owner" && <section><h2>Invitations</h2>{w.invitations.map(i=><article key={i.id}><strong>{i.email}</strong><p>{i.job_title} · {i.role} · {i.accepted?"Accepted":!i.enabled?"Revoked":Date.parse(i.expires_at)<=now?"Expired":i.delivery==="sent"?"Email sent · Awaiting acceptance":i.delivery==="failed"?"Delivery failed":"Pending email delivery"}</p>{!i.accepted && <div><button disabled={busy} onClick={()=>run("invite",{email:i.email,role:i.role,job_title:i.job_title})}>Resend</button>{i.enabled && <button disabled={busy} onClick={()=>run("revoke",{invitation_id:i.id})}>Revoke</button>}</div>}</article>)}</section>}
 <section><h2>Schedule and logistics</h2>{!w.schedule.length && <p>No scheduled activities yet. A project admin can add one in the workspace.</p>}{w.schedule.map(a=><form key={a.id} onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);run("schedule",{activity_id:a.id,category_id:a.category_id??"",original_day:a.original_day??"",date:String(f.get("date")??""),start_time:String(f.get("start_time")??""),end_time:String(f.get("end_time")??""),location:String(f.get("location")??"")});}}><h3>{a.title}</h3><label>Date<input type="date" name="date" defaultValue={a.date??""}/></label><label>Start<input type="time" name="start_time" defaultValue={a.start_time?.slice(0,5)??""}/></label><label>End<input type="time" name="end_time" defaultValue={a.end_time?.slice(0,5)??""}/></label><label>Location<input name="location" defaultValue={a.location??""} maxLength={500}/></label><button disabled={busy}>Save schedule</button></form>)}</section>
 </main>;
}
