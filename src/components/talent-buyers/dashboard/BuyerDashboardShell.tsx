"use client";

import { Menu } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";

import type { DashboardProfile } from "@/types/database";

import { BuyerChromeBar, BuyerChromeLogo } from "./BuyerChromeBar";
import { SidebarNav } from "./SidebarNav";

export function BuyerDashboardShell({
  profile,
  children,
}: {
  profile: DashboardProfile;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const hideShellChrome = pathname.startsWith("/talent");

  function toggleSidebar() {
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches) {
      setMobileOpen((open) => !open);
      return;
    }
    setSidebarExpanded((expanded) => !expanded);
  }

  return (
    <div className="flex h-screen min-h-screen bg-[#0a0a0a]">
      <SidebarNav
        profile={profile}
        collapsed={!sidebarExpanded}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
        onToggleSidebar={toggleSidebar}
        sidebarExpanded={sidebarExpanded}
      />

      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#0a0a0a]">
          {!hideShellChrome && !mobileOpen ? (
            <BuyerChromeBar
              start={
                <button
                  type="button"
                  onClick={() => setMobileOpen(true)}
                  className="inline-flex size-8 items-center justify-center rounded-lg text-white/70 transition hover:bg-white/6 hover:text-white lg:hidden"
                  aria-label="Open navigation menu"
                  aria-expanded={mobileOpen}
                  aria-controls="buyer-sidebar-nav"
                >
                  <Menu className="size-4" aria-hidden />
                </button>
              }
              center={<BuyerChromeLogo />}
            />
          ) : null}

          <main className="relative flex min-h-0 flex-1 flex-col overflow-y-auto px-5 py-5 text-white lg:px-8 lg:py-7">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
