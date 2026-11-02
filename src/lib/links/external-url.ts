/** Public links accept web destinations, never executable schemes or embedded credentials. */
export function publicWebUrl(value: string | null | undefined): string | null {
  const text = value?.trim();
  if (!text || text.length > 2000 || /\s/.test(text)) return null;
  try {
    const url = new URL(text.includes(":") ? text : `https://${text}`);
    if (!["http:", "https:"].includes(url.protocol) || !url.hostname.includes(".") || url.username || url.password) return null;
    return url.href;
  } catch { return null; }
}
