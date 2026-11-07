import { cache } from "react";

import { placeholderListings } from "@/lib/shop/catalog";
import type { ShopCatalog, ShopImage, ShopListing, ShopVariant } from "@/lib/shop/types";

const DEFAULT_API_VERSION = "2026-10";
const STORE_DOMAIN = /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/;
const STOREFRONT_TOKEN = /^[A-Za-z0-9_-]{20,200}$/;
const API_VERSION = /^\d{4}-(?:01|04|07|10)$/;
const PRODUCT_HANDLE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const VARIANT_GID = /^gid:\/\/shopify\/ProductVariant\/\d+$/;

const PLACEHOLDER_NOTICE =
  "The Motiion Wordmark Tee is a placeholder listing. The photo is a mockup. Price, sizes, and inventory are not set, and checkout is not open. Shopify supplies those once the store is connected. Browsing stays on this page.";

const INVALID_NOTICE =
  "Shopify settings are incomplete, so the placeholder listing is showing. Checkout is not open.";

const EMPTY_NOTICE =
  "The Shopify store is connected, but it has no published products yet. The placeholder listing stays up until a product is published.";

const ERROR_NOTICE =
  "The Shopify store could not be loaded, so the placeholder listing is showing. Checkout is not open.";

export type ShopifyConfig = {
  storeDomain: string;
  storefrontAccessToken: string;
  apiVersion: string;
};

export type ShopifyConfigResult =
  | { status: "unconfigured" }
  | { status: "invalid" }
  | { status: "ready"; config: ShopifyConfig };

type Money = { amount?: string | null; currencyCode?: string | null };
type ImageNode = {
  url?: string | null;
  altText?: string | null;
  width?: number | null;
  height?: number | null;
};

export type StorefrontVariantNode = {
  id?: string | null;
  availableForSale?: boolean | null;
  selectedOptions?: { name?: string | null; value?: string | null }[] | null;
  price?: Money | null;
};

export type StorefrontProductNode = {
  id?: string | null;
  handle?: string | null;
  title?: string | null;
  description?: string | null;
  availableForSale?: boolean | null;
  featuredImage?: ImageNode | null;
  images?: { nodes?: (ImageNode | null)[] | null } | null;
  priceRange?: { minVariantPrice?: Money | null; maxVariantPrice?: Money | null } | null;
  options?: { name?: string | null; values?: (string | null)[] | null }[] | null;
  variants?: { nodes?: StorefrontVariantNode[] | null } | null;
};

const PRODUCT_SELECTION = `
  id
  handle
  title
  description
  availableForSale
  featuredImage { url altText width height }
  images(first: 50) { nodes { url altText width height } }
  priceRange { minVariantPrice { amount currencyCode } maxVariantPrice { amount currencyCode } }
  options { name values }
  variants(first: 100) {
    nodes {
      id
      availableForSale
      selectedOptions { name value }
      price { amount currencyCode }
    }
  }
`;

const PRODUCTS_QUERY = `query ShopProducts($first: Int!) {
  products(first: $first) {
    nodes { ${PRODUCT_SELECTION} }
  }
}`;

const PRODUCT_QUERY = `query ShopProduct($handle: String!) {
  product(handle: $handle) { ${PRODUCT_SELECTION} }
}`;

const CART_CREATE = `mutation ShopCartCreate($merchandiseId: ID!, $quantity: Int!) {
  cartCreate(input: { lines: [{ merchandiseId: $merchandiseId, quantity: $quantity }] }) {
    cart { checkoutUrl }
    userErrors { message }
  }
}`;

export function readShopifyConfig(env: Record<string, string | undefined>): ShopifyConfigResult {
  const domainRaw = env.SHOPIFY_STORE_DOMAIN?.trim().toLowerCase() ?? "";
  const token = env.SHOPIFY_STOREFRONT_ACCESS_TOKEN?.trim() ?? "";
  const versionRaw = env.SHOPIFY_STOREFRONT_API_VERSION?.trim() ?? "";
  if (!domainRaw && !token && !versionRaw) return { status: "unconfigured" };

  const storeDomain = domainRaw.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const apiVersion = versionRaw || DEFAULT_API_VERSION;
  if (
    storeDomain.includes("/") ||
    !STORE_DOMAIN.test(storeDomain) ||
    !STOREFRONT_TOKEN.test(token) ||
    !API_VERSION.test(apiVersion)
  ) {
    return { status: "invalid" };
  }

  return {
    status: "ready",
    config: { storeDomain, storefrontAccessToken: token, apiVersion },
  };
}

