"use client";

import "@/app/product.css";

import { SiteScrollShell } from "@/components/landing/SiteScrollShell";

export function ProductShell({ children, className = "", appearance = "dark" }: { children: React.ReactNode; className?: string; appearance?: "light" | "dark" }) {
  return (
    <SiteScrollShell dark={appearance === "dark"} enabled={appearance !== "light"}>
      <div className={`product-theme ${className}`}>
        <div className="product-shell">{children}</div>
      </div>
    </SiteScrollShell>
  );
}
