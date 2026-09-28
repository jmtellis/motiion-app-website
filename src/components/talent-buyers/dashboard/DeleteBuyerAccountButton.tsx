"use client";

import { deleteBuyerAccount } from "@/app/(buyer-app)/dashboard/settings/actions";
import { DeleteAccountButton } from "@/components/settings/DeleteAccountButton";

export function DeleteBuyerAccountButton() {
  return <DeleteAccountButton deleteAccount={deleteBuyerAccount} profileLabel="talent buyer profile" />;
}
