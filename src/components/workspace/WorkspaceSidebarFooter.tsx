"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings } from "lucide-react";
import type { ReactNode } from "react";

import { NotificationsButton } from "./WorkspaceNotifications";

/** Settings row above the account switcher, with notifications beside the account. */
export function WorkspaceSidebarFooter({ settingsHref, account }: { settingsHref: string; account: ReactNode }) {
  const pathname = usePathname();
  const active = pathname === settingsHref || pathname.startsWith(`${settingsHref}/`);
  return (
    <>
      <div className="workspace-nav workspace-sidebar-settings">
        <Link href={settingsHref} title="Settings" className="workspace-nav-link" aria-current={active ? "page" : undefined}>
          <Settings aria-hidden="true" />
          <span className="workspace-nav-label">Settings</span>
        </Link>
      </div>
      <div className="workspace-sidebar-user">
        {account}
        <NotificationsButton placement="sidebar" />
      </div>
    </>
  );
}
