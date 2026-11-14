"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { WorkspaceSidebarHeader } from "./WorkspaceSidebarHeader";
import { NotificationsPanel, WorkspaceNotificationsProvider } from "./WorkspaceNotifications";
import { WorkspaceSidePanelHost } from "./WorkspaceSidePanel";
import {
  useWorkspaceSidebar,
  WorkspaceSidebarResize,
} from "./WorkspaceSidebar";
import { TalentMobileHeader } from "./TalentMobileHeader";
import "./workspace.css";
import "@/components/talent-buyers/dashboard/industry-light.css";
import "@/components/talent-buyers/dashboard/industry-experience.css";
import "@/components/talent-buyers/dashboard/industry-studio.css";
import "./talent-studio.css";
import "@/components/workspace/workspace-controls.css";
import "@/components/ui/chips.css";
import "@/components/ui/motion.css";
import "@/components/ui/polish.css";
import "@/components/talent-buyers/dashboard/workspace-polish.css";

export function TalentWorkspace({
  children,
  navigation,
  account,
  progress,
  community,
  userId,
}: {
  userId: string;
  children: ReactNode;
  navigation: ReactNode;
  account: ReactNode;
  progress: ReactNode;
  community: boolean;
}) {
  const sidebar = useWorkspaceSidebar("motiion-talent-sidebar-width");
  const pathname = usePathname();
  const mainRef = useRef<HTMLElement>(null);
  const [scrolled, setScrolled] = useState(false);
  const pageTitle = pathname.startsWith("/messages") ? "Inbox"
    : pathname.startsWith("/schedule") ? "Schedule"
    : pathname.startsWith("/portfolio") ? "Portfolio"
    : pathname.startsWith("/opportunities") ? "Opportunities"
    : pathname.startsWith("/settings") ? "Settings"
    : pathname.startsWith("/home") ? "Home" : null;
  useEffect(() => {
    const main = mainRef.current;
    if (!main) return;
    const update = () => setScrolled(main.scrollTop > 88);
    update();
    main.addEventListener("scroll", update, { passive: true });
    return () => main.removeEventListener("scroll", update);
  }, [pathname]);
  const homeHref = community ? "/home" : "/discover";
  const [shell, setShell] = useState<HTMLDivElement | null>(null);
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
  }, [pathname]);
  const mainVariant =
    pathname === "/discover"
      ? "workspace-talent-main--navigator"
      : pathname === "/portfolio" || pathname === "/schedule"
        ? "industry-studio-canvas workspace-talent-main--pane"
        : "industry-studio-canvas";
  return (
    <WorkspaceNotificationsProvider userId={userId} viewerRole={community ? "community" : "talent"}>
    <WorkspaceSidePanelHost value={shell}>
    <div
      ref={setShell}
      className="theme-dark theme-product workspace-shell workspace-shell--talent"
      style={sidebar.style}
      data-collapsed={sidebar.collapsed}
      data-resizing={sidebar.dragging}
    >
      <aside
        className="workspace-talent-sidebar"
        id="talent-workspace-sidebar"
        aria-label="Workspace navigation"
      >
        <WorkspaceSidebarHeader href={homeHref} collapsed={sidebar.collapsed} onToggle={sidebar.toggle} />
        <div className="workspace-sidebar-navigation">
          {community ? <p className="workspace-section-label">Community</p> : null}
          {navigation}
        </div>
        <div className="workspace-sidebar-account">{account}</div>
      </aside>
      <WorkspaceSidebarResize
        sidebar={sidebar}
        controls="talent-workspace-sidebar"
      />
      <TalentMobileHeader homeHref={homeHref} navigation={navigation} account={account} />
      <div className="workspace-frame">
        {progress}
        <main
          ref={mainRef}
          id="main-content"
          tabIndex={-1}
          className={`workspace-talent-main ${mainVariant}`}
        >
          {pageTitle ? <div className="workspace-scroll-header" aria-hidden={!scrolled} data-visible={scrolled}>
            <div className="workspace-scroll-header__surface">{pageTitle}</div>
          </div> : null}
          {children}
        </main>
      </div>
      <NotificationsPanel />
    </div>
    </WorkspaceSidePanelHost>
    </WorkspaceNotificationsProvider>
  );
}
