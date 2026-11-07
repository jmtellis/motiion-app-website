import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ShopProductGallery } from "@/components/shop/ShopProductGallery";
import { ShopPurchaseForm } from "@/components/shop/ShopPurchaseForm";
import { ShopShell } from "@/components/shop/ShopShell";
import { loadShopProduct } from "@/lib/shop/shopify";
import "@/components/landing/home-split-landing.css";
import "../shop.css";

export const revalidate = 60;

type ShopProductPageProps = {
  params: Promise<{ handle: string }>;
  searchParams: Promise<{ checkout?: string }>;
};

export async function generateMetadata({ params }: ShopProductPageProps): Promise<Metadata> {
  const { handle } = await params;
  const loaded = await loadShopProduct(handle);
  if (!loaded) return { title: "Shop" };
  const title = loaded.product.title;
  const description = loaded.product.placeholder
    ? `${title} is a placeholder Motiion merch listing. Price, sizes, and inventory are not set yet.`
    : loaded.product.description;
  return {
    title,
    description,
    alternates: { canonical: `/shop/${loaded.product.handle}` },
    robots: loaded.product.placeholder ? { index: false, follow: true } : undefined,
  };
}

export default async function ShopProductPage({ params, searchParams }: ShopProductPageProps) {
  const [{ handle }, query] = await Promise.all([params, searchParams]);
  const loaded = await loadShopProduct(handle);
  if (!loaded) notFound();

  const { product } = loaded;
  const checkoutFailed = query.checkout === "unavailable";
  const canPurchase = !product.placeholder && product.variants.length > 0;

  return (
    <ShopShell>
      <main id="main-content" className="shop-page">
        <div className="mkt-container">
          <p className="shop-eyebrow">Merch</p>
          <article className="shop-detail">
            <ShopProductGallery key={product.id} images={product.images} title={product.title} />
            <div className="shop-detail__copy">
              {product.placeholder ? <p className="shop-kicker">Placeholder</p> : null}
              <h1>{product.title}</h1>
              <p>{product.description}</p>
              {checkoutFailed ? (
                <p className="shop-alert" role="alert">
                  Checkout could not be opened. The Shopify store may be disconnected, or that size is unavailable.
                </p>
              ) : null}
              {canPurchase ? (
                <ShopPurchaseForm product={product} />
              ) : (
                <div className="shop-unavailable">
                  <p className="shop-price">{product.priceLabel ?? "Price not set"}</p>
                  <p>Sizes are not set.</p>
                  <p>Inventory is not set.</p>
                  <p>Checkout stays closed until this product is published in Shopify with a price, sizes, and inventory.</p>
                </div>
              )}
              <Link href="/shop" className="shop-back">
                Back to shop
              </Link>
            </div>
          </article>
        </div>
      </main>
    </ShopShell>
  );
}
