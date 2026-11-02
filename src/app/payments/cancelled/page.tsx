import Link from "next/link";

import { CastingPublicShell } from "@/components/casting/CastingPublicShell";
import type { PublicActivityKind } from "@/types/public";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function readParam(params: Record<string, string | string[] | undefined>, key: string): string | null {
  const raw = params[key];
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    return trimmed.length ? trimmed : null;
  }
  return null;
}

function activityHref(_kind: PublicActivityKind | null, activityId: string | null): string | null {
  if (!activityId) return null;
  const prefix = "/activity";
  return `${prefix}/${encodeURIComponent(activityId)}`;
}

export default async function PaymentCancelledPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const activityId = readParam(params, "activity_id") ?? readParam(params, "class_id");
  const kindRaw = readParam(params, "kind");
  const kind: PublicActivityKind | null =
    kindRaw === "class" || kindRaw === "session" || kindRaw === "event" ? kindRaw : "class";
  const backHref = activityHref(kind, activityId);

  return (
    <CastingPublicShell>
      <article className="casting-page">
        <header className="casting-page-header">
          <p className="casting-section-title">Payment</p>
          <h1 className="casting-page-title">Payment cancelled</h1>
          <p className="casting-page-subtitle">Checkout was closed. Return to the activity to review your reservation before starting another payment.</p>
        </header>

        {backHref ? (
          <Link href={backHref} className="casting-submit-button" style={{ textAlign: "center", textDecoration: "none" }}>
            Back to activity
          </Link>
        ) : (
          <a
            href="/classes"
            className="casting-submit-button"
            style={{ textAlign: "center", textDecoration: "none" }}
          >
            Explore classes
          </a>
        )}
      </article>
    </CastingPublicShell>
  );
}