export function formatShopMoney(amount: string, currencyCode: string): string | null {
  if (!/^[A-Z]{3}$/.test(currencyCode)) return null;
  const value = Number(amount);
  if (!Number.isFinite(value)) return null;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currencyCode }).format(value);
}

export function priceLabelFromRange(min?: Money | null, max?: Money | null): string | null {
  const minLabel = min?.amount && min.currencyCode ? formatShopMoney(min.amount, min.currencyCode) : null;
  const maxLabel = max?.amount && max.currencyCode ? formatShopMoney(max.amount, max.currencyCode) : null;
  if (!minLabel) return maxLabel;
  if (!maxLabel || minLabel === maxLabel) return minLabel;
  return `From ${minLabel}`;
}

/** Shopify product photos are served from the store CDN. Reject anything else before rendering. */
export function shopifyImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" || parsed.hostname !== "cdn.shopify.com" || parsed.username || parsed.password) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

export function isAllowedCheckoutUrl(value: string, storeDomain: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" || url.username || url.password) return false;
  const host = url.hostname.toLowerCase();
  return host === storeDomain || host === "checkout.shopify.com" || host === "shop.app";
}

export function isProductHandle(handle: string): boolean {
  return PRODUCT_HANDLE.test(handle);
}

function shopImage(image: ImageNode | null | undefined, fallbackAlt: string): ShopImage | null {
  const src = shopifyImageUrl(image?.url);
  if (!src) return null;
  const width = image?.width && image.width > 0 ? image.width : 1200;
  const height = image?.height && image.height > 0 ? image.height : 1200;
  return { src, alt: image?.altText?.trim() || fallbackAlt, width, height };
}

function imageIdentity(src: string): string {
  try {
    const url = new URL(src);
    return `${url.origin}${url.pathname}`;
  } catch {
    return src;
  }
}

/** Position order from Shopify, front first. The featured image fills in when the list is empty. */
export function shopImagesFromProduct(node: StorefrontProductNode): ShopImage[] {
  const fallbackAlt = node.title?.trim() || "Product photo";
  const seen = new Set<string>();
  const images: ShopImage[] = [];
  const push = (image: ImageNode | null | undefined) => {
    const mapped = shopImage(image, fallbackAlt);
    if (!mapped) return;
    const key = imageIdentity(mapped.src);
    if (seen.has(key)) return;
    seen.add(key);
    images.push(mapped);
  };

  for (const image of node.images?.nodes ?? []) push(image);
  if (images.length === 0) push(node.featuredImage);
  return images;
}

function mapVariant(node: StorefrontVariantNode): ShopVariant | null {
  if (!node.id || !VARIANT_GID.test(node.id)) return null;
  const selectedOptions = (node.selectedOptions ?? [])
    .filter((option) => option.name && option.value)
    .map((option) => ({ name: option.name as string, value: option.value as string }));
  return {
    id: node.id,
    availableForSale: Boolean(node.availableForSale),
    selectedOptions,
    priceLabel:
      node.price?.amount && node.price.currencyCode
        ? formatShopMoney(node.price.amount, node.price.currencyCode)
        : null,
  };
}

export function mapShopifyProduct(node: StorefrontProductNode): ShopListing | null {
  if (!node.id || !node.handle || !node.title || !isProductHandle(node.handle)) return null;
  const options = (node.options ?? [])
    .filter((option) => option.name && option.values?.length)
    .map((option) => ({
      name: option.name as string,
      values: (option.values ?? []).filter((value): value is string => Boolean(value)),
    }))
    .filter((option) => option.values.length > 0);
  const variants = (node.variants?.nodes ?? [])
    .map(mapVariant)
    .filter((variant): variant is ShopVariant => variant !== null);
  const images = shopImagesFromProduct(node);

  return {
    id: node.id,
    handle: node.handle,
    title: node.title,
    description: node.description?.trim() || "Motiion merch.",
    image: images[0] ?? null,
    images,
    priceLabel: priceLabelFromRange(node.priceRange?.minVariantPrice, node.priceRange?.maxVariantPrice),
    placeholder: false,
    availableForSale: Boolean(node.availableForSale),
    options,
    variants,
  };
}

