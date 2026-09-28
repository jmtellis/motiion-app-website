"use client";

import Link from "next/link";
import { PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { MotiionWordmark } from "@/components/brand/MotiionWordmark";

/** One geometry for both workspaces, including collapsed and mobile states. */
export function WorkspaceSidebarHeader({ href, collapsed, expanded = !collapsed, mobile = false, onToggle }: {
  href: string; collapsed: boolean; expanded?: boolean; mobile?: boolean; onToggle?: () => void;
}) {
  const Icon = mobile ? X : expanded ? PanelLeftClose : PanelLeftOpen;
  return <div className="workspace-shared-header" data-collapsed={collapsed}>
    {!collapsed && <Link href={href} aria-label="Motiion home" className="workspace-shared-brand"><MotiionWordmark height={10} /></Link>}
    {onToggle && <button type="button" className="workspace-shared-collapse" onClick={onToggle} aria-expanded={expanded} aria-label={mobile ? "Close navigation menu" : expanded ? "Collapse sidebar" : "Expand sidebar"}><Icon size={16} aria-hidden /></button>}
  </div>;
}
