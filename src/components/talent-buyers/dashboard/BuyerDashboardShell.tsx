"use client";

import { Menu } from "lucide-react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { NotificationBell } from "@/components/layout/NotificationBell";
import { NavigationProgress } from "@/components/navigation/NavigationProgress";
import { getProfileInitials } from "@/lib/auth/avatar";
import type { DashboardProfile } from "@/types/database";

import { useBuyerPageChromeContext } from "./BuyerPageChromeContext";

import { BuyerChromeBar } from "./BuyerChromeBar";
import { BuyerChromeTitle } from "./BuyerChromeTitle";
import { BuyerProfileModal } from "./BuyerProfileModal";
import { DashboardScrollLock } from "./DashboardScrollLock";
import { SidebarNav } from "./SidebarNav";

export function BuyerDashboardShell({
  profile,
  children,
}: {
  profile: DashboardProfile;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const mainRef = useRef<HTMLElement>(null);
  const { chrome } = useBuyerPageChromeContext();
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const isTalentProfileRoute = pathname.startsWith("/talent/") && pathname !== "/talent";
  const isDashboardHome = pathname === "/dashboard";
  const hideShellChrome = isTalentProfileRoute;
  const sidebarCollapsed = !sidebarExpanded;
  const initials = getProfileInitials(profile.fullName);

  useEffect(() => {
    setSidebarExpanded(false);
    setMobileOpen(false);
    setProfileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (isTalentProfileRoute) return;
    mainRef.current?.scrollTo({ top: 0 });
  }, [isTalentProfileRoute, pathname]);

  function toggleSidebar() {
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches) {
      setMobileOpen((open) => !open);
      return;
    }
    setSidebarExpanded((expanded) => !expanded);
  }

  const showChrome = !hideShellChrome && !mobileOpen;

  return (
    <>
      <DashboardScrollLock />
      <div
        className={`buyer-dashboard-shell buyer-dashboard-shell--aligned ${
          sidebarCollapsed ? "buyer-dashboard-shell--sidebar-collapsed" : ""
        } ${isTalentProfileRoute ? "buyer-dashboard-shell--talent-profile" : ""}`}
      >
        <SidebarNav
          profile={profile}
          collapsed={sidebarCollapsed}
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
          onToggleSidebar={toggleSidebar}
          sidebarExpanded={sidebarExpanded}
        />

        {showChrome ? (
          <div className="relative h-auto min-h-0 buyer-dashboard-shell__chrome lg:h-full">
            <NavigationProgress />
            <BuyerChromeBar
              className="buyer-chrome-bar--dashboard h-full"
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
              end={
                <>
                  {chrome.end}
                  {isDashboardHome ? (
                    <>
                      <NotificationBell userId={profile.id} />
                      <button
                        type="button"
                        onClick={() => setProfileOpen(true)}
                        className="relative inline-flex size-8 shrink-0 overflow-hidden rounded-full bg-[#0c2a26] ring-1 ring-white/10 transition hover:ring-white/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
                        aria-label="Your profile"
                        aria-haspopup="dialog"
                        aria-expanded={profileOpen}
                      >
                        {profile.avatarUrl ? (
                          <Image
                            src={profile.avatarUrl}
                            alt=""
                            fill
                            className="object-cover"
                            sizes="32px"
                            unoptimized
                          />
                        ) : (
                          <span className="flex size-full items-center justify-center text-[11px] font-semibold tracking-wide text-white/90">
                            {initials || "?"}
                          </span>
                        )}
                      </button>
                    </>
                  ) : null}
                </>
              }
            />
          </div>
        ) : null}

        <main
          ref={mainRef}
          className={`buyer-dashboard-shell__main relative flex min-h-0 flex-col px-5 py-5 text-white lg:px-8 lg:py-7 ${
            pathname.startsWith("/talent") ? "overflow-hidden overscroll-none" : "overflow-y-auto overscroll-none"
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
