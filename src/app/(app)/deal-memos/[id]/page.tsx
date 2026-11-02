import { RetiredBookingNotice } from "@/components/booking/RetiredBookingNotice";
import { requireTalentAccount } from "@/lib/auth/session";

export default async function RetiredBookingPage() {
  await requireTalentAccount();
  return <RetiredBookingNotice role="talent" />;
}
