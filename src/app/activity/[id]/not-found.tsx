import Link from "next/link";

import { ProductShell } from "@/components/product/ProductShell";

export default function ActivityNotFound() {
  return (
    <ProductShell>
      <div style={{ textAlign: "center", paddingTop: 80 }}>
        <h1 style={{ margin: 0, fontSize: 24 }}>Activity not found</h1>
        <p style={{ margin: "12px 0 0", color: "var(--text-low)" }}>
          This activity may be private, past, or unavailable.
        </p>
        <Link href="https://www.motiion.app" style={{ display: "inline-block", marginTop: 20, color: "var(--primary-500)" }}>
          motiion.app
        </Link>
      </div>
    </ProductShell>
  );
}
