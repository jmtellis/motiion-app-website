import type { BuyerBreadcrumbItem } from "@/components/talent-buyers/dashboard/BuyerPageChromeContext";

import { getProjectCreateConfig } from "./project-create-registry";
import { isProjectType } from "./project-types";

export function defaultBuyerChromeTitle(pathname: string): string {
  if (pathname === "/projects" || pathname.startsWith("/projects/")) {
    if (pathname === "/projects/new") return "Create project";
    const typedCreateMatch = pathname.match(/^\/projects\/new\/([^/]+)$/);
    if (typedCreateMatch?.[1]) {
      const type = typedCreateMatch[1];
      if (isProjectType(type)) {
        return getProjectCreateConfig(type).pageTitle;
      }
    }
    if (pathname.match(/^\/projects\/[^/]+\/edit$/)) return "Edit project";
    return "Projects";
  }
  if (pathname === "/dashboard") return "Dashboard";
  if (pathname === "/calendar") return "Calendar";
  if (pathname.startsWith("/library")) return "Library";
  if (pathname === "/messages") return "Inbox";
  if (pathname.startsWith("/dashboard/settings")) return "Settings";
  if (pathname.startsWith("/talent")) return "Talent";
  return "Motiion";
}

export function defaultBuyerChromeLede(pathname: string): string | undefined {
  if (pathname === "/projects") {
    return "Manage castings, classes, and sessions from one workspace.";
  }
  if (pathname === "/dashboard") {
    return "Pick up where you left off across your hiring workflow.";
  }
  return undefined;
}

export function defaultBuyerChromeBreadcrumbs(pathname: string): BuyerBreadcrumbItem[] | undefined {
  if (pathname === "/projects") {
    return [{ label: "Projects" }];
  }
  if (pathname === "/projects/new") {
    return [
      { label: "Projects", href: "/projects" },
      { label: "Create project" },
    ];
  }
  const typedCreateMatch = pathname.match(/^\/projects\/new\/([^/]+)$/);
  if (typedCreateMatch?.[1] && isProjectType(typedCreateMatch[1])) {
    const config = getProjectCreateConfig(typedCreateMatch[1]);
    return [
      { label: "Projects", href: "/projects" },
      { label: "Create project", href: "/projects?create=1" },
      { label: config.breadcrumbLabel },
    ];
  }
  if (pathname.match(/^\/projects\/[^/]+\/edit$/)) {
    const id = pathname.split("/")[2];
    return [
      { label: "Projects", href: "/projects" },
      { label: "Project", href: `/projects/${id}/overview` },
      { label: "Edit project" },
    ];
  }
  if (pathname.startsWith("/library/") && pathname !== "/library") {
    return [{ label: "Library", href: "/library" }];
  }
  if (pathname === "/dashboard") {
    return [{ label: "Dashboard" }];
  }
  if (pathname === "/calendar") {
    return [{ label: "Calendar" }];
  }
  if (pathname === "/messages") {
    return [{ label: "Inbox" }];
  }
  if (pathname.startsWith("/library")) {
    return [{ label: "Library" }];
  }
  if (pathname.startsWith("/dashboard/settings")) {
    return [{ label: "Settings" }];
  }
  if (pathname.startsWith("/talent")) {
    return [{ label: "Talent" }];
  }
  return undefined;
}

export function resolveBuyerChromeTitle(
  pathname: string,
  breadcrumbs: BuyerBreadcrumbItem[] | undefined,
  explicitTitle?: string,
): string {
  if (explicitTitle) return explicitTitle;

  const crumbs = breadcrumbs ?? defaultBuyerChromeBreadcrumbs(pathname) ?? [];
  const lastCrumb = crumbs.at(-1);
  if (lastCrumb && !lastCrumb.href) return lastCrumb.label;

  return defaultBuyerChromeTitle(pathname);
}
