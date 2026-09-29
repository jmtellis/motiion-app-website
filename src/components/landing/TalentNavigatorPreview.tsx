import Image from "next/image";
import { ArrowUp, Bell, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Folder, Heart, Library, Mail, PanelLeftClose, Search, Settings, SlidersHorizontal, Users, Mic } from "lucide-react";
import { MotiionWordmark } from "@/components/brand/MotiionWordmark";
import { previewHeadshot } from "@/lib/marketing/preview-media";
import "./talent-navigator-preview.css";

const navigation = [
  { label: "Discover", icon: Search },
  { label: "Projects", icon: Folder },
  { label: "Calendar", icon: CalendarDays },
  { label: "Roster", icon: Library },
  { label: "Inbox", icon: Mail },
  { label: "Notifications", icon: Bell },
];

/** A presentation-only Navigator scene, using existing illustrative marketing assets. */
export function TalentNavigatorPreview() {
  return (
    <section className="navigator-proof" id="talent-navigator-preview" aria-label="Inside Talent Navigator">
      <figure className="navigator-proof__figure">
        <div className="navigator-proof__window" role="img" aria-label="Motiion Talent Navigator preview: a workspace sidebar, a grid of dancer portraits, and a search field for describing the talent you want to find.">
          <div className="navigator-proof__interface" aria-hidden="true">
            <aside className="navigator-proof__sidebar">
              <div className="navigator-proof__brand"><MotiionWordmark height={9} /><PanelLeftClose size={14} /></div>
              <span className="navigator-proof__group-label">Workspace</span>
              <div className="navigator-proof__nav">
                {navigation.map(({ label, icon: Icon }, index) => (
                  <div key={label} className={`navigator-proof__nav-item ${index === 0 ? "is-active" : ""}`}><Icon size={15} strokeWidth={1.65} /><span>{label}</span></div>
                ))}
              </div>
              <div className="navigator-proof__sidebar-bottom"><Settings size={15} /><span>Settings</span></div>
              <div className="navigator-proof__account"><span className="navigator-proof__avatar">M</span><span>Motiion workspace<small>Industry</small></span><ChevronDown size={12} /></div>
            </aside>
            <div className="navigator-proof__canvas">
              <div className="navigator-proof__grid">
                {Array.from({ length: 15 }, (_, index) => (
                  <div key={index} className={`navigator-proof__portrait ${index === 7 ? "is-featured" : ""}`}>
                    <Image src={previewHeadshot(index + 3)} alt="" fill sizes="(max-width: 639px) 150px, (max-width: 1023px) 200px, 260px" />
                    {index === 7 && <div className="navigator-proof__profile"><span>Featured talent<small>Los Angeles, CA</small></span><Heart size={17} /></div>}
                  </div>
                ))}
              </div>
              <div className="navigator-proof__vignette" />
              <div className="navigator-proof__view"><span>Discover</span><span>Browse <small>PRO</small></span></div>
              <span className="navigator-proof__previous"><ChevronLeft size={18} /></span>
              <span className="navigator-proof__next"><ChevronRight size={18} /></span>
              <div className="navigator-proof__composer">
                <div className="navigator-proof__filters"><span><Users size={13} /> Roles <ChevronDown size={11} /></span><span><SlidersHorizontal size={13} /> Filters <ChevronDown size={11} /></span></div>
                <div className="navigator-proof__input"><span>Who are you looking for?</span><Mic size={17} /><span className="navigator-proof__send"><ArrowUp size={19} /></span></div>
              </div>
            </div>
          </div>
        </div>
        <figcaption className="navigator-proof__caption"><span><span className="navigator-proof__dot" />Talent Navigator</span><span>Discover the people behind the work.<small>Product preview</small></span></figcaption>
      </figure>
    </section>
  );
}
