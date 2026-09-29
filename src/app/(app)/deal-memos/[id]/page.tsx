import { notFound, redirect } from "next/navigation";

import { DealMemoWorkspace } from "@/components/booking/DealMemoWorkspace";
import { requireTalentAccount } from "@/lib/auth/session";
import { bookingPayoutLink, fetchBookingPayoutStatus } from "@/lib/booking/deal-memo-actions";
import { loadDealMemoDetail, loadTalentPayoutStatus } from "@/lib/booking/deal-memo-data";
import "@/components/booking/deal-memo.css";

export const metadata = { title: "Deal memo · Motiion" };

export default async function TalentDealMemoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ payouts?: string }>;
}) {
  const profile = await requireTalentAccount();
  const [{ id }, { payouts }] = await Promise.all([params, searchParams]);

  if (payouts === "refresh") {
    const link = await bookingPayoutLink("onboarding_link", `/deal-memos/${id}`);
    if (link.ok && link.data.url) redirect(link.data.url);
  }
  // Returning from Stripe onboarding: sync before reading so Pay unlocks without waiting on the webhook.
  if (payouts === "return") await fetchBookingPayoutStatus();

  const [detail, payout] = await Promise.all([loadDealMemoDetail(id, profile.id), loadTalentPayoutStatus(profile.id)]);
  if (!detail || detail.payload.viewer !== "talent" || detail.payload.memo.status === "draft") notFound();

  return (
    <DealMemoWorkspace
      key={detail.payload.memo.version}
      initial={detail.payload}
      context={detail.context}
      payout={payout}
      messagesHref="/inbox"
    />
  );
}
