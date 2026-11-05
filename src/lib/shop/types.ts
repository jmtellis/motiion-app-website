export type ShopOption = {
  name: string;
  values: string[];
};

export type ShopVariant = {
  id: string;
  availableForSale: boolean;
  selectedOptions: { name: string; value: string }[];
  priceLabel: string | null;
};

export type ShopImage = {
  src: string;
  alt: string;
  width: number;
  height: number;
};

/** A merch listing rendered on /shop. Live rows come from Shopify; placeholders never carry an official price. */
export type ShopListing = {
  id: string;
  handle: string;
  title: string;
  description: string;
  image: ShopImage | null;
  priceLabel: string | null;
  placeholder: boolean;
  availableForSale: boolean;
  options: ShopOption[];
  variants: ShopVariant[];
};

export type ShopCatalog = {
  listings: ShopListing[];
  /** True when the grid is the local stand-in, not published Shopify products. */
  usingPlaceholder: boolean;
  notice: string | null;
};
