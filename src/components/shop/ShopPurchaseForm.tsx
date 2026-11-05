"use client";

import { useMemo, useState } from "react";
import { useFormStatus } from "react-dom";

import { startShopifyCheckout } from "@/app/shop/actions";
import { visibleOptions } from "@/lib/shop/options";
import type { ShopListing } from "@/lib/shop/types";

function CheckoutButton({ disabled, label }: { disabled: boolean; label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-hero-pill btn-hero-pill-accent shop-buy" disabled={disabled || pending}>
      {pending ? "Opening checkout…" : label}
    </button>
  );
}

export function ShopPurchaseForm({ product }: { product: ShopListing }) {
  const options = visibleOptions(product.options);
  const initial = product.variants.find((variant) => variant.availableForSale) ?? product.variants[0];
  const [selected, setSelected] = useState<Record<string, string>>(() => {
    const next: Record<string, string> = {};
    for (const option of initial?.selectedOptions ?? []) next[option.name] = option.value;
    return next;
  });

  const variant = useMemo(
    () =>
      product.variants.find((item) =>
        item.selectedOptions.every((option) => selected[option.name] === option.value),
      ) ?? null,
    [product.variants, selected],
  );

  const soldOut = !variant?.availableForSale;

  return (
    <form action={startShopifyCheckout} className="shop-purchase">
      <input type="hidden" name="handle" value={product.handle} />
      <input type="hidden" name="variantId" value={variant?.id ?? ""} />
      {options.map((option) => (
        <fieldset key={option.name} className="shop-sizes">
          <legend>{option.name}</legend>
          <div className="shop-sizes__options">
            {option.values.map((value) => {
              const checked = selected[option.name] === value;
              return (
                <label key={value} className={checked ? "is-selected" : undefined}>
                  <input
                    type="radio"
                    name={`option-${option.name}`}
                    value={value}
                    checked={checked}
                    onChange={() => setSelected((current) => ({ ...current, [option.name]: value }))}
                  />
                  <span>{value}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
      ))}
      <label className="shop-quantity">
        Quantity
        <input type="number" name="quantity" min={1} max={10} defaultValue={1} inputMode="numeric" />
      </label>
      <p className="shop-price">{variant?.priceLabel ?? product.priceLabel ?? "Price not set"}</p>
      <CheckoutButton disabled={!variant || soldOut} label={soldOut ? "Sold out" : "Checkout"} />
      <p className="shop-checkout-note">Payment and shipping are completed on Shopify.</p>
    </form>
  );
}
