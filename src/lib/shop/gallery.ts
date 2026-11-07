/** Shopify stores product photos with the front first and the back second. */
export function productImageViewLabel(index: number): string {
  if (index === 0) return "Front";
  if (index === 1) return "Back";
  return `Photo ${index + 1}`;
}
