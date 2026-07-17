import Link from "next/link";
import { Home } from "lucide-react";

import type { BuyerBreadcrumbItem } from "./BuyerPageChromeContext";

export function BuyerBreadcrumbs({ items }: { items: BuyerBreadcrumbItem[] }) {
  if (!items.length) return null;

  return (
    <nav aria-label="Breadcrumb" className="buyer-chrome-bar__breadcrumbs">
      <ol className="buyer-chrome-bar__breadcrumb-list">
        {items.map((item, index) => {
          const isCurrent = !item.href && index === items.length - 1;
          const isHome = index === 0 && item.label === "Home";

          return (
            <li key={`${item.label}-${index}`} className="buyer-chrome-bar__breadcrumb-item">
              {item.href ? (
                <Link href={item.href} className="buyer-chrome-bar__breadcrumb-link">
                  {isHome ? <Home className="buyer-chrome-bar__breadcrumb-home-icon" aria-hidden /> : null}
                  <span>{item.label}</span>
                </Link>
              ) : (
                <span
                  className={
                    isCurrent
                      ? "buyer-chrome-bar__breadcrumb-text buyer-chrome-bar__breadcrumb-text--current"
                      : "buyer-chrome-bar__breadcrumb-text"
                  }
                  aria-current={isCurrent ? "page" : undefined}
                >
                  {item.label}
                </span>
              )}
              <span className="buyer-chrome-bar__breadcrumb-sep" aria-hidden>
                /
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
