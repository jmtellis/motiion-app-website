"use client";

import { Menu } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { NavigationProgress } from "@/components/navigation/NavigationProgress";
import { resolvePendingViewTransition } from "@/components/talent-buyers/project/composable/view-transition";
import type { UserEntitlement } from "@/lib/billing/entitlement";
import { defaultBuyerChromeBreadcrumbs } from "@/lib/talent-buyers/buyer-chrome-defaults";
import type { DashboardProfile } from "@/types/database";

import {
  useBuyerPageChromeContext,
  type BuyerPageChromeConfig,
} from "./BuyerPageChromeContext";

import { BuyerChromeBar } from "./BuyerChromeBar";
import { BuyerChromeTitle } from "./BuyerChromeTitle";
import { DashboardScrollLock } from "./DashboardScrollLock";
import { SidebarNav } from "./SidebarNav";

import {
  useWorkspaceSidebar,
  WorkspaceSidebarResize,
} from "@/components/workspace/WorkspaceSidebar";
import { WorkspaceSidePanelHost } from "@/components/workspace/WorkspaceSidePanel";
import {
  NotificationsPanel,
  WorkspaceNotificationsProvider,
} from "@/components/workspace/WorkspaceNotifications";
import "@/components/workspace/workspace.css";
import "./industry-light.css";
import "./industry-experience.css";
import "@/components/workspace/talent-studio.css";
import "./industry-studio.css";
import "@/components/workspace/workspace-controls.css";
import "@/components/ui/chips.css";
import "@/components/ui/motion.css";

/** Match Find Talent hubs: no top chrome unless the page needs nested crumbs or end actions. */
function buyerShellNeedsChrome(
  pathname: string,
  chrome: BuyerPageChromeConfig,
) {
  if (pathname.startsWith("/talent")) return false;
  if (chrome.end != null || chrome.leading != null) return true;
  const crumbs = chrome.breadcrumbs ?? defaultBuyerChromeBreadcrumbs(pathname);
  return (crumbs?.length ?? 0) > 1;
}

