import Link from "next/link";
import { redirect } from "next/navigation";

import { BuyerAppPage } from "@/components/talent-buyers/dashboard/BuyerAppPage";
import { IndustryEmptyState } from "@/components/talent-buyers/dashboard/IndustryUI";
import { DealMemoComposer } from "@/components/booking/DealMemoComposer";
import { requireHiringAccount } from "@/lib/auth/session";
import { loadComposeContext } from "@/lib/booking/deal-memo-data";
import "@/components/booking/deal-memo.css";

export const metadata = { title: "New deal memo · Motiion" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function NewDealMemoPage({
  searchParams,
}: {
  searchParams: Promise<{ availability?: string }>;
}) {
  const profile = await requireHiringAccount();
  const { availability } = await searchParams;
  const compose = availability && UUID.test(availability) ? await loadComposeContext(availability, profile.id) : null;

  if (compose?.openMemoId) redirect(`/bookings/deal-memos/${compose.openMemoId}`);

  if (!compose || !compose.eligible) {
    return (
      <BuyerAppPage fullWidth>
        <IndustryEmptyState
          title="Start from a confirmed availability request"
          description="Deal memos can only be sent to talent who confirmed they're available. Request availability first, then book from your Bookings desk."
          actions={
            <Link className="buyer-chrome-bar__cta" href="/bookings">
              Back to Bookings
            </Link>
          }
        />
      </BuyerAppPage>
    );
  }

  return (
    <BuyerAppPage fullWidth>
      <DealMemoComposer
        availabilityRequestId={availability}
        initialProvisions={compose.provisions}
        initialCoverNote=""
        context={compose.context}
      />
    </BuyerAppPage>
  );
}
