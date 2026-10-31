"use client";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import "@/components/workspace/workspace.css";
import "@/components/workspace/talent-studio.css";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Activity,
  ArrowLeft,
  BriefcaseBusiness,
  CircleDollarSign,
  Flag,
  LayoutDashboard,
  ListChecks,
  Search,
  Users,
} from "lucide-react";
import { getProfileInitials } from "@/lib/auth/avatar";
import { sections } from "@/lib/admin-dashboard/model";
const icons = [
  LayoutDashboard,
  Users,
  BriefcaseBusiness,
  Activity,
  CircleDollarSign,
  ListChecks,
  Flag,
];
export function AdminShell({
  children,
  preview = false,
  exitHref = "/home",
  viewer,
}: {
  children: React.ReactNode;
  preview?: boolean;
  exitHref?: string;
  viewer?: { fullName: string; avatarUrl?: string | null };
}) {
  const params = useSearchParams();
  const [failedAvatar, setFailedAvatar] = useState<string | null>(null);
  const viewerName = preview ? "Preview admin" : viewer?.fullName || "Signed-in admin";
  const avatarUrl = !preview && viewer?.avatarUrl && /^https?:\/\//i.test(viewer.avatarUrl) ? viewer.avatarUrl : null;
  const avatarLabel = preview ? "Fictional preview admin" : `Signed in as ${viewerName}`;
  const pathname = usePathname();
  const mainRef = useRef<HTMLElement>(null);
  const navigationKey = `${pathname}?${params.toString()}`;
  useEffect(() => { mainRef.current?.scrollTo({top:0}); },[navigationKey]);
  const active = pathname.includes("industry-applications")
    ? "reviews"
    : params.get("view") || "overview";
  const base = preview ? "/preview/admin-analytics" : "/admin/analytics";
  return (
    <div className="launch-admin workspace-shell workspace-shell--talent">
      <aside className="launch-sidebar">
        <Link className="launch-workspace" href={base} aria-label="Motiion admin overview">
          <Image className="launch-wordmark" src="/admin-wordmark.svg" width={92} height={20} alt="Motiion" priority unoptimized />
          <span className="launch-brand-admin">Admin</span>
        </Link>
        <p className="launch-nav-label">WORKSPACE</p>
        <nav aria-label="Admin navigation">
          {sections.map((section, i) => {
            const Icon = icons[i];
            return (
              <Link
                key={section}
                aria-current={active === section ? "page" : undefined}
                href={`${base}?view=${section}&range=${params.get("range") || "30"}`}
              >
                <Icon size={19} />
                <span>{section}</span>
                {section === "reviews" && (
                  <span className="launch-nav-hint">Inbox</span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="launch-sidebar-footer">
          <Link href={exitHref}><ArrowLeft size={17} /> Back to app</Link>
        </div>
      </aside>
      <div className="launch-work workspace-frame">
        <header className="launch-topbar">
          <span>
            Workspace <span className="launch-separator">/</span>{" "}
            <strong>{active.replaceAll("_", " ")}</strong>
          </span>
          <form action={base} className="launch-search">
            <input type="hidden" name="view" value="talent" />
            <Search size={16} />
            <input
              name="query"
              placeholder="Search people, email…"
              aria-label="Search talent"
            />
            <kbd>↵</kbd>
          </form>
          <span className="launch-avatar" role="img" aria-label={avatarLabel} title={avatarLabel}>
            {avatarUrl && failedAvatar !== avatarUrl ? <Image src={avatarUrl} alt="" width={32} height={32} unoptimized onError={() => setFailedAvatar(avatarUrl)} /> : getProfileInitials(viewerName) || "A"}
          </span>
        </header>
        {preview && (
          <div className="launch-preview">
            Design preview · fictional fixtures · no live data or working review
            decisions
          </div>
        )}
        <main ref={mainRef} className="launch-main">{children}</main>
      </div>
    </div>
  );
}