function placeholderCatalog(notice: string): ShopCatalog {
  return { listings: placeholderListings, usingPlaceholder: true, notice };
}

async function shopifyStorefront<T>(
  config: ShopifyConfig,
  query: string,
  variables: Record<string, unknown>,
  cacheMode: "catalog" | "checkout",
): Promise<T> {
  const response = await fetch(`https://${config.storeDomain}/api/${config.apiVersion}/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-Shopify-Storefront-Access-Token": config.storefrontAccessToken,
    },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(8000),
    ...(cacheMode === "catalog" ? { next: { revalidate: 60 } } : { cache: "no-store" as const }),
  });
  if (!response.ok) throw new Error(`Shopify storefront request failed (${response.status})`);
  const body = (await response.json()) as { data?: T; errors?: unknown[] };
  if (!body.data || (body.errors && body.errors.length > 0)) {
    throw new Error("Shopify storefront returned an error");
  }
  return body.data;
}

async function fetchShopifyListings(config: ShopifyConfig): Promise<ShopListing[]> {
  const data = await shopifyStorefront<{ products?: { nodes?: StorefrontProductNode[] } }>(
    config,
    PRODUCTS_QUERY,
    { first: 50 },
    "catalog",
  );
  return (data.products?.nodes ?? [])
    .map(mapShopifyProduct)
    .filter((product): product is ShopListing => product !== null);
}

async function fetchShopifyProduct(config: ShopifyConfig, handle: string): Promise<ShopListing | null> {
  const data = await shopifyStorefront<{ product?: StorefrontProductNode | null }>(
    config,
    PRODUCT_QUERY,
    { handle },
    "checkout",
  );
  return data.product ? mapShopifyProduct(data.product) : null;
}

export const loadShopCatalog = cache(async (): Promise<ShopCatalog> => {
  const result = readShopifyConfig(process.env);
  if (result.status === "unconfigured") return placeholderCatalog(PLACEHOLDER_NOTICE);
  if (result.status === "invalid") {
    console.error(
      "Shopify shop config is incomplete or invalid. Set SHOPIFY_STORE_DOMAIN to a *.myshopify.com host and SHOPIFY_STOREFRONT_ACCESS_TOKEN.",
    );
    return placeholderCatalog(INVALID_NOTICE);
  }

  try {
    const listings = await fetchShopifyListings(result.config);
    if (listings.length === 0) return placeholderCatalog(EMPTY_NOTICE);
    return { listings, usingPlaceholder: false, notice: null };
  } catch (error) {
    console.error("Shopify storefront catalog failed", error instanceof Error ? error.message : "unknown");
    return placeholderCatalog(ERROR_NOTICE);
  }
});

export async function loadShopProduct(handle: string): Promise<{ product: ShopListing; catalog: ShopCatalog } | null> {
  if (!isProductHandle(handle)) return null;
  const catalog = await loadShopCatalog();
  const product = catalog.listings.find((listing) => listing.handle === handle);
  return product ? { product, catalog } : null;
}

export async function createShopifyCheckout(input: {
  handle: string;
  variantId: string;
  quantity: number;
}): Promise<{ ok: true; checkoutUrl: string } | { ok: false }> {
  const result = readShopifyConfig(process.env);
  if (result.status !== "ready") return { ok: false };
  if (!isProductHandle(input.handle) || !VARIANT_GID.test(input.variantId)) return { ok: false };
  if (!Number.isInteger(input.quantity) || input.quantity < 1 || input.quantity > 10) return { ok: false };

  try {
    const product = await fetchShopifyProduct(result.config, input.handle);
    const variant = product?.variants.find((item) => item.id === input.variantId && item.availableForSale);
    if (!product || product.placeholder || !variant) return { ok: false };

    const data = await shopifyStorefront<{
      cartCreate?: { cart?: { checkoutUrl?: string | null } | null; userErrors?: { message?: string }[] };
    }>(result.config, CART_CREATE, { merchandiseId: variant.id, quantity: input.quantity }, "checkout");

    if (data.cartCreate?.userErrors?.length) return { ok: false };
    const checkoutUrl = data.cartCreate?.cart?.checkoutUrl ?? "";
    if (!isAllowedCheckoutUrl(checkoutUrl, result.config.storeDomain)) return { ok: false };
    return { ok: true, checkoutUrl };
  } catch (error) {
    console.error("Shopify checkout failed", error instanceof Error ? error.message : "unknown");
    return { ok: false };
  }
}
