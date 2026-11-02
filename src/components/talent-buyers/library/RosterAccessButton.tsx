"use client";
import { useEffect, useRef, useState } from "react";
import { Modal } from "@/components/talent-buyers/dashboard/Modal";
import { searchActivityPeople } from "@/app/(buyer-app)/(paid)/calendar/activity-people-actions";
import { loadRosterUserAccess, revokeRosterUserAccess, shareRosterWithUser, updateRosterUserAccess, type RosterUserAccess } from "@/lib/talent-buyers/roster-user-shares";
import { ROSTER_SHARE_DURATIONS, rosterShareIsActive, type RosterShareDuration } from "@/lib/talent-buyers/roster-access-model";
import type { DraftPersonRef } from "@/lib/talent-buyers/activities/types";

export function RosterAccessButton({ listId, listName }: { listId: string; listName: string }) {
  const [open,setOpen]=useState(false);
  return <><button type="button" className="ui-button ui-button--secondary" onClick={()=>setOpen(true)}>Member access</button>{open?<RosterAccessPanel key={listId} listId={listId} listName={listName} onClose={()=>setOpen(false)}/>:null}</>;
}
function RosterAccessPanel({listId,listName,onClose}:{listId:string;listName:string;onClose:()=>void}){
  const [shares,setShares]=useState<RosterUserAccess[]|null>(null);
  const [canShare,setCanShare]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const [notice,setNotice]=useState<string|null>(null);
  const [query,setQuery]=useState("");
  const [people,setPeople]=useState<DraftPersonRef[]>([]);
  const [searching,setSearching]=useState(false);
  const [duration,setDuration]=useState<RosterShareDuration>("oneWeek");
  const [busy,setBusy]=useState(false);
  const mutation=useRef(false);
  const alive=useRef(true);
  async function refresh(){
    try{const result=await loadRosterUserAccess(listId);if(!alive.current)return;setCanShare(result.canShare);setError(result.error);if(!result.error)setShares(result.shares);}catch{if(alive.current)setError("Could not load member access. Please retry.");}
  }
  useEffect(()=>{alive.current=true;void loadRosterUserAccess(listId).then(result=>{if(!alive.current)return;setCanShare(result.canShare);setError(result.error);if(!result.error)setShares(result.shares);}).catch(()=>{if(alive.current)setError("Could not load member access. Please retry.");});return()=>{alive.current=false;};},[listId]);
  useEffect(()=>{
    if(query.trim().length<2)return;
    let cancelled=false;
    const timer=window.setTimeout(()=>{setSearching(true);void searchActivityPeople(query).then(result=>{if(cancelled)return;if(result.ok)setPeople(result.people);else setError(result.error);}).catch(()=>{if(!cancelled)setError("Member search failed. Edit the search to retry.");}).finally(()=>{if(!cancelled)setSearching(false);});},220);
    return()=>{cancelled=true;window.clearTimeout(timer);};
  },[query]);
  async function run(action:()=>Promise<{ok:boolean;error:string|null}>,success:string){
    if(mutation.current)return;mutation.current=true;setBusy(true);setError(null);setNotice(null);
    try{const result=await action();if(!alive.current)return;if(!result.ok){setError(result.error);return;}setNotice(success);await refresh();}catch{if(alive.current)setError("Could not confirm this change. Check your connection and retry.");}finally{mutation.current=false;if(alive.current)setBusy(false);}
  }
  return <Modal open title="Roster member access" description={listName} placement="drawer" onClose={()=>{if(!mutation.current)onClose();}}><div className="space-y-5"><p className="text-sm text-[var(--ui-muted)]">Share this roster with specific Motiion members. They can view its members and notes while access is active. Public links are managed separately.</p>
    {error?<p role="alert" className="ui-notice" data-tone="error">{error} <button type="button" className="underline" disabled={busy} onClick={()=>void refresh()}>Retry</button></p>:null}
    {notice?<p role="status" className="ui-notice" data-tone="success">{notice}</p>:null}
    {!shares&&!error?<p role="status">Loading access…</p>:null}
    {shares?.length?<ul className="space-y-3">{shares.map(share=><li key={share.id} className="rounded-xl border border-[var(--ui-border)] p-4"><p className="font-medium">{share.name}</p><p className="mt-1 text-xs text-[var(--ui-muted)]">{!rosterShareIsActive(share.expiresAt)?"Expired":share.expiresAt?`Access until ${new Date(share.expiresAt).toLocaleString()}`:"Access until removed"}</p><div className="mt-3 flex flex-wrap items-center gap-2"><label className="sr-only" htmlFor={`duration-${share.id}`}>Change access duration for {share.name}</label><select id={`duration-${share.id}`} defaultValue="" disabled={busy} className="min-h-11 rounded-lg border border-[var(--ui-border)] bg-[var(--ui-surface)] px-3 text-sm" onChange={event=>{const value=event.target.value as RosterShareDuration;event.target.value="";if(value)void run(()=>updateRosterUserAccess(listId,share.id,value),"Access duration updated.");}}><option value="" disabled>Change duration…</option>{ROSTER_SHARE_DURATIONS.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</select><button type="button" className="ui-button ui-button--secondary" disabled={busy} onClick={()=>void run(()=>revokeRosterUserAccess(listId,share.id),"Member access removed. You can share again later.")}>Remove access</button></div></li>)}</ul>:shares?<p className="rounded-xl border border-dashed border-[var(--ui-border)] p-4 text-sm text-[var(--ui-muted)]">No members have access to this roster yet.</p>:null}
    {canShare?<section className="space-y-3"><h3 className="font-semibold">Add a member</h3><label className="ui-field"><span className="ui-field__label">Find a Motiion member</span><input type="search" placeholder="Name or username" value={query} maxLength={64} onChange={event=>{setQuery(event.target.value);setPeople([]);setSearching(event.target.value.trim().length>=2);}}/></label><label className="ui-field"><span className="ui-field__label">Access duration</span><select value={duration} onChange={event=>setDuration(event.target.value as RosterShareDuration)}>{ROSTER_SHARE_DURATIONS.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</select></label>{searching?<p role="status">Searching members…</p>:null}{query.trim().length>=2&&!searching&&!people.length?<p className="text-sm text-[var(--ui-muted)]">No matching members. Try another name.</p>:null}<ul className="divide-y divide-[var(--ui-border)]">{people.map(person=><li key={person.userId} className="flex items-center justify-between gap-3 py-3"><span>{person.displayName}</span><button type="button" className="ui-button" disabled={busy} onClick={()=>void run(()=>shareRosterWithUser(listId,person.userId,duration),`Shared with ${person.displayName}.`)}>{shares?.some(share=>share.recipientId===person.userId&&rosterShareIsActive(share.expiresAt))?"Update access":"Share roster"}</button></li>)}</ul></section>:shares?<p className="text-sm text-[var(--ui-muted)]">Industry Pro is required to grant or extend access. You can still shorten or remove existing access.</p>:null}
  </div></Modal>;
}
