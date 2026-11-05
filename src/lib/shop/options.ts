import type { ShopOption } from "@/lib/shop/types";

/** Shopify adds a Title / Default Title option when a product has no real choices, such as sizes. */
export function visibleOptions(options: ShopOption[]): ShopOption[] {
  return options.filter(
    (option) =>
      !(option.name === "Title" && option.values.length > 0 && option.values.every((value) => value === "Default Title")),
  );
}