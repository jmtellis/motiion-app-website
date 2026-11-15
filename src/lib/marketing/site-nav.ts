/** Shared marketing navigation, followed by the App Store icon. */
export const marketingPageLinks = [
  { href: "/for-talent", label: "For Talent" },
  { href: "/shop", label: "Shop" },
  { href: "/pricing", label: "Pricing" },
] as const;

export function marketingPageLinkCurrent(pathname: string, href: string): "page" | undefined {
  if (href === "/shop") {
    return pathname === "/shop" || pathname.startsWith("/shop/") ? "page" : undefined;
  }
  return pathname === href ? "page" : undefined;
}
