import assert from "node:assert/strict";
import test from "node:test";

import { footerColumns } from "../src/lib/marketing/footer-links";
import { marketingPageLinkCurrent, marketingPageLinks } from "../src/lib/marketing/site-nav";
import { placeholderListings } from "../src/lib/shop/catalog";
import { visibleOptions } from "../src/lib/shop/options";
import {
  formatShopMoney,
  isAllowedCheckoutUrl,
  mapShopifyProduct,
  priceLabelFromRange,
  readShopifyConfig,
  shopifyImageUrl,
} from "../src/lib/shop/shopify";

const ready = {
  SHOPIFY_STORE_DOMAIN: "motiion-merch.myshopify.com",
  SHOPIFY_STOREFRONT_ACCESS_TOKEN: "a".repeat(32),
};

test("shop nav sits with Services and Pricing, including the footer", () => {
  assert.deepEqual(
    marketingPageLinks.map((link) => link.label),
    ["Services", "Pricing", "Shop"],
  );
  assert.equal(marketingPageLinks.find((link) => link.label === "Shop")?.href, "/shop");
  assert.equal(marketingPageLinkCurrent("/shop/motiion-wordmark-tee", "/shop"), "page");
  assert.equal(marketingPageLinkCurrent("/services", "/shop"), undefined);
  assert.equal(marketingPageLinkCurrent("/pricing", "/pricing"), "page");
  const company = footerColumns.find((column) => column.title === "Company");
  assert.equal(company?.links.some((link) => link.href === "/shop" && link.label === "Shop"), true);
});

test("placeholder tee has no official price, sizes, or inventory", () => {
  const tee = placeholderListings.find((product) => product.handle === "motiion-wordmark-tee");
  assert.ok(tee);
  assert.equal(tee.title, "Motiion Wordmark Tee");
  assert.equal(tee.priceLabel, null);
  assert.equal(tee.placeholder, true);
  assert.equal(tee.availableForSale, false);
  assert.deepEqual(tee.options, []);
  assert.deepEqual(tee.variants, []);
  assert.equal(tee.image?.src, "/shop/motiion-wordmark-tee.jpg");
  assert.match(tee.description, /wordmark centered on the chest/);
});

test("shopify config stays empty until both store values are real", () => {
  assert.equal(readShopifyConfig({}).status, "unconfigured");
  assert.equal(readShopifyConfig({ SHOPIFY_STORE_DOMAIN: "evil.example" }).status, "invalid");
  assert.equal(readShopifyConfig({ ...ready, SHOPIFY_STORE_DOMAIN: "https://motiion.app/shop" }).status, "invalid");
  assert.equal(readShopifyConfig({ ...ready, SHOPIFY_STOREFRONT_ACCESS_TOKEN: "short" }).status, "invalid");
  assert.equal(readShopifyConfig({ ...ready, SHOPIFY_STOREFRONT_API_VERSION: "2026-13" }).status, "invalid");
  const parsed = readShopifyConfig({ ...ready, SHOPIFY_STORE_DOMAIN: "https://Motiion-Merch.myshopify.com/" });
  assert.equal(parsed.status, "ready");
  if (parsed.status === "ready") {
    assert.equal(parsed.config.storeDomain, "motiion-merch.myshopify.com");
    assert.equal(parsed.config.apiVersion, "2026-10");
  }
});

test("checkout redirects only to the configured store or Shopify checkout hosts", () => {
  const store = "motiion-merch.myshopify.com";
  assert.equal(isAllowedCheckoutUrl(`https://${store}/cart/c/token`, store), true);
  assert.equal(isAllowedCheckoutUrl("https://checkout.shopify.com/c/token", store), true);
  assert.equal(isAllowedCheckoutUrl("https://shop.app/checkout/token", store), true);
  assert.equal(isAllowedCheckoutUrl("https://other.myshopify.com/cart/c/token", store), false);
  assert.equal(isAllowedCheckoutUrl("http://checkout.shopify.com/c/token", store), false);
  assert.equal(isAllowedCheckoutUrl("https://user:pass@checkout.shopify.com/c/token", store), false);
  assert.equal(isAllowedCheckoutUrl("https://evil.example/checkout", store), false);
});

test("shopify products keep store prices and drop non-cdn photos", () => {
  assert.equal(formatShopMoney("32.00", "USD"), "$32.00");
  assert.equal(formatShopMoney("nope", "USD"), null);
  assert.equal(shopifyImageUrl("https://cdn.shopify.com/s/files/tee.jpg"), "https://cdn.shopify.com/s/files/tee.jpg");
  assert.equal(shopifyImageUrl("https://evil.example/tee.jpg"), null);
  assert.equal(priceLabelFromRange({ amount: "28.00", currencyCode: "USD" }, { amount: "36.00", currencyCode: "USD" }), "From $28.00");

  const product = mapShopifyProduct({
    id: "gid://shopify/Product/1",
    handle: "motiion-wordmark-tee",
    title: "Motiion Wordmark Tee",
    description: "From the store.",
    availableForSale: true,
    featuredImage: { url: "https://evil.example/tee.jpg", altText: "nope", width: 10, height: 10 },
    priceRange: {
      minVariantPrice: { amount: "28.00", currencyCode: "USD" },
      maxVariantPrice: { amount: "28.00", currencyCode: "USD" },
    },
    options: [{ name: "Size", values: ["S", "M"] }],
    variants: {
      nodes: [
        {
          id: "gid://shopify/ProductVariant/9",
          availableForSale: true,
          selectedOptions: [{ name: "Size", value: "S" }],
          price: { amount: "28.00", currencyCode: "USD" },
        },
      ],
    },
  });
  assert.equal(product?.placeholder, false);
  assert.equal(product?.priceLabel, "$28.00");
  assert.equal(product?.image, null);
  assert.equal(product?.variants[0]?.priceLabel, "$28.00");
  assert.deepEqual(visibleOptions([{ name: "Title", values: ["Default Title"] }]), []);
  assert.equal(mapShopifyProduct({ id: "x", handle: "../admin", title: "Bad" }), null);
});
