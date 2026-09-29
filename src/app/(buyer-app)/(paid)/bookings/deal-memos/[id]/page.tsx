import { notFound } from "next/navigation";

import { BuyerAppPage } from "@/components/talent-buyers/dashboard/BuyerAppPage";
import { DealMemoComposer } from "@/components/booking/DealMemoComposer";
import { DealMemoWorkspace } from "@/components/booking/DealMemoWorkspace";
import { requireHiringAccount } from "@/lib/auth/session";
import { syncBookingCheckoutOnLoad } from "@/lib/booking/deal-memo-actions";
import { loadDealMemoDetail } from "@/lib/booking/deal-memo-data";
import "@/components/booking/deal-memo.css";

export const metadata = { title: "Deal memo · Motiion" };

export default async function IndustryDealMemoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ payment_intent?: string; checkout?: string }>;
}) {
  const profile = await requireHiringAccount();
  const [{ id }, query] = await Promise.all([params, searchParams]);
  // Returning from a Payment Element redirect or Stripe Checkout: reconcile with Stripe before the webhook lands.
  if (query.payment_intent || query.checkout === "success") await syncBookingCheckoutOnLoad(id);

  const detail = await loadDealMemoDetail(id, profile.id);
  if (!detail || detail.payload.viewer !== "industry") notFound();
  const { payload, context } = detail;
  const { memo } = payload;

  return (
    <BuyerAppPage fullWidth>
      {memo.status === "draft" ? (
        <DealMemoComposer
          key={memo.version}
          memoId={memo.id}
          version={memo.version}
          initialProvisions={payload.provisions}
          initialCoverNote={memo.cover_note ?? ""}
          context={context}
        />
      ) : (
        <DealMemoWorkspace
          key={memo.version}
          initial={payload}
          context={context}
          messagesHref="/messages"
          newOfferHref={`/bookings/deal-memos/new?availability=${memo.availability_check_request_id}`}
        />
      )}
    </BuyerAppPage>
  );
}
