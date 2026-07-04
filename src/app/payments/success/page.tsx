import { BookingSuccessClient } from "@/components/booking/BookingSuccessClient";
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

function parseKind(raw: string | null): PublicActivityKind | null {
  if (raw === "class" || raw === "session" || raw === "event") return raw;
  return null;
}

export default async function PaymentSuccessPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const stripeSessionId = readParam(params, "session_id");
  const activityId = readParam(params, "activity_id") ?? readParam(params, "class_id");
  const kind = parseKind(readParam(params, "kind"));
  const enrolled = readParam(params, "enrolled") === "1";
  const title = readParam(params, "title");
  const email = readParam(params, "email");

  return (
    <BookingSuccessClient
      stripeSessionId={stripeSessionId}
      activityId={activityId}
      kind={kind}
      enrolled={enrolled}
      title={title}
      email={email}
    />
  );
}
