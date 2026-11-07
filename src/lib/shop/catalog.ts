import type { ShopListing } from "@/lib/shop/types";

/**
 * Local stand-in until a Shopify store is connected and this product is published there.
 * Replace the photo, price, sizes, and inventory in Shopify — do not treat the values
 * below as an official SKU. `priceLabel` stays null on purpose.
 */
export const placeholderListings: ShopListing[] = [
  {
    id: "placeholder:motiion-wordmark-tee",
    handle: "motiion-wordmark-tee",
    title: "Motiion Wordmark Tee",
    description: "Black t-shirt with the Motiion wordmark centered on the chest.",
    image: {
      src: "/shop/motiion-wordmark-tee.jpg",
      alt: "Placeholder photo of a black t-shirt with the white Motiion wordmark centered on the chest.",
      width: 1024,
      height: 1024,
    },
    images: [
      {
        src: "/shop/motiion-wordmark-tee.jpg",
        alt: "Placeholder photo of a black t-shirt with the white Motiion wordmark centered on the chest.",
        width: 1024,
        height: 1024,
      },
    ],
    priceLabel: null,
    placeholder: true,
    availableForSale: false,
    options: [],
    variants: [],
  },
];

export function findPlaceholderListing(handle: string): ShopListing | null {
  return placeholderListings.find((product) => product.handle === handle) ?? null;
}
