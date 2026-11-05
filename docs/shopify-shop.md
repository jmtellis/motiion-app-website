# Motiion shop

The public shop is `/shop` on the Motiion website (`https://www.motiion.app/shop`). The catalog is drawn inside the existing site, with the same header and footer as Services and Pricing. There is no separate Motiion cart.

Shopify is the store. This repository does not contain a Shopify store, a Storefront API token, or a shop domain. Until those exist, `/shop` shows one placeholder listing and does not take payment.

## Placeholder listing

| | |
| --- | --- |
| Title | Motiion Wordmark Tee |
| Photo | `public/shop/motiion-wordmark-tee.jpg` — a mockup of a black tee with the Motiion wordmark centered on the chest |
| Price | Not set. This is not an official price. |
| Sizes | Not set |
| Inventory | Not set |
| Checkout | Closed |

When Shopify returns published products, those replace the placeholder. The mockup is not sent to Shopify automatically.

## Why this shape

The site is a Next.js app. A Hydrogen store would be a second application. A Buy Button widget would not match the page. The Storefront API lets `/shop` and `/shop/[handle]` stay on `motiion.app`.

Choosing Checkout creates a Shopify cart for that variant and sends the visitor to Shopify Checkout. Card payment, tax, and shipping happen there, on `checkout.shopify.com` or the store’s own Shopify host. That hop is required. Do not point the `motiion.app` DNS records at Shopify; that would replace the website.

## What still has to be done in Shopify

1. Create a Shopify store (or a development store).
2. Add the real products, starting with the Motiion Wordmark Tee: final photo, title, **price**, sizes, and inventory. Publish them to the Headless (or Online Store) channel.
3. In Shopify admin, open the Headless sales channel and create a storefront. Copy the `*.myshopify.com` domain and the Storefront API access token. The token needs to read product listings and create carts (`unauthenticated_read_product_listings`, `unauthenticated_write_checkouts`, `unauthenticated_read_checkouts`).
4. Set these on the website host (Vercel), for Production when you are ready, and for Preview if you want a test store. Do not commit them.

   - `SHOPIFY_STORE_DOMAIN` — `your-store.myshopify.com` (not `motiion.app`)
   - `SHOPIFY_STOREFRONT_ACCESS_TOKEN` — Storefront API token
   - `SHOPIFY_STOREFRONT_API_VERSION` — optional, default `2026-10`

5. Redeploy so the server can read the new variables. `/shop` then lists published products. A product page with sizes posts to Shopify and redirects to Checkout.
6. In Shopify admin, connect a payment provider (Settings → Payments).
7. Add shipping rates (Settings → Shipping and delivery) and tax settings.
8. The catalog design lives in this repo, not in a Shopify theme. A theme only matters if the `*.myshopify.com` Online Store is also public. Password-protect that storefront if customers should buy only on `motiion.app/shop`.
9. Optional: redirect the public Shopify domain to `https://www.motiion.app/shop` so old links land here. Checkout links should still be allowed to open Shopify.

No charges are made from this repository. Stripe in this repo is for industry subscriptions, not merch.
