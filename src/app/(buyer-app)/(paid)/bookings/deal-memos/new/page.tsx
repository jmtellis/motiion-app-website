import { RetiredBookingNotice } from "@/components/booking/RetiredBookingNotice";
import { requireHiringAccount } from "@/lib/auth/session";

export default async function RetiredBookingPage() {
  await requireHiringAccount();
  return <RetiredBookingNotice role="industry" />;
}
