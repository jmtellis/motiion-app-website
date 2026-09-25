"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeftClose, PanelLeftOpen, Settings } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { MotiionBrandMark } from "@/components/brand/MotiionBrandMark";
import { useWorkspaceSidebar, WorkspaceSidebarResize } from "./WorkspaceSidebar";
import "./workspace.css";

export function TalentWorkspace({ children, navigation, mobileNavigation, account, progress, settingsHref, community }: {
  children: ReactNode; navigation: ReactNode; mobileNavigation: ReactNode; account: ReactNode;
  progress: ReactNode; settingsHref: string; community: boolean;
}) {
  const sidebar = useWorkspaceSidebar("motiion-talent-sidebar-width");
  const pathname = usePathname();
  const mainRef = useRef<HTMLElement>(null);
  useEffect(() => { mainRef.current?.scrollTo({ top: 0 }); }, [pathname]);
  const titles: Record<string, string> = { home: "Home", inbox: "Chat", discover: community ? "Browse" : "Navigator", schedule: "Schedule", portfolio: "Portfolio" };
  const title = titles[pathname.split("/")[1]] ?? "Workspace";
  return <div className="theme-dark theme-product workspace-shell workspace-shell--talent"
    style={sidebar.style} data-collapsed={sidebar.collapsed} data-resizing={sidebar.dragging}>
    <aside className="workspace-talent-sidebar" id="talent-workspace-sidebar" aria-label="Workspace navigation">
      <div className="workspace-sidebar-header">
        <Link href="/home" aria-label="Motiion home" className="workspace-brand"><MotiionBrandMark inverted height={15} /><span>Motiion</span></Link>
        <button className="workspace-icon-button" onClick={sidebar.toggle} aria-label={sidebar.collapsed ? "Expand sidebar" : "Collapse sidebar"} aria-expanded={!sidebar.collapsed}>
          {sidebar.collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
        </button>
      </div>
      <div className="workspace-sidebar-navigation"><p className="workspace-section-label">{community ? "Community" : "Your workspace"}</p>{navigation}</div>
      {!community && <Link href={settingsHref} className="workspace-nav-link workspace-settings" title="Settings"><Settings aria-hidden="true" /><span className="workspace-nav-label">Settings</span></Link>}
    </aside>
    <WorkspaceSidebarResize sidebar={sidebar} controls="talent-workspace-sidebar" />
    <div className="workspace-frame">
      <header className="workspace-toolbar">{progress}<div className="workspace-toolbar-title"><span className="workspace-mobile-brand"><MotiionBrandMark inverted height={14} /></span><span>{title}</span></div><div className="workspace-account">{account}</div></header>
      <main ref={mainRef} id="main-content" tabIndex={-1} className="workspace-talent-main">{children}</main>
    </div>
    <nav aria-label="App" className="workspace-mobile-nav">{mobileNavigation}</nav>
  </div>;
}
