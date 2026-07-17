"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  CalendarDays,
  LayoutDashboard,
  Mail,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  Workflow,
  X,
} from "lucide-react";

import {
  buyerHomeNavItems,
  buyerSettingsNavItem,
  buyerWorkspaceNavItems,
} from "@/lib/talent-buyers/dashboard-data";
import type { DashboardProfile } from "@/types/database";

import { BuyerChromeLogo } from "./BuyerChromeBar";
import "./buyer-chrome.css";

const navIcons = {
  dashboard: LayoutDashboard,
  projects: Workflow,
  talent: Search,
  messages: Mail,
  calendar: CalendarDays,
  library: BookOpen,
  settings: Settings,
} as const;

function isNavActive(pathname: string, href: string) {
  if (href === "/projects") {
    return pathname === "/projects" || pathname.startsWith("/projects/");
  }
  if (href === "/dashboard") {
    return pathname === "/dashboard";
  }
  if (href === "/talent") {
    return pathname.startsWith("/talent");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavSection({
  label,
  collapsed,
  children,
}: {
  label: string;
  collapsed: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="buyer-sidebar__section">
      <p className={`buyer-sidebar__section-label ${collapsed ? "sr-only" : ""}`}>{label}</p>
      <div className="buyer-sidebar__section-links">{children}</div>
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
      className={`buyer-sidebar__link ${active ? "buyer-sidebar__link--active" : ""} ${
        collapsed ? "buyer-sidebar__link--collapsed" : ""
      }`}
      aria-current={active ? "page" : undefined}
    >
      <Icon className="buyer-sidebar__link-icon" aria-hidden />
      {collapsed ? <span className="sr-only">{label}</span> : <span>{label}</span>}
    </Link>
  );
}

function SidebarBrand({
  profile,
  collapsed,
}: {
  profile: DashboardProfile;
  collapsed: boolean;
}) {
  if (collapsed) {
    return <BuyerChromeLogo height={14} />;
  }

  const companyName = profile.organizationName || profile.companyName || "Your organization";

  return (
    <div className="buyer-sidebar__brand-inner">
      <BuyerChromeLogo height={16} />
      <div className="buyer-sidebar__brand-copy">
        <p className="buyer-sidebar__brand-name">{profile.fullName}</p>
        <p className="buyer-sidebar__brand-company">{companyName}</p>
      </div>
    </div>
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
      <div className={`buyer-sidebar__brand ${collapsed ? "buyer-sidebar__brand--collapsed" : ""}`}>
        <SidebarBrand profile={profile} collapsed={collapsed} />
      </div>

      <div className={`buyer-sidebar__home ${collapsed ? "buyer-sidebar__home--collapsed" : ""}`}>
        <NavSection label="Home" collapsed={collapsed}>
          {buyerHomeNavItems.map((item) => {
            const Icon = navIcons[item.segment];
            return (
              <NavLink
                key={item.href}
                href={item.href}
                label={item.label}
                icon={Icon}
                active={isNavActive(pathname, item.href)}
                collapsed={collapsed}
                onNavigate={onNavigate}
              />
            );
          })}
        </NavSection>
      </div>

      <div className={`buyer-sidebar__lower ${collapsed ? "buyer-sidebar__lower--collapsed" : ""}`}>
        <div
          className={`buyer-sidebar__workspace buyer-dashboard-shell__sidebar-scroll ${
            collapsed ? "buyer-sidebar__workspace--collapsed" : ""
          }`}
        >
          <NavSection label="Workspace" collapsed={collapsed}>
            {buyerWorkspaceNavItems.map((item) => {
              const Icon = navIcons[item.segment];
              return (
                <NavLink
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  icon={Icon}
                  active={isNavActive(pathname, item.href)}
                  collapsed={collapsed}
                  onNavigate={onNavigate}
                />
              );
            })}
          </NavSection>

          <div className="buyer-sidebar__settings">
            <NavLink
              href={buyerSettingsNavItem.href}
              label={buyerSettingsNavItem.label}
              icon={navIcons.settings}
              active={isNavActive(pathname, buyerSettingsNavItem.href)}
              collapsed={collapsed}
              onNavigate={onNavigate}
            />
          </div>
        </div>

        {onToggleSidebar ? (
          <div className={`buyer-sidebar__footer ${collapsed ? "buyer-sidebar__footer--collapsed" : ""}`}>
            <button
              type="button"
              onClick={onToggleSidebar}
              className={`buyer-sidebar__collapse ${collapsed ? "buyer-sidebar__collapse--collapsed" : ""}`}
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
      </div>
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
        className={`buyer-sidebar z-50 shrink-0 border-r border-[#262626] bg-[#0f0f0f] transition-[width,transform] duration-200 lg:translate-x-0 ${
          collapsed ? "buyer-sidebar--collapsed lg:w-16" : "lg:w-64"
        } max-lg:fixed max-lg:inset-y-0 max-lg:left-0 max-lg:z-50 max-lg:flex max-lg:h-dvh max-lg:flex-col max-lg:w-[min(100%,17.5rem)] ${
          showMobileDrawer
            ? "max-lg:pointer-events-auto max-lg:translate-x-0"
            : "max-lg:pointer-events-none max-lg:-translate-x-full"
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
