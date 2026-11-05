/** Pages linked from the marketing header, beside Login / Sign up / Download. */
export const marketingPageLinks = [
  { href: "/services", label: "Services" },
  { href: "/pricing", label: "Pricing" },
  { href: "/shop", label: "Shop" },
] as const;

export function marketingPageLinkCurrent(pathname: string, href: string): "page" | undefined {
  if (href === "/shop") {
    return pathname === "/shop" || pathname.startsWith("/shop/") ? "page" : undefined;
  }
  return pathname === href ? "page" : undefined;
}
