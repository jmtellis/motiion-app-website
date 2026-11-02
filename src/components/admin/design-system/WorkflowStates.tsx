"use client";

import { useState } from "react";
import { Check, Search, X } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Field, Input } from "@/components/ui/Field";
import { ProductEmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/talent-buyers/dashboard/Modal";
import { UnderlineTabs } from "@/components/talent-buyers/dashboard/UnderlineTabs";

/** Real shared controls; no backend calls or pretend persistence in this reference. */
export function WorkflowStates() {
  const [tab, setTab] = useState("active");
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  return <div className="space-y-8 text-[var(--ui-text)]">
    <p className="max-w-2xl text-sm text-[var(--ui-muted)]">These are the components used by product workflows. Test focus, Escape, arrow keys, zoom, and narrow layouts here. Preview interactions do not save data.</p>
    <section className="space-y-4"><h3 className="text-lg font-semibold">Actions and selection</h3><div className="flex flex-wrap gap-3">
      <button className="ui-button" onClick={() => setOpen(true)}>Review dialog</button>
      <button className="ui-button ui-button--secondary">Secondary action</button>
      <button className="ui-button ui-button--danger">Destructive action</button>
      <button className="ui-button" disabled aria-busy="true">Saving…</button>
      <button className="ui-icon-button" aria-label="Search"><Search size={20}/></button>
    </div>
    <UnderlineTabs ariaLabel="Project status" options={[{value:"active",label:"Active"},{value:"drafts",label:"Drafts"},{value:"archived",label:"Archived"}]} value={tab} onChange={setTab}/>
    </section>
    <section className="grid gap-6 sm:grid-cols-2"><Field label="Project name" hint="A clear name helps collaborators find the project."><Input value={text} onChange={e=>setText(e.target.value)} placeholder="Autumn tour"/></Field>
    <Field label="Email" error="Enter a complete email address."><Input defaultValue="jay@" type="email"/></Field>
    <Field label="Pending field" hint="Controls stay readable while unavailable."><Input disabled value="Saving your update" readOnly/></Field>
    <div className="flex items-center gap-4"><Avatar name="Alex Jordan" size="lg"/><div><strong>Alex Jordan</strong><p className="text-sm text-[var(--ui-muted)]">Missing-image fallback</p></div></div></section>
    <section><div className="ui-notice" data-tone="success" role="status"><Check/>Your changes are saved.</div><div className="ui-notice mt-3" data-tone="error"><X/>Couldn’t refresh. Previously loaded information stays visible.<button className="ui-button ui-button--secondary">Retry</button></div></section>
    <ProductEmptyState title="Your roster starts here" description="Save talent from Discover, then bring people together for a project." actionLabel="Discover talent" actionHref="/talent"/>
    <Modal open={open} onClose={()=>setOpen(false)} title="Review project details" description="Tab stays inside this dialog. Escape closes it and returns focus to its trigger." size="sm" footer={<button className="ui-button" onClick={()=>setOpen(false)}>Done</button>}>
      <Field label="Preview project name"><Input defaultValue="Autumn tour"/></Field>
    </Modal>
  </div>;
}
