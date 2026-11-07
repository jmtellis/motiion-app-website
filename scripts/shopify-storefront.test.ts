import assert from "node:assert/strict";
import test from "node:test";

import { footerColumns } from "../src/lib/marketing/footer-links";
import { marketingPageLinkCurrent, marketingPageLinks } from "../src/lib/marketing/site-nav";
import { placeholderListings } from "../src/lib/shop/catalog";
import { productImageViewLabel } from "../src/lib/shop/gallery";
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
  assert.equal(tee.images.length, 1);
  assert.equal(tee.images[0]?.src, tee.image?.src);
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
  assert.deepEqual(product?.images, []);
  assert.equal(product?.variants[0]?.priceLabel, "$28.00");
  assert.deepEqual(visibleOptions([{ name: "Title", values: ["Default Title"] }]), []);
  assert.equal(mapShopifyProduct({ id: "x", handle: "../admin", title: "Bad" }), null);
});

test("product galleries keep Shopify image order and the front photo as the default", () => {
  assert.equal(productImageViewLabel(0), "Front");
  assert.equal(productImageViewLabel(1), "Back");
  assert.equal(productImageViewLabel(2), "Photo 3");

  const front = "https://cdn.shopify.com/s/files/1/1/files/hoodie-front.png?v=1";
  const back = "https://cdn.shopify.com/s/files/1/1/files/hoodie-back.png?v=2";
  const product = mapShopifyProduct({
    id: "gid://shopify/Product/2",
    handle: "motiion-blue-zip-up-hoodie",
    title: "Motiion Blue Zip-Up Hoodie",
    description: "Blue zip-up hoodie.",
    availableForSale: true,
    featuredImage: { url: `${front}&width=100`, altText: "featured", width: 100, height: 100 },
    images: {
      nodes: [
        { url: front, altText: "Motiion blue zip-up hoodie front", width: 2245, height: 3179 },
        { url: "https://evil.example/back.png", altText: "rejected", width: 10, height: 10 },
        { url: back, altText: "Motiion blue zip-up hoodie back", width: 2245, height: 3179 },
        { url: `${back}?width=400`, altText: "duplicate back", width: 400, height: 566 },
      ],
    },
    priceRange: {
      minVariantPrice: { amount: "60.00", currencyCode: "USD" },
      maxVariantPrice: { amount: "60.00", currencyCode: "USD" },
    },
    options: [{ name: "Size", values: ["XS", "S", "M", "L", "XL", "2XL"] }],
    variants: {
      nodes: [
        {
          id: "gid://shopify/ProductVariant/11",
          availableForSale: true,
          selectedOptions: [{ name: "Size", value: "XS" }],
          price: { amount: "60.00", currencyCode: "USD" },
        },
      ],
    },
  });

  assert.equal(product?.priceLabel, "$60.00");
  assert.equal(product?.image?.src, front);
  assert.deepEqual(
    product?.images.map((image) => image.alt),
    ["Motiion blue zip-up hoodie front", "Motiion blue zip-up hoodie back"],
  );
  assert.deepEqual(product?.images.map((_, index) => productImageViewLabel(index)), ["Front", "Back"]);
  assert.equal(product?.options[0]?.values.length, 6);
  assert.equal(product?.variants[0]?.priceLabel, "$60.00");

  const tee = mapShopifyProduct({
    id: "gid://shopify/Product/3",
    handle: "motiion-wordmark-tee",
    title: "Motiion Wordmark Tee",
    availableForSale: true,
    images: {
      nodes: [
        {
          url: "https://cdn.shopify.com/s/files/1/1/files/motiion-wordmark-tee.jpg",
          altText: "Black t-shirt with the Motiion wordmark",
          width: 1024,
          height: 1024,
        },
      ],
    },
  });
  assert.equal(tee?.images.length, 1);
  assert.equal(tee?.image?.src, tee?.images[0]?.src);

  const rejectedList = mapShopifyProduct({
    id: "gid://shopify/Product/5",
    handle: "fallback-photo",
    title: "Fallback",
    featuredImage: {
      url: "https://cdn.shopify.com/s/files/1/1/files/front.jpg",
      altText: "Front",
      width: 800,
      height: 800,
    },
    images: { nodes: [{ url: "https://evil.example/nope.jpg", altText: "no", width: 1, height: 1 }] },
  });
  assert.equal(rejectedList?.images.length, 1);
  assert.equal(rejectedList?.image?.alt, "Front");

  const featuredOnly = mapShopifyProduct({
    id: "gid://shopify/Product/4",
    handle: "featured-only",
    title: "Featured only",
    featuredImage: {
      url: "https://cdn.shopify.com/s/files/1/1/files/only.jpg",
      altText: "Only photo",
      width: 800,
      height: 800,
    },
  });
  assert.equal(featuredOnly?.images.length, 1);
  assert.equal(featuredOnly?.image?.alt, "Only photo");
});
