import type { ReactNode } from "react";

import "./buyer-dashboard.css";

export function BuyerAppPage({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`buyer-dashboard mx-auto w-full max-w-6xl space-y-10 ${className}`}>{children}</div>;
}
