import type { ReactNode } from "react";

import "./buyer-dashboard.css";

export function BuyerAppPage({
  children,
  className = "",
  fullWidth = false,
}: {
  children: ReactNode;
  className?: string;
  fullWidth?: boolean;
}) {
  const widthClass = fullWidth ? "max-w-none" : className || "max-w-6xl";

  return (
    <div
      className={`buyer-dashboard mx-auto w-full ${fullWidth ? "" : "space-y-10 "} ${widthClass} ${fullWidth ? className : ""}`.trim()}
    >
      {children}
    </div>
  );
}
