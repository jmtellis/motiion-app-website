import Link from "next/link";

import { CastingPublicShell } from "@/components/casting/CastingPublicShell";

export default function CastingNotFound() {
  return (
    <CastingPublicShell>
      <div style={{ textAlign: "center", paddingTop: 80 }}>
        <h1 style={{ margin: 0, fontSize: 24 }}>Casting not found</h1>
        <p style={{ margin: "12px 0 0", color: "rgba(255, 255, 255, 0.55)" }}>
          This casting may be private, closed, or unavailable.
        </p>
        <Link
          href="https://www.motiion.app"
          style={{ display: "inline-block", marginTop: 20, color: "#00ccb7" }}
        >
          motiion.app
        </Link>
      </div>
    </CastingPublicShell>
  );
}
