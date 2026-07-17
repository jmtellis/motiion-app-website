"use client";

import "@/app/product.css";

import { SiteScrollShell } from "@/components/landing/SiteScrollShell";

export function ProductShell({ children }: { children: React.ReactNode }) {
  return (
    <SiteScrollShell>
      <div className="product-theme">
        <div className="product-shell">{children}</div>
      </div>
    </SiteScrollShell>
  );
}
