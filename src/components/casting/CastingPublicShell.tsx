import { PublicReviewShell } from "@/components/public/PublicReviewShell";

import "@/app/casting/casting.css";

/** @deprecated Use PublicReviewShell directly. Kept for casting route imports. */
export function CastingPublicShell({ children }: { children: React.ReactNode }) {
  return <PublicReviewShell>{children}</PublicReviewShell>;
}
