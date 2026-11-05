"use server";

import { redirect } from "next/navigation";

import { createShopifyCheckout, isProductHandle } from "@/lib/shop/shopify";

export async function startShopifyCheckout(formData: FormData) {
  const handle = String(formData.get("handle") ?? "");
  const variantId = String(formData.get("variantId") ?? "");
  const quantity = Number(formData.get("quantity") ?? 1);
  const destination = isProductHandle(handle) ? `/shop/${handle}` : "/shop";

  const result = await createShopifyCheckout({ handle, variantId, quantity });
  if (!result.ok) {
    redirect(`${destination}?checkout=unavailable`);
  }
  redirect(result.checkoutUrl);
}
