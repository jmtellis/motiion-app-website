"use client";
import { useState, useTransition } from "react";
import { Plus, FileDown, ArrowLeft } from "lucide-react";
import { saveBooking } from "@/lib/talent-buyers/bookings";
import { bookingStatuses, jobTemplates, type Booking, type BookingInput } from "@/lib/talent-buyers/booking-schema";
import { useProjectWorkspace } from "./ProjectWorkspaceContext";
import "./project-bookings.css";

const labels = { draft: "Draft", negotiating: "Negotiating", confirmed: "Confirmed", completed: "Work completed", cancelled: "Cancelled" };
export function ProjectBookingsPanel({ initialBookings, storageError }: { initialBookings: Booking[]; storageError: string | null }) {
 const { projectId, project, rosterMembers } = useProjectWorkspace();
 const [bookings,setBookings] = useState(initialBookings);
 const [editor,setEditor] = useState<BookingInput | null>(null);
 const [error,setError] = useState<string | null>(null);
 const [notice,setNotice] = useState("");
 const [filter,setFilter] = useState("all");
 const [pending,startTransition] = useTransition();
 const [tab,setTab] = useState("details");
 function edit(value?: Booking) {
   setError(null); setNotice(""); setTab("details");
   setEditor(value ?? { project_id: projectId, talent_name: "", role: "", status: "draft", fee_cents: 0, currency: "USD", start_date: null, end_date: null, payer_name: "", payer_email: "", terms: "", negotiation_notes: "" });
 }
 function update<K extends keyof BookingInput>(key: K, value: BookingInput[K]) { setEditor(current => current ? { ...current, [key]: value } : null); }
 function save() {
   startTransition(async()=>{
     try {
       const result = await saveBooking(editor);
       if (!result.booking) { setError(result.error ?? "Could not save."); return; }
       const saved=result.booking;
       setBookings(current=>current.some(b=>b.id===saved.id) ? current.map(b=>b.id===saved.id?saved:b) : [...current,saved]);
       setEditor(saved); setError(null); setNotice("Booking saved.");
     } catch { setError("Could not save. Your changes are still here; please try again."); }
   });
 }
 function downloadTerms() {
   if (!editor) return;
   const text = `DRAFT JOB TERMS — NOT SIGNED\n${project.title}\n${editor.talent_name} · ${editor.role}\n${editor.start_date ?? "Dates TBD"} — ${editor.end_date ?? ""}\n${editor.currency} ${(editor.fee_cents/100).toFixed(2)}\n\n${editor.terms}`;
   const url=URL.createObjectURL(new Blob([text],{type:"text/plain;charset=utf-8"}));
   const a=document.createElement("a"); a.href=url; a.download="draft-job-terms.txt"; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 const visible=bookings.filter(b=>filter==="all" || b.status===filter);
 return <section className="project-bookings">
   <div className="project-bookings__heading"><div><p className="project-bookings__eyebrow">PROJECT WORKSPACE</p><h2>Bookings</h2><p>Coordinate talent, agree job details, and prepare for payment.</p></div><button onClick={()=>edit()} disabled={!!storageError}><Plus size={16}/> New booking</button></div>
   {storageError && <p role="alert" className="project-bookings__notice">{storageError}</p>}
   <div className="project-bookings__stages">{bookingStatuses.filter(s=>s!=="cancelled").map(s=><button key={s} onClick={()=>setFilter(filter===s?"all":s)} aria-pressed={filter===s}><span>{labels[s]}</span><strong>{bookings.filter(b=>b.status===s).length}</strong></button>)}</div>
   {editor ? <>
     <div className="project-bookings__heading"><button className="secondary" onClick={()=>{if (pending) return; if(window.confirm("Return to the booking list? Unsaved edits will be discarded."))setEditor(null);}}><ArrowLeft size={16}/> All bookings</button><span role="status">{notice}</span></div>
     <div className="project-bookings__layout">
       <div className="project-bookings__panel">
         <nav aria-label="Booking details">{["details","negotiation","contract"].map(t=><button className="secondary" aria-pressed={tab===t} key={t} onClick={()=>setTab(t)}>{t === "contract" ? "Contract draft" : t[0].toUpperCase()+t.slice(1)}</button>)}</nav>
         <fieldset disabled={pending}>
         {tab==="details" && <div className="project-bookings__fields">
           <label>Talent<input list="booking-roster" value={editor.talent_name} onChange={e=>update("talent_name",e.target.value)} placeholder="Dancer or choreographer name" maxLength={200}/><datalist id="booking-roster">{rosterMembers.map(m=><option key={m.id} value={m.name}/>)}</datalist></label>
           <label>Role<input value={editor.role} onChange={e=>update("role",e.target.value)} placeholder="e.g. Featured dancer" maxLength={200}/></label>
           <label>Start date<input type="date" value={editor.start_date??""} onChange={e=>update("start_date",e.target.value||null)}/></label>
           <label>End date<input type="date" min={editor.start_date??undefined} value={editor.end_date??""} onChange={e=>update("end_date",e.target.value||null)}/></label>
           <label>Agreed fee<input type="number" min="0" step="0.01" value={editor.fee_cents/100} onChange={e=>update("fee_cents",Math.round(Number(e.target.value)*100))}/></label>
           <label>Currency<select value={editor.currency} onChange={e=>update("currency",e.target.value as BookingInput["currency"])}>{["USD","CAD","GBP","EUR","AUD"].map(c=><option key={c}>{c}</option>)}</select></label>
           <label>Billing contact<input value={editor.payer_name} onChange={e=>update("payer_name",e.target.value)} placeholder="Company or person covering the bill"/></label>
           <label>Billing email<input type="email" value={editor.payer_email} onChange={e=>update("payer_email",e.target.value)} placeholder="billing@company.com"/></label>
         </div>}
         {tab==="negotiation" && <label>Negotiation notes<p>Internal notes for offers, counteroffers, and agreed changes. These are not sent to talent.</p><textarea rows={12} value={editor.negotiation_notes} onChange={e=>update("negotiation_notes",e.target.value)} placeholder="Track the discussion and agreed terms…"/></label>}
         {tab==="contract" && <div className="project-bookings__contract"><label>Start from a job outline<select defaultValue="" onChange={e=>{if(!e.target.value)return;if(!editor.terms || window.confirm("Replace the current draft with this outline?"))update("terms",jobTemplates[e.target.value]);e.target.value="";}}><option value="">Choose job type</option>{Object.keys(jobTemplates).map(t=><option key={t}>{t}</option>)}</select></label><p>Editable job terms for review. This draft is not an executed contract; signing is not connected yet.</p><textarea aria-label="Draft job terms" rows={14} value={editor.terms} onChange={e=>update("terms",e.target.value)}/><button className="secondary" onClick={downloadTerms} disabled={!editor.terms}><FileDown size={16}/> Download draft</button></div>}
         </fieldset>
         {error && <p role="alert" className="project-bookings__error">{error}</p>}
         <div className="project-bookings__save"><button onClick={save} disabled={pending || !editor.talent_name.trim() || !!storageError}>{pending?"Saving…":"Save booking"}</button></div>
       </div>
       <aside className="project-bookings__panel"><h3>Booking status</h3><p>Track the stage agreed with talent.</p><select aria-label="Booking status" value={editor.status} disabled={pending} onChange={e=>update("status",e.target.value as BookingInput["status"])}>{bookingStatuses.map(s=><option key={s} value={s}>{labels[s]}</option>)}</select><hr/><h3>Payment</h3><strong className="project-bookings__amount">{new Intl.NumberFormat(undefined,{style:"currency",currency:editor.currency}).format(editor.fee_cents/100)}</strong><p>{editor.payer_name ? `Billing contact: ${editor.payer_name}` : "Add a billing contact in Details."}</p><p className="project-bookings__notice">Payment collection and dancer payouts are not connected yet. Saving a booking does not charge anyone or send a payment request.</p></aside>
     </div>
   </> : <div className="project-bookings__panel">
     <div className="project-bookings__heading"><h3>{filter==="all"?"All bookings":labels[filter as BookingInput["status"]]}</h3>{filter!=="all"&&<button className="secondary" onClick={()=>setFilter("all")}>Show all</button>}</div>
     {visible.length ? <div className="project-bookings__table"><table><thead><tr><th>Talent / role</th><th>Status</th><th>Dates</th><th>Fee</th><th>Billing contact</th></tr></thead><tbody>{visible.map(b=><tr key={b.id}><td><button className="project-bookings__name" onClick={()=>edit(b)}>{b.talent_name}</button><small>{b.role}</small></td><td><span className={`project-bookings__status is-${b.status}`}>{labels[b.status]}</span></td><td>{b.start_date ?? "Not set"}</td><td>{new Intl.NumberFormat(undefined,{style:"currency",currency:b.currency}).format(b.fee_cents/100)}</td><td>{b.payer_name || "Not set"}</td></tr>)}</tbody></table></div> : <div className="project-bookings__empty"><h3>{bookings.length?"No bookings in this stage":"Your project’s bookings, in one place"}</h3><p>Add talent when you’re ready to discuss a job. Track each booking through negotiation, confirmation, and completed work.</p><button disabled={!!storageError} onClick={()=>edit()}>Add a booking</button></div>}
   </div>}
 </section>;
}
