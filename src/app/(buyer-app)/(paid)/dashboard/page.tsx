import { redirect } from "next/navigation";

import { BUYER_HOME_PATH } from "@/lib/talent-buyers/dashboard-data";

export default function BuyerDashboardPage() {
  redirect(BUYER_HOME_PATH);
}
