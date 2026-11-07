"use client";

import type { ReactNode } from "react";

import { trackClientEvent } from "@/lib/analytics/track-client";
import type { LinkKind } from "@/lib/links/link-tree";

export function LinkTreeAnchor({
  href,
  linkId,
  kind,
  position,
  className,
  children,
}: {
  href: string;
  linkId: string;
  kind: LinkKind;
  position: number;
  className: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      className={className}
      onClick={() => trackClientEvent("link_tree_click", { link_id: linkId, kind, position, href })}
    >
      {children}
    </a>
  );
}
