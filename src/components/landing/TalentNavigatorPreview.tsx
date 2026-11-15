import Image from "next/image";
import { CalendarDays, Folder, Library, Mail, Search, Settings, ArrowUpRight, Plus } from "lucide-react";
import { MotiionWordmark } from "@/components/brand/MotiionWordmark";
import { previewHeadshot } from "@/lib/marketing/preview-media";
import "./hiring-workspace-preview.css";

const navigation = [
  { label: "Discover", icon: Search }, { label: "Projects", icon: Folder },
  { label: "Inbox", icon: Mail }, { label: "Calendar", icon: CalendarDays }, { label: "Roster", icon: Library },
];
// Source: seahawks.com/photos/2025-super-bowl-lx-seahawks-patriots-bad-bunny-halftime-show
// Public reference image; this is an illustrative project, not a customer claim.
const projectImage = "https://static.clubs.nfl.com/image/upload/t_new_photo_album/f_auto/seahawks/hkstrphes29bs8rf24zi.jpg";

/** Illustrative project data; this preview never displays private workspace records. */
export function TalentNavigatorPreview() {
  return <section className="hiring-preview mkt-container" aria-labelledby="hiring-preview-heading">
    <div className="hiring-preview__intro">
      <h2 id="hiring-preview-heading" className="mkt-heading">Bring your team and cast together.</h2>
      <p className="mkt-lead">Give your cast, schedules, and conversations a shared workspace so everyone moves together.</p>
    </div>
    <figure>
      <div className="hiring-preview__window" role="img" aria-label="Illustrative Motiion project workspace for Bad Bunny’s Super Bowl LX Halftime Show, with completed casting, cast groups, confirmations, rehearsals, and project messages.">
        <div className="hiring-preview__interface" aria-hidden="true">
          <aside className="hiring-preview__sidebar"><MotiionWordmark height={11} />
            <div className="hiring-preview__nav">{navigation.map(({ label, icon: Icon }) => <div key={label} className={label === "Projects" ? "is-active" : ""}><Icon size={17} /><span>{label}</span></div>)}</div>
            <div className="hiring-preview__account"><Settings size={16} /><span>Creative team<small>Motiion workspace</small></span></div>
          </aside>
          <div className="hiring-preview__main">
            <div className="hiring-preview__project-heading">
              <div className="hiring-preview__cover"><Image src={projectImage} unoptimized alt="" fill sizes="100px" /></div>
              <div className="hiring-preview__project-identity"><h3>Bad Bunny · Super Bowl LX</h3><p>Live performance · Santa Clara</p><span className="hiring-preview__production-status">In production</span></div>
              <span className="hiring-preview__new"><Plus size={14} /> Invite</span>
            </div>
            <div className="hiring-preview__tabs"><strong>Manage</strong><span>Schedule</span><span>Messages <small>3</small></span></div>
            <div className="hiring-preview__tools">
              <div className="hiring-preview__tool"><span className="hiring-preview__status">Selections complete</span><h4>Casting</h4><strong>48 dancers selected</strong><p>3 roles · 240 submissions reviewed</p><span className="hiring-preview__tool-link">View selections <ArrowUpRight size={13} /></span></div>
              <div className="hiring-preview__tool"><div className="hiring-preview__members">{[0, 1, 2, 3].map(member => <Image key={member} src={previewHeadshot(member)} alt="" width={28} height={28} />)}<span>+48</span></div><h4>People</h4><strong>52 people · 4 groups</strong><p>Principal · Salsa dancers · Field cast · Creative team</p><span className="hiring-preview__tool-link">Manage people <ArrowUpRight size={13} /></span></div>
              <div className="hiring-preview__tool"><span className="hiring-preview__status">Everyone confirmed</span><h4>Confirmations</h4><strong>48 of 48 confirmed</strong><p>Availability collected · No pending holds</p><span className="hiring-preview__tool-link">View confirmations <ArrowUpRight size={13} /></span></div>
            </div>
            <div className="hiring-preview__activity">
              <div className="hiring-preview__panel"><h4>Upcoming schedule</h4><div className="hiring-preview__schedule-row"><span>9:00 AM</span><div><strong>Full cast rehearsal</strong><p>All dancers · Rehearsal studio</p></div></div><div className="hiring-preview__schedule-row"><span>1:00 PM</span><div><strong>Field blocking</strong><p>Field cast · Stadium</p></div></div></div>
              <div className="hiring-preview__panel"><h4>Project messages</h4><div className="hiring-preview__message"><Image src={previewHeadshot(4)} alt="" width={28} height={28} /><div><strong>Creative team <small>12 min ago</small></strong><p>Updated rehearsal notes are ready for tomorrow’s full cast run.</p></div></div><div className="hiring-preview__message"><Image src={previewHeadshot(5)} alt="" width={28} height={28} /><div><strong>Salsa dancers <small>28 min ago</small></strong><p>Call time confirmed. See everyone at the studio!</p></div></div></div>
            </div>
          </div>
        </div>
      </div>
      <figcaption>Illustrative workspace</figcaption>
    </figure>
  </section>;
}
