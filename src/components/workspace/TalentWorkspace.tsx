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
    <WorkspaceNotificationsProvider userId={userId}>
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
        <WorkspaceSidebarHeader href="/home" collapsed={sidebar.collapsed} onToggle={sidebar.toggle} />
        <div className="workspace-sidebar-navigation">
          <p className="workspace-section-label">
            {community ? "Community" : "Workflow"}
          </p>
          {navigation}
        </div>
        <div className="workspace-sidebar-account">{account}</div>
      </aside>
      <WorkspaceSidebarResize
        sidebar={sidebar}
        controls="talent-workspace-sidebar"
      />
      <TalentMobileHeader homeHref="/home" navigation={navigation} account={account} />
      <div className="workspace-frame">
        {progress}
        <main
          ref={mainRef}
          id="main-content"
          tabIndex={-1}
          className={`workspace-talent-main ${mainVariant}`}
        >
          {children}
        </main>
      </div>
      <NotificationsPanel />
    </div>
    </WorkspaceSidePanelHost>
    </WorkspaceNotificationsProvider>
  );
}
