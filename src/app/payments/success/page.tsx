import { BookingSuccessClient } from "@/components/booking/BookingSuccessClient";
import { activityViewerState } from "@/lib/app/activities";
import { isActiveEnrollment } from "@/lib/app/activity-enrollment";
import type { PublicActivityKind } from "@/types/public";
import { createServerSupabaseClient } from "@/lib/supabase/server";

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

function parseKind(raw: string | null): PublicActivityKind | null {
  if (raw === "class" || raw === "session" || raw === "event") return raw;
  return null;
}

export default async function PaymentSuccessPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const stripeSessionId = readParam(params, "session_id");
  const activityId = readParam(params, "activity_id") ?? readParam(params, "class_id");
  const kind = parseKind(readParam(params, "kind"));
  const viewer = activityId && /^[\da-f-]{36}$/i.test(activityId) ? await activityViewerState(activityId) : null;
  // Older receipt links contain only a Checkout session ID. They still need to
  // recognize the signed-in owner after returning from the login flow.
  const signedIn = viewer?.signedIn ?? Boolean((await (await createServerSupabaseClient())?.auth.getUser())?.data.user);

  return (
    <BookingSuccessClient
      stripeSessionId={stripeSessionId}
      activityId={activityId}
      kind={kind}
      verifiedEnrollment={isActiveEnrollment(viewer?.enrollmentStatus)}
      signedIn={signedIn}
    />
  );
}
