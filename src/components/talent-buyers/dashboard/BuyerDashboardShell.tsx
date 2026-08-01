"use client";

import { Menu } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { NavigationProgress } from "@/components/navigation/NavigationProgress";
import type { UserEntitlement } from "@/lib/billing/entitlement";
import { defaultBuyerChromeBreadcrumbs } from "@/lib/talent-buyers/buyer-chrome-defaults";
import type { DashboardProfile } from "@/types/database";

import {
  useBuyerPageChromeContext,
  type BuyerPageChromeConfig,
} from "./BuyerPageChromeContext";

import { BuyerChromeBar } from "./BuyerChromeBar";
import { BuyerChromeTitle } from "./BuyerChromeTitle";
import { BuyerProfileModal } from "./BuyerProfileModal";
import { DashboardScrollLock } from "./DashboardScrollLock";
import { SidebarNav } from "./SidebarNav";

const SIDEBAR_EXPANDED_KEY = "buyer-sidebar-expanded";

/** Match Find Talent hubs: no top chrome unless the page needs nested crumbs or end actions. */
function buyerShellNeedsChrome(pathname: string, chrome: BuyerPageChromeConfig) {
  if (pathname.startsWith("/talent")) return false;
  if (chrome.end != null || chrome.leading != null) return true;
  const crumbs = chrome.breadcrumbs ?? defaultBuyerChromeBreadcrumbs(pathname);
  return (crumbs?.length ?? 0) > 1;
}

export function BuyerDashboardShell({
  profile,
  entitlement,
  children,
}: {
  profile: DashboardProfile;
  entitlement: UserEntitlement;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const mainRef = useRef<HTMLElement>(null);
  const { chrome } = useBuyerPageChromeContext();
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [sidebarPreferenceReady, setSidebarPreferenceReady] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const needsShellChrome = useMemo(
    () => buyerShellNeedsChrome(pathname, chrome),
    [pathname, chrome],
  );
  const isTalentRoute = pathname.startsWith("/talent");
  const hideShellChrome = !needsShellChrome;
  const sidebarCollapsed = !sidebarExpanded;

  useEffect(() => {
    const stored = window.localStorage.getItem(SIDEBAR_EXPANDED_KEY);
    if (stored === "0") setSidebarExpanded(false);
    if (stored === "1") setSidebarExpanded(true);
    setSidebarPreferenceReady(true);
  }, []);

  useEffect(() => {
    if (!sidebarPreferenceReady) return;
    window.localStorage.setItem(SIDEBAR_EXPANDED_KEY, sidebarExpanded ? "1" : "0");
  }, [sidebarExpanded, sidebarPreferenceReady]);

  useEffect(() => {
    setMobileOpen(false);
    setProfileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (hideShellChrome && isTalentRoute) return;
    mainRef.current?.scrollTo({ top: 0 });
  }, [hideShellChrome, isTalentRoute, pathname]);

  function toggleSidebar() {
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches) {
      setMobileOpen((open) => !open);
      return;
    }
    setSidebarExpanded((expanded) => !expanded);
  }

  const showChrome = needsShellChrome && !mobileOpen;

  return (
    <>
      <DashboardScrollLock />
      <div
        className={`buyer-dashboard-shell buyer-dashboard-shell--aligned ${
          sidebarCollapsed ? "buyer-dashboard-shell--sidebar-collapsed" : ""
        } ${hideShellChrome ? "buyer-dashboard-shell--talent-profile" : ""}`}
      >
        <SidebarNav
          profile={profile}
          entitlement={entitlement}
          collapsed={sidebarCollapsed}
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
          onToggleSidebar={toggleSidebar}
          onOpenProfile={() => setProfileOpen(true)}
          sidebarExpanded={sidebarExpanded}
        />

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
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="fixed left-3 top-3 z-40 inline-flex size-9 items-center justify-center rounded-full border border-white/10 bg-black/70 text-white/80 backdrop-blur-md transition hover:bg-black/85 hover:text-white lg:hidden"
            aria-label="Open navigation menu"
            aria-expanded={mobileOpen}
            aria-controls="buyer-sidebar-nav"
          >
            <Menu className="size-4" aria-hidden />
          </button>
        ) : null}

        <main
          ref={mainRef}
          className={`buyer-dashboard-shell__main relative flex min-h-0 flex-col text-white ${
            isTalentRoute
              ? "overflow-hidden overscroll-none p-0"
              : "overflow-y-auto overscroll-none px-5 pt-5 pb-0 lg:px-8 lg:pt-7 lg:pb-0"
          }`}
        >
          {children}
        </main>
      </div>

      <BuyerProfileModal
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        profile={profile}
      />
    </>
  );
}
