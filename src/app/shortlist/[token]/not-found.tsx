import Link from "next/link";

import { PublicReviewShell } from "@/components/public/PublicReviewShell";

export default function ShortlistNotFound() {
  return (
    <PublicReviewShell>
      <div style={{ textAlign: "center", paddingTop: 80 }}>
        <h1 style={{ margin: 0, fontSize: 24 }}>Shortlist not found</h1>
        <p style={{ margin: "12px 0 0", color: "rgba(255, 255, 255, 0.55)" }}>
          This link may be invalid, expired, or unavailable.
        </p>
        <Link
          href="https://www.motiion.app"
          style={{ display: "inline-block", marginTop: 20, color: "#2dd4bf" }}
        >
          motiion.app
        </Link>
      </div>
    </PublicReviewShell>
  );
}
