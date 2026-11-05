import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { ShopShell } from "@/components/shop/ShopShell";
import { loadShopCatalog } from "@/lib/shop/shopify";
import "@/components/landing/home-split-landing.css";
import "./shop.css";

const description =
  "T-shirts and merch from Motiion. Professional dance, connected. The shop lists products from Shopify on motiion.app.";

export async function generateMetadata(): Promise<Metadata> {
  const catalog = await loadShopCatalog();
  return {
    title: "Shop",
    description,
    alternates: { canonical: "/shop" },
    openGraph: { title: "Shop · Motiion", description, url: "/shop" },
    twitter: { title: "Shop · Motiion", description },
    robots: catalog.usingPlaceholder ? { index: false, follow: true } : undefined,
  };
}

export const revalidate = 60;

export default async function ShopPage() {
  const catalog = await loadShopCatalog();

  return (
    <ShopShell>
      <main id="main-content" className="shop-page">
        <div className="mkt-container">
          <p className="shop-eyebrow">Merch</p>
          <h1>Shop</h1>
          <p className="shop-lead">T-shirts and other pieces from Motiion.</p>
          <p className="shop-brand">Professional dance, connected.</p>
          {catalog.notice ? <p className="shop-notice">{catalog.notice}</p> : null}
          <ul className="shop-grid">
            {catalog.listings.map((product) => (
              <li key={product.id}>
                <Link href={`/shop/${product.handle}`} className="shop-card">
                  <div className="shop-card__media">
                    {product.image ? (
                      <Image
                        src={product.image.src}
                        alt={product.image.alt}
                        fill
                        sizes="(max-width: 767px) 100vw, (max-width: 900px) 50vw, 33vw"
                      />
                    ) : null}
                  </div>
                  <div className="shop-card__body">
                    {product.placeholder ? <p className="shop-card__kicker">Placeholder</p> : null}
                    {!product.placeholder && !product.availableForSale ? (
                      <p className="shop-card__kicker">Sold out</p>
                    ) : null}
                    <h2>{product.title}</h2>
                    <p>{product.priceLabel ?? "Price not set"}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </main>
    </ShopShell>
  );
}