export function BuyerDashboardShell({
  profile,
  entitlement,
  testEnvironment = false,
  children,
}: {
  profile: DashboardProfile;
  entitlement: UserEntitlement;
  testEnvironment?: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const mainRef = useRef<HTMLElement>(null);
  const [shell, setShell] = useState<HTMLDivElement | null>(null);
  const { chrome } = useBuyerPageChromeContext();
  const sidebar = useWorkspaceSidebar("motiion-industry-sidebar-width");
  const sidebarExpanded = !sidebar.collapsed;
  const [mobileOpen, setMobileOpen] = useState(false);
  const needsShellChrome = useMemo(
    () => buyerShellNeedsChrome(pathname, chrome),
    [pathname, chrome],
  );
  const isTalentRoute = pathname.startsWith("/talent");
  const hideShellChrome = !needsShellChrome;
  const sidebarCollapsed = !sidebarExpanded;

  const [previousPathname, setPreviousPathname] = useState(pathname);
  if (previousPathname !== pathname) {
    setPreviousPathname(pathname);
    setMobileOpen(false);
  }

  const scrollByPathRef = useRef(new Map<string, number>());
  const historyTargetPathRef = useRef<string | null>(null);

  useEffect(() => {
    function markHistoryNavigation() {
      historyTargetPathRef.current = window.location.pathname;
    }
    window.addEventListener("popstate", markHistoryNavigation);
    return () => window.removeEventListener("popstate", markHistoryNavigation);
  }, []);

  useEffect(() => {
    const main = mainRef.current;
    if (!main) return;
    const saved = scrollByPathRef.current;
    function remember() {
      if (main) saved.set(pathname, main.scrollTop);
    }
    main.addEventListener("scroll", remember, { passive: true });
    return () => main.removeEventListener("scroll", remember);
  }, [pathname]);

  useEffect(() => {
    resolvePendingViewTransition();
    const restore = historyTargetPathRef.current === pathname;
    historyTargetPathRef.current = null;
    if (hideShellChrome && isTalentRoute) return;
    const main = mainRef.current;
    if (!main) return;
    const top = restore ? (scrollByPathRef.current.get(pathname) ?? 0) : 0;
    main.scrollTo({ top });
    if (top > 0) {
      const frame = window.requestAnimationFrame(() => main.scrollTo({ top }));
      return () => window.cancelAnimationFrame(frame);
    }
  }, [hideShellChrome, isTalentRoute, pathname]);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1024px)");
    function closeMobileDrawer(event: MediaQueryListEvent) {
      if (event.matches) setMobileOpen(false);
    }
    desktop.addEventListener("change", closeMobileDrawer);
    return () => desktop.removeEventListener("change", closeMobileDrawer);
  }, []);

  function toggleSidebar() {
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 1023px)").matches
    ) {
      setMobileOpen((open) => !open);
      return;
    }
    sidebar.toggle();
  }

  const showChrome = needsShellChrome && !mobileOpen;

  return (
    <WorkspaceNotificationsProvider userId={profile.id}>
    <WorkspaceSidePanelHost value={shell}>
    <>
      <DashboardScrollLock />
      <div
        ref={setShell}
        style={sidebar.style}
        data-resizing={sidebar.dragging}
        data-collapsed={sidebar.collapsed}
        className={`buyer-dashboard-shell workspace-shell workspace-shell--industry ${
          sidebarCollapsed ? "buyer-dashboard-shell--sidebar-collapsed" : ""
        } ${hideShellChrome ? "buyer-dashboard-shell--talent-profile" : ""}`}
      >
        <SidebarNav
          profile={profile}
          entitlement={entitlement}
          testEnvironment={testEnvironment}
          collapsed={sidebarCollapsed}
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
          onToggleSidebar={toggleSidebar}
          sidebarExpanded={sidebarExpanded}
        />

        <WorkspaceSidebarResize
          sidebar={sidebar}
          controls="buyer-sidebar-nav"
        />
        <div className="workspace-frame">
          <NavigationProgress />

          {showChrome ? (
            <div className="relative h-auto min-h-0 buyer-dashboard-shell__chrome lg:h-full">
              <BuyerChromeBar
                className="buyer-chrome-bar--dashboard h-full"
                progressPercent={chrome.progressPercent}
                start={
                  <>
                    <button
                      type="button"
                      onClick={() => setMobileOpen(true)}
                      className="inline-flex size-8 items-center justify-center rounded-full text-white/70 transition hover:bg-white/6 hover:text-white lg:hidden"
                      aria-label="Open navigation menu"
                      aria-expanded={mobileOpen}
                      aria-controls="buyer-sidebar-nav"
                    >
                      <Menu className="size-4" aria-hidden />
                    </button>
                    <BuyerChromeTitle />
                  </>
                }
                end={chrome.end}
              />
            </div>
          ) : null}

          {!showChrome && !mobileOpen ? (
            <div className="workspace-industry-mobile-toolbar">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="workspace-icon-button"
                aria-label="Open navigation menu"
                aria-expanded={mobileOpen}
                aria-controls="buyer-sidebar-nav"
              >
                <Menu className="size-4" aria-hidden />
              </button>
              <span>Motiion</span>
            </div>
          ) : null}

          <main
            ref={mainRef}
            className={`buyer-dashboard-shell__main ${isTalentRoute || pathname === "/dashboard" ? "" : "industry-studio-canvas"} relative flex min-h-0 flex-col text-white ${
              isTalentRoute
                ? "overflow-hidden overscroll-none p-0"
                : "overflow-x-clip overflow-y-auto overscroll-none px-8 pt-7 pb-0"
            }`}
          >
            {children}
          </main>
        </div>
        <NotificationsPanel />
      </div>
    </>
    </WorkspaceSidePanelHost>
    </WorkspaceNotificationsProvider>
  );
}
