import Link from "next/link";

import { ProductShell } from "@/components/product/ProductShell";
import type { ActivityShareKind } from "@/lib/activitySharePreview";
import { activityKindWord } from "@/lib/activitySharePreview";

export function ActivityShareLinkLanding({
  title,
  kind,
}: {
  title: string;
  kind: ActivityShareKind;
}) {
  const word = activityKindWord(kind);
  return (
    <ProductShell>
      <div style={{ textAlign: "center", paddingTop: 80, paddingInline: 24 }}>
        <p style={{ margin: 0, fontSize: 13, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-low)" }}>
          {word}
        </p>
        <h1 style={{ margin: "12px 0 0", fontSize: 28 }}>{title}</h1>
        <p style={{ margin: "12px auto 0", maxWidth: 420, color: "var(--text-low)", lineHeight: 1.5 }}>
          Open this {word} in the Motiion app.
        </p>
        <Link href="https://www.motiion.app" style={{ display: "inline-block", marginTop: 20, color: "var(--primary-500)" }}>
          motiion.app
        </Link>
      </div>
    </ProductShell>
  );
}
