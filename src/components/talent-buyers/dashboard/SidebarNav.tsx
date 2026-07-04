"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  CalendarDays,
  FolderKanban,
  LayoutDashboard,
  Mail,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  X,
} from "lucide-react";

import { buyerNavItems } from "@/lib/talent-buyers/dashboard-data";
import type { DashboardProfile } from "@/types/database";

const navIcons = {
  dashboard: LayoutDashboard,
  talent: Search,
  projects: FolderKanban,
  messages: Mail,
  events: CalendarDays,
  library: BookOpen,
  settings: Settings,
} as const;

const primaryNavItems = buyerNavItems.filter((item) => item.segment !== "settings");
const settingsNavItem = buyerNavItems.find((item) => item.segment === "settings");

function isNavActive(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === "/dashboard";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function OrganizationSwitcher({ profile, collapsed }: { profile: DashboardProfile; collapsed: boolean }) {
  if (collapsed) return null;

  const orgName = profile.organizationName || profile.companyName || "Your organization";

  return (
    <div className="mb-4 rounded-[8px] border border-[#262626] bg-[#1e1e1e] p-3">
      <p className="font-mono text-[10px] font-medium tracking-[0.08em] text-[#5a5a5a] uppercase">Workspace</p>
      <p className="mt-1 truncate text-sm font-semibold text-[#fafafa]">{orgName}</p>
      <p className="mt-0.5 truncate text-xs text-[#8a8a8a]">{profile.fullName}</p>
    </div>
  );
}

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  collapsed,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  active: boolean;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      title={collapsed ? label : undefined}
      className={`flex items-center rounded-[8px] text-sm font-medium transition-colors ${
        collapsed ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2.5"
      } ${
        active ? "bg-[#1e1e1e] text-[#fafafa]" : "text-[#8a8a8a] hover:bg-[#1e1e1e]/60 hover:text-[#eaeaea]"
      }`}
      aria-current={active ? "page" : undefined}
    >
      <Icon className="size-4 shrink-0 opacity-90" aria-hidden />
      {collapsed ? <span className="sr-only">{label}</span> : label}
    </Link>
  );
}

function SidebarContent({
  profile,
  pathname,
  collapsed,
  onNavigate,
  onToggleSidebar,
  sidebarExpanded,
  mobileOpen,
}: {
  profile: DashboardProfile;
  pathname: string;
  collapsed: boolean;
  onNavigate?: () => void;
  onToggleSidebar?: () => void;
  sidebarExpanded?: boolean;
  mobileOpen?: boolean;
}) {
  const showExpanded = sidebarExpanded || mobileOpen;
  const isMobileDrawer = Boolean(mobileOpen);

  return (
    <>
      <div
        className={`flex min-h-0 flex-1 flex-col justify-start overflow-y-auto ${
          collapsed ? "px-2 pb-6 pt-4" : "px-3 pb-6 pt-4"
        }`}
      >
        <OrganizationSwitcher profile={profile} collapsed={collapsed} />

        <nav aria-label="Buyer dashboard" className="space-y-1">
          {primaryNavItems.map((item) => {
            const Icon = navIcons[item.segment];
            const active = isNavActive(pathname, item.href);

            return (
              <NavLink
                key={item.href}
                href={item.href}
                label={item.label}
                icon={Icon}
                active={active}
                collapsed={collapsed}
                onNavigate={onNavigate}
              />
            );
          })}

          {settingsNavItem ? (
            <>
              <div
                className={`border-t border-[#262626] ${collapsed ? "my-2" : "my-3"}`}
                role="separator"
                aria-hidden
              />
              <NavLink
                href={settingsNavItem.href}
                label={settingsNavItem.label}
                icon={navIcons.settings}
                active={isNavActive(pathname, settingsNavItem.href)}
                collapsed={collapsed}
                onNavigate={onNavigate}
              />
            </>
          ) : null}
        </nav>
      </div>

      {onToggleSidebar ? (
        <div className={`shrink-0 ${collapsed ? "p-2" : "p-4"}`}>
          <button
            type="button"
            onClick={onToggleSidebar}
            className={`flex w-full items-center rounded-[8px] text-sm font-medium text-[#8a8a8a] transition-colors hover:bg-[#1e1e1e]/60 hover:text-[#eaeaea] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2dd4bf] ${
              collapsed ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2.5"
            }`}
            aria-label={
              isMobileDrawer ? "Close navigation menu" : showExpanded ? "Collapse sidebar" : "Expand sidebar"
            }
            aria-expanded={showExpanded}
          >
            {isMobileDrawer ? (
              <X className="size-4 shrink-0" aria-hidden />
            ) : showExpanded ? (
              <PanelLeftClose className="size-4 shrink-0" aria-hidden />
            ) : (
              <PanelLeftOpen className="size-4 shrink-0" aria-hidden />
            )}
            {collapsed ? <span className="sr-only">Toggle sidebar</span> : isMobileDrawer ? "Close" : "Collapse"}
          </button>
        </div>
      ) : null}
    </>
  );
}

export function SidebarNav({
  profile,
  collapsed = false,
  mobileOpen = false,
  onMobileClose,
  onToggleSidebar,
  sidebarExpanded = true,
}: {
  profile: DashboardProfile;
  collapsed?: boolean;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  onToggleSidebar?: () => void;
  sidebarExpanded?: boolean;
}) {
  const pathname = usePathname();
  const showMobileDrawer = mobileOpen;

  return (
    <>
      {showMobileDrawer ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          aria-label="Close navigation overlay"
          onClick={onMobileClose}
        />
      ) : null}

      <aside
        id="buyer-sidebar-nav"
        className={`sticky top-0 z-50 flex h-screen shrink-0 flex-col border-r border-[#262626] bg-[#0f0f0f] transition-[width,transform] duration-200 ${
          collapsed ? "w-16" : "w-64"
        } max-lg:fixed max-lg:inset-y-0 max-lg:left-0 max-lg:w-[min(100%,17.5rem)] max-lg:translate-x-0 ${
          showMobileDrawer ? "max-lg:translate-x-0" : "max-lg:-translate-x-full"
        }`}
      >
        <SidebarContent
          profile={profile}
          pathname={pathname}
          collapsed={collapsed && !showMobileDrawer}
          onNavigate={onMobileClose}
          onToggleSidebar={onToggleSidebar}
          sidebarExpanded={sidebarExpanded}
          mobileOpen={showMobileDrawer}
        />
      </aside>
    </>
  );
}
